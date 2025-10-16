// Test real-time updates simulation
const WebSocket = require('ws');

console.log('Testing real-time updates simulation...');

// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:8081');
let updateCount = 0;

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');

  // Subscribe to real-time updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: { channel: 'token-updates' }
  }));

  // Simulate receiving token updates
  const simulateUpdates = setInterval(() => {
    const tokenUpdate = {
      type: 'token_update',
      data: {
        tokenAddress: '0x1234567890123456789012345678901234567890',
        price: (Math.random() * 0.001 + 0.0001).toFixed(8),
        volume24h: (Math.random() * 100 + 10).toFixed(2),
        change24h: (Math.random() * 20 - 10).toFixed(2),
        timestamp: new Date().toISOString()
      }
    };

    ws.send(JSON.stringify(tokenUpdate));
    updateCount++;

    console.log(`📡 Sent update ${updateCount}: Price ${tokenUpdate.data.price} BNB`);

    if (updateCount >= 5) {
      clearInterval(simulateUpdates);
      console.log('✅ Finished sending updates');
      setTimeout(() => ws.close(), 1000);
    }
  }, 2000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received:', message.type, message.data?.message || message.data);
  } catch (error) {
    console.log('📥 Received raw:', data.toString());
  }
});

ws.on('close', () => {
  console.log('✅ Connection closed');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
  process.exit(0);
}, 15000);