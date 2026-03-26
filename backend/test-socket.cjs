// Quick test: connect to Socket.io and check if events arrive
const { io } = require('socket.io-client');

const socket = io('http://localhost:3010', {
  transports: ['websocket', 'polling'],
  timeout: 5000,
});

const TIMEOUT = 8000;

socket.on('connect', () => {
  console.log('✅ CONNECTED  socketId:', socket.id);
  socket.emit('join', { workspaceId: 'enterprise-corp' });
  console.log('✅ JOINED room ws:enterprise-corp');
  console.log('Listening for events... (will exit in 8s)');
});

socket.on('connect_error', (err) => {
  console.error('❌ CONNECTION ERROR:', err.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('❌ DISCONNECTED:', reason);
});

// Listen for ALL events
socket.onAny((event, data) => {
  console.log(`📨 EVENT: ${event}`, JSON.stringify(data).slice(0, 200));
});

setTimeout(() => {
  console.log('\n⏱️  Timeout reached. Socket connected:', socket.connected);
  socket.disconnect();
  process.exit(0);
}, TIMEOUT);
