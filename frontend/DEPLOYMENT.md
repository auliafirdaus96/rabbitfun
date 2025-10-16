# RabbitFun Launchpad - Deployment Guide

## Table of Contents
1. [Environment Configuration](#environment-configuration)
2. [Production Deployment](#production-deployment)
3. [Development Deployment](#development-deployment)
4. [Staging Deployment](#staging-deployment)
5. [Security Checklist](#security-checklist)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Environment Configuration

### Step 1: Environment Variables Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local        # For development
   cp .env.example .env.staging      # For staging
   cp .env.example .env.production   # For production
   ```

2. **Update configuration values:**

   **Critical variables that MUST be updated:**
   ```bash
   # API Configuration
   VITE_API_BASE_URL=https://api.rabbitfun.io
   VITE_WS_URL=wss://api.rabbitfun.io

   # Blockchain Configuration
   VITE_CHAIN_ID=56
   VITE_RPC_URL=https://bsc-dataseed.binance.org
   VITE_BLOCK_EXPLORER_URL=https://bscscan.com

   # Smart Contract Addresses (update after deployment)
   VITE_BONDING_CURVE_ADDRESS=0x...
   VITE_TOKEN_FACTORY_ADDRESS=0x...
   VITE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E

   # Security Configuration
   VITE_CORS_ORIGIN=https://rabbitfun.io
   VITE_RATE_LIMIT_REQUESTS=50
   VITE_RATE_LIMIT_WINDOW=60000

   # Application Configuration
   VITE_APP_NAME=RabbitFun Launchpad
   VITE_APP_VERSION=1.0.0
   VITE_APP_URL=https://rabbitfun.io
   ```

3. **Production-specific security settings:**
   ```bash
   # Security (must be true in production)
   VITE_SECURITY_HEADERS_ENABLED=true
   VITE_CSP_ENABLED=true
   VITE_BUILD_SOURCEMAP=false

   # Features (disable development features)
   VITE_ENABLE_DEV_TOOLS=false
   VITE_ENABLE_DEBUG_LOGS=false
   VITE_ENABLE_MOCK_DATA=false

   # Monitoring (enable in production)
   VITE_ENABLE_ERROR_REPORTING=true
   VITE_ENABLE_PERFORMANCE_MONITORING=true
   ```

### Step 2: Feature Flags Configuration

1. **Enable/disable features per environment:**
   ```bash
   # Production features
   VITE_ENABLE_ANALYTICS=true
   VITE_ENABLE_SOCIAL_FEATURES=true
   VITE_ENABLE_ADVANCED_SEARCH=true
   VITE_ENABLE_NOTIFICATIONS=true

   # Experimental features (keep disabled in production)
   VITE_ENABLE_AI_FEATURES=false
   VITE_ENABLE_NFT_FEATURES=false
   VITE_ENABLE_STAKING=false
   ```

2. **Review feature flags in production:**
   ```bash
   # Use the production validator to check configuration
   npm run validate:production
   ```

## Production Deployment

### Method 1: Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy to production:**
   ```bash
   # Build and deploy
   npm run build
   vercel --prod

   # Or with specific configuration
   vercel --prod --env .env.production
   ```

4. **Configure domain:**
   ```bash
   # Add custom domain
   vercel domains add rabbitfun.io
   ```

### Method 2: Netlify Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify:**
   ```bash
   # Install Netlify CLI
   npm i -g netlify-cli

   # Login
   netlify login

   # Deploy
   netlify deploy --prod --dir=dist
   ```

3. **Configure environment variables:**
   - Go to Netlify dashboard
   - Site settings → Environment variables
   - Add all production variables

### Method 3: Docker Deployment

1. **Build Docker image:**
   ```bash
   docker build -t rabbitfun-frontend .
   ```

2. **Run container:**
   ```bash
   docker run -p 80:80 \
     -e VITE_API_BASE_URL=https://api.rabbitfun.io \
     -e VITE_APP_URL=https://rabbitfun.io \
     rabbitfun-frontend
   ```

3. **Docker Compose:**
   ```yaml
   version: '3.8'
   services:
     frontend:
       build: .
       ports:
         - "80:80"
       environment:
         - VITE_API_BASE_URL=https://api.rabbitfun.io
         - VITE_APP_URL=https://rabbitfun.io
       env_file:
         - .env.production
   ```

### Method 4: Traditional Web Server

1. **Build application:**
   ```bash
   npm run build
   ```

2. **Configure web server (nginx example):**
   ```nginx
   server {
       listen 80;
       server_name rabbitfun.io;

       # Security headers
       add_header X-Frame-Options DENY;
       add_header X-Content-Type-Options nosniff;
       add_header X-XSS-Protection "1; mode=block";
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

       # Serve static files
       location / {
           root /var/www/rabbitfun/dist;
           try_files $uri $uri/ /index.html;

           # Cache static assets
           location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
               expires 1y;
               add_header Cache-Control "public, immutable";
           }
       }
   }
   ```

## Development Deployment

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Copy environment file:**
   ```bash
   cp .env.example .env.local
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

### Development with Docker

1. **Build and run:**
   ```bash
   docker-compose up -d
   ```

2. **Access application:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

## Staging Deployment

### Staging Environment Setup

1. **Configure staging environment:**
   ```bash
   cp .env.example .env.staging
   ```

2. **Update staging variables:**
   ```bash
   # Use testnet configurations
   VITE_CHAIN_ID=97
   VITE_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
   VITE_BLOCK_EXPLORER_URL=https://testnet.bscscan.com

   # Enable debugging features
   VITE_ENABLE_DEBUG_LOGS=true
   VITE_ENABLE_PERFORMANCE_MONITORING=true
   ```

3. **Deploy to staging:**
   ```bash
   # Vercel staging
   vercel --env .env.staging

   # Netlify staging
   netlify deploy --dir=dist
   ```

## Security Checklist

### Pre-Deployment Security Checks

1. **Environment Variables:**
   - [ ] No hardcoded secrets in code
   - [ ] All sensitive variables are in environment files
   - [ ] Production secrets are different from development
   - [ ] API keys are rotated regularly

2. **Configuration Security:**
   - [ ] Source maps disabled in production
   - [ ] Debug logging disabled in production
   - [ ] Development tools disabled in production
   - [ ] Security headers enabled

3. **Network Security:**
   - [ ] HTTPS enforced
   - [ ] CORS properly configured
   - [ ] CSP headers configured
   - [ ] Rate limiting enabled

4. **Application Security:**
   - [ ] Input validation enabled
   - [ ] XSS prevention measures in place
   - [ ] CSRF protection enabled
   - [ ] Error handling doesn't leak information

### Production Security Validation

1. **Run security validator:**
   ```bash
   npm run validate:security
   ```

2. **Check feature flags:**
   ```bash
   npm run validate:features
   ```

3. **Review configuration:**
   ```bash
   npm run validate:config
   ```

## Performance Optimization

### Build Optimization

1. **Bundle analysis:**
   ```bash
   npm run analyze
   ```

2. **Optimization checks:**
   ```bash
   npm run lighthouse
   npm run bundle:check
   ```

3. **Performance budget validation:**
   ```bash
   npm run validate:performance
   ```

### Caching Strategy

1. **Static asset caching:**
   - Set appropriate cache headers
   - Use content hashing for cache busting
   - Enable CDN caching

2. **API response caching:**
   - Configure cache TTL
   - Implement cache invalidation
   - Monitor cache hit rates

3. **Browser caching:**
   - Enable service worker
   - Configure offline support
   - Cache critical resources

## Monitoring and Maintenance

### Health Checks

1. **Application health:**
   ```bash
   # Health check endpoint
   GET /health
   ```

2. **Performance monitoring:**
   - Page load time tracking
   - Error rate monitoring
   - User experience metrics

3. **Security monitoring:**
   - Error tracking
   - Security incident alerts
   - Performance anomaly detection

### Maintenance Tasks

1. **Regular maintenance:**
   - Update dependencies
   - Rotate API keys
   - Review and update security policies

2. **Performance monitoring:**
   - Analyze performance metrics
   - Optimize slow queries
   - Monitor user experience

3. **Security updates:**
   - Apply security patches
   - Review security configurations
   - Update security policies

## Troubleshooting

### Common Issues

1. **Build failures:**
   ```bash
   # Clear cache and rebuild
   rm -rf node_modules dist
   npm install
   npm run build
   ```

2. **Environment variable issues:**
   ```bash
   # Validate environment variables
   npm run validate:env
   ```

3. **Performance issues:**
   ```bash
   # Run performance diagnostics
   npm run diagnose:performance
   ```

4. **Security issues:**
   ```bash
   # Run security audit
   npm run audit:security
   ```

### Debug Mode

1. **Enable debug mode:**
   ```bash
   # Add to .env.local
   VITE_ENABLE_DEBUG_LOGS=true
   VITE_LOG_LEVEL=debug
   ```

2. **Development tools:**
   ```bash
   # Enable development tools
   VITE_ENABLE_DEV_TOOLS=true
   ```

3. **Mock data:**
   ```bash
   # Enable mock data for testing
   VITE_ENABLE_MOCK_DATA=true
   ```

### Support

1. **Check logs:**
   ```bash
   # Application logs
   tail -f logs/app.log

   # Error logs
   tail -f logs/error.log
   ```

2. **Monitoring dashboard:**
   - Application health status
   - Performance metrics
   - Error tracking

3. **Documentation:**
   - [API Documentation](./API.md)
   - [Security Guide](./SECURITY.md)
   - [Performance Guide](./PERFORMANCE.md)

## Deployment Checklist

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Security settings validated
- [ ] Performance optimization applied
- [ ] Feature flags configured
- [ ] Build process tested
- [ ] SSL certificates configured
- [ ] Monitoring set up
- [ ] Backup procedures tested

### Post-Deployment Checklist

- [ ] Application accessible via HTTPS
- [ ] All pages load correctly
- [ ] API endpoints responding
- [ ] Security headers present
- [ ] Error monitoring working
- [ ] Performance metrics collecting
- [ ] User authentication working
- [ ] Database connections stable

### Rollback Plan

1. **Quick rollback:**
   ```bash
   # Vercel rollback
   vercel rollback

   # Netlify rollback
   netlify deploy --prod --dir=dist-previous
   ```

2. **Database rollback:**
   ```bash
   # Restore database backup
   pg_restore -d rabbitfun_prod backup.sql
   ```

3. **Configuration rollback:**
   ```bash
   # Restore previous configuration
   git checkout HEAD~1 -- .env.production
   ```

## Emergency Procedures

### Emergency Shutdown

1. **Enable maintenance mode:**
   ```bash
   # Add to .env.production
   VITE_MAINTENANCE_MODE=true
   VITE_MAINTENANCE_MESSAGE="Emergency maintenance in progress"
   ```

2. **Disable critical features:**
   ```bash
   # Add to .env.production
   VITE_ENABLE_TRADING=false
   VITE_ENABLE_TOKEN_CREATION=false
   ```

3. **Redirect to status page:**
   ```bash
   VITE_MAINTENANCE_REDIRECT_URL=https://status.rabbitfun.io
   ```

### Emergency Contact

- **Technical Lead:** [contact information]
- **DevOps Team:** [contact information]
- **Security Team:** [contact information]
- **Support Team:** [contact information]

---

## Notes

1. Always test deployment in staging before production
2. Keep production environment variables secure
3. Monitor application performance after deployment
4. Have rollback procedures ready
5. Keep documentation up to date
6. Regular security audits are recommended
7. Monitor and update dependencies regularly
8. Test emergency procedures regularly