import request from 'supertest';
import { app } from '../../src/server';
import { generateValidAddress, createValidTokenData, createValidBuyData, createValidSellData } from '../helpers/testUtils';

describe('API Integration Tests', () => {
  let tokenAddress: string;
  let userAddress: string;

  beforeAll(() => {
    tokenAddress = generateValidAddress();
    userAddress = generateValidAddress();
  });

  describe('Complete Token Flow', () => {
    it('should handle complete token lifecycle', async () => {
      // 1. Create a new token
      const tokenData = createValidTokenData();
      const createResponse = await request(app)
        .post('/api/contract/token/create')
        .send(tokenData)
        .expect(200);

      expect(createResponse.body).toHaveProperty('success', true);
      expect(createResponse.body.data).toHaveProperty('transactionHash');

      // 2. Get token information
      const tokenInfoResponse = await request(app)
        .get(`/api/tokens/${tokenAddress}`)
        .expect(200);

      expect(tokenInfoResponse.body).toHaveProperty('success', true);
      expect(tokenInfoResponse.body.data).toHaveProperty('tokenAddress', tokenAddress);

      // 3. Get bonding curve stats
      const bondingCurveResponse = await request(app)
        .get(`/api/tokens/${tokenAddress}/bonding-curve`)
        .expect(200);

      expect(bondingCurveResponse.body).toHaveProperty('success', true);

      // 4. Calculate token purchase
      const buyData = createValidBuyData({ tokenAddress });
      const calculateBuyResponse = await request(app)
        .post('/api/tokens/calculate/buy')
        .send(buyData)
        .expect(200);

      expect(calculateBuyResponse.body).toHaveProperty('success', true);
      expect(calculateBuyResponse.body.data).toHaveProperty('tokensOut');

      // 5. Execute token purchase
      const buyResponse = await request(app)
        .post(`/api/contract/token/${tokenAddress}/buy`)
        .send(buyData)
        .expect(200);

      expect(buyResponse.body).toHaveProperty('success', true);
      expect(buyResponse.body.data).toHaveProperty('transactionHash');

      // 6. Get token balance
      const balanceResponse = await request(app)
        .get(`/api/contract/token/${tokenAddress}/balance/${userAddress}`)
        .expect(200);

      expect(balanceResponse.body).toHaveProperty('success', true);
      expect(balanceResponse.body.data).toHaveProperty('balance');

      // 7. Calculate token sale
      const sellData = createValidSellData({ tokenAddress });
      const calculateSellResponse = await request(app)
        .post('/api/tokens/calculate/sell')
        .send(sellData)
        .expect(200);

      expect(calculateSellResponse.body).toHaveProperty('success', true);
      expect(calculateSellResponse.body.data).toHaveProperty('bnbOut');

      // 8. Execute token sale
      const sellResponse = await request(app)
        .post(`/api/contract/token/${tokenAddress}/sell`)
        .send(sellData)
        .expect(200);

      expect(sellResponse.body).toHaveProperty('success', true);
      expect(sellResponse.body.data).toHaveProperty('transactionHash');

      // 9. Get transaction details
      const txHash = buyResponse.body.data.transactionHash;
      const txResponse = await request(app)
        .get(`/api/contract/transaction/${txHash}`)
        .expect(200);

      expect(txResponse.body).toHaveProperty('success', true);
      expect(txResponse.body.data).toHaveProperty('hash', txHash);
    });
  });

  describe('Market Analytics Flow', () => {
    it('should fetch market and analytics data', async () => {
      // 1. Get market statistics
      const marketStatsResponse = await request(app)
        .get('/api/contract/market/stats')
        .expect(200);

      expect(marketStatsResponse.body).toHaveProperty('success', true);

      // 2. Get analytics dashboard
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .expect(200);

      expect(analyticsResponse.body).toHaveProperty('success', true);
      expect(analyticsResponse.body.data).toHaveProperty('totalTokens');
      expect(analyticsResponse.body.data).toHaveProperty('totalVolume');

      // 3. Get token analytics
      const tokenAnalyticsResponse = await request(app)
        .get('/api/analytics/tokens')
        .expect(200);

      expect(tokenAnalyticsResponse.body).toHaveProperty('success', true);
      expect(tokenAnalyticsResponse.body.data).toHaveProperty('tokens');
    });
  });

  describe('Real-time Features Flow', () => {
    it('should handle real-time features', async () => {
      // 1. Get real-time stats
      const realtimeStatsResponse = await request(app)
        .get('/api/contract/realtime/stats')
        .expect(200);

      expect(realtimeStatsResponse.body).toHaveProperty('success', true);

      // 2. Start listening to token events
      const listenResponse = await request(app)
        .post(`/api/contract/listen/${tokenAddress}`)
        .expect(200);

      expect(listenResponse.body).toHaveProperty('success', true);
      expect(listenResponse.body.data).toHaveProperty('message');

      // 3. Broadcast message
      const broadcastResponse = await request(app)
        .post('/api/contract/broadcast')
        .send({
          type: 'test-event',
          data: { message: 'Test broadcast message' }
        })
        .expect(200);

      expect(broadcastResponse.body).toHaveProperty('success', true);
      expect(broadcastResponse.body.data).toHaveProperty('sentCount');

      // 4. Stop listening to token events
      const stopListenResponse = await request(app)
        .delete(`/api/contract/listen/${tokenAddress}`)
        .expect(200);

      expect(stopListenResponse.body).toHaveProperty('success', true);
    });
  });

  describe('Error Recovery Flow', () => {
    it('should handle errors gracefully in flow', async () => {
      // 1. Try to get non-existent token
      await request(app)
        .get('/api/tokens/0x0000000000000000000000000000000000000000')
        .expect(404);

      // 2. Try to create token with invalid data
      await request(app)
        .post('/api/contract/token/create')
        .send({
          name: '',
          symbol: ''
        })
        .expect(400);

      // 3. Try to buy tokens with invalid amount
      await request(app)
        .post(`/api/contract/token/${tokenAddress}/buy`)
        .send({
          bnbAmount: '-1'
        })
        .expect(400);

      // 4. Verify system is still responsive
      const healthResponse = await request(app)
        .get('/health')
        .expect(200);

      expect(healthResponse.body).toHaveProperty('status', 'OK');
    });
  });

  describe('Pagination and Filtering Flow', () => {
    it('should handle pagination and filtering correctly', async () => {
      // 1. Get first page of tokens
      const firstPageResponse = await request(app)
        .get('/api/tokens?page=1&limit=5')
        .expect(200);

      expect(firstPageResponse.body).toHaveProperty('success', true);
      expect(firstPageResponse.body.data).toHaveProperty('pagination');
      expect(firstPageResponse.body.data.pagination).toHaveProperty('page', 1);
      expect(firstPageResponse.body.data.pagination).toHaveProperty('limit', 5);

      // 2. Get second page of tokens
      const secondPageResponse = await request(app)
        .get('/api/tokens?page=2&limit=5')
        .expect(200);

      expect(secondPageResponse.body).toHaveProperty('success', true);
      expect(secondPageResponse.body.data.pagination).toHaveProperty('page', 2);

      // 3. Try invalid pagination
      await request(app)
        .get('/api/tokens?page=-1&limit=0')
        .expect(400);
    });
  });

  describe('Concurrent Requests Flow', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = [
        request(app).get('/health'),
        request(app).get('/api/tokens'),
        request(app).get('/api/contract/status'),
        request(app).get('/api/analytics/dashboard')
      ];

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect([200, 404]).toContain(response.status);
      });

      // Health check should definitely succeed
      const healthResponse = responses[0]; // First request was health check
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body).toHaveProperty('status', 'OK');
    });
  });
});