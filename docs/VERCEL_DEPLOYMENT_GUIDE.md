# 🚀 Vercel Deployment Guide

> **Complete guide untuk deploy Rabbit Launchpad Investor Presentation ke Vercel**

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup Akun Vercel](#setup-akun-vercel)
3. [Method 1: Otomatis dengan Script](#method-1-otomatis-dengan-script)
4. [Method 2: Manual via CLI](#method-2-manual-via-cli)
5. [Method 3: Via Web Dashboard](#method-3-via-web-dashboard)
6. [Konfigurasi Custom Domain](#konfigurasi-custom-domain)
7. [Monitoring & Analytics](#monitoring--analytics)
8. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### Required Tools
- **Node.js 18+** - Sudah terinstall
- **Git** - Untuk version control
- **Vercel Account** - Buat di vercel.com
- **Vercel CLI** - Akan diinstall otomatis

### Project Structure
```
RABBIT/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── InvestorLanding.tsx
│   │   │   └── InvestorPage.tsx
│   │   └── components/
│   │       └── InteractiveDemo.tsx
│   ├── vercel.json          ⭐ Konfigurasi Vercel
│   ├── package.json
│   └── dist/                ⭐ Build output
├── scripts/
│   └── deploy-vercel.sh     ⭐ Deployment script
└── docs/
    └── VERCEL_DEPLOYMENT_GUIDE.md
```

---

## 🎯 Method 1: Otomatis dengan Script (Recommended)

### Langkah 1: Persiapan
```bash
# Navigate ke project root
cd C:\Users\Lenovo\RABBIT

# Login ke Vercel (hanya perlu sekali)
vercel login
```

### Langkah 2: Jalankan Deployment Script
```bash
# Jalankan script deployment otomatis
./scripts/deploy-vercel.sh
```

**Script akan otomatis:**
- ✅ Build aplikasi untuk production
- ✅ Konfigurasi environment variables
- ✅ Optimasi assets untuk Vercel
- ✅ Deploy ke production
- ✅ Memberikan deployment URL

### Langkah 3: Verifikasi
1. Buka URL yang diberikan oleh script
2. Test halaman `/investors`
3. Test interactive demo
4. Share URL ke investors

---

## 🛠️ Method 2: Manual via CLI

### Langkah 1: Setup Vercel CLI
```bash
# Install Vercel CLI (jika belum)
npm install -g vercel

# Login ke Vercel
vercel login
```

### Langkah 2: Konfigurasi Project
```bash
# Navigate ke frontend directory
cd frontend

# Inisialisasi project Vercel
vercel

# Jawab pertanyaan:
# ? Set up and deploy "~/frontend"? [Y/n] y
# ? Which scope do you want to deploy to? [username]
# ? Link to existing project? [y/N] n
# ? What's your project's name? rabbit-launchpad-investors
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] n
```

### Langkah 3: Deploy ke Production
```bash
# Deploy ke production
vercel --prod
```

### Langkah 4: Configure Custom Settings (Optional)
```bash
# Edit project settings
vercel project add

# Configure domain, environment variables, dll
```

---

## 🌐 Method 3: Via Web Dashboard

### Langkah 1: Push ke GitHub
```bash
# Init git repository
git init
git add .
git commit -m "Initial commit - Rabbit Launchpad Investor Site"

# Push ke GitHub
git remote add origin https://github.com/username/rabbit-launchpad.git
git push -u origin main
```

### Langkah 2: Import di Vercel
1. Buka [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import GitHub repository
4. Configure settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Langkah 3: Environment Variables
Add environment variables di Vercel dashboard:
```
VITE_INVESTOR_MODE=true
VITE_APP_TITLE=Rabbit Launchpad - Investor Presentation
VITE_APP_DESCRIPTION=Enterprise-Grade Token Launch Platform Seeking Strategic Investment
```

### Langkah 4: Deploy
1. Click "Deploy"
2. Tunggu deployment selesai
3. Copy deployment URL

---

## 🌟 Konfigurasi Custom Domain

### Method 1: Via CLI
```bash
# Tambah custom domain
vercel domains add rabbit-launchpad.com

# Verify domain
vercel domains ls
```

### Method 2: Via Dashboard
1. Buka Vercel project dashboard
2. Go to "Settings" → "Domains"
3. Add custom domain
4. Configure DNS records:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

---

## 📊 Monitoring & Analytics

### View Deployment Logs
```bash
# View recent logs
vercel logs --since=1h

# View real-time logs
vercel logs --follow
```

### Performance Monitoring
1. **Vercel Analytics** - Built-in analytics
2. **Vercel Speed Insights** - Core Web Vitals
3. **Google Search Console** - SEO monitoring

### Custom Analytics (Optional)
Tambahkan tracking scripts di `frontend/index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## 🔧 Konfigurasi Lanjutan

### Environment Variables Production
```bash
# Set production environment variables
vercel env add VITE_INVESTOR_MODE production
vercel env add VITE_APP_TITLE production
vercel env add VITE_APP_DESCRIPTION production
```

### Custom Build Configuration
Edit `frontend/vercel.json`:
```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "regions": ["sin1"],
  "functions": {
    "memory": 1024,
    "timeout": 30
  }
}
```

### SEO Optimization
Files yang sudah di-generate otomatis:
- `public/robots.txt`
- `public/sitemap.xml`
- Meta tags di HTML

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Build Failed
```bash
# Clear cache dan rebuild
rm -rf node_modules dist
npm install
npm run build
```

#### 2. Routing Issues
```bash
# Check vercel.json configuration
cat vercel.json

# Test routing locally
npm run preview
```

#### 3. Environment Variables Not Working
```bash
# Check environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.production
```

#### 4. Performance Issues
```bash
# Analyze bundle size
npm run build -- --analyze

# Check Vercel Analytics
vercel logs --since=24h
```

#### 5. Custom Domain Not Working
```bash
# Check DNS configuration
nslookup rabbit-launchpad.com

# Check domain status
vercel domains ls
```

### Error Codes & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `BUILD_FAILED` | Build error | Check build logs, fix syntax errors |
| `DEPLOYMENT_TIMEOUT` | Large build | Optimize assets, increase timeout |
| `ROUTING_ERROR` | Wrong routing | Fix vercel.json rewrites |
| `ENV_VAR_ERROR` | Missing env vars | Add environment variables |

---

## 📱 Mobile Optimization

### Responsive Testing
Test di berbagai devices:
- Mobile phones (iOS/Android)
- Tablets
- Desktop
- Different browsers

### Performance Optimization
- Image optimization
- Code splitting
- Lazy loading
- Cache optimization

---

## 🔒 Security Configuration

### Headers Otomatis
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

### HTTPS
- ✅ Otomatis enabled oleh Vercel
- ✅ SSL certificate gratis
- ✅ Auto-renewal

---

## 📈 Best Practices

### 1. CI/CD Integration
```bash
# Connect GitHub repository
vercel link

# Automatic deployments on push
# Production: main branch
# Preview: pull requests
```

### 2. Branch Strategy
```
main (Production)
├── develop (Staging)
├── feature/investor-site
└── hotfix/fixes
```

### 3. Environment Management
- **Development**: Local development
- **Preview**: Pull request previews
- **Production**: Main branch

### 4. Performance Monitoring
- Core Web Vitals
- Bundle size analysis
- Error tracking
- User experience metrics

---

## 🎯 Post-Deployment Checklist

### ✅ Immediate Tasks
- [ ] Test semua pages
- [ ] Test interactive demo
- [ ] Test responsive design
- [ ] Test mobile navigation
- [ ] Verify SEO meta tags

### ✅ Configuration Tasks
- [ ] Setup custom domain
- [ ] Configure analytics
- [ ] Set up monitoring alerts
- [ ] Add team members to Vercel

### ✅ Content Tasks
- [ ] Update project description
- [ ] Add social media links
- [ ] Create social sharing images
- [ ] Test social sharing functionality

---

## 📞 Support & Resources

### Vercel Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Framework Guides](https://vercel.com/docs/frameworks)

### Community Support
- [Vercel Discord](https://vercel.com/discord)
- [GitHub Issues](https://github.com/vercel/vercel/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/vercel)

### Emergency Contacts
- Vercel Support: support@vercel.com
- Project Team: dev@rabbit-launchpad.com

---

## 🚀 Quick Start Command Summary

```bash
# 1. Setup awal
npm install -g vercel
vercel login

# 2. Deploy otomatis (Recommended)
./scripts/deploy-vercel.sh

# 3. Deploy manual
cd frontend
vercel --prod

# 4. Monitor deployment
vercel logs --follow

# 5. Add custom domain
vercel domains add rabbit-launchpad.com
```

---

**🎉 Website investor presentation Rabbit Launchpad siap di Vercel!**

**URL Production**: `https://rabbit-launchpad-investors.vercel.app/investors`
**Custom Domain**: `https://rabbit-launchpad.com/investors` (setelah konfigurasi)

*Selamat! Website investor Anda sudah live dan siap untuk presentasi ke angel investor.* 🚀