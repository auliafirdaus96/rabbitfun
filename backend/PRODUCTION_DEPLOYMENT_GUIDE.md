# Production Database Setup & Deployment Guide

This comprehensive guide covers the complete setup and deployment of the Rabbit Launchpad production database using the same patterns as the test database setup.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Database Setup](#database-setup)
4. [Configuration](#configuration)
5. [Security](#security)
6. [Deployment](#deployment)
7. [Monitoring](#monitoring)
8. [Backup & Recovery](#backup--recovery)
9. [Maintenance](#maintenance)
10. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### Infrastructure Requirements

**Minimum Server Specifications:**
- **CPU:** 4 cores
- **RAM:** 16GB
- **Storage:** 100GB SSD
- **OS:** Ubuntu 20.04+ or CentOS 8+

**Software Requirements:**
- **PostgreSQL:** 13+ (14+ recommended)
- **Node.js:** 18+ LTS
- **Redis:** 6.0+
- **AWS CLI:** (if using S3 backups)
- **Git:** 2.0+

### Network Requirements
- **Database Port:** 5432 (default PostgreSQL)
- **Redis Port:** 6379 (default Redis)
- **Application Port:** 3001 (configurable)
- **SSL Certificate:** Required for production

### Access Requirements
- **Database Admin Access:** PostgreSQL superuser or equivalent
- **File System Access:** Read/write to backup directories
- **S3 Access:** (if using cloud backups)
- **Email/SMS:** For alert notifications

## 🏗️ Architecture Overview

### Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Production Infrastructure                    │
├─────────────────────────────────────────────────────────────────┤
│  Application Server                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Rabbit Launchpad Backend (Node.js)                      │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │  API Layer   │  │  Monitoring   │  │  Background   │  │   │
│  │  │             │  │   Service    │  │   Jobs       │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Databases & Storage                                         │
│  ┌─────────────┐  ┌─────────┐  ┌─────────────────────┐        │
│  │  PostgreSQL │  │  Redis  │  │  File System      │        │
│  │  (Primary)  │  │ (Cache) │  │  (Backups)       │        │
│  │  │         │  │        │  │  ┌─────────────┐│        │
│  │  │  Users    │  │  Sessions│  │  │  Daily     ││        │
│  │  │  Tokens   │  │  Rate    │  │  │  Weekly    ││        │
│  │  │  Transactions│ │  Limits  │  │  │  Monthly   ││        │
│  │  └─────────┘  └─────────┘  │  └─────────────┘│        │
│  └─────────────┘  └─────────┘  └─────────────────────┘        │
├─────────────────────────────────────────────────────────────────┤
│  Monitoring & Observability                                │
│  ┌─────────────────────┐  ┌──────────────────────┐           │
│  │  Database Monitoring │  │  Performance Metrics │           │
│  │  Health Checks       │  │  Custom Dashboards   │           │
│  │  Alerting           │  │  Log Aggregation     │           │
│  │  └─────────────────────┘  └──────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Users/Web      │    │   API Gateway    │    │  Load Balancer  │
└─────────┬───────┘    └─────────┬─────────┘    └─────────┬───────┘
          │                    │                        │
          ▼                    ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Rabbit Launchpad Backend                 │
├─────────────────────┬─────────────────────────────────────────┤
│ Authentication     │  ┌─────────────────────────────────────────┐ │
│ Rate Limiting     │  │          Application Logic            │ │
│ Validation       │  │  ┌─────────────────────────────────────┐ │
│                 │  │  │  Token Management                │ │ │
│                 │  │  │  ┌─────────┐  ┌─────────────────┐  │ │
│                 │  │  │  │  Users   │  │  Transactions  │  │ │
│                 │  │  │  └─────────┘  └─────────────────┘  │ │
│                 │  │  │  ┌─────────────────────────────────────┐ │ │
│                 │  │  │  │  Analytics  │  │  Webhooks    │  │ │
│                 │  │  │  └─────────────────────────────────────┘ │ │
│                 │  │  └─────────────────────────────────────────┘ │
│                 │  └─────────────────────────────────────────────┘ │
│ Business Logic    │  ┌─────────────────────────────────────────┐   │
│                 │  │  ┌─────────┐  ┌─────────────────────┐    │   │
│                 │  │  │  Redis   │  │  Background Jobs    │    │   │
│                 │  │  │  (Cache) │  │  (Email, Notifications) │   │
│                 │  │  └─────────┘  └─────────────────────┘    │   │
│                 │  └─────────────────────────────────────────────┘   │
│ └───────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
          │                    │                        │
          ▼                    ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                           │
│  ┌─────────────────┐  ┌─────────────────────────────────────────┐ │
│  │  PostgreSQL    │  │  File System                         │ │
│  │  (Primary DB)   │  │  (Logs, Backups, Uploads)           │ │
│  │  │              │  │  ┌─────────────────────────────────┐ │ │
│  │  │  Users       │  │  │  Application Logs              │ │ │
│  │  │  Tokens      │  │  │  Database Backups             │ │ │
│  │  │  Transactions│  │  │  File Uploads                  │ │ │
│  │  │  Analytics   │  │  └─────────────────────────────────┘ │ │
│  │  └─────────┘  │                                         │
│  └─────────────────┘  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🗄️ Database Setup

### 1. Quick Setup (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd rabbit-launchpad/backend

# Set up environment
cp .env.production.example .env.production

# Edit production configuration
nano .env.production

# Run production database setup
chmod +x scripts/setup-production-db.sh
sudo ./scripts/setup-production-db.sh
```

### 2. Manual Setup

#### Step 1: Environment Configuration

```bash
# Copy environment template
cp .env.production.example .env.production

# Edit production settings
nano .env.production
```

**Critical Settings in `.env.production`:**
```bash
# Database
PRODUCTION_DATABASE_URL=postgresql://username:password@hostname:5432/rabbit_launchpad_prod
DATABASE_POOL_SIZE=20
DATABASE_SSL_MODE=require

# Security
JWT_SECRET=your-super-secure-32-character-secret-key
ENCRYPTION_KEY=your-32-character-encryption-key
SESSION_SECRET=your-session-secret-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key

# Backup
BACKUP_S3_BUCKET=your-backup-bucket
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

#### Step 2: Database Creation

```bash
# Make script executable
chmod +x scripts/setup-production-db.sh

# Run database setup
sudo ./scripts/setup-production-db.sh
```

**What the setup script does:**
- ✅ Creates production database user with secure password
- ✅ Creates production database with proper encoding
- ✅ Installs required PostgreSQL extensions
- ✅ Applies production database schema
- ✅ Creates performance indexes
- ✅ Sets up monitoring user
- ✅ Creates backup directories
- ✅ Generates backup scripts
- ✅ Validates database health

#### Step 3: Database Migration

```bash
# Make migration script executable
chmod +x scripts/migrate-production.sh

# Run migrations
sudo ./scripts/migrate-production.sh
```

**Migration Features:**
- ✅ Pre-migration backup
- ✅ Rollback capability on failure
- ✅ Schema validation
- ✅ Performance optimization
- ✅ Migration logging
- ✅ Integrity verification

## ⚙️ Configuration

### Production Configuration

The production configuration is centralized in `config/production.ts`:

```typescript
import productionConfig from './config/production';

// Validate configuration
productionConfig.validateProductionConfig();

// Start application
const app = createApp(productionConfig);
```

### Environment Variables

Required variables for production:

| Variable | Description | Example |
|----------|-------------|---------|
| `PRODUCTION_DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `super-secret-key-32-chars` |
| `ENCRYPTION_KEY` | Data encryption key (32 chars) | `exactly-32-chars-long` |
| `SESSION_SECRET` | Session signing secret | `session-secret-key-32-chars` |
| `WEBHOOK_SECRET` | Webhook verification secret | `webhook-secret-32-chars` |

### Database Connection Pooling

```typescript
database: {
  url: process.env.PRODUCTION_DATABASE_URL!,
  poolSize: 20,
  poolTimeout: 30000,
  sslMode: 'require',
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  maxUses: 7500,
}
```

### Security Configuration

```typescript
security: {
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: '24h',
    issuer: 'rabbit-launchpad',
    audience: 'rabbit-launchpad-users',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY!,
    algorithm: 'aes-256-gcm',
  },
  bcrypt: {
    rounds: 12,
  },
  cors: {
    origin: ['https://yourdomain.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
}
```

## 🔒 Security

### Database Security

#### 1. User Permissions

```sql
-- Production database user (limited privileges)
CREATE ROLE rabbit_prod_user WITH LOGIN PASSWORD 'secure_password';

-- Grant specific permissions
GRANT CONNECT ON DATABASE rabbit_launchpad_prod TO rabbit_prod_user;
GRANT USAGE ON SCHEMA public TO rabbit_prod_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rabbit_prod_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rabbit_prod_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO rabbit_prod_user;
```

#### 2. SSL Configuration

```bash
# Force SSL connections
export DATABASE_SSL_MODE=require

# Verify SSL certificate
export DATABASE_SSL_VERIFY=true

# Use SSL certificate authorities
export DATABASE_SSL_ROOT_CERT=/path/to/ca-bundle.crt
```

#### 3. Access Control

```bash
# Restrict database access to application servers
# Allow only application server IP addresses
sudo ufw allow from 10.0.0.5 to any port 5432
sudo ufw allow from 10.0.0.6 to any port 6379
```

### Application Security

#### 1. Environment Variables

```bash
# Secure environment file
chmod 600 .env.production
chown app:app .env.production
```

#### 2. Process Management

```bash
# Run as non-root user
sudo -u rabbit-app npm start

# Use process manager (PM2)
npm install -g pm2
pm2 start ecosystem.config.js
```

#### 3. File Permissions

```bash
# Secure file permissions
chmod 750 /var/backups/rabbit-launchpad
chmod 640 /var/log/rabbit-launchpad
chmod 600 /etc/rabbit-launchpad/ssl/*
```

## 🚀 Deployment

### 1. Application Deployment

#### Using PM2

```bash
# Install PM2
npm install -g pm2

# Create ecosystem config
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'rabbit-launchpad-backend',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/rabbit-launchpad/err.log',
      out_file: '/var/log/rabbit-launchup/out.log',
      log_file: '/var/log/rabbit-launchup/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'dist'],
      kill_timeout: 10000,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

#### Using Docker

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build application
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create required directories
RUN mkdir -p /app/uploads /app/logs /app/backups
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["dumb-init", "node", "dist/server.js"]
```

```dockerfile
version: '3.8'

services:
  rabbit-launchpad-backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    volumes:
      - /app/uploads:/app/uploads
      - /app/logs:/app/logs
      - /app/backups:/app/backups
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: rabbit_launchpad_prod
      POSTGRES_USER: rabbit_prod_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/var/backups/postgres
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

volumes:
  postgres_data:
  redis_data:
  postgres_backups:
  app_backups:
  app_logs:
  app_uploads:
```

### 2. Database Deployment

#### Step 1: PostgreSQL Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# CentOS/RHEL
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Step 2: Database Configuration

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**Key PostgreSQL Settings:**
```ini
# Connection settings
listen_addresses = 'localhost'
port = 5432
max_connections = 200
superuser_reserved_connections = 3

# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL settings
wal_level = replica
wal_buffers = 16MB
checkpoint_completion_target = 0.9
wal_writer_delay = 200ms
commit_delay = 0

# Logging
log_destination = 'stderr'
logging_collector = 'jsonlog'
log_line_prefix = '%m [%p]: [%l-1] %v'
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200
```

```bash
# Edit pg_hba.conf for access control
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

**Access Control Settings:**
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                    peer
host    all             postgres                                    md5
host    all             all               10.0.0.0/8            md5
host    all             all               127.0.0.1/32           md5
host    rabbit_launchpad_prod rabbit_prod_user    10.0.0.0/8            md5
```

### 3. Redis Setup

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
```

**Redis Configuration:**
```ini
# Network
bind 127.0.0.1
port 6379
protected-mode yes

# Memory
maxmemory 512mb
maxmemory-policy noeviction

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your_redis_password
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG ""
```

```bash
# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

## 📊 Monitoring

### 1. Application Monitoring

#### Health Checks

```typescript
// Built-in health check endpoint
GET /health

// Response format
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 86400,
  "environment": "production",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "connectionCount": 15,
    "poolSize": 20
  },
  "redis": {
    "status": "connected",
    "memory": "245MB"
  },
  "blockchain": {
    "status": "connected",
    "blockNumber": 12345678
  }
}
```

#### Metrics Endpoint

```typescript
// Application metrics
GET /metrics

// Response format
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 86400,
  "memory": {
    "used": "245MB",
    "total": "1GB",
    "external": "50MB"
  },
  "cpu": {
    "user": "15%",
    "system": "5%"
  },
  "database": {
    "connections": 15,
    "size": "2.5GB",
    "cacheHitRatio": 0.95
  },
  "api": {
    "totalRequests": 10000,
    "errorRate": 0.1,
    "averageResponseTime": 45
  }
}
```

### 2. Database Monitoring

#### Prisma Studio

```bash
# Start Prisma Studio
npx prisma studio --schema=./prisma/schema-production.prisma
```

#### Custom Monitoring

```typescript
import { ProductionMonitoringService } from './services/productionMonitoring';

const monitoringConfig = {
  enabled: true,
  metricsEndpoint: '/metrics',
  healthCheckInterval: 30000, // 30 seconds
  alertThresholds: {
    errorRate: 5.0,        // 5%
    responseTime: 1000,    // 1 second
    databaseConnections: 100, // 100 connections
    databaseSize: 50,       // 50GB
  },
  notifications: {
    slack: process.env.SLACK_WEBHOOK_URL,
    email: ['admin@yourdomain.com'],
    webhook: process.env.WEBHOOK_URL,
  },
};

const monitoring = new ProductionMonitoringService(monitoringConfig);
await monitoring.start();
```

### 3. External Monitoring Services

#### Sentry Integration

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  release: process.env.npm_package_version,
  tracesSampleRate: 0.1,
});
```

#### New Relic Integration

```typescript
import * as newrelic from 'newrelic';

if (process.env.NEW_RELIC_LICENSE_KEY) {
  newrelic({
    licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
    appName: 'rabbit-launchpad-backend',
    distributedTracing: {
      enabled: true,
    },
    logging: {
      enabled: true,
    },
  });
}
```

### 4. Log Management

#### Winston Configuration

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: '/var/log/rabbit-launchup/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: '/var/log/rabbit-launchup/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
  ],
});
```

#### Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/rabbit-launchpad
```

```ini
/var/log/rabbit-launchup/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 rabbit-launchpad rabbit-launchpad
    postrotate
        systemctl reload rabbit-launchpad-backend || true
    endscript
}
```

## 💾 Backup & Recovery

### 1. Automated Backup Setup

#### Daily Backups

```bash
# Create cron job for daily backups
sudo crontab -e
```

```cron
# Rabbit Launchpad Production Database Backups
0 2 * * * /path/to/rabbit-launchpad/backend/scripts/backup-production.sh daily
# Rabbit Launchpad Weekly Backup
0 3 * * 0 /path/to/rabbit-launchpad/backend/scripts/backup-production.sh weekly
# Rabbit Launchpad Monthly Backup
0 4 1 * * /path/to/rabbit-launchpad/backend/scripts/backup-production.sh monthly
# Cleanup Old Backups
0 5 * * * /path/to/rabbit-launchpad/backend/scripts/backup-production.sh cleanup
```

### 2. Backup Script Features

#### What Gets Backed

```bash
# Database backup includes:
- Tables (user sessions, rate limits, failed logins - excluded)
- Indexes
- Constraints
- Sequences
- Views
- Stored procedures
- Functions
- Extensions
- Data (with some optimizations for size)
```

#### Backup Storage

```bash
# Local storage structure
/var/backups/rabbit-launchup/
├── daily/
│   ├── rabbit_launchpad_prod_20240101_020000.sql.gz
│   ├── rabbit_launchpad_prod_20240102_020000.sql.gz
│   └── ...
├── weekly/
│   ├── rabbit_launchpad_prod_20240101_week1.sql.gz
│   ├── rabbit_launchpad_prod_20240108_week1.sql.gz
│   └── ...
├── monthly/
│   ├── rabbit_launchpad_prod_20240101.sql.gz
│   ├── rabbit_launchpad_prod_20240201.sql.gz
│   └── ...
└── snapshots/
    ├── rabbit_launchpad_prod_schema_20240101.sql.gz
    └── ...
```

### 3. Cloud Backup (S3)

#### S3 Configuration

```bash
# AWS CLI configuration
aws configure
```

```bash
# Create S3 bucket
aws s3 mb s3://your-backup-bucket --region us-east-1

# Set up lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket your-backup-bucket \
  --lifecycle-configuration file://lifecycle-policy.json
```

```json
{
  "Rules": [
    {
      "ID": "BackupLifecycleRule",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "database-backups/"
      },
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "STANDARD_IA",
          "Transition": "GLACIER"
        },
        {
          "Days": 30,
          "StorageClass": "GLACIER",
          "Transition": "DEEP_ARCHIVE"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE",
          "Transition": "DELETE"
        }
      ]
    }
  ]
}
```

### 4. Recovery Procedures

#### Database Restoration

```bash
# Manual restoration
./scripts/setup-production-db.sh rollback

# Specific backup restoration
./scripts/backup-production.sh restore /path/to/backup/file

# Schema-only restoration
./scripts/backup-production.sh restore-schema /path/to/schema/backup.sql.gz
```

#### Recovery Testing

```bash
# Test restore process (non-destructive)
./scripts/test-restore.sh /path/to/backup/file
```

## 🔧 Maintenance

### 1. Regular Maintenance Tasks

#### Weekly Tasks

```bash
# Check database health
./scripts/migrate-production.sh verify

# Analyze database performance
psql -h localhost -U rabbit_prod_user -d rabbit_launchpad_prod -c "
  SELECT
    schemaname,
    tablename,
    n_tup_ins as tuples,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables
  JOIN pg_namespace ON pg_namespace.oid = pg_tables.schemaname
  WHERE pg_tables.schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check slow queries
SELECT query, calls, total_time, rows, mean_time, stddev_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 10;
"

# Update statistics
VACUUM ANALYZE;
```

#### Monthly Tasks

```bash
# Rebuild indexes
REINDEX DATABASE rabbit_launch_prod;

# Update table statistics
ANALYZE rabbit_launch_prod;

# Clean up old data
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM failed_logins WHERE created_at < NOW() - '30 days';
DELETE FROM user_sessions WHERE expires_at < NOW();
```

### 2. Performance Optimization

#### Database Indexing

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  table_name
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Analyze table statistics
ANALYZE VERBOSE users;
ANALYZE VERBOSE tokens;
ANALYZE VERBOSE transactions;
```

#### Connection Pool Optimization

```typescript
// Monitor connection pool usage
setInterval(async () => {
  const pool = database.pool;
  console.log('Database Pool Stats:', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
}, 60000); // Every minute
```

### 3. Security Maintenance

#### Certificate Renewal

```bash
# Check SSL certificate expiration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null | openssl x509 -dates -noout | grep "Not After"
```

#### Password Rotation

```bash
# Rotate database password
./scripts/rotate-db-password.sh

# Update application configuration
nano .env.production
```

#### Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
npm update
npm audit fix
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Failed

**Symptoms:**
- "Cannot connect to database"
- Connection timeout errors
- Authentication failures

**Solutions:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check network connectivity
telnet $DB_HOST $DB_PORT

# Check database exists
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -l

# Check connection string
echo $PRODUCTION_DATABASE_URL
```

#### 2. Migration Failures

**Symptoms:**
- "Migration failed"
- Schema validation errors
- Permission denied errors

**Solutions:**
```bash
# Check migration logs
tail -f $BACKUP_DIR/migration_log_*.log

# Check database permissions
sudo -u postgres psql -c "\l"

# Rollback if needed
./scripts/migrate-production.sh rollback

# Manual investigation
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $PROD_DB_NAME -c "\dt"
```

#### 3. Performance Issues

**Symptoms:**
- Slow API responses
- Database timeouts
- High memory usage

**Solutions:**
```bash
# Check active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';

# Check long-running queries
SELECT pid, now() - pg_stat_activity.query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

# Kill long-running queries (use with caution)
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query LIKE '%problematic_query%';
```

#### 4. Backup Failures

**Symptoms:**
- Backup creation failed
- S3 upload errors
- Storage space issues

**Solutions:**
```bash
# Check backup logs
tail -f $BACKUP_DIR/backup.log

# Check disk space
df -h /var/backups/rabbit-launchpad

# Check S3 configuration
aws s3 ls s3://your-backup-bucket/

# Test S3 permissions
aws s3 cp test.txt s3://your-bucket/test.txt
```

### 5. Monitoring Alerts

**Common Alerts and Solutions:**

**Alert: High Error Rate**
```bash
# Check application logs
tail -n 100 /var/log/rabbit-launchup/combined.log | grep ERROR

# Check database connections
SELECT COUNT(*) FROM pg_stat_activity;

# Check system resources
top
htop
iostat -x 1
```

**Alert: Database Size Warning**
```bash
# Check database size
SELECT pg_size_pretty(pg_database_size('rabbit_launchpad_prod'));

# Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
JOIN pg_namespace ON pg_namespace.oid = pg_tables.schemas
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Consider archiving old data
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '6 months';
```

**Alert: Slow Response Time**
```bash
# Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;

# Analyze query plan
EXPLAIN ANALYZE SELECT * FROM tokens WHERE name LIKE '%test%';

# Update statistics
ANALYZE tokens;
```

## 📞 Support

### Getting Help

1. **Check this guide** - Most issues are covered here
2. **Check application logs** - `/var/log/rabbit-launchup/`
3. **Check monitoring dashboards** - Sentry, New Relic, custom metrics
4. **Review backup logs** - `/var/backups/rabbit-launchup/backup.log`

### Emergency Contacts

- **Database Administrator**: `dba@yourdomain.com`
- **System Administrator**: `sysadmin@yourdomain.com`
- **DevOps Team**: `devops@yourdomain.com`

### Support Channels

- **Slack**: `#production-support`
- **Email**: `support@yourdomain.com`
- **Documentation**: https://docs.yourdomain.com
- **GitHub Issues**: Create issue in repository

### Escalation Process

1. **Level 1**: Application team investigates (1-2 hours)
2. **Level 2**: Systems Administrator (2-4 hours)
3. **Level 3**: DevOps team (4-8 hours)
4. **Level 4**: Management team (8+ hours)

---

**This guide provides a comprehensive approach to deploying and maintaining the Rabbit Launchpad production database using the same patterns established in the test database setup. For additional help, refer to the [test database setup guide](DATABASE_TEST_SETUP.md) for similar patterns and troubleshooting steps.**