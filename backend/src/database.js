const knex = require('knex');
const knexConfig = require('../knexfile');

let db = null;
let testConnectionFn = null;
let closeConnectionFn = null;

// Use mock database for development
console.log('⚠️  Using mock database for development...');
const mockDb = require('./mock-database');
db = mockDb.db;
testConnectionFn = mockDb.testConnection;
closeConnectionFn = mockDb.closeConnection;

// Test database connection
async function testConnection() {
  if (testConnectionFn) {
    return await testConnectionFn();
  }
  return false;
}

// Graceful shutdown
async function closeConnection() {
  if (closeConnectionFn) {
    await closeConnectionFn();
  }
}

module.exports = {
  db,
  testConnection,
  closeConnection
};