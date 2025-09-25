import { io } from 'socket.io-client';

let socket = null;
let isConnected = false;

const SOCKET_URL = 'http://localhost:5000';

export const initSocket = () => {
  if (socket && socket.connected) {
    console.log('Socket already connected');
    return socket;
  }

  console.log('🚀 Connecting to:', SOCKET_URL);
  
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true
  });

  // Handle built-in socket.io errors
  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
    isConnected = false;
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    isConnected = true;
    
    // Don't automatically join with teacher credentials
    // Let each page handle its own join logic
    console.log('🔌 Socket ready for manual join');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    isConnected = false;
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error);
    isConnected = false;
  });

  socket.on('user_joined', (data) => {
    console.log('👤 User joined event:', data);
  });

  socket.on('active_users', (data) => {
    console.log('👥 Active users:', data);
  });

  socket.on('error', (data) => {
    // Completely suppress all error logging to avoid console noise
    // Real errors will be handled by specific event handlers
  });

  return socket;
};

export const getSocket = () => socket;
export const isSocketConnected = () => isConnected;

export const createPoll = (pollData) => {
  if (socket && socket.connected) {
    console.log('🗳️ Creating poll:', pollData);
    socket.emit('create_poll', pollData);
  } else {
    console.error('❌ Cannot create poll - socket not connected');
  }
};

// Auto-initialize when in browser
if (typeof window !== 'undefined') {
  console.log('🔧 Auto-initializing socket...');
  initSocket();
}