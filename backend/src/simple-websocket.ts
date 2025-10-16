import { WebSocketServer } from 'ws';
import logger from './utils/logger';

const WS_PORT = parseInt(process.env.WS_PORT || '8081');

// Create WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

logger.info(`WebSocket server started on port ${WS_PORT}`);

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  logger.info(`Client connected from ${clientIp}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    data: {
      message: 'Connected to Rabbit Launchpad WebSocket server',
      timestamp: new Date().toISOString(),
      server: 'Rabbit Launchpad Backend'
    }
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      logger.debug('Message received:', message);

      // Echo message back
      ws.send(JSON.stringify({
        type: 'echo',
        data: {
          originalMessage: message,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      logger.error('Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        data: {
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }
      }));
    }
  });

  // Handle disconnection
  ws.on('close', (code, reason) => {
    logger.info(`Client disconnected (code: ${code}, reason: ${reason})`);
  });

  // Handle errors
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
  });

  // Send ping every 30 seconds
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
});

// Handle server errors
wss.on('error', (error) => {
  logger.error('WebSocket server error:', error);
});

logger.info(`WebSocket server ready. Connect to: ws://localhost:${WS_PORT}`);

export default wss;