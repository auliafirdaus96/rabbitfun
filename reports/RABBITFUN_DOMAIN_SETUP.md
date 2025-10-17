# 🐰 **Setup rabbitfun.vercel.app - Domain Configuration Guide**

## 📋 **Current Situation**

**Problem**: Production site menggunakan URL default Vercel:
- **Current URL**: `https://frontend-b1j37cm9d-aulias-projects-feb62b13.vercel.app`
- **Desired URL**: `https://rabbitfun.vercel.app`

**Solution**: Konfigurasi custom domain `rabbitfun.vercel.app` di Vercel.

## 🔄 **Step-by-Step Setup Guide**

### **Option 1: Via Vercel Dashboard (Recommended)**

#### **1. Login ke Vercel Dashboard**
1. Buka: https://vercel.com/dashboard
2. Login dengan akun GitHub Anda
3. Cari project `rabbit-launchpad-investors`

#### **2. Add Custom Domain**
1. Klik project settings (gear icon ⚙️)
2. Pilih tab **"Domains"**
3. Klik **"Add Custom Domain"**
4. Masukkan: `rabbitfun.vercel.app`
5. Klik **"Add"**

#### **3. Verify Domain Ownership**
Vercel akan menunjukkan opsi verifikasi:

**Option A: DNS Configuration (Jika Anda Own Domain)**
```
Type: CNAME
Name: rabbitfun
Value: cname.vercel-dns.com
TTL: 300 (atau "Default")
```

**Option B: Vercel Hosted (Simpler)**
- Pilih **"I want Vercel to manage DNS for my domain"**
- Tunggu proses verifikasi otomatis

#### **4. Wait for Propagation**
- **Time**: 5-30 menit untuk DNS propagation
- **Status**: Cek di dashboard Vercel

### **Option 2: Via Vercel CLI**

#### **1. Install Vercel CLI**
```bash
npm install -g vercel
```

#### **2. Add Domain via CLI**
```bash
# Login ke Vercel
vercel login

# Navigate ke project
cd /path/to/rabbitfun/frontend

# Add custom domain
vercel domains add rabbitfun.vercel.app
```

#### **3. Verify Domain**
```bash
# Cek status domain
vercel domains ls
```

## 🔧 **Alternative: Update vercel.json Configuration**

### **1. Update Project Name**
Edit `frontend/vercel.json`:
```json
{
  "version": 2,
  "name": "rabbitfun", // Ganti dari "rabbit-launchpad-investors"
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [...],
  "headers": [...]
}
```

### **2. Re-deploy dengan Nama Baru**
```bash
# Login ke Vercel
vercel login

# Deploy dengan nama baru
vercel --prod --name rabbitfun
```

### **3. Resulting URL**
Setelah deploy, Anda akan dapat URL:
`https://rabbitfun.vercel.app`

## 🚀 **Quick Deploy Method (Fastest)**

### **Langkah 1: Update vercel.json**
```bash
# Edit file vercel.json
cd /c/Users/Lenovo/RABBIT/frontend

# Update name field
sed -i 's/"rabbit-launchpad-investors"/"rabbitfun"/g' vercel.json
```

### **Langkah 2: Redeploy**
```bash
# Redeploy dengan nama baru
vercel --prod --name rabbitfun
```

### **Langkah 3: Cek Result**
Expected URL: `https://rabbitfun.vercel.app`

## ⚠️ **Troubleshooting**

### **Issue 1: Domain Already Taken**
**Solution**:
1. Coba alternatif: `rabbitfun-app.vercel.app`
2. Atau `rabbitfun-launchpad.vercel.app`
3. Cek ketersediaan: `vercel domains check rabbitfun.vercel.app`

### **Issue 2: DNS Propagation Delay**
**Solution**:
1. Tunggu 30-60 menit
2. Clear browser cache
3. Gunakan incognito mode
4. Cek dengan: `nslookup rabbitfun.vercel.app`

### **Issue 3: SSL Certificate Error**
**Solution**:
1. Tunggu SSL certificate generation (5-15 menit)
2. Cek status di Vercel dashboard
3. Force refresh browser: `Ctrl + Shift + R`

### **Issue 4: Build Failed**
**Solution**:
1. Test local build: `npm run build`
2. Check error logs: `vercel logs`
3. Fix environment variables

## 🔍 **Verification Steps**

### **Setelah Setup Selesai**

#### **1. Test Production URL**
- Buka: https://rabbitfun.vercel.app
- Expected: Tampilan homepage dengan Bakpao token

#### **2. Test Bakpao Token**
- Cari: 🥟 Bakpao Token di featured section
- Expected: Muncul dengan data yang benar

#### **3. Test Token Detail**
- Direct URL: https://rabbitfun.vercel.app/token/0xa16E02E87b7454126E5E10d957A927A7F5B5d2be
- Expected: Trading interface functional

#### **4. Test MetaMask Integration**
- Klik "Connect Wallet"
- Expected: MetaMask popup muncul

## 🎯 **Target URLs**

### **Primary (Goal)**
```
Homepage: https://rabbitfun.vercel.app
Token Detail: https://rabbitfun.vercel.app/token/0xa16E02E87b7454126E5E10d957A927A7F5B5d2be
```

### **Fallback (Alternative)**
```
Homepage: https://rabbitfun.vercel.app
Token Detail: https://rabbitfun.vercel.app/token/CONTRACT_ADDRESS
```

## 📱 **Mobile Testing**

### **Test di Mobile Browser**
1. Buka `rabbitfun.vercel.app` di mobile
2. Test responsive design
3. Test MetaMask mobile integration
4. Test token creation flow

## 🔄 **Post-Setup Checklist**

- [ ] Domain propagation complete (30-60 menit)
- [ ] SSL certificate active
- [ ] Homepage loads correctly
- [ ] Bakpao token visible in featured section
- [ ] Trading interface functional
- [ ] MetaMask integration working
- [ ] Mobile responsive design OK
- [ ] No console errors
- [ ] Real-time data loading

## 🆘 **Support Resources**

### **Vercel Documentation**
- Custom Domains: https://vercel.com/docs/concepts/projects/custom-domains
- DNS Configuration: https://vercel.com/docs/concepts/projects/custom-domains/dns-configuration
- Troubleshooting: https://vercel.com/docs/troubleshooting/domains

### **Community Support**
- Vercel Discord: https://vercel.com/discord
- Stack Overflow: Tag dengan `vercel`

### **Emergency Rollback**
Jika ada masalah:
```bash
# Kembali ke previous deployment
vercel rollback --to PREVIOUS_DEPLOYMENT_ID
```

---

**🎯 Target**: `https://rabbitfun.vercel.app` dengan Bakpao Token featured!