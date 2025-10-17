# 🗄️ PostgreSQL Migration Plan

## 📋 Overview

This document outlines the comprehensive migration plan from SQLite to PostgreSQL for the Rabbit Launchpad backend system.

## 🎯 Migration Goals

1. **Production-Ready Database**: Move from SQLite to PostgreSQL for production scalability
2. **Data Integrity**: Ensure no data loss during migration
3. **Zero Downtime**: Minimize impact on users during transition
4. **Performance Improvement**: Leverage PostgreSQL features for better performance
5. **Backup & Recovery**: Implement proper backup strategies

## 📊 Current State Analysis

### SQLite Database Structure
- **Current Schema**: Compatible with existing codebase
- **Data Types**: String-based for most fields (BigInt stored as String)
- **Relationships**: Foreign key relationships with cascade deletes
- **Indexes**: Basic indexes on key fields

### PostgreSQL Target Schema
- **Enhanced Schema**: `prisma/schema.postgresql.prisma` (already created)
- **Proper Types**: Native PostgreSQL types (BIGINT, NUMERIC, etc.)
- **Performance Indexes**: Comprehensive indexing strategy
- **Constraints**: Better data integrity constraints

## 🚀 Migration Strategy

### Phase 1: Preparation (Week 1)

#### 1.1 Environment Setup
```bash
# Create PostgreSQL database
createdb rabbit_launchpad_dev
createdb rabbit_launchpad_staging
createdb rabbit_launchpad_prod

# Update environment variables
DATABASE_URL="postgresql://username:password@localhost:5432/rabbit_launchpad_dev"
```

#### 1.2 Schema Validation
- [ ] Compare SQLite vs PostgreSQL schemas
- [ ] Identify data type conversions needed
- [ ] Validate relationship constraints
- [ ] Test Prisma generation for PostgreSQL

#### 1.3 Backup Strategy
```bash
# Current SQLite backup
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d)

# PostgreSQL connection test
psql $DATABASE_URL -c "SELECT version();"
```

### Phase 2: Migration Development (Week 2)

#### 2.1 Migration Scripts
- [ ] Review existing `scripts/migrate-to-postgresql.ts`
- [ ] Test data type conversions
- [ ] Handle BigInt to NUMERIC conversions
- [ ] Validate foreign key relationships

#### 2.2 Data Transformation
```typescript
// Example conversion logic
const transformData = {
  // String fields that should be BIGINT
  bnbAmount: (value: string) => new BN(value).toString(),
  totalVolume: (value: string) => new BN(value).toString(),

  // DateTime fields
  createdAt: (value: string) => new Date(value),

  // Boolean conversions
  isActive: (value: number) => Boolean(value)
};
```

#### 2.3 Testing Migration
```bash
# Test migration on development data
npm run db:migrate-from-sqlite

# Verify data integrity
npm run db:verify-migration
```

### Phase 3: Staging Migration (Week 3)

#### 3.1 Staging Environment Setup
```bash
# Clone production data to staging
npm run db:backup-production
npm run db:restore-to-staging

# Run migration on staging
npm run db:migrate-staging
```

#### 3.2 Performance Testing
- [ ] Test query performance with PostgreSQL
- [ ] Benchmark CRUD operations
- [ ] Test concurrent connections
- [ ] Validate indexing strategy

#### 3.3 Application Testing
- [ ] Full API endpoint testing
- [ ] WebSocket connection testing
- [ ] Authentication flow testing
- [ ] Transaction processing testing

### Phase 4: Production Migration (Week 4)

#### 4.1 Migration Day Preparation
```bash
# Pre-migration checklist
- [ ] Notify users of scheduled maintenance
- [ ] Create final SQLite backup
- [ ] Prepare rollback plan
- [ ] Monitor system performance baseline
```

#### 4.2 Migration Execution
```bash
# 1. Put application in maintenance mode
export MAINTENANCE_MODE=true

# 2. Stop application services
npm run stop

# 3. Final backup
npm run db:backup-final

# 4. Execute migration
npm run db:migrate-production

# 5. Update configuration
cp .env.postgresql.production .env.production

# 6. Start application with PostgreSQL
npm run start

# 7. Verify all systems
npm run health-check
npm run post-migration-verification
```

#### 4.3 Post-Migration Verification
- [ ] Database connectivity check
- [ ] API endpoint validation
- [ ] Data integrity verification
- [ ] Performance baseline comparison
- [ ] Error log monitoring

## 📋 Detailed Migration Tasks

### Schema Conversion Tasks

#### 1. Data Type Mapping
| SQLite Type | PostgreSQL Type | Notes |
|-------------|----------------|-------|
| TEXT (BigInt) | NUMERIC(38,0) | For token amounts, prices |
| TEXT (Address) | VARCHAR(42) | Blockchain addresses |
| TEXT | TEXT | General text fields |
| INTEGER | INTEGER | Counters, IDs |
| BOOLEAN | BOOLEAN | Flags and status |
| DATETIME | TIMESTAMP | Created/updated timestamps |

#### 2. Index Optimization
```sql
-- Performance indexes for PostgreSQL
CREATE INDEX CONCURRENTLY idx_tokens_created_at_desc ON tokens(created_at DESC);
CREATE INDEX CONCURRENTLY idx_transactions_token_id_created_at ON transactions(token_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_users_wallet_address ON users(wallet_address);
CREATE INDEX CONCURRENTLY idx_tokens_creator_address_active ON tokens(creator_address, is_active) WHERE is_active = true;
```

#### 3. Constraint Enhancements
```sql
-- Data integrity constraints
ALTER TABLE tokens ADD CONSTRAINT check_sold_supply_nonnegative CHECK (sold_supply >= '0');
ALTER TABLE transactions ADD CONSTRAINT check_token_amount_positive CHECK (token_amount > '0');
ALTER TABLE users ADD CONSTRAINT check_wallet_address_format CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$');
```

### Data Migration Scripts

#### 1. Pre-Migration Validation
```typescript
// scripts/validate-sqlite-data.ts
async function validateSQLiteData() {
  const issues = [];

  // Check data consistency
  const orphanedTransactions = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM transactions t
    LEFT JOIN tokens ON t.token_id = tokens.id
    WHERE tokens.id IS NULL
  `;

  // Validate BigInt fields
  const invalidBigInts = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM transactions
    WHERE bnbAmount NOT GLOB '[0-9]*'
  `;

  return { issues, orphanedTransactions, invalidBigInts };
}
```

#### 2. Migration Execution
```typescript
// scripts/execute-migration.ts
async function executeMigration() {
  console.log('🚀 Starting PostgreSQL migration...');

  // 1. Create PostgreSQL schema
  await createPostgreSQLSchema();

  // 2. Migrate data in batches
  const tables = ['users', 'tokens', 'transactions', 'token_favorites', 'analytics'];

  for (const table of tables) {
    console.log(`📦 Migrating ${table}...`);
    await migrateTable(table);
  }

  // 3. Verify migration
  await verifyMigrationIntegrity();

  console.log('✅ Migration completed successfully!');
}
```

#### 3. Post-Migration Verification
```typescript
// scripts/verify-migration.ts
async function verifyMigration() {
  const sqliteCount = await countSQLiteRecords();
  const postgresCount = await countPostgreSQLRecords();

  const verification = {
    users: sqliteCount.users === postgresCount.users,
    tokens: sqliteCount.tokens === postgresCount.tokens,
    transactions: sqliteCount.transactions === postgresCount.transactions,
    // ... other tables
  };

  console.log('📊 Migration Verification:', verification);
  return verification;
}
```

## 🛡️ Risk Mitigation

### Migration Risks

#### 1. Data Loss Risk
- **Mitigation**: Multiple backups before migration
- **Rollback Plan**: Keep SQLite database available for 48 hours
- **Validation**: Post-migration data integrity checks

#### 2. Downtime Risk
- **Mitigation**: Plan migration during low-traffic hours
- **Rollback Strategy**: Quick revert to SQLite if issues arise
- **Monitoring**: Real-time monitoring during migration

#### 3. Performance Risk
- **Mitigation**: Performance testing in staging
- **Optimization**: Query optimization and indexing strategy
- **Monitoring**: Performance metrics tracking

### Rollback Plan

```bash
# If migration fails, rollback to SQLite
export DATABASE_URL="file:./prisma/dev.db.backup"
npm run start
```

## 📊 Success Metrics

### Migration Success Criteria
- [ ] All data migrated without loss
- [ ] API endpoints fully functional
- [ ] Performance improved or maintained
- [ ] Zero critical errors in production
- [ ] All automated tests passing

### Performance Targets
- **Query Response Time**: < 100ms for 95% of queries
- **Concurrent Users**: Support 1000+ concurrent users
- **Database Size**: Handle 10GB+ of data efficiently
- **Backup Time**: < 5 minutes for full backup

## 📞 Contact & Support

### Migration Team
- **Database Admin**: [Contact info]
- **Backend Developer**: [Contact info]
- **DevOps Engineer**: [Contact info]
- **Project Manager**: [Contact info]

### Emergency Contacts
- **On-call Engineer**: [Contact info]
- **System Administrator**: [Contact info]

## 📚 Documentation Updates

### Post-Migration Tasks
- [ ] Update database documentation
- [ ] Update deployment procedures
- [ ] Update monitoring dashboards
- [ ] Update backup procedures
- [ ] Update development setup guide

---

**Last Updated**: October 17, 2025
**Version**: 1.0
**Status**: Ready for Execution