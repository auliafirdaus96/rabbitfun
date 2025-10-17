#!/usr/bin/env ts-node

/**
 * Migration Verification Script
 *
 * This script verifies the integrity of data migration from SQLite to PostgreSQL
 * Usage: npx ts-node scripts/verify-migration.ts
 */

import { PrismaClient as SQLiteClient } from '@prisma/client';
import { PrismaClient as PostgreSQLClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  tableName: string;
  sqliteCount: number;
  postgresCount: number;
  isMatch: boolean;
  sampleData?: any[];
}

interface MigrationReport {
  totalTables: number;
  passedTables: number;
  failedTables: number;
  totalRecords: {
    sqlite: number;
    postgres: number;
  };
  tables: VerificationResult[];
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  timestamp: string;
}

class MigrationVerifier {
  private sqlite: SQLiteClient;
  private postgresql: PostgreSQLClient;
  private sqlitePath: string;
  private postgresUrl: string;

  constructor(sqlitePath: string, postgresUrl: string) {
    this.sqlitePath = sqlitePath;
    this.postgresUrl = postgresUrl;

    // Initialize SQLite client
    this.sqlite = new SQLiteClient({
      datasources: {
        db: {
          provider: 'sqlite',
          url: `file:${sqlitePath}`,
        },
      },
    });

    // Initialize PostgreSQL client
    this.postgresql = new PostgreSQLClient({
      datasources: {
        db: {
          provider: 'postgresql',
          url: postgresUrl,
        },
      },
    });
  }

  async verify(): Promise<MigrationReport> {
    console.log('🔍 Starting migration verification...');

    const report: MigrationReport = {
      totalTables: 0,
      passedTables: 0,
      failedTables: 0,
      totalRecords: {
        sqlite: 0,
        postgres: 0,
      },
      tables: [],
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
    };

    try {
      await this.sqlite.$connect();
      await this.postgresql.$connect();
      console.log('✅ Database connections established');

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

      report.totalTables = tables.length;

      for (const tableName of tables) {
        console.log(`📊 Verifying table: ${tableName}`);
        const result = await this.verifyTable(tableName);
        report.tables.push(result);

        if (result.isMatch) {
          report.passedTables++;
          console.log(`✅ ${tableName}: ${result.sqliteCount} records`);
        } else {
          report.failedTables++;
          console.log(`❌ ${tableName}: SQLite(${result.sqliteCount}) != PostgreSQL(${result.postgresCount})`);
        }

        report.totalRecords.sqlite += result.sqliteCount;
        report.totalRecords.postgres += result.postgresCount;
      }

      // Determine overall status
      if (report.failedTables === 0) {
        report.status = 'SUCCESS';
      } else if (report.passedTables > 0) {
        report.status = 'PARTIAL';
      } else {
        report.status = 'FAILED';
      }

    } catch (error) {
      console.error('❌ Verification failed:', error);
      report.status = 'FAILED';
    } finally {
      await this.sqlite.$disconnect();
      await this.postgresql.$disconnect();
    }

    return report;
  }

  private async verifyTable(tableName: string): Promise<VerificationResult> {
    let sqliteCount = 0;
    let postgresCount = 0;
    let sampleData: any[] = [];

    try {
      // Count SQLite records
      const sqliteResult = await this.sqlite.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
      sqliteCount = Number((sqliteResult as any)[0]?.count || 0);

      // Count PostgreSQL records
      const postgresResult = await this.postgresql.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
      postgresCount = Number((postgresResult as any)[0]?.count || 0);

      // Get sample data for mismatched tables
      if (sqliteCount !== postgresCount) {
        sampleData = await this.getSampleData(tableName);
      }

    } catch (error) {
      console.error(`Error verifying table ${tableName}:`, error);
    }

    return {
      tableName,
      sqliteCount,
      postgresCount,
      isMatch: sqliteCount === postgresCount,
      sampleData,
    };
  }

  private async getSampleData(tableName: string): Promise<any[]> {
    const sampleData = [];

    try {
      // Get sample from SQLite
      const sqliteSample = await this.sqlite.$queryRawUnsafe(`SELECT * FROM ${tableName} LIMIT 3`);
      sampleData.push({ source: 'SQLite', data: sqliteSample });

      // Get sample from PostgreSQL
      const postgresSample = await this.postgresql.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT 3`);
      sampleData.push({ source: 'PostgreSQL', data: postgresSample });

    } catch (error) {
      console.error(`Error getting sample data for ${tableName}:`, error);
    }

    return sampleData;
  }

  async generateDetailedReport(): Promise<void> {
    console.log('📋 Generating detailed verification report...');

    const report = await this.verify();
    const reportPath = path.join(__dirname, '../migration-verification-report.json');

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.printReport(report);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  private printReport(report: MigrationReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION VERIFICATION REPORT');
    console.log('='.repeat(60));

    console.log(`📅 Timestamp: ${report.timestamp}`);
    console.log(`📈 Status: ${report.status}`);
    console.log(`📋 Total Tables: ${report.totalTables}`);
    console.log(`✅ Passed Tables: ${report.passedTables}`);
    console.log(`❌ Failed Tables: ${report.failedTables}`);
    console.log(`📊 Total Records: SQLite(${report.totalRecords.sqlite}) | PostgreSQL(${report.totalRecords.postgres})`);

    if (report.failedTables > 0) {
      console.log('\n❌ FAILED TABLES:');
      report.tables
        .filter(table => !table.isMatch)
        .forEach(table => {
          console.log(`   - ${table.tableName}: SQLite(${table.sqliteCount}) vs PostgreSQL(${table.postgresCount})`);
        });
    }

    console.log('\n📋 TABLE DETAILS:');
    report.tables.forEach(table => {
      const status = table.isMatch ? '✅' : '❌';
      console.log(`   ${status} ${table.tableName.padEnd(20)} | SQLite: ${table.sqliteCount.toString().padStart(8)} | PostgreSQL: ${table.postgresCount.toString().padStart(10)}`);
    });

    console.log('='.repeat(60));

    if (report.status === 'SUCCESS') {
      console.log('🎉 MIGRATION VERIFICATION SUCCESSFUL!');
      console.log('✅ All tables have been migrated correctly.');
    } else if (report.status === 'PARTIAL') {
      console.log('⚠️  PARTIAL MIGRATION SUCCESSFUL!');
      console.log('⚠️  Some tables may need attention.');
    } else {
      console.log('❌ MIGRATION VERIFICATION FAILED!');
      console.log('❌ Migration needs to be reviewed and corrected.');
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Migration Verification Script');
    console.log('');
    console.log('Usage:');
    console.log('  npx ts-node scripts/verify-migration.ts');
    console.log('');
    console.log('Environment Variables:');
    console.log('  SQLITE_PATH: Path to SQLite database (default: ./prisma/dev.db)');
    console.log('  POSTGRES_URL: PostgreSQL connection URL (required)');
    console.log('');
    console.log('Examples:');
    console.log('  POSTGRES_URL="postgresql://user:pass@localhost:5432/rabbit" npx ts-node scripts/verify-migration.ts');
    process.exit(0);
  }

  const sqlitePath = process.env.SQLITE_PATH || './prisma/dev.db';
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!postgresUrl) {
    console.error('❌ POSTGRES_URL or DATABASE_URL environment variable is required');
    process.exit(1);
  }

  if (!fs.existsSync(sqlitePath)) {
    console.error(`❌ SQLite database not found at: ${sqlitePath}`);
    process.exit(1);
  }

  const verifier = new MigrationVerifier(sqlitePath, postgresUrl);
  await verifier.generateDetailedReport();
}

// Handle errors
if (require.main === module) {
  main().catch((error) => {
    console.error('Verification failed:', error);
    process.exit(1);
  });
}

export { MigrationVerifier };