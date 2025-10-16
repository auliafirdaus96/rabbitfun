import request from 'supertest';
import { app } from '../../src/server';

describe('Health Check API', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
    });

    it('should include rate limits info', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('rateLimits');
      expect(response.body.rateLimits).toHaveProperty('global');
      expect(response.body.rateLimits).toHaveProperty('api');
      expect(response.body.rateLimits).toHaveProperty('tokenCreation');
      expect(response.body.rateLimits).toHaveProperty('trading');
    });
  });

  describe('GET /', () => {
    it('should return root endpoint info', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Rabbit Launchpad Backend API');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('status', 'Running');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});