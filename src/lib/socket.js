import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

class SocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.hasJoined = false;
  }

  connect() {
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    console.log('Connecting to socket server:', SOCKET_URL);

    const options = {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      maxReconnectionAttempts: 5
    };

    this.socket = io(SOCKET_URL, options);

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket?.id || 'unknown');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.hasJoined = false;
      
      // Auto-join immediately after connection
      this.joinAsTeacher();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.isConnected = false;
      this.hasJoined = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      this.isConnected = false;
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.hasJoined = false;
      this.joinAsTeacher();
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Reconnection error:', error);
    });

    // Re-register all listeners
    this.listeners.forEach((callback, event) => {
      this.socket.on(event, callback);
    });

    return this.socket;
  }

  joinAsTeacher() {
    if (!this.socket || !this.socket.connected || this.hasJoined) {
      return;
    }

    const userData = {
      userId: `teacher_${Date.now()}`,
      username: `Teacher_${Math.random().toString(36).substr(2, 5)}`,
      role: 'teacher'
    };
    
    console.log('Joining with user data:', userData);
    this.socket.emit('join', userData);
    this.hasJoined = true;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.hasJoined = false;
    }
  }

  on(event, callback) {
    this.listeners.set(event, callback);
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback = null) {
    if (callback) {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      console.log('📤 Emitting event:', event, data);
      this.socket.emit(event, data);
    } else {
      console.error('❌ Cannot emit - socket not connected');
    }
  }

  // Specific methods for the application
  joinRoom(roomId) {
    this.emit('join_room', { roomId });
  }

  leaveRoom(roomId) {
    this.emit('leave_room', { roomId });
  }

  sendMessage(message, pollId = null) {
    this.emit('send_message', {
      message,
      pollId,
      timestamp: new Date()
    });
  }

  createPoll(pollData) {
    console.log('🗳️ Creating poll:', pollData);
    this.emit('create_poll', pollData);
  }

  startPoll(pollId) {
    this.emit('start_poll', { pollId });
  }

  endPoll(pollId) {
    this.emit('end_poll', { pollId });
  }

  vote(pollId, optionIndex) {
    this.emit('vote', {
      pollId,
      optionIndex,
      timestamp: new Date()
    });
  }

  kickUser(userId, reason = '') {
    this.emit('kick_user', { userId, reason });
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
      hasJoined: this.hasJoined
    };
  }
}

// Create singleton instance
const socketClient = new SocketClient();

export default socketClient;