# 🚀 Rabbit Launchpad Deployment Guide

> **Complete production deployment guide for Rabbit Launchpad platform**

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Redis Configuration](#redis-configuration)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Smart Contract Deployment](#smart-contract-deployment)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Monitoring & Logging](#monitoring--logging)
10. [Security Hardening](#security-hardening)
11. [Backup & Recovery](#backup--recovery)
12. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

#### Minimum Requirements
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Network**: 100Mbps

#### Recommended Requirements
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 100GB+ SSD
- **Network**: 1Gbps

### Required Tools
- Docker 20.10+
- Docker Compose 2.0+
- kubectl 1.28+
- Node.js 18+ or 20+
- Git
- Make (optional)
- PostgreSQL 14+ (for local development)
- Redis 6+ (for local development)

### Cloud Provider Setup
- Kubernetes cluster (EKS, GKE, AKS, or self-hosted)
- Container registry (GitHub Container Registry, Docker Hub, or AWS ECR)
- Object storage (AWS S3, Google Cloud Storage, or similar)
- Database (PostgreSQL 15+)
- Cache (Redis 7+)
- Load balancer with SSL/TLS support

### Domain & SSL
- Custom domain (e.g., rabbit-launchpad.com)
- SSL/TLS certificates (Let's Encrypt recommended)
- DNS configuration pointing to your load balancer

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/your-org/rabbit-launchpad.git
cd rabbit-launchpad
```

### 2. Environment Variables
```bash
# Copy environment templates
cp .env.production.example .env.production
cp .env.staging.example .env.staging
cp .env.development.example .env.development

# Fill in actual values
# NEVER commit actual .env files to version control
```

### 3. GitHub Container Registry
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Set registry permissions
# Repository Settings > Actions > General > Workflow permissions
# - Allow actions to create and approve pull requests
# - Allow actions to run workflows
```

### 4. Kubernetes Secrets
```bash
# Create namespace
kubectl create namespace rabbit-launchpad

# Create secrets (replace with actual values)
kubectl create secret generic rabbit-secrets \
  --from-literal=DATABASE_URL="postgresql://user:pass@host:5432/db" \
  --from-literal=REDIS_URL="redis://:pass@host:6379" \
  --from-literal=JWT_SECRET="your-super-secret-jwt-key" \
  --from-literal=BSC_RPC_URL="https://bsc-dataseed.binance.org" \
  --from-literal=MORALIS_API_KEY="your-moralis-api-key" \
  -n rabbit-launchpad

# Create SSL certificates
kubectl create secret tls rabbit-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  -n rabbit-launchpad
```

## Local Development

### 1. Using Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 2. Using Node.js
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### 3. Database Setup
```bash
# Generate Prisma client
cd backend
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

## Staging Deployment

### 1. Automated Deployment (Recommended)
```bash
# Push to staging branch
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Create pull request to staging branch
# GitHub Actions will automatically deploy to staging
```

### 2. Manual Deployment
```bash
# Deploy to staging
./scripts/deploy.sh staging latest

# Run health checks
./scripts/deploy.sh health staging

# Run smoke tests
./scripts/smoke-tests.sh staging
```

### 3. Staging Environment Access
- URL: https://staging.rabbitlaunchpad.io
- Grafana: https://staging-grafana.rabbitlaunchpad.io
- Kibana: https://staging-logs.rabbitlaunchpad.io

## Production Deployment

### 1. Pre-deployment Checklist
- [ ] All tests passing in CI/CD
- [ ] Security audit completed
- [ ] Load testing completed
- [ ] Database backups verified
- [ ] SSL certificates configured
- [ ] Monitoring dashboards ready
- [ ] Rollback plan prepared
- [ ] Team notification configured

### 2. Automated Deployment
```bash
# Create release branch
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0

# Update version numbers
# Update package.json, changelog, etc.

# Push release branch
git push origin release/v1.2.0

# Create pull request to main branch
# GitHub Actions will automatically deploy to production
```

### 3. Manual Deployment
```bash
# Deploy to production
./scripts/deploy.sh production v1.2.0

# Monitor deployment
kubectl get pods -n rabbit-launchpad
kubectl logs -f deployment/rabbit-backend -n rabbit-launchpad
```

### 4. Post-deployment Verification
```bash
# Run health checks
./scripts/deploy.sh health production

# Run smoke tests
./scripts/smoke-tests.sh production

# Run performance tests
./scripts/performance-tests.sh production

# Verify monitoring
curl https://prometheus.rabbitlaunchpad.io/api/v1/query?query=up
```

## Monitoring & Logging

### 1. Grafana Dashboards
- Application Overview
- System Metrics
- Business Metrics
- Error Tracking

### 2. Prometheus Metrics
- HTTP request metrics
- Database performance
- System resources
- Custom business metrics

### 3. ELK Stack
- Centralized logging
- Log aggregation
- Search and analytics
- Alerting on errors

### 4. Alerting Rules
- Service downtime
- High error rates
- Performance degradation
- Resource exhaustion

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database connectivity
kubectl exec -it deployment/postgres -n rabbit-launchpad -- psql -U postgres -d rabbit_launchpad

# Check connection string
kubectl get secret rabbit-secrets -n rabbit-launchpad -o yaml
```

#### 2. High Memory Usage
```bash
# Check pod memory usage
kubectl top pods -n rabbit-launchpad

# Check memory limits
kubectl describe deployment rabbit-backend -n rabbit-launchpad
```

#### 3. SSL Certificate Issues
```bash
# Check certificate validity
kubectl get secret rabbit-tls -n rabbit-launchpad -o yaml

# Verify certificate chain
openssl s_client -connect rabbitlaunchpad.io:443 -servername rabbitlaunchpad.io
```

#### 4. Performance Issues
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://rabbitlaunchpad.io/

# Analyze with Grafana
# Navigate to performance dashboard
```

### Debug Commands
```bash
# Get pod logs
kubectl logs -f deployment/rabbit-backend -n rabbit-launchpad

# Debug pod
kubectl exec -it deployment/rabbit-backend -n rabbit-launchpad -- /bin/sh

# Check events
kubectl get events -n rabbit-launchpad --sort-by='.lastTimestamp'

# Describe resources
kubectl describe pod <pod-name> -n rabbit-launchpad
```

## Security Considerations

### 1. Secrets Management
- Never commit secrets to version control
- Use Kubernetes secrets or external secret management
- Rotate secrets regularly
- Use strong, unique passwords

### 2. Network Security
- Enable HTTPS everywhere
- Use strong TLS configurations
- Implement firewall rules
- Use VPN for administrative access

### 3. Application Security
- Keep dependencies updated
- Enable security scanning in CI/CD
- Use input validation
- Implement rate limiting

### 4. Monitoring Security
- Monitor for suspicious activities
- Set up security alerts
- Regular security audits
- Incident response plan

## Backup & Recovery

### 1. Database Backups
```bash
# Create manual backup
kubectl exec -it deployment/postgres -n rabbit-launchpad -- \
  pg_dump -U postgres rabbit_launchpad > backup.sql

# Restore from backup
kubectl exec -it deployment/postgres -n rabbit-launchpad -- \
  psql -U postgres rabbit_launchpad < backup.sql
```

### 2. Application Backups
```bash
# Backup deployment configurations
kubectl get deployment -n rabbit-launchpad -o yaml > deployment-backup.yaml

# Backup secrets
kubectl get secret rabbit-secrets -n rabbit-launchpad -o yaml > secrets-backup.yaml
```

### 3. Disaster Recovery
1. Assess the damage
2. Restore from latest backup
3. Verify data integrity
4. Restart services
5. Monitor system health
6. Post-incident review

## Support & Maintenance

### Regular Tasks
- Daily: Monitor system health
- Weekly: Review logs and metrics
- Monthly: Update dependencies
- Quarterly: Security audit
- Annually: Disaster recovery test

### Contact Information
- Technical Support: support@rabbitlaunchpad.io
- Security Issues: security@rabbitlaunchpad.io
- Documentation: https://docs.rabbitlaunchpad.io

### Additional Resources
- [API Documentation](https://api.rabbitlaunchpad.io/docs)
- [GitHub Repository](https://github.com/your-org/rabbit-launchpad)
- [Status Page](https://status.rabbitlaunchpad.io)