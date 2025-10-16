import request from 'supertest';
import { app } from '../../src/server';

describe('Tokens API', () => {
  describe('GET /api/tokens', () => {
    it('should return tokens list with pagination', async () => {
      const response = await request(app)
        .get('/api/tokens')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data.tokens)).toBe(true);
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should respect pagination parameters', async () => {
      const response = await request(app)
        .get('/api/tokens?page=1&limit=5')
        .expect(200);

      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/tokens?page=-1&limit=0')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/tokens/:tokenAddress', () => {
    it('should return token information for valid address', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      const response = await request(app)
        .get(`/api/tokens/${validAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('tokenAddress', validAddress);
    });

    it('should return 400 for invalid address format', async () => {
      const invalidAddress = 'invalid-address';

      const response = await request(app)
        .get(`/api/tokens/${invalidAddress}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/tokens/:tokenAddress/bonding-curve', () => {
    it('should return bonding curve stats', async () => {
      const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      const response = await request(app)
        .get(`/api/tokens/${validAddress}/bonding-curve`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 for invalid address format', async () => {
      const invalidAddress = 'invalid-address';

      const response = await request(app)
        .get(`/api/tokens/${invalidAddress}/bonding-curve`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/tokens/calculate/buy', () => {
    it('should calculate token purchase with valid data', async () => {
      const response = await request(app)
        .post('/api/tokens/calculate/buy')
        .send({
          tokenAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          bnbAmount: '0.1'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 for invalid bnbAmount', async () => {
      const response = await request(app)
        .post('/api/tokens/calculate/buy')
        .send({
          tokenAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          bnbAmount: '-1'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid token address', async () => {
      const response = await request(app)
        .post('/api/tokens/calculate/buy')
        .send({
          tokenAddress: 'invalid-address',
          bnbAmount: '0.1'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/tokens/calculate/sell', () => {
    it('should calculate token sale with valid data', async () => {
      const response = await request(app)
        .post('/api/tokens/calculate/sell')
        .send({
          tokenAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          tokenAmount: '100'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 for invalid tokenAmount', async () => {
      const response = await request(app)
        .post('/api/tokens/calculate/sell')
        .send({
          tokenAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          tokenAmount: '-1'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for missing token address', async () => {
      const response = await request(app)
        .post('/api/tokens/calculate/sell')
        .send({
          tokenAmount: '100'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});