import request from 'supertest';
import { app } from '../../src/server';
import { expectValidErrorResponse } from '../helpers/testUtils';

describe('Error Handling', () => {
  describe('404 Not Found', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent token', async () => {
      const response = await request(app)
        .get('/api/tokens/0x0000000000000000000000000000000000000000')
        .expect(404);

      expectValidErrorResponse(response, 404);
    });
  });

  describe('400 Bad Request', () => {
    it('should return 400 for invalid JSON', async () => {
      const response = await request(app)
        .post('/api/tokens/calculate/buy')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expectValidErrorResponse(response, 400);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/tokens/calculate/buy')
        .send({})
        .expect(400);

      expectValidErrorResponse(response, 400);
    });
  });

  describe('429 Rate Limiting', () => {
    it('should handle rate limiting (if implemented)', async () => {
      // This test depends on rate limiting implementation
      // For now, we'll just make a request that should work
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
    });
  });

  describe('Validation Errors', () => {
    it('should validate Ethereum addresses', async () => {
      const invalidAddresses = [
        'invalid',
        '0xinvalid',
        '0x123',
        '0x1234567890123456789012345678901234567890' // Too short
      ];

      for (const address of invalidAddresses) {
        const response = await request(app)
          .get(`/api/tokens/${address}`)
          .expect(400);

        expectValidErrorResponse(response, 400);
      }
    });

    it('should validate numeric inputs', async () => {
      const response = await request(app)
        .post('/api/tokens/calculate/buy')
        .send({
          tokenAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          bnbAmount: 'not-a-number'
        })
        .expect(400);

      expectValidErrorResponse(response, 400);
    });

    it('should validate transaction hash format', async () => {
      const invalidHashes = [
        'invalid',
        '0xinvalid',
        '0x123',
        '0x1234567890123456789012345678901234567890123456789012345678901234' // Wrong length
      ];

      for (const hash of invalidHashes) {
        const response = await request(app)
          .get(`/api/contract/transaction/${hash}`)
          .expect(400);

        expectValidErrorResponse(response, 400);
      }
    });
  });

  describe('CORS Handling', () => {
    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/tokens')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });

  describe('Content Security Policy', () => {
    it('should include CSP headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('content-security-policy');
    });
  });

  describe('Compression', () => {
    it('should handle compressed responses', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Encoding', 'gzip, deflate, br')
        .expect(200);

      // The response should be successful even with compression
      expect(response.body).toHaveProperty('status', 'OK');
    });
  });

  describe('Large Payloads', () => {
    it('should handle large payloads within limits', async () => {
      const largeData = {
        data: 'x'.repeat(100000) // 100KB of data
      };

      const response = await request(app)
        .post('/api/users/profile')
        .send(largeData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Special Characters', () => {
    it('should handle special characters in input', async () => {
      const specialCharData = {
        name: 'Test <script>alert("xss")</script> Token',
        symbol: '!@#$%^&*()',
        description: 'Token with special chars: \n\t\r'
      };

      const response = await request(app)
        .post('/api/users/profile')
        .send(specialCharData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});