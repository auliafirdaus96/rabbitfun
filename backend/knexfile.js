require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      connectionString: process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ahiru_dev',
      ssl: false
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },

  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  test: {
    client: 'pg',
    connection: {
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ahiru_test'
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    }
  }
};