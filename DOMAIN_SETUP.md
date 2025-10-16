# 🌐 Custom Domain Setup for RabbitFun Launchpad

## Recommended Domain Names

### **Primary Options:**
- `rabbitfun.io` - Professional, tech-focused
- `rabbitlaunch.app` - Launchpad focused
- `rabbitfund.io` - Financial/funding focused

### **Premium Options:**
- `rabbit.com` - May be expensive
- `rabbit.io` - Tech-focused
- `rabbitfund.com` - Professional finance

## Setup Steps

### 1. Purchase Domain
```bash
# Recommended registrars:
- Namecheap.com (affordable, good support)
- GoDaddy.com (popular, expensive)
- Cloudflare.com (free DNS, good security)
```

### 2. Configure DNS for Vercel
```bash
# Add these DNS records:
# For rabbitfun.io
A     @     76.76.21.21
A     @     76.76.19.61
CNAME www   rabbit-launchpad.vercel.app
```

### 3. Vercel Configuration
```bash
# Add domain to Vercel project
cd frontend
vercel domains add rabbitfun.io

# Verify domain ownership
vercel domains verify rabbitfun.io
```

### 4. SSL Certificate
- ✅ Auto-provisioned by Vercel
- ✅ HTTPS enabled by default
- ✅ Automatic renewal

## Cost Estimate
- **Domain**: $10-15/year (.io, .app)
- **Vercel Pro**: $20/month (if needed)
- **Total**: ~$250/year minimum

## Benefits for Investor Presentation
- ✅ Professional branding
- ✅ Trust building
- ✅ Easy to remember
- ✅ Better SEO
- ✅ Email addresses (contact@rabbitfun.io)

## Next Actions
1. **Choose domain name**
2. **Purchase domain**
3. **Update Vercel configuration**
4. **Update all documentation**
5. **Set up email forwarding**

## Email Setup (Optional)
```bash
# Forward emails to personal address:
contact@rabbitfun.io -> your.email@gmail.com
info@rabbitfun.io -> your.email@gmail.com
investors@rabbitfun.io -> your.email@gmail.com
```