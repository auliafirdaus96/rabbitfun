/**
 * API Integration Tests
 * Tests for API integration and data flow
 */

require('./setupIntegrationTests.cjs');
const { http } = require('../mocks/server.cjs');
const { server } = require('../mocks/server.cjs');

describe('API Integration Tests', () => {
  describe('Token API Integration', () => {
    it('should fetch and display token list', async () => {
      // Mock API response using MSW v2
      server.use(
        http.get('/api/v1/tokens', () => {
          return new Response(
            JSON.stringify(global.createMockPagination([
              global.mockToken,
              {
                ...global.mockToken,
                id: '2',
                name: 'Second Token',
                ticker: 'SECOND',
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

      // Simulate API call
      const response = await fetch('/api/v1/tokens');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.total).toBe(2);
    });

    it('should handle API errors gracefully', async () => {
      server.use(
        http.get('/api/v1/tokens', () => {
          return new Response(
            JSON.stringify(global.createMockErrorResponse('Internal server error', 500)),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/tokens');
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should fetch single token details', async () => {
      const tokenAddress = '0x1234567890123456789012345678901234567890';

      server.use(
        http.get(`/api/v1/tokens/${tokenAddress}`, () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse(global.mockToken)),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch(`/api/v1/tokens/${tokenAddress}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toEqual(global.mockToken);
    });

    it('should handle token creation', async () => {
      const newTokenData = {
        name: 'New Test Token',
        ticker: 'NEW',
        description: 'A new test token',
        imageUrl: 'https://example.com/new-token.png',
      };

      server.use(
        http.post('/api/v1/tokens', async ({ request }) => {
          const body = await request.json() as any;
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              ...global.mockToken,
              ...body,
              id: 'new-token-id',
              createdAt: new Date().toISOString(),
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

      const response = await fetch('/api/v1/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTokenData),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(newTokenData.name);
      expect(data.data.ticker).toBe(newTokenData.ticker);
    });

    it('should validate token creation data', async () => {
      const invalidTokenData = {
        name: '', // Invalid: empty name
        ticker: 'TOO_LONG_SYMBOL_NAME', // Invalid: too long
      };

      server.use(
        http.post('/api/v1/tokens', () => {
          return new Response(
            JSON.stringify(global.createMockErrorResponse('Invalid token data')),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidTokenData),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid token data');
    });
  });

  describe('Analytics API Integration', () => {
    it('should fetch analytics data', async () => {
      server.use(
        http.get('/api/v1/analytics', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse(global.mockAnalytics)),
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
      expect(data.data.totalTokens).toBe(150);
      expect(data.data.totalVolume24h).toBe('500000');
      expect(data.data.activeUsers).toBe(2500);
    });

    it('should fetch trending tokens', async () => {
      server.use(
        http.get('/api/v1/tokens/trending', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse(global.mockAnalytics.trendingTokens)),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/tokens/trending');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].mentions).toBe(150);
      expect(data.data[0].socialScore).toBe(85);
    });

    it('should fetch top gainers', async () => {
      server.use(
        http.get('/api/v1/tokens/gainers', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse(global.mockAnalytics.topGainers)),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/tokens/gainers');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data[0].priceChange).toBe(45.5);
      expect(data.data[0].ticker).toBe('GAIN');
    });

    it('should fetch top losers', async () => {
      server.use(
        http.get('/api/v1/tokens/losers', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse(global.mockAnalytics.topLosers)),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/tokens/losers');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data[0].priceChange).toBe(-32.1);
      expect(data.data[0].ticker).toBe('LOSE');
    });
  });

  describe('User API Integration', () => {
    it('should fetch user profile', async () => {
      const userAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      server.use(
        http.get(`/api/v1/users/${userAddress}`, () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              ...global.mockUserSession,
              portfolio: [
                {
                  token: global.mockToken,
                  amount: 1000,
                  value: '100',
                }
              ],
              favorites: [global.mockToken.id],
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

      const response = await fetch(`/api/v1/users/${userAddress}`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data.address).toBe(userAddress);
      expect(data.data.portfolio).toHaveLength(1);
      expect(data.data.favorites).toContain(global.mockToken.id);
    });

    it('should update user favorites', async () => {
      const userAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const tokenId = '1';

      server.use(
        http.post(`/api/v1/users/${userAddress}/favorites`, () => {
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

      const response = await fetch(`/api/v1/users/${userAddress}/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tokenId }),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });

    it('should remove from user favorites', async () => {
      const userAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
      const tokenId = '1';

      server.use(
        http.delete(`/api/v1/users/${userAddress}/favorites/${tokenId}`, () => {
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

      const response = await fetch(`/api/v1/users/${userAddress}/favorites/${tokenId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });
  });

  describe('Pagination Integration', () => {
    it('should handle paginated results', async () => {
      const pageSize = 10;
      const allTokens = Array.from({ length: 25 }, (_, i) => ({
        ...global.mockToken,
        id: `token-${i}`,
        name: `Token ${i + 1}`,
      }));

      server.use(
        http.get('/api/v1/tokens', ({ request }) => {
          const url = new URL(request.url);
          const page = parseInt(url.searchParams.get('page') || '1');
          const start = (page - 1) * pageSize;
          const end = start + pageSize;
          const paginatedTokens = allTokens.slice(start, end);

          return new Response(
            JSON.stringify(global.createMockPagination(paginatedTokens, page, pageSize, allTokens.length)),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      // Test first page
      const response1 = await fetch('/api/v1/tokens?page=1');
      const data1 = await response1.json();

      expect(response1.ok).toBe(true);
      expect(data1.data).toHaveLength(10);
      expect(data1.pagination.page).toBe(1);
      expect(data1.pagination.hasNext).toBe(true);
      expect(data1.pagination.hasPrev).toBe(false);

      // Test second page
      const response2 = await fetch('/api/v1/tokens?page=2');
      const data2 = await response2.json();

      expect(response2.ok).toBe(true);
      expect(data2.data).toHaveLength(10);
      expect(data2.pagination.page).toBe(2);
      expect(data2.pagination.hasNext).toBe(true);
      expect(data2.pagination.hasPrev).toBe(true);

      // Test last page
      const response3 = await fetch('/api/v1/tokens?page=3');
      const data3 = await response3.json();

      expect(response3.ok).toBe(true);
      expect(data3.data).toHaveLength(5);
      expect(data3.pagination.page).toBe(3);
      expect(data3.pagination.hasNext).toBe(false);
      expect(data3.pagination.hasPrev).toBe(true);
    });

    it('should handle invalid page numbers', async () => {
      server.use(
        http.get('/api/v1/tokens', () => {
          return new Response(
            JSON.stringify(global.createMockErrorResponse('Invalid page number')),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/tokens?page=0');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid page number');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle server errors', async () => {
      server.use(
        http.get('/api/v1/tokens', () => {
          return new Response(
            JSON.stringify(global.createMockErrorResponse('Service unavailable', 503)),
            {
              status: 503,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/tokens');
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Service unavailable');
    });

    it('should handle malformed JSON responses', async () => {
      server.use(
        http.get('/api/v1/tokens', () => {
          return new Response(
            '{"invalid": json}', // Malformed JSON
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      const response = await fetch('/api/v1/tokens');

      expect(response.ok).toBe(true);
      // This should throw when trying to parse JSON
      await expect(response.json()).rejects.toThrow();
    });
  });

  describe('Authentication Integration', () => {
    it('should handle authenticated requests', async () => {
      const authToken = 'mock-jwt-token';

      server.use(
        http.get('/api/v1/user/profile', ({ request }) => {
          const authHeader = request.headers.get('Authorization');

          if (!authHeader || !authHeader.includes('Bearer ')) {
            return new Response(
              JSON.stringify(global.createMockErrorResponse('Unauthorized')),
              {
                status: 401,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
          }

          return new Response(
            JSON.stringify(global.createMockApiResponse(global.mockUserSession)),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      // Test without auth header
      const response1 = await fetch('/api/v1/user/profile');
      const data1 = await response1.json();
      expect(response1.status).toBe(401);
      expect(data1.success).toBe(false);

      // Test with auth header
      const response2 = await fetch('/api/v1/user/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      const data2 = await response2.json();
      expect(response2.ok).toBe(true);
      expect(data2.data.address).toBe(global.mockUserSession.address);
    });

    it('should handle token refresh', async () => {
      const expiredToken = 'expired-jwt-token';
      const newToken = 'new-jwt-token';

      server.use(
        http.get('/api/v1/user/profile', ({ request }) => {
          const authHeader = request.headers.get('Authorization');

          if (authHeader === `Bearer ${expiredToken}`) {
            return new Response(
              JSON.stringify({
                error: 'Token expired',
                needsRefresh: true,
              }),
              {
                status: 401,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
          }

          if (authHeader === `Bearer ${newToken}`) {
            return new Response(
              JSON.stringify(global.createMockApiResponse(global.mockUserSession)),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
          }

          return new Response(
            JSON.stringify(global.createMockErrorResponse('Unauthorized')),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        })
      );

      server.use(
        http.post('/api/v1/auth/refresh', () => {
          return new Response(
            JSON.stringify(global.createMockApiResponse({
              token: newToken,
              expiresIn: 3600,
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

      // Test with expired token
      const response1 = await fetch('/api/v1/user/profile', {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });
      const data1 = await response1.json();
      expect(response1.status).toBe(401);
      expect(data1.needsRefresh).toBe(true);

      // Test token refresh
      const refreshResponse = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });
      const refreshData = await refreshResponse.json();
      expect(refreshResponse.ok).toBe(true);
      expect(refreshData.data.token).toBe(newToken);

      // Test with new token
      const response2 = await fetch('/api/v1/user/profile', {
        headers: {
          'Authorization': `Bearer ${newToken}`,
        },
      });
      const data2 = await response2.json();
      expect(response2.ok).toBe(true);
      expect(data2.data.address).toBe(global.mockUserSession.address);
    });
  });
});