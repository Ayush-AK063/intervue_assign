const express = require('express');
const router = express.Router();

// In-memory storage for chat messages (for testing without MongoDB)
let messages = [];
let messageIdCounter = 1;

// Get all chat messages
router.get('/', async (req, res) => {
  try {
    const { room, limit = 50 } = req.query;
    
    let filteredMessages = messages;

    // Filter by room if provided
    if (room) {
      filteredMessages = filteredMessages.filter(message => message.room === room);
    }

    // Sort by timestamp (newest first) and limit
    filteredMessages = filteredMessages
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: filteredMessages,
      count: filteredMessages.length
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching messages'
    });
  }
});

// Send a new message
router.post('/', async (req, res) => {
  try {
    const { message, username, room, isSystem } = req.body;

    // Validate required fields
    if (!message || !username) {
      return res.status(400).json({
        success: false,
        message: 'Message and username are required'
      });
    }

    // Create new message
    const newMessage = {
      _id: messageIdCounter++,
      message: message.trim(),
      username,
      room: room || 'classroom',
      isSystem: isSystem || false,
      timestamp: new Date(),
      createdAt: new Date()
    };

    messages.push(newMessage);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while sending message'
    });
  }
});

// Get message by ID
router.get('/:id', async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const message = messages.find(m => m._id === messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching message'
    });
  }
});

// Delete a message
router.delete('/:id', async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const messageIndex = messages.findIndex(m => m._id === messageId);

    if (messageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Remove the message
    messages.splice(messageIndex, 1);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting message'
    });
  }
});

// Clear all messages in a room
router.delete('/room/:room', async (req, res) => {
  try {
    const { room } = req.params;
    
    const initialCount = messages.length;
    messages = messages.filter(message => message.room !== room);
    const deletedCount = initialCount - messages.length;

    res.json({
      success: true,
      message: `${deletedCount} messages cleared from room: ${room}`
    });

  } catch (error) {
    console.error('Clear room messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while clearing room messages'
    });
  }
});

// Get messages by room
router.get('/room/:room', async (req, res) => {
  try {
    const { room } = req.params;
    const { limit = 50 } = req.query;
    
    const roomMessages = messages
      .filter(message => message.room === room)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // Oldest first for chat
      .slice(-parseInt(limit)); // Get last N messages

    res.json({
      success: true,
      data: roomMessages,
      count: roomMessages.length
    });

  } catch (error) {
    console.error('Get room messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching room messages'
    });
  }
});

module.exports = router;