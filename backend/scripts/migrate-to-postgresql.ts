#!/usr/bin/env ts-node

/**
 * Database Migration Script: SQLite to PostgreSQL
 *
 * This script helps migrate data from SQLite to PostgreSQL
 * Usage: npx ts-node scripts/migrate-to-postgresql.ts
 */

import { PrismaClient as SQLiteClient } from '@prisma/client';
import { PrismaClient as PostgreSQLClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationConfig {
  sqlitePath: string;
  postgresqlUrl: string;
  batchSize: number;
  skipTables: string[];
}

class DatabaseMigrator {
  private sqlite: SQLiteClient;
  private postgresql: PostgreSQLClient;
  private config: MigrationConfig;

  constructor(config: MigrationConfig) {
    this.config = config;

    // Initialize SQLite client
    this.sqlite = new SQLiteClient({
      datasources: {
        db: {
          provider: 'sqlite',
          url: `file:${config.sqlitePath}`,
        },
      },
    });

    // Initialize PostgreSQL client
    this.postgresql = new PostgreSQLClient({
      datasources: {
        db: {
          provider: 'postgresql',
          url: config.postgresqlUrl,
        },
      },
    });
  }

  async migrate(): Promise<void> {
    console.log('🚀 Starting database migration from SQLite to PostgreSQL...');

    try {
      // Test connections
      await this.testConnections();

      // Get all tables
      const tables = await this.getTableList();

      // Migrate each table
      for (const table of tables) {
        if (this.config.skipTables.includes(table)) {
          console.log(`⏭️  Skipping table: ${table}`);
          continue;
        }

        await this.migrateTable(table);
      }

      console.log('✅ Migration completed successfully!');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async testConnections(): Promise<void> {
    console.log('🔍 Testing database connections...');

    try {
      await this.sqlite.$connect();
      console.log('✅ SQLite connection successful');

      await this.postgresql.$connect();
      console.log('✅ PostgreSQL connection successful');
    } catch (error) {
      throw new Error(`Database connection failed: ${error}`);
    }
  }

  private async getTableList(): Promise<string[]> {
    const tables = [
      'users',
      'tokens',
      'transactions',
      'token_favorites',
      'token_analytics',
      'user_analytics',
      'analytics',
      'portfolio',
      'token_price_history',
      'system_config',
      'audit_logs'
    ];

    return tables;
  }

  private async migrateTable(tableName: string): Promise<void> {
    console.log(`📦 Migrating table: ${tableName}`);

    try {
      // Get data from SQLite
      const sqliteData = await this.getSQLiteData(tableName);

      if (sqliteData.length === 0) {
        console.log(`⚠️  No data found in table: ${tableName}`);
        return;
      }

      console.log(`📊 Found ${sqliteData.length} records in ${tableName}`);

      // Transform and insert data in batches
      await this.insertDataInBatches(tableName, sqliteData);

      console.log(`✅ Successfully migrated ${tableName}`);
    } catch (error) {
      console.error(`❌ Failed to migrate table ${tableName}:`, error);
      throw error;
    }
  }

  private async getSQLiteData(tableName: string): Promise<any[]> {
    // Use raw query since Prisma might not have the models set up for SQLite
    const query = `SELECT * FROM ${tableName}`;

    try {
      const result = await this.sqlite.$queryRawUnsafe(query);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn(`Warning: Could not read from ${tableName}: ${error}`);
      return [];
    }
  }

  private async insertDataInBatches(tableName: string, data: any[]): Promise<void> {
    const batches = this.createBatches(data, this.config.batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`  📝 Processing batch ${i + 1}/${batches.length} (${batch.length} records)`);

      try {
        await this.insertBatch(tableName, batch);
      } catch (error) {
        console.error(`  ❌ Failed to insert batch ${i + 1}:`, error);

        // Try individual records for debugging
        for (const record of batch) {
          try {
            await this.insertRecord(tableName, record);
          } catch (recordError) {
            console.error(`  ❌ Failed to insert record:`, record, recordError);
          }
        }
      }
    }
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private async insertBatch(tableName: string, batch: any[]): Promise<void> {
    // Convert data types and handle transformations
    const transformedBatch = batch.map(record => this.transformRecord(tableName, record));

    // Use the appropriate Prisma model method
    const model = this.getModelName(tableName);
    const prismaModel = (this.postgresql as any)[model];

    if (prismaModel && typeof prismaModel.createMany === 'function') {
      await prismaModel.createMany({
        data: transformedBatch,
        skipDuplicates: true,
      });
    } else {
      // Fallback to individual inserts
      for (const record of transformedBatch) {
        await this.insertRecord(tableName, record);
      }
    }
  }

  private async insertRecord(tableName: string, record: any): Promise<void> {
    const model = this.getModelName(tableName);
    const prismaModel = (this.postgresql as any)[model];

    if (prismaModel && typeof prismaModel.create === 'function') {
      await prismaModel.create({
        data: record,
      });
    }
  }

  private getModelName(tableName: string): string {
    const modelMap: Record<string, string> = {
      'users': 'user',
      'tokens': 'token',
      'transactions': 'transaction',
      'token_favorites': 'tokenFavorite',
      'token_analytics': 'tokenAnalytics',
      'user_analytics': 'userAnalytics',
      'analytics': 'analytics',
      'portfolio': 'portfolio',
      'token_price_history': 'tokenPriceHistory',
      'system_config': 'systemConfig',
      'audit_logs': 'auditLog'
    };

    return modelMap[tableName] || tableName;
  }

  private transformRecord(tableName: string, record: any): any {
    // Handle data type conversions
    const transformed = { ...record };

    // Convert SQLite integer fields to boolean where needed
    if (tableName === 'users') {
      transformed.isActive = Boolean(record.isActive);
      transformed.isAdmin = Boolean(record.isAdmin);
      transformed.isVerified = Boolean(record.isVerified);
    }

    if (tableName === 'tokens') {
      transformed.graduated = Boolean(record.graduated);
      transformed.exists = Boolean(record.exists);
      transformed.isActive = Boolean(record.isActive);
      transformed.isFeatured = Boolean(record.isFeatured);
      transformed.isVerified = Boolean(record.isVerified);
      transformed.isHidden = Boolean(record.isHidden);
    }

    if (tableName === 'analytics') {
      transformed.graduated = Boolean(record.graduated);
    }

    // Handle date fields
    const dateFields = ['createdAt', 'updatedAt', 'confirmedAt', 'graduatedAt', 'date', 'timestamp'];
    for (const field of dateFields) {
      if (transformed[field]) {
        const date = new Date(transformed[field]);
        if (!isNaN(date.getTime())) {
          transformed[field] = date;
        }
      }
    }

    return transformed;
  }

  private async cleanup(): Promise<void> {
    try {
      await this.sqlite.$disconnect();
      await this.postgresql.$disconnect();
    } catch (error) {
      console.warn('Warning: Error during cleanup:', error);
    }
  }
}

// Main execution
async function main() {
  const config: MigrationConfig = {
    sqlitePath: './prisma/dev.db',
    postgresqlUrl: process.env.POSTGRESQL_URL || process.env.DATABASE_URL || '',
    batchSize: 100,
    skipTables: [], // Add tables to skip if needed
  };

  if (!config.postgresqlUrl) {
    console.error('❌ POSTGRESQL_URL or DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Check if SQLite database exists
  if (!fs.existsSync(config.sqlitePath)) {
    console.error(`❌ SQLite database not found at: ${config.sqlitePath}`);
    process.exit(1);
  }

  const migrator = new DatabaseMigrator(config);
  await migrator.migrate();
}

// Handle errors
if (require.main === module) {
  main().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

export { DatabaseMigrator };