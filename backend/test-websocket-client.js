const io = require('socket.io-client');

console.log('🔌 Testing WebSocket connection...');

const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log(`🆔 Socket ID: ${socket.id}`);

  // Test subscriptions
  console.log('📡 Subscribing to token...');
  socket.emit('subscribe_token', { tokenAddress: '0x1e46c31cf3017' });

  console.log('📡 Subscribing to market...');
  socket.emit('subscribe_market');

  // Test ping
  setTimeout(() => {
    console.log('🏓 Sending ping...');
    socket.emit('ping');
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket server');
});

socket.on('token_price_update', (data) => {
  console.log('💰 Price Update Received:', JSON.stringify(data, null, 2));
});

socket.on('new_transaction', (data) => {
  console.log('📝 New Transaction Received:', JSON.stringify(data, null, 2));
});

socket.on('market_update', (data) => {
  console.log('📊 Market Update Received:', JSON.stringify(data, null, 2));
});

socket.on('pong', () => {
  console.log('🏓 Pong received');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Keep the test running for 30 seconds
setTimeout(() => {
  console.log('🔚 Test completed. Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 30000);