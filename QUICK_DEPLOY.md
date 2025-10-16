# 🚀 Quick Vercel Deployment

## Cara Cepat Deploy ke Vercel

### Langkah 1: Login ke Vercel (hanya sekali)
```bash
vercel login
```

### Langkah 2: Deploy Otomatis
```bash
# Cara 1: Pakai script otomatis (RECOMMENDED)
./scripts/deploy-vercel.sh

# Cara 2: Manual dari frontend folder
cd frontend
vercel --prod
```

### Langkah 3: Akses Website
Setelah deploy selesai, website akan accessible di:
- **URL Otomatis**: `https://rabbit-launchpad-investors-xxxx.vercel.app`
- **Halaman Investor**: Tambah `/investors` di URL

## 🔥 Quick Commands

```bash
# Deploy sekarang
cd C:\Users\Lenovo\RABBIT
./scripts/deploy-vercel.sh

# Cek deployment logs (ganti URL dengan deployment URL yang sebenarnya)
vercel logs https://frontend-ng1pu9b9a-aulias-projects-feb62b13.vercel.app

# Lihat semua deployments
vercel ls --yes

# Update custom domain
vercel domains add your-domain.com
```

## ✅ Hasil

Website investor presentation dengan fitur:
- 🎯 Professional landing page
- 📊 Interactive demo
- 📱 Mobile responsive
- 🚀 Production ready
- 📈 SEO optimized

**Estimasi waktu deploy: 2-5 menit**