// Mock database for development without PostgreSQL
class MockDatabase {
  constructor() {
    this.tokens = new Map();
    this.transactions = new Map();
    this.users = new Map();
    this.initializeData();
  }

  initializeData() {
    // Empty array - all dummy tokens have been removed
    const mockTokens = [];

    mockTokens.forEach(token => {
      this.tokens.set(token.address, token);
    });
  }

  // Token methods
  async getTokens() {
    return Array.from(this.tokens.values());
  }

  async getTokenByAddress(address) {
    return this.tokens.get(address) || null;
  }

  async createToken(tokenData) {
    const token = {
      ...tokenData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.tokens.set(token.address, token);
    return token;
  }

  async updateToken(address, updates) {
    const token = this.tokens.get(address);
    if (!token) return null;

    const updatedToken = {
      ...token,
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.tokens.set(address, updatedToken);
    return updatedToken;
  }

  // Transaction methods
  async createTransaction(transactionData) {
    const transaction = {
      ...transactionData,
      timestamp: new Date().toISOString()
    };
    this.transactions.set(transaction.hash, transaction);
    return transaction;
  }

  async getTransactionsByToken(tokenAddress, limit = 10) {
    const transactions = Array.from(this.transactions.values())
      .filter(tx => tx.token_address === tokenAddress)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
    return transactions;
  }

  // User methods
  async getUserByAddress(address) {
    return this.users.get(address) || null;
  }

  async createUser(userData) {
    const user = {
      ...userData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.set(user.address, user);
    return user;
  }

  // Raw query method (mock)
  async raw(query) {
    console.log('Mock query executed:', query);
    if (query.includes('version()')) {
      return { rows: [{ version: 'PostgreSQL 15.0 (Mock)' }] };
    }
    if (query.includes('information_schema.tables')) {
      return { rows: [{ table_name: 'tokens' }, { table_name: 'transactions' }, { table_name: 'users' }] };
    }
    return { rows: [] };
  }
}

const mockDb = new MockDatabase();

module.exports = {
  db: mockDb,
  testConnection: async () => {
    console.log('✅ Mock database connected successfully');
    return true;
  },
  closeConnection: async () => {
    console.log('📀 Mock database connection closed');
  }
};