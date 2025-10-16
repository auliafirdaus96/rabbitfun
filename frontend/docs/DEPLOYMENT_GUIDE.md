# 🚀 Rabbit Launchpad - Deployment Guide

## 📋 Overview

Deployment guide for Rabbit Launchpad frontend across various environments. Covers all aspects from local development to production deployment.

## 🎯 Deployment Environments

### Environment Types
- **🏠 Local**: Development on local machine
- **🧪 Staging**: Pre-production testing
- **🌐 Production**: Live environment
- **📦 Demo**: Demo environment for showcase

### Environment Matrix

| Environment | URL | Purpose | Auto-deploy | Domain |
|-------------|-----|---------|-------------|--------|
| Local | `localhost:5173` | Development | Manual | N/A |
| Staging | `staging.rabbit-launchpad.com` | Testing | Git main | Subdomain |
| Production | `rabbit-launchpad.com` | Live | Git main | Custom |
| Demo | `demo.rabbit-launchpad.com` | Demo | Git develop | Subdomain |

---

## 🏠 Local Development Setup

### Prerequisites

#### System Requirements
- **Node.js**: 18.0+ (recommended: 20.x LTS)
- **npm**: 9.0+ or **yarn**: 1.22+
- **Git**: 2.30+
- **OS**: Windows 10+, macOS 12+, Ubuntu 20.04+

#### Browser Requirements
- **Chrome**: 100+ (recommended)
- **Firefox**: 100+
- **Safari**: 14+
- **Edge**: 100+
- **MetaMask**: Latest version

### Installation Steps

#### 1. Clone Repository
```bash
# Clone main repository
git clone https://github.com/rabbit-launchpad/frontend.git
cd rabbit-launchpad/frontend
```

#### 2. Install Dependencies
```bash
# Using npm
npm install

# Or using yarn
yarn install
```

#### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
# See Environment Configuration section below
```

#### 4. Start Development Server
```bash
# Start development server
npm run dev

# Or using yarn
yarn dev
```

#### 5. Access Application
- **Local URL**: http://localhost:5173
- **Hot Reload**: Enabled by default
- **API**: Points to local backend (if configured)

---

## ⚙️ Environment Configuration

### Environment Variables

#### Required Variables
```bash
# Smart Contract Configuration
VITE_LAUNCHPAD_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Network Configuration
VITE_BSC_RPC_URL=https://bsc-dataseed.binance.org/
VITE_BSC_CHAIN_ID=56
VITE_BSC_EXPLORER=https://bscscan.com

# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# App Configuration
VITE_APP_NAME=Rabbit Launchpad
VITE_APP_VERSION=1.0.0
```

#### Optional Variables
```bash
# Analytics & Monitoring
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Feature Flags
VITE_ENABLE_TESTNET=true
VITE_ENABLE_WALLET_CONNECT=true
VITE_ENABLE_NOTIFICATIONS=true

# UI Configuration
VITE_THEME_MODE=auto
VITE_DEFAULT_NETWORK=mainnet
```

### Environment Files

#### Development (.env.local)
```bash
# Development configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_BSC_CHAIN_ID=97  # Testnet
VITE_ENABLE_ANALYTICS=false
```

#### Production (.env.production)
```bash
# Production configuration
VITE_API_URL=https://api.rabbit-launchpad.com
VITE_WS_URL=wss://api.rabbit-launchpad.com
VITE_BSC_CHAIN_ID=56  # Mainnet
VITE_ENABLE_ANALYTICS=true
```

---

## 🚀 Build Process

### Development Build
```bash
# Build for development
npm run build:dev

# Or using yarn
yarn build:dev
```

### Production Build
```bash
# Build for production
npm run build

# Or using yarn
yarn build
```

### Build Output
- **Directory**: `dist/`
- **File Size**: ~1.5MB (gzipped: ~500KB)
- **Assets**: Optimized and hashed
- **Source Maps**: Generated for debugging

---

## 🌐 Production Deployment

### Vercel (Recommended)

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Login to Vercel
```bash
vercel login
```

#### 3. Deploy Project
```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

#### 4. Environment Variables Setup
```bash
# Set environment variables in Vercel dashboard
# or using CLI
vercel env add VITE_LAUNCHPAD_CONTRACT_ADDRESS
vercel env add VITE_BSC_RPC_URL
vercel env add VITE_API_URL
```

### Netlify

#### 1. Build Configuration
Create `netlify.toml`:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 2. Deploy to Netlify
```bash
# Build and deploy
npm run build

# Upload dist folder to Netlify
# or use Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### AWS S3 + CloudFront

#### 1. S3 Bucket Setup
```bash
# Create S3 bucket
aws s3 mb s3://rabbit-launchpad-frontend

# Configure bucket for static hosting
aws s3 website s3://rabbit-launchpad-frontend \
  --index-document index.html \
  --error-document index.html
```

#### 2. Deploy to S3
```bash
# Deploy build files
aws s3 sync dist/ s3://rabbit-launchpad-frontend --delete

# Set bucket policy for public access
aws s3api put-bucket-policy \
  --bucket rabbit-launchpad-frontend \
  --policy file://bucket-policy.json
```

#### 3. CloudFront Distribution
Create CloudFront distribution with:
- **Origin**: S3 bucket
- **Viewer Protocol**: Redirect HTTP to HTTPS
- **Custom Error Pages**: 403/404 -> /index.html

### Docker Deployment

#### 1. Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 2. Build and Run Docker Image
```bash
# Build image
docker build -t rabbit-launchpad-frontend .

# Run container
docker run -p 80:80 rabbit-launchpad-frontend
```

---

## 🔒 Security Configuration

### HTTPS/SSL
- **Vercel**: Automatic SSL certificates
- **Netlify**: Automatic SSL certificates
- **AWS**: Use AWS Certificate Manager
- **Custom**: Use Let's Encrypt

### Security Headers
```nginx
# Nginx security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

### Environment Security
- **Never commit** `.env.local` files
- **Use secrets management** for production
- **Rotate API keys** regularly
- **Monitor access logs**

---

## 📊 Monitoring & Analytics

### Performance Monitoring
```bash
# Enable performance monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true

# Configure monitoring
VITE_SENTRY_DSN=your-sentry-dsn
VITE_ANALYTICS_ID=your-analytics-id
```

### Error Tracking
```bash
# Enable error reporting
VITE_ENABLE_ERROR_REPORTING=true

# Configure error tracking
VITE_ERROR_TRACKING_SERVICE=sentry
VITE_ERROR_TRACKING_DSN=your-dsn
```

### Analytics Integration
```bash
# Google Analytics
VITE_GA_TRACKING_ID=GA_MEASUREMENT_ID

# Custom analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.rabbit-launchpad.com
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Automated Testing
```yaml
# Test configuration in package.json
{
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "build": "vite build"
  }
}
```

---

## 🚨 Troubleshooting

### Common Issues

#### Build Errors
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf dist .vite
npm run build
```

#### Environment Variables
```bash
# Verify environment variables
echo $VITE_API_URL
echo $VITE_LAUNCHPAD_CONTRACT_ADDRESS

# Check build output
npm run build
ls -la dist/
```

#### Network Issues
```bash
# Check network connectivity
curl -I https://bsc-dataseed.binance.org/

# Test API endpoint
curl -H "Accept: application/json" \
  https://api.rabbit-launchpad.com/health
```

### Performance Issues
- **Bundle Analysis**: `npm run build:analyze`
- **Source Maps**: Enable for debugging
- **Lazy Loading**: Implement route-based code splitting
- **Image Optimization**: Use WebP format

---

## 📝 Best Practices

### Code Quality
- **TypeScript**: Use strict mode
- **ESLint**: Configure strict rules
- **Prettier**: Consistent formatting
- **Husky**: Pre-commit hooks

### Performance
- **Bundle Size**: Keep under 2MB
- **Loading Speed**: < 3 seconds
- **Core Web Vitals**: > 90 score
- **Image Optimization**: WebP format

### Security
- **Dependencies**: Regular updates
- **Audit**: `npm audit` regularly
- **Environment**: No secrets in code
- **HTTPS**: Enforce everywhere

---

## 📚 Additional Resources

### Documentation
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Web3 Documentation](https://docs.ethers.org/)

### Tools & Services
- [Vercel Platform](https://vercel.com/)
- [Netlify Platform](https://www.netlify.com/)
- [AWS Services](https://aws.amazon.com/)
- [GitHub Actions](https://github.com/features/actions)

### Community
- [Rabbit Launchpad Discord](https://discord.gg/rabbit)
- [GitHub Discussions](https://github.com/rabbit-launchpad/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/rabbit-launchpad)

---

<div align="center">

**🐰 Rabbit Launchpad Frontend**

**🚀 Deploy with confidence using this guide**

**Need help?** [Discord](https://discord.gg/rabbit) • [GitHub Issues](https://github.com/rabbit-launchpad/issues)

</div>