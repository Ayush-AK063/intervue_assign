const mongoose = require('mongoose');
const ChatMessage = require('../models/Chat');
const Poll = require('../models/Poll');
const User = require('../models/User');

// Store active users and rooms
const activeUsers = new Map();
const activePolls = new Map();
const pollQueue = []; // Queue for sequential polls
let currentActivePoll = null; // Track currently active poll

module.exports = (io) => {
  
  // Function to start the next poll in queue
  const startNextPoll = async () => {
    if (pollQueue.length === 0 || currentActivePoll) {
      return; // No polls in queue or already have an active poll
    }

    const nextPoll = pollQueue.shift();
    currentActivePoll = nextPoll;

    try {
      // Update poll status to active
      const poll = await Poll.findById(nextPoll._id);
      if (poll) {
        poll.isActive = true;
        poll.status = 'active';
        poll.startTime = new Date();
        poll.endTime = new Date(Date.now() + (poll.duration * 1000));
        await poll.save();

        // Store active poll
        activePolls.set(poll._id.toString(), {
          pollId: poll._id,
          startTime: poll.startTime,
          endTime: poll.endTime,
          timer: null
        });

        // Set up auto-end timer
        const timer = setTimeout(async () => {
          try {
            const pollToEnd = await Poll.findById(poll._id);
            if (pollToEnd) {
              pollToEnd.isActive = false;
              pollToEnd.status = 'completed';
              await pollToEnd.save();
              
              io.emit('poll_ended', {
                pollId: poll._id,
                results: pollToEnd.options.map(opt => ({
                  id: opt.id,
                  text: opt.text,
                  votes: opt.votes
                })),
                totalVotes: pollToEnd.totalVotes
              });
              
              activePolls.delete(poll._id.toString());
              currentActivePoll = null;
              
              // Start next poll in queue after a brief delay
              setTimeout(() => {
                startNextPoll();
              }, 1000);
            }
          } catch (error) {
            console.error('Error ending poll:', error);
            currentActivePoll = null;
            startNextPoll(); // Try to start next poll even if there was an error
          }
        }, poll.duration * 1000);

        // Update the timer in activePolls
        activePolls.get(poll._id.toString()).timer = timer;

        // Emit poll created to all users
        io.emit('poll_created', {
          _id: poll._id,
          pollId: poll._id,
          question: poll.question,
          options: poll.options,
          duration: poll.duration,
          isActive: poll.isActive,
          startTime: poll.startTime,
          endTime: poll.endTime,
          createdBy: nextPoll.createdBy,
          timestamp: poll.createdAt
        });

        console.log(`📊 Poll started from queue: ${poll.question}`);
      }
    } catch (error) {
      console.error('Error starting queued poll:', error);
      currentActivePoll = null;
      startNextPoll(); // Try to start next poll
    }
  };

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // Add error handling for the socket itself
    socket.on('error', (error) => {
      console.error(`❌ Socket ${socket.id} error:`, error);
    });

    // Add a small delay to ensure the client is ready
    setTimeout(() => {
      console.log(`⏰ Socket ${socket.id} ready for events`);
    }, 50);

    // Handle room joining
    socket.on('join_room', (data) => {
      try {
        const { room } = data;
        const user = activeUsers.get(socket.id);
        
        if (!user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        socket.join(room);
        console.log(`🚪 ${user.username} joined room: ${room}`);
        
        // Notify others in the room
        socket.to(room).emit('user_joined_room', {
          userId: user.userId,
          username: user.username,
          room: room,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle user joining
    socket.on('join', async (data) => {
      console.log('📥 Join event received:', data);
      try {
        const { userId, username, role } = data;
        
        // For database users, verify they exist
        let dbUser = null;
        if (userId && !userId.startsWith('anonymous_') && !userId.startsWith('teacher_') && !userId.startsWith('student_')) {
          try {
            // Validate ObjectId format before querying
            if (mongoose.Types.ObjectId.isValid(userId)) {
              dbUser = await User.findById(userId);
              if (!dbUser) {
                socket.emit('error', { message: 'User not found in database' });
                return;
              }
            } else {
              console.log(`⚠️ Invalid ObjectId format for userId: ${userId}, treating as temporary user`);
            }
          } catch (dbError) {
            console.error('Database error:', dbError);
            socket.emit('error', { message: 'Database connection error' });
            return;
          }
        }
        
        // Check if user already exists and remove old connection
        for (const [socketId, user] of activeUsers.entries()) {
          if (user.userId === userId) {
            console.log(`🔄 Removing existing connection for user ${userId}`);
            activeUsers.delete(socketId);
            // Disconnect the old socket if it exists
            const oldSocket = io.sockets.sockets.get(socketId);
            if (oldSocket) {
              oldSocket.disconnect();
            }
            break;
          }
        }
        
        // Store user info (use database user data if available)
        const userData = dbUser ? {
          userId: dbUser._id.toString(),
          username: dbUser.username,
          role: dbUser.role,
          socketId: socket.id,
          joinedAt: new Date()
        } : {
          userId,
          username,
          role,
          socketId: socket.id,
          joinedAt: new Date()
        };
        
        activeUsers.set(socket.id, userData);

        // Update database user with socket info
        if (dbUser) {
          try {
            await User.findByIdAndUpdate(userId, { 
              socketId: socket.id,
              lastSeen: new Date()
            });
          } catch (dbError) {
            console.log('Failed to update user socket info:', dbError);
          }
        }

        // Join general room
        socket.join('general');
        
        // Emit user joined to all clients
        socket.broadcast.emit('user_joined', {
          userId: userData.userId,
          username: userData.username,
          role: userData.role,
          timestamp: new Date()
        });

        // Send current active users list (only database users)
        const users = Array.from(activeUsers.values()).filter(user => 
          !user.userId.startsWith('anonymous_')
        );
        io.emit('active_users', users);

        console.log(`👤 ${userData.username} (${userData.role}) joined`);
      } catch (error) {
        console.error('Error in join event:', error);
        socket.emit('error', { 
          message: 'Failed to join',
          details: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle chat messages
    socket.on('send_message', async (data) => {
      try {
        console.log('📨 Received send_message event:', data);
        const { message, pollId = null } = data;
        const user = activeUsers.get(socket.id);
        
        console.log('📨 User sending message:', user);
        console.log('📨 Message content:', message);
        
        if (!user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        // For temporary users (teacher_, student_, anonymous_), don't save to database
        // Just broadcast the message directly
        if (user.userId.startsWith('teacher_') || user.userId.startsWith('student_') || user.userId.startsWith('anonymous_')) {
          const messageData = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: message,
            sender: {
              username: user.username,
              role: user.role
            },
            username: user.username, // For backward compatibility
            timestamp: new Date(),
            pollId
          };

          console.log('🚀 Sending messageData:', JSON.stringify(messageData, null, 2));
          io.emit('new_message', messageData);
          console.log(`💬 Message from ${user.username}: ${message}`);
          return;
        }

        // For real users with valid ObjectIds, save to database
        const chatMessage = new ChatMessage({
          message,
          sender: {
            userId: user.userId,
            username: user.username,
            role: user.role
          },
          pollId
        });

        await chatMessage.save();

        // Broadcast message to all users
        const messageData = {
          id: chatMessage._id,
          message: chatMessage.message,
          sender: chatMessage.sender,
          timestamp: chatMessage.createdAt,
          pollId: chatMessage.pollId
        };

        console.log('🚀 Sending DB messageData:', JSON.stringify(messageData, null, 2));
        io.emit('new_message', messageData);
        console.log(`💬 Message from ${user.username}: ${message}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle poll creation (teacher only)
    socket.on('create_poll', async (data) => {
      try {
        const user = activeUsers.get(socket.id);
        
        if (!user || user.role !== 'teacher') {
          socket.emit('error', { message: 'Only teachers can create polls' });
          return;
        }

        const { question, options, duration = 15, correctAnswer = null } = data;

        // Create a temporary ObjectId for the user since we don't have user registration
        const tempUserId = new mongoose.Types.ObjectId();

        const poll = new Poll({
          question,
          options: options.map((opt, index) => ({
            id: index + 1,
            text: opt,
            votes: 0,
            voters: []
          })),
          createdBy: tempUserId, // Use temporary ObjectId instead of string userId
          duration,
          correctAnswer,
          isActive: false, // Start as inactive, will be activated when it's time
          status: 'queued', // New status for queued polls
          startTime: null,
          endTime: null
        });

        await poll.save();

        // ALSO save to in-memory storage for API compatibility
        const pollsModule = require('../routes/polls');
        if (pollsModule.polls && Array.isArray(pollsModule.polls)) {
          const inMemoryPoll = {
            _id: poll._id.toString(),
            question: poll.question,
            options: poll.options.map((opt, index) => ({
              _id: `option_${poll._id}_${index}`,
              text: opt.text,
              votes: opt.votes || 0,
              isCorrect: correctAnswer !== undefined ? index === correctAnswer : false
            })),
            timeLimit: duration || 60,
            isActive: false,
            totalVotes: 0,
            createdBy: 'teacher',
            createdAt: new Date(),
            updatedAt: new Date(),
            startedAt: null,
            endedAt: null
          };
          pollsModule.polls.push(inMemoryPoll);
        }

        // Add poll to queue instead of starting immediately
        pollQueue.push({
          _id: poll._id,
          question: poll.question,
          options: poll.options,
          duration: poll.duration,
          createdBy: user.username
        });

        console.log(`📊 Poll queued by ${user.username}: ${question} (Queue length: ${pollQueue.length})`);
        
        // Notify teacher that poll was queued
        socket.emit('poll_queued', {
          pollId: poll._id,
          question: poll.question,
          queuePosition: pollQueue.length,
          message: currentActivePoll ? 'Poll queued. Will start after current poll ends.' : 'Poll queued. Starting now...'
        });

        // Start the poll if no poll is currently active
        if (!currentActivePoll) {
          startNextPoll();
        }

      } catch (error) {
        console.error('Error creating poll:', error);
        socket.emit('error', { message: 'Failed to create poll' });
      }
    });

    // Handle poll start (teacher only)
    socket.on('start_poll', async (data) => {
      try {
        const user = activeUsers.get(socket.id);
        
        if (!user || user.role !== 'teacher') {
          socket.emit('error', { message: 'Only teachers can start polls' });
          return;
        }

        const { pollId } = data;
        const poll = await Poll.findById(pollId);
        
        if (!poll) {
          socket.emit('error', { message: 'Poll not found' });
          return;
        }

        // Start the poll
        await poll.startPoll();
        
        // Set up timer
        const activePoll = activePolls.get(pollId);
        if (activePoll) {
          activePoll.startTime = new Date();
          activePoll.endTime = new Date(Date.now() + (poll.duration * 1000));
          
          // Auto-end poll after duration
          activePoll.timer = setTimeout(async () => {
            await poll.endPoll();
            io.emit('poll_ended', {
              pollId: poll._id,
              results: poll.getVotePercentages(),
              totalVotes: poll.totalVotes
            });
            activePolls.delete(pollId);
          }, poll.duration * 1000);
        }

        // Emit poll started to all users
        io.emit('poll_started', {
          pollId: poll._id,
          question: poll.question,
          options: poll.options,
          duration: poll.duration,
          startTime: poll.startTime,
          endTime: poll.endTime
        });

        console.log(`▶️ Poll started: ${poll.question}`);
      } catch (error) {
        console.error('Error starting poll:', error);
        socket.emit('error', { message: 'Failed to start poll' });
      }
    });

    // Handle poll vote (students only)
    socket.on('vote_poll', async (data) => {
      try {
        const user = activeUsers.get(socket.id);
        
        if (!user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        const { pollId, optionId } = data;
        const poll = await Poll.findById(pollId);
        
        if (!poll || poll.status !== 'active') {
          socket.emit('error', { message: 'Poll not active' });
          return;
        }

        // Add vote to MongoDB
        await poll.addVote(optionId, user.userId, user.username);

        // Also update the in-memory polls array for poll history API
        const polls = require('../routes/polls').polls;
        if (polls) {
          const inMemoryPoll = polls.find(p => p._id == pollId);
          if (inMemoryPoll) {
            const option = inMemoryPoll.options.find(opt => opt._id === optionId);
            if (option) {
              option.votes++;
              inMemoryPoll.totalVotes++;
              inMemoryPoll.updatedAt = new Date();
            }
          }
        }

        // Emit vote update to all users
        io.emit('vote_update', {
          pollId: poll._id,
          optionId,
          voter: user.username,
          totalVotes: poll.totalVotes,
          results: poll.getVotePercentages()
        });

        console.log(`🗳️ Vote from ${user.username} for option ${optionId}`);
      } catch (error) {
        console.error('Error voting:', error);
        socket.emit('error', { message: error.message || 'Failed to vote' });
      }
    });

    // Handle kick participant (teacher only)
    socket.on('kick_participant', async (data) => {
      try {
        const user = activeUsers.get(socket.id);
        
        if (!user || user.role !== 'teacher') {
          socket.emit('error', { message: 'Only teachers can kick participants' });
          return;
        }

        const { userId, username } = data;
        
        // Find the user's socket
        const targetSocket = Array.from(activeUsers.entries())
          .find(([socketId, userData]) => userData.userId === userId);

        if (targetSocket) {
          const [targetSocketId] = targetSocket;
          
          // Emit kick event to the specific user
          io.to(targetSocketId).emit('kicked_out', {
            message: 'You have been removed from the session',
            timestamp: new Date()
          });

          // Remove from active users
          activeUsers.delete(targetSocketId);
          
          // Disconnect the socket
          io.sockets.sockets.get(targetSocketId)?.disconnect();
        }

        // Send system message to chat about the kick
        const kickMessage = {
          id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          message: `${username} has been removed from the session by ${user.username}`,
          sender: {
            username: 'System',
            role: 'system'
          },
          username: 'System', // For backward compatibility
          timestamp: new Date(),
          isSystem: true,
          messageType: 'system'
        };

        // Broadcast system message to all users (including chat)
        io.emit('new_message', kickMessage);

        // Update active users list for all clients after kick
        const users = Array.from(activeUsers.values()).filter(user => 
          !user.userId.startsWith('anonymous_')
        );
        io.emit('active_users', users);

        // Broadcast to all users
        socket.broadcast.emit('participant_kicked', {
          userId,
          username,
          kickedBy: user.username,
          timestamp: new Date()
        });

        console.log(`👢 ${username} kicked by ${user.username}`);
      } catch (error) {
        console.error('Error kicking participant:', error);
        socket.emit('error', { message: 'Failed to kick participant' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      try {
        const user = activeUsers.get(socket.id);
        
        if (user) {
          // Update user's last seen in database (only for database users)
          if (!user.userId.startsWith('anonymous_') && !user.userId.startsWith('teacher_') && !user.userId.startsWith('student_')) {
            try {
              // Validate ObjectId format before updating
              if (mongoose.Types.ObjectId.isValid(user.userId)) {
                await User.findByIdAndUpdate(user.userId, { 
                  socketId: null,
                  lastSeen: new Date()
                });
              }
            } catch (dbError) {
              console.log('Failed to update user disconnect info:', dbError);
            }
          }

          // Remove from active users
          activeUsers.delete(socket.id);

          // Broadcast user left (only for database users)
          if (!user.userId.startsWith('anonymous_')) {
            socket.broadcast.emit('user_left', {
              userId: user.userId,
              username: user.username,
              timestamp: new Date()
            });

            // Update active users list for all clients
            const users = Array.from(activeUsers.values()).filter(user => 
              !user.userId.startsWith('anonymous_')
            );
            io.emit('active_users', users);
          }

          console.log(`🔌 ${user.username} disconnected`);
        } else {
          console.log(`🔌 Unknown user disconnected: ${socket.id}`);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Handle get chat history
    socket.on('get_chat_history', async (data) => {
      try {
        const { pollId = null, limit = 50 } = data;
        const messages = await ChatMessage.getRecentMessages(pollId, limit);
        
        socket.emit('chat_history', {
          messages: messages.reverse(), // Send in chronological order
          pollId
        });
      } catch (error) {
        console.error('Error getting chat history:', error);
        socket.emit('error', { message: 'Failed to get chat history' });
      }
    });
  });

  console.log('🔌 Socket.io handler initialized');
};