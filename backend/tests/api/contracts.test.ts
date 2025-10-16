import request from 'supertest';
import { app } from '../../src/server';

describe('Contract API', () => {
  describe('GET /api/contract/status', () => {
    it('should return contract integration status', async () => {
      const response = await request(app)
        .get('/api/contract/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/contract/health', () => {
    it('should return health check status', async () => {
      const response = await request(app)
        .get('/api/contract/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
    });
  });

  describe('GET /api/contract/token/:tokenAddress', () => {
    it('should return token information for valid address', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      const response = await request(app)
        .get(`/api/contract/token/${validAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 for invalid address format', async () => {
      const invalidAddress = 'invalid-address';

      const response = await request(app)
        .get(`/api/contract/token/${invalidAddress}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('GET /api/contract/market/stats', () => {
    it('should return market statistics', async () => {
      const response = await request(app)
        .get('/api/contract/market/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('POST /api/contract/token/create', () => {
    it('should validate token creation data', async () => {
      const tokenData = {
        name: 'Test Token',
        symbol: 'TEST',
        metadata: 'https://example.com/metadata.json'
      };

      const response = await request(app)
        .post('/api/contract/token/create')
        .send(tokenData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 for invalid token name', async () => {
      const response = await request(app)
        .post('/api/contract/token/create')
        .send({
          name: '',
          symbol: 'TEST'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for invalid token symbol', async () => {
      const response = await request(app)
        .post('/api/contract/token/create')
        .send({
          name: 'Test Token',
          symbol: 'test123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for symbol too long', async () => {
      const response = await request(app)
        .post('/api/contract/token/create')
        .send({
          name: 'Test Token',
          symbol: 'TOOLONG'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/contract/token/:tokenAddress/buy', () => {
    it('should validate token purchase data', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const buyData = {
        bnbAmount: '0.1',
        minTokensOut: '100'
      };

      const response = await request(app)
        .post(`/api/contract/token/${validAddress}/buy`)
        .send(buyData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 for invalid token address', async () => {
      const response = await request(app)
        .post('/api/contract/token/invalid-address/buy')
        .send({
          bnbAmount: '0.1'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid bnbAmount', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const response = await request(app)
        .post(`/api/contract/token/${validAddress}/buy`)
        .send({
          bnbAmount: '-1'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for bnbAmount too small', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const response = await request(app)
        .post(`/api/contract/token/${validAddress}/buy`)
        .send({
          bnbAmount: '0.00001'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/contract/token/:tokenAddress/sell', () => {
    it('should validate token sell data', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const sellData = {
        tokenAmount: '100',
        minBNBOut: '0.1'
      };

      const response = await request(app)
        .post(`/api/contract/token/${validAddress}/sell`)
        .send(sellData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 for invalid token address', async () => {
      const response = await request(app)
        .post('/api/contract/token/invalid-address/sell')
        .send({
          tokenAmount: '100'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid tokenAmount', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const response = await request(app)
        .post(`/api/contract/token/${validAddress}/sell`)
        .send({
          tokenAmount: '-1'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/contract/token/:tokenAddress/balance/:address', () => {
    it('should return token balance for valid addresses', async () => {
      const tokenAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const userAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      const response = await request(app)
        .get(`/api/contract/token/${tokenAddress}/balance/${userAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('tokenAddress', tokenAddress);
      expect(response.body.data).toHaveProperty('address', userAddress);
      expect(response.body.data).toHaveProperty('balance');
    });

    it('should return 400 for invalid token address', async () => {
      const response = await request(app)
        .get('/api/contract/token/invalid-address/balance/0x742d35Cc6634C0532925a3b844Bc454e4438f44e')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid user address', async () => {
      const response = await request(app)
        .get('/api/contract/token/0x742d35Cc6634C0532925a3b844Bc454e4438f44e/balance/invalid-address')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/contract/balance/:address', () => {
    it('should return BNB balance for valid address', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      const response = await request(app)
        .get(`/api/contract/balance/${validAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('address', validAddress);
      expect(response.body.data).toHaveProperty('balance');
    });

    it('should return 400 for invalid address', async () => {
      const response = await request(app)
        .get('/api/contract/balance/invalid-address')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/contract/transaction/:hash', () => {
    it('should return transaction details for valid hash', async () => {
      const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      const response = await request(app)
        .get(`/api/contract/transaction/${validHash}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('hash', validHash);
    });

    it('should return 400 for invalid hash format', async () => {
      const response = await request(app)
        .get('/api/contract/transaction/invalid-hash')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for hash wrong length', async () => {
      const response = await request(app)
        .get('/api/contract/transaction/0x123')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/contract/bonding-curve/calculate', () => {
    it('should calculate bonding curve with BNB amount', async () => {
      const response = await request(app)
        .get('/api/contract/bonding-curve/calculate?bnbAmount=0.1&currentSupply=1000')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('tokensOut');
      expect(response.body.data).toHaveProperty('currentPrice');
      expect(response.body.data).toHaveProperty('priceImpact');
    });

    it('should calculate bonding curve with token amount', async () => {
      const response = await request(app)
        .get('/api/contract/bonding-curve/calculate?tokenAmount=100&currentSupply=1000')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('bnbOut');
      expect(response.body.data).toHaveProperty('currentPrice');
    });

    it('should return 400 for missing currentSupply', async () => {
      const response = await request(app)
        .get('/api/contract/bonding-curve/calculate?bnbAmount=0.1')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for negative currentSupply', async () => {
      const response = await request(app)
        .get('/api/contract/bonding-curve/calculate?bnbAmount=0.1&currentSupply=-1')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/contract/listen/:tokenAddress', () => {
    it('should start listening to token events', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      const response = await request(app)
        .post(`/api/contract/listen/${validAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('tokenAddress', validAddress);
    });

    it('should return 400 for invalid token address', async () => {
      const response = await request(app)
        .post('/api/contract/listen/invalid-address')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/contract/listen/:tokenAddress', () => {
    it('should stop listening to token events', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      const response = await request(app)
        .delete(`/api/contract/listen/${validAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('tokenAddress', validAddress);
    });

    it('should return 400 for invalid token address', async () => {
      const response = await request(app)
        .delete('/api/contract/listen/invalid-address')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/contract/realtime/stats', () => {
    it('should return real-time service statistics', async () => {
      const response = await request(app)
        .get('/api/contract/realtime/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('POST /api/contract/broadcast', () => {
    it('should broadcast message to all connected clients', async () => {
      const broadcastData = {
        type: 'test-message',
        data: {
          message: 'Test broadcast message'
        }
      };

      const response = await request(app)
        .post('/api/contract/broadcast')
        .send(broadcastData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('sentCount');
      expect(response.body.data).toHaveProperty('type', 'test-message');
    });

    it('should return 400 for missing message type', async () => {
      const response = await request(app)
        .post('/api/contract/broadcast')
        .send({
          data: { message: 'Test message' }
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for missing message data', async () => {
      const response = await request(app)
        .post('/api/contract/broadcast')
        .send({
          type: 'test-message'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });
});