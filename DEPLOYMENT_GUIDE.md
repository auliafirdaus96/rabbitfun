# 🚀 Rabbit Launchpad Production Deployment Guide

## 📋 Overview

This guide provides step-by-step instructions for deploying Rabbit Launchpad backend to production environment.

## 🎯 Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / Amazon Linux 2
- **Node.js**: Version 18.0.0 or higher
- **PostgreSQL**: Version 13.0 or higher
- **Redis**: Version 6.0 or higher
- **Docker**: Version 20.10.0 or higher
- **Docker Compose**: Version 2.0.0 or higher
- **PM2**: Latest version
- **Git**: Version 2.0 or higher
- **Nginx**: Version 1.18.0 or higher

### Hardware Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 20GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 50GB SSD storage
- **Production**: 8+ CPU cores, 16GB+ RAM, 100GB+ SSD storage

### Domain & SSL Requirements
- **Domain Name**: Registered domain (e.g., rabbitlaunchpad.com)
- **SSL Certificate**: Valid SSL certificate (Let's Encrypt recommended)
- **DNS Records**: A and CNAME records configured

## 🔧 Pre-Deployment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl wget git nginx postgresql redis-server \
    build-essential python3 python3-pip \
    ufw certbot python3-certbot-nginx

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reboot to apply Docker group changes
sudo reboot
```

### 2. Create Application User

```bash
# Create application user
sudo adduser rabbituser
sudo usermod -aG sudo,docker rabbituser

# Switch to application user
sudo su - rabbituser
```

### 3. Application Directory Setup

```bash
# Create application directory
mkdir -p /var/www/rabbit-launchpad
cd /var/www/rabbit-launchpad

# Clone repository
git clone https://github.com/rabbitlaunchpad/rabbit-launchpad.git .
cd backend

# Set appropriate permissions
chmod +x scripts/*.sh
```

## 🗄️ Database Setup

### 1. PostgreSQL Configuration

```bash
# Configure PostgreSQL
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE rabbit_launchpad_prod;
CREATE USER rabbit_user WITH PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE rabbit_launchpad_prod TO rabbit_user;
ALTER USER rabbit_user CREATEDB;
\q

# Enable PostgreSQL authentication
sudo nano /etc/postgresql/13/main/pg_hba.conf
# Add: local   all             rabbit_user                              md5

# Restart PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### 2. Redis Configuration

```bash
# Configure Redis
sudo nano /etc/redis/redis.conf
# Set password: requirepass YOUR_REDIS_PASSWORD

# Restart Redis
sudo systemctl restart redis
sudo systemctl enable redis
```

## 🔐 Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp
sudo ufw enable
```

### 2. SSL Certificate Setup

```bash
# Obtain SSL certificate (Let's Encrypt)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 3. Environment Configuration

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit production environment
nano .env.production
# Set all required values:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET (generate strong secret)
# - API keys (Alchemy, Moralis, etc.)
# - Other configuration values
```

## 🚀 Deployment Methods

### Method 1: Docker Deployment (Recommended)

```bash
# Build and deploy with Docker Compose
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh docker

# Or manually:
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build

# Check status
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f api
```

### Method 2: PM2 Deployment

```bash
# Build application
npm ci --only=production
npm run build

# Run database migrations
npx prisma migrate deploy

# Deploy with PM2
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh pm2

# Or manually:
pm2 start ecosystem.config.prod.js --env production
pm2 save
pm2 startup
```

### Method 3: Systemd Service (Advanced)

```bash
# Create systemd service file
sudo nano /etc/systemd/system/rabbit-launchpad.service

# Add the following content:
[Unit]
Description=Rabbit Launchpad API
After=network.target

[Service]
Type=simple
User=rabbituser
WorkingDirectory=/var/www/rabbit-launchpad/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable rabbit-launchpad
sudo systemctl start rabbit-launchpad
```

## 🔍 Post-Deployment Verification

### 1. Health Checks

```bash
# Test API health endpoint
curl http://localhost:3001/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "blockchain": {
      "alchemy": "connected",
      "moralis": "connected"
    }
  }
}
```

### 2. Performance Testing

```bash
# Run performance tests
node scripts/perf-test.js

# Expected results:
# - 0% error rate
# - < 100ms average response time for API endpoints
# - > 1000 RPS for API endpoints
```

### 3. Security Testing

```bash
# Run security tests
node scripts/security-test.js

# Expected results:
# - All critical security tests passed
# - No authentication bypass
# - No SQL injection vulnerabilities
```

## 📊 Monitoring Setup

### 1. PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate
pm2 install pm2-server

# Configure monitoring
pm2 set pm2:pm2_server:username admin
pm2 set pm2:pm2_server:password your_password
pm2 update
```

### 2. Log Monitoring

```bash
# Configure log rotation
pm2 install pm2-logrotate

# View logs
pm2 logs
tail -f logs/combined.log
```

### 3. System Monitoring

```bash
# Install system monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system resources
htop
iotop
nethogs
```

## 🔄 Maintenance Procedures

### 1. Database Backups

```bash
# Create backup script
cat > backup-database.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/var/backups/rabbit_launchpad_backup_$DATE.sql"

sudo -u postgres pg_dump rabbit_launchpad_prod > $BACKUP_FILE
echo "Backup created: $BACKUP_FILE"

# Keep only last 30 days
find /var/backups -name "rabbit_launchpad_backup_*.sql" -mtime +30 -delete
EOF

chmod +x backup-database.sh

# Add to cron for daily backups
crontab -e
# Add: 0 2 * * * /var/www/rabbit-launchpad/backend/backup-database.sh
```

### 2. Application Updates

```bash
# Update application
cd /var/www/rabbit-launchpad/backend
git pull origin main

# Stop current deployment
pm2 stop all

# Install dependencies and build
npm ci --only=production
npm run build

# Run database migrations
npx prisma migrate deploy

# Start new deployment
pm2 start ecosystem.config.prod.js --env production
pm2 save
```

### 3. SSL Certificate Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Renew certificates
sudo certbot renew

# Reload Nginx
sudo systemctl reload nginx
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log

# Test connection
psql -h localhost -U rabbit_user -d rabbit_launchpad_prod
```

#### 2. Redis Connection Errors
```bash
# Check Redis status
sudo systemctl status redis

# Test connection
redis-cli -a YOUR_REDIS_PASSWORD ping
```

#### 3. Application Startup Errors
```bash
# Check PM2 logs
pm2 logs rabbit-launchpad-api

# Check application logs
tail -f logs/combined.log
tail -f logs/err.log
```

#### 4. Port Conflicts
```bash
# Check what's using ports
sudo netstat -tlnp | grep :3001
sudo lsof -i :3001

# Kill conflicting processes
sudo kill -9 <PID>
```

### Emergency Procedures

#### 1. Application Crash Recovery
```bash
# Restart application
pm2 restart all

# If restart fails, redeploy
./scripts/deploy-production.sh pm2
```

#### 2. Database Recovery
```bash
# Restore from backup
psql -h localhost -U rabbit_user -d rabbit_launchpad_prod < backup_file.sql

# Or use PostgreSQL tools
pg_restore -h localhost -U rabbit_user -d rabbit_launchpad_prod backup_file.backup
```

#### 3. Complete System Recovery
```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down
pm2 stop all
sudo systemctl stop nginx

# Restore from backup
# (Follow backup restoration procedures)

# Start services
docker-compose -f docker-compose.prod.yml up -d
sudo systemctl start nginx
```

## 📋 Deployment Checklist

### Pre-Deployment Checklist
- [ ] Server requirements met
- [ ] Firewall configured
- [ ] SSL certificate obtained
- [ ] Database installed and configured
- [ ] Redis installed and configured
- [ ] Application cloned and built
- [ ] Environment variables configured
- [ ] Secrets generated and stored
- [ ] Backup procedures tested

### Post-Deployment Checklist
- [ ] Application starts successfully
- [ ] Health checks pass
- [ ] All API endpoints respond correctly
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] Performance tests pass
- [ ] Security tests pass
- [ ] Logs are being generated
- [ ] Monitoring is configured
- [ ] SSL certificate is valid
- [ ] Domain points to server
- [ ] Load balancer configured (if applicable)

### Ongoing Monitoring Checklist
- [ ] Monitor application logs daily
- [ ] Monitor system resources (CPU, RAM, disk)
- [ ] Monitor database performance
- [ ] Monitor SSL certificate expiration
- [ ] Review security alerts
- [ ] Update dependencies regularly
- [ ] Test backup restoration quarterly
- [ ] Review access controls monthly

---

**Last Updated**: October 17, 2025
**Version**: 1.0
**Status**: Production Ready