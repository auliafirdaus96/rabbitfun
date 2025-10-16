import request from 'supertest';
import { app } from '../../src/server';

describe('Bonding Curve API', () => {
  describe('GET /api/bonding-curve/config', () => {
    it('should return bonding curve configuration', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/config')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const data = response.body.data;
      expect(data).toHaveProperty('P0');
      expect(data).toHaveProperty('S');
      expect(data).toHaveProperty('k');
      expect(data).toHaveProperty('PLATFORM_FEE');
      expect(data).toHaveProperty('CREATOR_FEE');
      expect(data).toHaveProperty('TOTAL_FEE');
      expect(data).toHaveProperty('GROSS_RAISE');
      expect(data).toHaveProperty('NET_RAISE');
      expect(data).toHaveProperty('INITIAL_PRICE_WEI');
      expect(data).toHaveProperty('TOTAL_SUPPLY_TOKENS');
      expect(data).toHaveProperty('TRADING_SUPPLY_TOKENS');
      expect(data).toHaveProperty('GRADUATION_SUPPLY_TOKENS');
    });

    it('should return numeric values for configuration', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/config')
        .expect(200);

      const data = response.body.data;
      expect(typeof data.P0).toBe('number');
      expect(typeof data.S).toBe('number');
      expect(typeof data.k).toBe('number');
      expect(typeof data.PLATFORM_FEE).toBe('number');
      expect(typeof data.CREATOR_FEE).toBe('number');
      expect(typeof data.TOTAL_FEE).toBe('number');
    });
  });

  describe('GET /api/bonding-curve/price', () => {
    it('should calculate price for valid supply', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/price?supply=1000')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const data = response.body.data;
      expect(data).toHaveProperty('supply', 1000);
      expect(data).toHaveProperty('price');
      expect(data).toHaveProperty('priceBNB');
      expect(data).toHaveProperty('priceWei');
      expect(typeof data.price).toBe('number');
      expect(typeof data.priceWei).toBe('string');
    });

    it('should return 400 for missing supply parameter', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/price')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Valid supply parameter is required');
    });

    it('should return 400 for invalid supply parameter', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/price?supply=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Valid supply parameter is required');
    });

    it('should return 400 for negative supply', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/price?supply=-100')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle zero supply', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/price?supply=0')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('supply', 0);
    });

    it('should handle large supply values', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/price?supply=1000000')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('supply', 1000000);
    });
  });

  describe('GET /api/bonding-curve/calculate/buy', () => {
    it('should calculate tokens for BNB amount', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/buy?bnbAmount=0.1&currentSupply=1000')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const data = response.body.data;
      expect(data).toHaveProperty('bnbAmount', 0.1);
      expect(data).toHaveProperty('tokensOut');
      expect(data).toHaveProperty('priceImpact');
      expect(data).toHaveProperty('fee');
      expect(data).toHaveProperty('platformFee');
      expect(data).toHaveProperty('creatorFee');
      expect(data).toHaveProperty('netAmount');
      expect(data).toHaveProperty('currentPrice');
      expect(data).toHaveProperty('newPrice');

      expect(typeof data.tokensOut).toBe('number');
      expect(typeof data.priceImpact).toBe('number');
      expect(typeof data.fee).toBe('number');
    });

    it('should return 400 for missing bnbAmount parameter', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/buy?currentSupply=1000')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Valid bnbAmount and currentSupply parameters are required');
    });

    it('should return 400 for missing currentSupply parameter', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/buy?bnbAmount=0.1')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Valid bnbAmount and currentSupply parameters are required');
    });

    it('should return 400 for invalid bnbAmount', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/buy?bnbAmount=invalid&currentSupply=1000')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for negative bnbAmount', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/buy?bnbAmount=-0.1&currentSupply=1000')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle small BNB amounts', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/buy?bnbAmount=0.001&currentSupply=1000')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('bnbAmount', 0.001);
    });
  });

  describe('GET /api/bonding-curve/calculate/sell', () => {
    it('should calculate BNB for token amount', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/sell?tokenAmount=100&currentSupply=1000')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const data = response.body.data;
      expect(data).toHaveProperty('tokenAmount', 100);
      expect(data).toHaveProperty('bnbOut');
      expect(data).toHaveProperty('priceImpact');
      expect(data).toHaveProperty('fee');
      expect(data).toHaveProperty('platformFee');
      expect(data).toHaveProperty('creatorFee');
      expect(data).toHaveProperty('netAmount');
      expect(data).toHaveProperty('currentPrice');
      expect(data).toHaveProperty('newPrice');

      expect(typeof data.bnbOut).toBe('number');
      expect(typeof data.priceImpact).toBe('number');
      expect(typeof data.fee).toBe('number');
    });

    it('should return 400 for missing tokenAmount parameter', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/sell?currentSupply=1000')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Valid tokenAmount and currentSupply parameters are required');
    });

    it('should return 400 for missing currentSupply parameter', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/sell?tokenAmount=100')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Valid tokenAmount and currentSupply parameters are required');
    });

    it('should return 400 for invalid tokenAmount', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/sell?tokenAmount=invalid&currentSupply=1000')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for negative tokenAmount', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/sell?tokenAmount=-100&currentSupply=1000')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle token amount equal to current supply', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/sell?tokenAmount=1000&currentSupply=1000')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('newPrice');
      expect(response.body.data.newPrice).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/bonding-curve/state/:tokenAddress', () => {
    it('should return bonding curve state for valid token address', async () => {
      const tokenAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      const response = await request(app)
        .get(`/api/bonding-curve/state/${tokenAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');

      const data = response.body.data;
      expect(data).toHaveProperty('tokenAddress', tokenAddress);
      expect(data).toHaveProperty('bondingCurve');
      expect(data.bondingCurve).toHaveProperty('currentPrice');
      expect(data.bondingCurve).toHaveProperty('currentSupply');
      expect(data.bondingCurve).toHaveProperty('raisedAmount');
      expect(data.bondingCurve).toHaveProperty('progressPercentage');
    });

    it('should handle different token addresses', async () => {
      const tokenAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
      ];

      for (const address of tokenAddresses) {
        const response = await request(app)
          .get(`/api/bonding-curve/state/${address}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('tokenAddress', address);
      }
    });

    it('should handle token address with mixed case', async () => {
      const mixedCaseAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      const response = await request(app)
        .get(`/api/bonding-curve/state/${mixedCaseAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large numbers', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/buy?bnbAmount=1000&currentSupply=1000000')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('bnbAmount', 1000);
    });

    it('should handle very small numbers', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/buy?bnbAmount=0.000001&currentSupply=1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle decimal parameters correctly', async () => {
      const response = await request(app)
        .get('/api/bonding-curve/calculate/buy?bnbAmount=0.123456789&currentSupply=987.654321')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('bnbAmount', 0.123456789);
      expect(response.body.data).toHaveProperty('currentSupply');
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent calculation requests', async () => {
      const requests = Array(10).fill(null).map((_, index) =>
        request(app)
          .get('/api/bonding-curve/price')
          .query({ supply: (index + 1) * 100 })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('supply', (index + 1) * 100);
      });
    });

    it('should handle mixed concurrent requests', async () => {
      const requests = [
        request(app).get('/api/bonding-curve/config'),
        request(app).get('/api/bonding-curve/price?supply=1000'),
        request(app).get('/api/bonding-curve/calculate/buy?bnbAmount=0.1&currentSupply=1000'),
        request(app).get('/api/bonding-curve/calculate/sell?tokenAmount=100&currentSupply=1000')
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });
    });
  });
});