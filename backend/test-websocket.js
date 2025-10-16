const WebSocket = require('ws');

console.log('Testing WebSocket connection to ws://localhost:8081...');

const ws = new WebSocket('ws://localhost:8081');

ws.on('open', function open() {
  console.log('Connected to WebSocket server!');

  // Send a test message
  const testMessage = {
    type: 'test',
    data: {
      message: 'Hello from test client!',
      timestamp: new Date().toISOString()
    }
  };

  ws.send(JSON.stringify(testMessage));
  console.log('Sent message:', testMessage);
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('Received message:', parsed);
  } catch (error) {
    console.log('Received raw message:', data.toString());
  }

  // Close connection after receiving response
  setTimeout(() => {
    ws.close();
  }, 1000);
});

ws.on('close', function close() {
  console.log('WebSocket connection closed');
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err.message);
});

// Timeout after 10 seconds
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('Test timeout - closing connection');
    ws.close();
  }
}, 10000);