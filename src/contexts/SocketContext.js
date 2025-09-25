'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { initSocket, getSocket, isSocketConnected } from '../lib/socket-simple';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [currentPoll, setCurrentPoll] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Use ref to track if socket is already initialized
  const socketInitialized = useRef(false);

  // Initialize socket and event handlers outside of useEffect
  const setupSocket = () => {
    if (socketInitialized.current) return;
    
    console.log('🔌 Setting up socket connection');
    const socket = initSocket();
    socketInitialized.current = true;

    // Direct event handlers without refs
    socket.on('connect', () => {
      console.log('✅ Socket connected in context');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected in context');
      setIsConnected(false);
    });

    socket.on('active_users', (users) => {
      console.log('👥 Active users updated:', users);
      setActiveUsers(prevUsers => {
        // Only update if the users array has actually changed
        if (JSON.stringify(prevUsers) !== JSON.stringify(users)) {
          return users;
        }
        return prevUsers;
      });
    });

    socket.on('poll_created', (poll) => {
      console.log('🗳️ Poll created:', poll);
      setCurrentPoll(poll);
    });

    socket.on('poll_ended', (data) => {
      console.log('⏰ Poll ended:', data);
      setCurrentPoll(null);
    });

    socket.on('new_message', (message) => {
      console.log('💬 New message received:', message);
      console.log('💬 Message keys:', Object.keys(message));
      console.log('💬 Message.message field:', message.message);
      console.log('💬 Current messages before update:', messages);
      setMessages(prev => {
        const updated = [...prev, message];
        console.log('💬 Updated messages:', updated);
        return updated;
      });
    });

    socket.on('chat_message', (message) => {
      console.log('💬 Chat message received:', message);
      console.log('💬 Current messages before update:', messages);
      setMessages(prev => {
        const updated = [...prev, message];
        console.log('💬 Updated messages:', updated);
        return updated;
      });
    });

    // Check initial connection status
    if (isSocketConnected()) {
      console.log('🔗 Socket already connected');
      setIsConnected(true);
    }
  };

  // Use useEffect only for component lifecycle
  useEffect(() => {
    setupSocket();
    
    // Cleanup function
    return () => {
      const socket = getSocket();
      if (socket && socketInitialized.current) {
        console.log('🧹 Cleaning up socket listeners');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('active_users');
        socket.off('poll_created');
        socket.off('poll_ended');
        socket.off('new_message');
        socket.off('chat_message');
        socketInitialized.current = false;
      }
    };
  }, []); // Empty dependency array - runs only once

  // Helper functions for components - using useCallback to prevent recreation
  const joinRoom = useCallback((roomName) => {
    const socket = getSocket();
    if (socket && socket.connected) {
      console.log(`🚪 Joining room: ${roomName}`);
      socket.emit('join_room', { room: roomName });
    } else {
      console.error('❌ Cannot join room - socket not connected');
    }
  }, []);

  const sendMessage = useCallback((messageText) => {
    const socket = getSocket();
    if (socket && socket.connected) {
      console.log('💬 Sending message:', messageText);
      
      // Get user info from localStorage
      const studentName = localStorage.getItem('studentName') || 'Anonymous';
      const teacherName = localStorage.getItem('teacherName');
      const username = teacherName || studentName;
      
      const messageData = { 
        message: messageText,
        username: username
      };
      
      console.log('💬 Sending message data:', messageData);
      socket.emit('send_message', messageData);
    } else {
      console.error('❌ Cannot send message - socket not connected');
    }
  }, []);

  const votePoll = useCallback((pollId, optionId) => {
    const socket = getSocket();
    if (socket && socket.connected) {
      console.log('🗳️ Voting on poll:', { pollId, optionId });
      socket.emit('vote_poll', { pollId, optionId });
    } else {
      console.error('❌ Cannot vote - socket not connected');
    }
  }, []);

  const value = {
    socket: getSocket(),
    isConnected,
    activeUsers,
    onlineUsers: activeUsers, // Alias for compatibility
    currentPoll,
    messages,
    joinRoom,
    sendMessage,
    votePoll,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;