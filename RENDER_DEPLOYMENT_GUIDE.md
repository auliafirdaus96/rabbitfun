# 🚀 Render.com Deployment Guide - Rabbit Launchpad Backend

## 📋 Prerequisites

1. **Render.com Account**
   - Sign up at https://render.com
   - Connect your GitHub account

2. **GitHub Repository**
   - Push all code to GitHub
   - Ensure `backend/` folder is in the root

## 🛠️ Deployment Steps

### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → **New** → **PostgreSQL**
2. **Database Name**: `rabbit_launchpad`
3. **User**: `rabbit_user`
4. **Region**: Choose nearest region
5. **Plan**: Free (or paid for production)
6. **Create Database**

### Step 2: Create Redis Instance

1. Go to Render Dashboard → **New** → **Redis**
2. **Name**: `rabbit-redis`
3. **Plan**: Free
4. **Create Redis**

### Step 3: Deploy Backend Service

1. Go to Render Dashboard → **New** → **Web Service**
2. **Connect Repository**: Select your GitHub repo
3. **Root Directory**: `backend`
4. **Runtime**: Node
5. **Build Command**: `npm install`
6. **Start Command**: `npm start`
7. **Instance Type**: Free (or paid for production)

### Step 4: Configure Environment Variables

Add these environment variables to your web service:

```bash
# Database
DATABASE_URL=postgresql://rabbit_user:PASSWORD@HOST:PORT/rabbit_launchpad

# Redis
REDIS_URL=redis://USER:PASSWORD@HOST:PORT

# App Configuration
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secure-jwt-secret-key-here

# CORS
CORS_ORIGIN=https://rabbitfun.vercel.app
CORS_CREDENTIALS=true

# Blockchain
BSC_RPC_URL=https://bsc-dataseed.binance.org
BSC_CHAIN_ID=56

# WebSocket
WS_PORT=8081
WS_CORS_ORIGIN=https://rabbitfun.vercel.app

# Features
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true
ENABLE_SWAGGER=true
LOG_LEVEL=warn
```

### Step 5: Health Check Configuration

1. **Health Check Path**: `/api/health`
2. **Check Interval**: 30s
3. **Timeout**: 10s
4. **Retries**: 3

### Step 6: Deploy

1. Click **Create Web Service**
2. Wait for deployment to complete
3. Check deployment logs for any errors

## 🌐 Production URLs

After deployment, you'll get:
- **Backend URL**: `https://rabbit-backend.onrender.com`
- **API Documentation**: `https://rabbit-backend.onrender.com/api`
- **Health Check**: `https://rabbit-backend.onrender.com/api/health`

## 📱 Update Frontend Configuration

Update `frontend/.env.production`:

```bash
VITE_API_BASE_URL=https://rabbit-backend.onrender.com
VITE_WS_URL=wss://rabbit-backend.onrender.com
```

## 🔄 Auto-Deploy

Enable auto-deploy in Render settings:
- Go to your web service → **Settings**
- Enable **Auto-Deploy** on push to `main` branch

## 🛠️ Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database is running
   - Check user permissions

2. **Redis Connection Failed**
   - Check REDIS_URL format
   - Verify Redis instance is running

3. **Build Failed**
   - Check package.json scripts
   - Verify all dependencies are installed
   - Check Node.js version compatibility

4. **Health Check Failed**
   - Ensure `/api/health` endpoint exists
   - Check server startup logs

### Debug Steps:

1. **Check Logs**: Go to service → **Logs**
2. **Check Environment**: Verify all env vars are set
3. **Manual Deploy**: Trigger manual deploy from dashboard
4. **Local Test**: Test locally with production env vars

## 🚀 Production Optimizations

1. **Enable Paid Plan**: For better performance
2. **Add Custom Domain**: For professional branding
3. **Set Up Monitoring**: Use Render's built-in metrics
4. **Configure Backups**: Enable database backups
5. **Set Up Alerts**: Configure email alerts for downtime

## 📊 Monitoring

Render provides built-in monitoring:
- Response time
- Memory usage
- CPU usage
- Request count
- Error rate

Access via: Service → **Metrics**

## 🔐 Security

1. **Environment Variables**: Never commit secrets
2. **Database Security**: Use SSL connections
3. **CORS**: Configure properly for frontend domain
4. **Rate Limiting**: Already configured in app
5. **Security Headers**: Already configured with Helmet

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Status Page**: https://status.render.com
- **Support**: support@render.com

---

**Deployment Status Checklist:**

- [ ] PostgreSQL database created
- [ ] Redis instance created
- [ ] Backend service deployed
- [ ] Environment variables configured
- [ ] Health check passing
- [ ] Frontend API URL updated
- [ ] Auto-deploy enabled
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up
- [ ] Backups enabled

**Expected Timeline**: 15-30 minutes for complete deployment