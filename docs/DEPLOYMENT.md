# Rabbit Launchpad Deployment Guide

This guide provides comprehensive instructions for deploying Rabbit Launchpad to Kubernetes environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Kubernetes Manifests](#kubernetes-manifests)
- [Deployment Scripts](#deployment-scripts)
- [Deployment Process](#deployment-process)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## Prerequisites

### Required Tools
- `kubectl` - Kubernetes command-line tool
- `docker` - Container platform
- `bash` - Shell environment
- Access to a Kubernetes cluster

### Cluster Requirements
- Kubernetes version 1.20+
- Ingress controller (nginx recommended)
- Persistent storage for databases
- Load balancer for external access

## Environment Setup

### Supported Environments
- **staging** - Development and testing environment
- **production** - Live production environment

### Environment Configuration

1. **Create environment file:**
   ```bash
   cp .env.staging.example .env.staging
   # Update with actual values
   ```

2. **Required environment variables:**
   ```bash
   # Database
   DATABASE_URL=postgresql://user:pass@host:5432/database
   REDIS_URL=redis://host:6379

   # Security
   JWT_SECRET=your-super-secret-jwt-key

   # Application
   NODE_ENV=staging
   PORT=3001
   ```

3. **AWS S3 for backups (optional):**
   ```bash
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_S3_BUCKET=your-backup-bucket
   ```

## Kubernetes Manifests

### Directory Structure
```
k8s/
├── staging/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   └── ingress.yaml
└── production/
    ├── namespace.yaml
    ├── configmap.yaml
    ├── secrets.yaml
    ├── backend-deployment.yaml
    ├── frontend-deployment.yaml
    └── ingress.yaml
```

### Key Components

#### Namespace
- **staging**: `rabbit-launchpad`
- **production**: `rabbit-launchpad`
- **monitoring**: `rabbit-monitoring`

#### Deployments
- **Backend**: Node.js application with API services
- **Frontend**: Static files served by nginx
- **Replica counts**:
  - Staging: Backend 2, Frontend 1
  - Production: Backend 3+, Frontend 2+

#### Services
- **Backend**: Port 3001, internal service
- **Frontend**: Port 3000, external service

#### Ingress
- **Staging**: `staging.rabbitlaunchpad.io`
- **Production**: `rabbitlaunchpad.io`
- **TLS**: Configured for HTTPS
- **Paths**:
  - `/api/*` → Backend service
  - `/*` → Frontend service

## Deployment Scripts

### Available Scripts

1. **deploy-k8s.sh** - Main deployment script
   ```bash
   ./scripts/deploy-k8s.sh [environment] [version] [action]
   ```

2. **verify-k8s-deployment.sh** - Deployment verification
   ```bash
   ./scripts/verify-k8s-deployment.sh [environment]
   ```

3. **validate-k8s-manifests.sh** - Manifest validation
   ```bash
   ./scripts/validate-k8s-manifests.sh [environment]
   ```

4. **test-deployment-flow.sh** - Deployment flow testing
   ```bash
   ./scripts/test-deployment-flow.sh [environment] [version]
   ```

### Script Features

#### deploy-k8s.sh
- ✅ Backup production data
- ✅ Build and push Docker images
- ✅ Prepare Kubernetes manifests
- ✅ Deploy with rollback capability
- ✅ Health checks and monitoring
- ✅ Automatic rollback on failure
- ✅ Smoke tests
- ✅ Resource cleanup

#### verify-k8s-deployment.sh
- ✅ Prerequisites checking
- ✅ Deployment status verification
- ✅ Pod health monitoring
- ✅ Service connectivity testing
- ✅ External endpoint testing
- ✅ Resource usage analysis
- ✅ Comprehensive reporting

## Deployment Process

### Quick Start

1. **Validate deployment configuration:**
   ```bash
   ./scripts/test-deployment-flow.sh staging latest
   ```

2. **Deploy to staging:**
   ```bash
   ./scripts/deploy-k8s.sh staging latest deploy
   ```

3. **Verify deployment:**
   ```bash
   ./scripts/verify-k8s-deployment.sh staging
   ```

### Detailed Deployment Steps

#### 1. Prerequisites Check
```bash
# Verify kubectl access
kubectl cluster-info

# Check environment file
ls -la .env.staging

# Validate manifests
./scripts/validate-k8s-manifests.sh staging
```

#### 2. Environment Setup
```bash
# Create actual environment file
cp .env.staging.example .env.staging

# Update secrets (DO NOT commit actual secrets)
vim k8s/staging/secrets.yaml

# Test configuration
./scripts/test-deployment-flow.sh staging latest
```

#### 3. Deployment
```bash
# Deploy application
./scripts/deploy-k8s.sh staging latest deploy

# Monitor deployment progress
kubectl get pods -n rabbit-launchpad -w
```

#### 4. Verification
```bash
# Verify all resources
./scripts/verify-k8s-deployment.sh staging

# Check application health
curl https://staging.rabbitlaunchpad.io/health

# View logs
./scripts/deploy-k8s.sh staging logs backend
```

### Deployment Commands

| Action | Command | Description |
|--------|---------|-------------|
| Deploy | `./scripts/deploy-k8s.sh staging latest deploy` | Deploy to staging |
| Status | `./scripts/deploy-k8s.sh staging status` | Check deployment status |
| Logs | `./scripts/deploy-k8s.sh staging logs backend` | View service logs |
| Scale | `./scripts/deploy-k8s.sh staging scale 3` | Scale deployments |
| Rollback | `./scripts/deploy-k8s.sh staging rollback` | Rollback deployment |
| Cleanup | `./scripts/deploy-k8s.sh staging cleanup` | Clean up resources |

## Verification

### Automated Verification
```bash
# Full deployment verification
./scripts/verify-k8s-deployment.sh staging

# Manifest validation
./scripts/validate-k8s-manifests.sh staging

# Deployment flow testing
./scripts/test-deployment-flow.sh staging latest
```

### Manual Verification Steps

1. **Namespace Status:**
   ```bash
   kubectl get namespace rabbit-launchpad
   ```

2. **Deployments:**
   ```bash
   kubectl get deployments -n rabbit-launchpad
   ```

3. **Pods:**
   ```bash
   kubectl get pods -n rabbit-launchpad
   ```

4. **Services:**
   ```bash
   kubectl get services -n rabbit-launchpad
   ```

5. **Ingress:**
   ```bash
   kubectl get ingress -n rabbit-launchpad
   ```

6. **Application Health:**
   ```bash
   curl https://staging.rabbitlaunchpad.io/health
   curl https://staging.rabbitlaunchpad.io/api/health
   ```

### Health Endpoints

- **Frontend Health**: `https://staging.rabbitlaunchpad.io/health`
- **Backend API**: `https://staging.rabbitlaunchpad.io/api/health`
- **API Docs**: `https://staging.rabbitlaunchpad.io/api/docs`

## Troubleshooting

### Common Issues

#### 1. Pod Not Starting
```bash
# Check pod status
kubectl get pods -n rabbit-launchpad

# Describe pod for errors
kubectl describe pod <pod-name> -n rabbit-launchpad

# View pod logs
kubectl logs <pod-name> -n rabbit-launchpad
```

#### 2. Service Not Accessible
```bash
# Check service configuration
kubectl get service -n rabbit-launchpad

# Test internal connectivity
kubectl run test-pod --image=curlimages/curl --rm -it -- \
  curl http://rabbit-backend:3001/health
```

#### 3. Ingress Issues
```bash
# Check ingress status
kubectl get ingress -n rabbit-launchpad

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

#### 4. Resource Issues
```bash
# Check resource usage
kubectl top pods -n rabbit-launchpad

# Check events
kubectl get events -n rabbit-launchpad --sort-by='.lastTimestamp'
```

### Rollback Procedures

#### Automatic Rollback
The deployment script includes automatic rollback on health check failures.

#### Manual Rollback
```bash
# Check deployment history
kubectl rollout history deployment/rabbit-backend -n rabbit-launchpad

# Rollback to previous version
kubectl rollout undo deployment/rabbit-backend -n rabbit-launchpad

# Verify rollback status
kubectl rollout status deployment/rabbit-backend -n rabbit-launchpad
```

## Maintenance

### Regular Tasks

#### 1. Monitor Resources
```bash
# Check resource usage
./scripts/deploy-k8s.sh staging status

# Monitor logs
./scripts/deploy-k8s.sh staging logs backend true  # Follow logs
```

#### 2. Backup and Cleanup
```bash
# Create backup (production only)
./scripts/deploy-k8s.sh production latest deploy  # Includes backup

# Clean up old resources
./scripts/deploy-k8s.sh staging cleanup
```

#### 3. Updates and Upgrades
```bash
# Deploy new version
./scripts/deploy-k8s.sh staging v1.2.0 deploy

# Verify update
./scripts/verify-k8s-deployment.sh staging
```

### Scaling

#### Manual Scaling
```bash
# Scale backend to 5 replicas
kubectl scale deployment/rabbit-backend --replicas=5 -n rabbit-launchpad

# Scale frontend to 2 replicas
kubectl scale deployment/rabbit-frontend --replicas=2 -n rabbit-launchpad
```

#### Auto Scaling
Horizontal Pod Autoscalers (HPA) are configured for automatic scaling based on CPU/memory usage.

### Monitoring and Logging

#### Application Monitoring
- **Metrics**: Prometheus endpoint at `/metrics`
- **Health**: Health endpoints at `/health` and `/api/health`
- **Logs**: Structured JSON logs with correlation IDs

#### Infrastructure Monitoring
- **Kubernetes**: kubectl commands and events
- **Pods**: Resource usage and health status
- **Services**: Network connectivity and response times

#### Log Collection
```bash
# View recent logs
kubectl logs deployment/rabbit-backend -n rabbit-launchpad --tail=100

# Follow logs in real-time
kubectl logs -f deployment/rabbit-backend -n rabbit-launchpad

# Logs from all pods
kubectl logs -l app=rabbit-backend -n rabbit-launchpad
```

## Security Considerations

### Secrets Management
- Never commit actual secrets to version control
- Use Kubernetes secrets for sensitive data
- Rotate secrets regularly
- Use different secrets for staging and production

### Network Security
- Use HTTPS/TLS for all external communication
- Configure network policies when needed
- Limit ingress access to required IPs
- Use internal services for inter-service communication

### Container Security
- Use official base images
- Regularly update base images
- Scan images for vulnerabilities
- Use resource limits to prevent DoS attacks

## Support and Contacts

For deployment issues:
1. Check the troubleshooting section
2. Review deployment logs
3. Check the verification reports
4. Contact the DevOps team

## Appendices

### Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| NODE_ENV | Yes | Application environment | `staging` |
| PORT | Yes | Application port | `3001` |
| DATABASE_URL | Yes | PostgreSQL connection string | `postgresql://...` |
| REDIS_URL | Yes | Redis connection string | `redis://localhost:6379` |
| JWT_SECRET | Yes | JWT signing secret | `your-secret-key` |
| AWS_S3_BUCKET | No | S3 bucket for backups | `my-bucket` |

### Kubernetes Resource Limits

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| Backend | 100m | 500m | 128Mi | 512Mi |
| Frontend | 50m | 200m | 64Mi | 256Mi |

### Port Mappings

| Service | Internal Port | External Port | Protocol |
|---------|---------------|---------------|----------|
| Backend | 3001 | - | TCP |
| Frontend | 3000 | 80/443 | TCP |
| PostgreSQL | 5432 | - | TCP |
| Redis | 6379 | - | TCP |