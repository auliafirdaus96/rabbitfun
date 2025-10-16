/**
 * Workflow Integration Tests
 * Tests for complete user workflows and data flows
 */

require('./setupIntegrationTests.cjs');
const { http } = require('../mocks/server.cjs');
const { server } = require('../mocks/server.cjs');

describe('User Workflow Integration Tests', () => {
  describe('Token Discovery Workflow', () => {
    it('should complete token discovery journey', async () => {
      // Step 1: Fetch trending tokens
      server.use(
        http.get('/api/v1/tokens/trending', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse([
              {
                ...global.mockToken,
                id: 'trending-1',
                name: 'Trending Token',
                ticker: 'TREND',
                mentions: 250,
                socialScore: 90,
              },
              {
                ...global.mockToken,
                id: 'trending-2',
                name: 'Hot Token',
                ticker: 'HOT',
                mentions: 180,
                socialScore: 75,
              }
            ])),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const trendingResponse = await fetch('/api/v1/tokens/trending');
      const trendingData = await trendingResponse.json();

      expect(trendingResponse.ok).toBe(true);
      expect(trendingData.data).toHaveLength(2);

      // Step 2: Search for specific token
      const searchTerm = 'Trending Token';
      server.use(
        http.get('/api/v1/tokens/search', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse([
              {
                ...global.mockToken,
                id: 'search-1',
                name: 'Trending Token',
                ticker: 'TREND',
                description: 'A trending token with high social engagement',
              }
            ])),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const searchResponse = await fetch(`/api/v1/tokens/search?q=${encodeURIComponent(searchTerm)}`);
      const searchData = await searchResponse.json();

      expect(searchResponse.ok).toBe(true);
      expect(searchData.data).toHaveLength(1);
      expect(searchData.data[0].name).toBe(searchTerm);

      // Step 3: View token details
      const tokenId = 'search-1';
      server.use(
        http.get(`/api/v1/tokens/${tokenId}`, () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              ...global.mockToken,
              id: tokenId,
              name: 'Trending Token',
              ticker: 'TREND',
              analytics: {
                views: 1250,
                favorites: 89,
                trades24h: 45,
                volume24h: '25000',
                priceHistory: [
                  { time: Date.now() - 3600000, price: 0.08 },
                  { time: Date.now() - 1800000, price: 0.09 },
                  { time: Date.now() - 900000, price: 0.10 },
                  { time: Date.now(), price: 0.11 },
                ],
              },
            })),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const detailsResponse = await fetch(`/api/v1/tokens/${tokenId}`);
      const detailsData = await detailsResponse.json();

      expect(detailsResponse.ok).toBe(true);
      expect(detailsData.data.name).toBe('Trending Token');
      expect(detailsData.data.analytics).toBeDefined();
      expect(detailsData.data.analytics.priceHistory).toHaveLength(4);

      // Step 4: Check token creator information
      const creatorAddress = detailsData.data.creatorAddress;
      server.use(
        http.get(`/api/v1/users/${creatorAddress}`, () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              address: creatorAddress,
              username: 'trending_creator',
              displayName: 'Trending Creator',
              avatar: 'https://example.com/avatar.jpg',
              verified: true,
              createdTokens: 5,
              successfulTokens: 3,
              reputation: 4.8,
            })),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const creatorResponse = await fetch(`/api/v1/users/${creatorAddress}`);
      const creatorData = await creatorResponse.json();

      expect(creatorResponse.ok).toBe(true);
      expect(creatorData.data.username).toBe('trending_creator');
      expect(creatorData.data.verified).toBe(true);
    });

    it('should handle token discovery with no results', async () => {
      // Mock empty search results
      server.use(
        http.get('/api/v1/tokens/search', () => {
          return new Response(
            JSON.stringify(global.createMockPagination([], 1, 10, 0)),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/tokens/search?q=nonexistent');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(0);
      expect(data.pagination.total).toBe(0);
    });
  });

  describe('Trading Workflow', () => {
    beforeEach(() => {
      // Setup mock user session
      global.ethereum = {
        request: jest.fn().mockResolvedValue([{ address: global.mockUserSession.address }]),
        isMetaMask: true,
        isConnected: true,
      };
    });

    it('should complete trading workflow for token purchase', async () => {
      const tokenId = 'trade-token-1';
      const purchaseAmount = 1000; // 1000 BNB

      // Step 1: Get current price
      server.use(
        http.get(`/api/v1/tokens/${tokenId}/price`, () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              price: 0.15,
              receiveAmount: 6666.67,
              impact: 0.05,
              liquidity: 50000,
            })),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const priceResponse = await fetch(`/api/v1/tokens/${tokenId}/price`);
      const priceData = await priceResponse.json();

      expect(priceResponse.ok).toBe(true);
      expect(priceData.data.price).toBe(0.15);
      expect(priceData.data.receiveAmount).toBeGreaterThan(0);

      // Step 2: Simulate wallet connection and approval
      const mockWalletResponse = {
        success: true,
        allowance: '10000',
        balance: '10.5',
      };

      server.use(
        http.post('/api/v1/wallet/approve', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse(mockWalletResponse)),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const approvalResponse = await fetch('/api/v1/wallet/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenId,
          amount: purchaseAmount,
        }),
      });

      const approvalData = await approvalResponse.json();
      expect(approvalResponse.ok).toBe(true);
      expect(approvalData.data.success).toBe(true);

      // Step 3: Execute trade
      server.use(
        http.post('/api/v1/trades/buy', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
              from: global.mockUserSession.address,
              to: global.mockToken.contractAddress,
              amount: purchaseAmount,
              tokenAmount: priceData.data.receiveAmount,
              price: priceData.data.price,
              gasUsed: '21000',
              gasPrice: '20',
              blockNumber: 12345678,
              timestamp: Date.now(),
            })),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const tradeResponse = await fetch('/api/v1/trades/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenId,
          amount: purchaseAmount,
        }),
      });

      const tradeData = await tradeResponse.json();
      expect(tradeResponse.ok).toBe(true);
      expect(tradeData.data.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(tradeData.data.from).toBe(global.mockUserSession.address);
      expect(tradeData.data.amount).toBe(purchaseAmount);

      // Step 4: Verify updated user portfolio
      server.use(
        http.get(`/api/v1/users/${global.mockUserSession.address}/portfolio`, () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse([
              {
                token: global.mockToken,
                amount: priceData.data.receiveAmount,
                value: String(parseFloat(priceData.data.receiveAmount) * priceData.data.price),
                acquiredAt: new Date().toISOString(),
              }
            ])),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const portfolioResponse = await fetch(`/api/v1/users/${global.mockUserSession.address}/portfolio`);
      const portfolioData = await portfolioResponse.json();

      expect(portfolioResponse.ok).toBe(true);
      expect(portfolioData.data).toHaveLength(1);
      expect(portfolioData.data[0].amount).toBe(priceData.data.receiveAmount);
    });

    it('should handle trading workflow with insufficient balance', async () => {
      const tokenId = 'trade-token-2';
      const purchaseAmount = 10000; // More than user balance

      // Mock insufficient balance response
      server.use(
        http.post('/api/v1/wallet/approve', () => {
          return new Response(
            JSON.stringify(global.createMockErrorResponse('Insufficient balance', 400)),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/wallet/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenId,
          amount: purchaseAmount,
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient balance');
    });

    it('should handle trading workflow with network error', async () => {
      const tokenId = 'trade-token-3';
      const purchaseAmount = 1000;

      // Mock network error
      server.use(
        http.post('/api/v1/trades/buy', () => {
          return new Response(
            JSON.stringify(global.createMockErrorResponse('Network error', 500)),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/trades/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: tokenId,
          amount: purchaseAmount,
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Network error');
    });
  });

  describe('Analytics Dashboard Workflow', () => {
    it('should load complete analytics dashboard', async () => {
      // Mock all required analytics data
      server.use(
        http.get('/api/v1/analytics', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              totalTokens: 1250,
              totalMarketCap: '5000000',
              totalVolume24h: '2500000',
              activeUsers: 5000,
              trades24h: 1250,
              newUsers24h: 150,
              topGainers: [
                { name: 'Moon Token', ticker: 'MOON', priceChange: 45.2 },
                { name: 'Star Token', ticker: 'STAR', priceChange: 32.1 },
              ],
              topLosers: [
                { name: 'Crash Token', ticker: 'CRASH', priceChange: -28.5 },
                { name: 'Fall Token', ticker: 'FALL', priceChange: -15.3 },
              ],
              recentActivity: [
                { type: 'trade', token: 'Moon Token', amount: 500 },
                { type: 'favorite', token: 'Star Token', user: '0x123' },
                { type: 'trade', token: 'Crash Token', amount: 200 },
              ],
            })),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const analyticsResponse = await fetch('/api/v1/analytics');
      const analyticsData = await analyticsResponse.json();

      expect(analyticsResponse.ok).toBe(true);
      expect(analyticsData.data.totalTokens).toBe(1250);
      expect(analyticsData.data.topGainers).toHaveLength(2);
      expect(analyticsData.data.topLosers).toHaveLength(2);
      expect(analyticsData.data.recentActivity).toHaveLength(3);

      // Verify top gainers
      const topGainer = analyticsData.data.topGainers[0];
      expect(topGainer.priceChange).toBe(45.2);
      expect(topGainer.name).toBe('Moon Token');

      // Verify top losers
      const topLoser = analyticsData.data.topLosers[0];
      expect(topLoser.priceChange).toBe(-28.5);
      expect(topLoser.name).toBe('Crash Token');

      // Verify activity types
      const activityTypes = analyticsData.data.recentActivity.map(activity => activity.type);
      expect(activityTypes).toContain('trade');
      expect(activityTypes).toContain('favorite');
    });

    it('should handle analytics with no data', async () => {
      server.use(
        http.get('/api/v1/analytics', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              totalTokens: 0,
              totalMarketCap: '0',
              totalVolume24h: '0',
              activeUsers: 0,
              trades24h: 0,
              newUsers24h: 0,
              topGainers: [],
              topLosers: [],
              recentActivity: [],
            })),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/analytics');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.totalTokens).toBe(0);
      expect(data.data.topGainers).toHaveLength(0);
      expect(data.data.recentActivity).toHaveLength(0);
    });
  });

  describe('User Profile Management Workflow', () => {
    const userAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

    it('should complete user profile setup workflow', async () => {
      // Step 1: Create user profile
      const profileData = {
        username: 'testuser',
        displayName: 'Test User',
        bio: 'A test user description',
        avatar: 'https://example.com/avatar.jpg',
      };

      server.use(
        http.post('/api/v1/users', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              address: userAddress,
              ...profileData,
              createdAt: new Date().toISOString(),
              verified: false,
            })),
            {
              status: 201,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const createResponse = await fetch('/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const createData = await createResponse.json();
      expect(createResponse.status).toBe(201);
      expect(createData.data.username).toBe('testuser');
      expect(createData.data.displayName).toBe('Test User');

      // Step 2: Set favorite tokens
      const favoriteTokens = ['token-1', 'token-2', 'token-3'];

      server.use(
        http.put(`/api/v1/users/${userAddress}/favorites`, () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({ success: true })),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const favoritesResponse = await fetch(`/api/v1/users/${userAddress}/favorites`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokens: favoriteTokens }),
      });

      expect(favoritesResponse.ok).toBe(true);
      const favoritesData = await favoritesResponse.json();
      expect(favoritesData.data.success).toBe(true);

      // Step 3: Upload avatar
      const avatarData = new FormData();
      avatarData.append('avatar', new Blob(['avatar-image-data'], { type: 'image/jpeg' }));

      server.use(
        http.post(`/api/v1/users/${userAddress}/avatar`, () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              avatarUrl: 'https://example.com/new-avatar.jpg',
              uploadTime: new Date().toISOString(),
            })),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const avatarResponse = await fetch(`/api/v1/users/${userAddress}/avatar`, {
        method: 'POST',
        body: avatarData,
      });

      const avatarResult = await avatarResponse.json();
      expect(avatarResponse.ok).toBe(true);
      expect(avatarResult.data.avatarUrl).toContain('new-avatar.jpg');

      // Step 4: Verify complete profile
      server.use(
        http.get(`/api/v1/users/${userAddress}`, () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              address: userAddress,
              ...profileData,
              avatarUrl: 'https://example.com/new-avatar.jpg',
              favorites: favoriteTokens,
              createdAt: createData.data.createdAt,
              verified: false,
              stats: {
                tokensCreated: 0,
                tokensTraded: 15,
                totalVolume: '5000',
              },
            })),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const profileResponse = await fetch(`/api/v1/users/${userAddress}`);
      const profileDataResult = await profileResponse.json();

      expect(profileResponse.ok).toBe(true);
      expect(profileDataResult.data.username).toBe('testuser');
      expect(profileDataResult.data.favorites).toEqual(favoriteTokens);
      expect(profileDataResult.data.avatarUrl).toContain('new-avatar.jpg');
      expect(profileDataResult.data.stats).toBeDefined();
    });

    it('should handle profile updates', async () => {
      const updateData = {
        displayName: 'Updated Test User',
        bio: 'Updated bio description',
      };

      server.use(
        http.put(`/api/v1/users/${userAddress}`, () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              ...global.mockUserSession,
              ...updateData,
              updatedAt: new Date().toISOString(),
            })),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch(`/api/v1/users/${userAddress}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      expect(response.ok).toBe(true);
      expect(data.data.displayName).toBe('Updated Test User');
      expect(data.data.bio).toBe('Updated bio description');
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle API timeout with retry mechanism', async () => {
      let callCount = 0;
      server.use(
        http.get('/api/v1/tokens', () => {
          callCount++;
          if (callCount < 3) {
            // Simulate timeout with slow response
            return new Response(
              JSON.stringify(global.createMockErrorResponse('Request timeout', 408)),
              {
                status: 408,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
          }
          return new Response(
            JSON.stringify(global.createMockPagination([global.mockToken])),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      // Implement retry logic
      const fetchWithRetry = async (url: string, retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              return response;
            }
          } catch (error) {
            if (i === retries - 1) throw error;
            await global.wait(1000); // Wait before retry
          }
        }
        throw new Error('Max retries exceeded');
      };

      const response = await fetchWithRetry('/api/v1/tokens');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(callCount).toBe(3);
    });

    it('should handle rate limiting gracefully', async () => {
      let requestCount = 0;

      server.use(
        http.get('/api/v1/tokens', () => {
          requestCount++;
          if (requestCount > 5) {
            return new Response(
              JSON.stringify(global.createMockErrorResponse('Rate limit exceeded', 429)),
              {
                status: 429,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
          }
          return new Response(
            JSON.stringify(global.createMockPagination([global.mockToken])),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      // Make multiple requests to trigger rate limit
      const requests = Array(10).fill(null).map(() => fetch('/api/v1/tokens'));
      const responses = await Promise.allSettled(requests);

      // Check that some requests failed due to rate limiting
      const failedRequests = responses.filter((r: any) => r.value?.status === 429);
      const successfulRequests = responses.filter((r: any) => r.value?.status === 200);

      expect(failedRequests.length).toBeGreaterThan(0);
      expect(successfulRequests.length).toBe(5);
    });
  });

  describe('Real-time Updates Workflow', () => {
    it('should handle WebSocket price updates', async () => {
      // Mock WebSocket connection
      const mockWebSocket = jest.fn();
      global.WebSocket = mockWebSocket;

      // Simulate price update event
      const priceUpdate = {
        tokenAddress: global.mockToken.contractAddress,
        price: 0.12,
        priceChange: 15.5,
        timestamp: Date.now(),
      };

      // Mock server-sent events
      const mockEventSource = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
      };

      global.EventSource = jest.fn().mockImplementation((url) => {
        setTimeout(() => {
          // Check if there are any calls before trying to access them
          if (mockEventSource.addEventListener.mock.calls.length > 0) {
            mockEventSource.addEventListener.mock.calls[0][1]({
              data: JSON.stringify(priceUpdate),
            });
          }
        }, 100);
        return mockEventSource;
      });

      // Connect to price updates
      const eventSource = new EventSource('/api/v1/price-updates');
      // The EventSource constructor was called, which triggers the mock
      expect(global.EventSource).toHaveBeenCalledWith('/api/v1/price-updates');

      // Verify price update processing
      const mockPriceCallback = jest.fn();
      eventSource.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        mockPriceCallback(data);
      });

      await global.wait(200);
      expect(mockPriceCallback).toHaveBeenCalledWith(priceUpdate);
    });

    it('should handle real-time notification updates', async () => {
      // Mock notification service
      const notifications = [];
      const mockNotificationService = {
        subscribe: (callback: any) => {
          setTimeout(() => {
            callback({
              type: 'trade',
              message: 'New trade executed for TEST',
              data: {
                amount: 1000,
                price: 0.15,
                hash: '0x1234567890',
              },
            });
          }, 100);
        },
      };

      mockNotificationService.subscribe((notification: any) => {
        notifications.push(notification);
      });

      await global.wait(200);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('trade');
      expect(notifications[0].message).toBe('New trade executed for TEST');
    });
  });
});