# 🍕 GastroPod & GastroMatch Deployment Guide

Bu dokümanda GastroPod ve GastroMatch uygulamalarını `baranbasaran.com` sunucusuna nasıl kuracağınız anlatılmaktadır.

## 📋 Gereksinimler

- Debian 12 sunucu
- Node.js 18+ yüklü olmalı
- Nginx reverse proxy
- PM2 (Next.js uygulamalarını production'da çalıştırmak için)

---

## 🚀 Adım 1: Node.js Kurulumu

Sunucuya SSH ile bağlanın ve Node.js kurun:

```bash
# Node.js 20.x (LTS) kurulumu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Versiyonları kontrol edin
node --version  # v20.x.x olmalı
npm --version
```

---

## 📦 Adım 2: PM2 Kurulumu

PM2, Node.js uygulamalarını production'da çalıştırmak için kullanılır:

```bash
sudo npm install -g pm2
```

---

## 🔧 Adım 3: GastroPod Kurulumu

```bash
cd /home/baran/sunucu/projects/gastropod

# Bağımlılıkları yükleyin
npm install

# Production build oluşturun
npm run build

# PM2 ile başlatın (port 3001)
pm2 start npm --name "gastropod" -- start -- -p 3001
```

---

## 🔧 Adım 4: GastroMatch Kurulumu

```bash
cd /home/baran/sunucu/projects/gastromatch

# Bağımlılıkları yükleyin
npm install

# Production build oluşturun
npm run build

# PM2 ile başlatın (port 3002)
pm2 start npm --name "gastromatch" -- start -- -p 3002
```

---

## 🌐 Adım 5: Nginx Yapılandırması

`/etc/nginx/sites-available/baranbasaran.com` dosyasını düzenleyin ve aşağıdaki location bloklarını ekleyin:

```nginx
server {
    listen 443 ssl http2;
    server_name baranbasaran.com www.baranbasaran.com;

    # SSL sertifikaları (mevcut)
    ssl_certificate /etc/letsencrypt/live/baranbasaran.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/baranbasaran.com/privkey.pem;

    # Ana Flask uygulaması (mevcut)
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # GastroPod App (Next.js - Port 3001)
    location /gastropod-app/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # GastroMatch App (Next.js - Port 3002)
    location /gastromatch-app/ {
        proxy_pass http://127.0.0.1:3002/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Next.js static files için
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001/_next/static/;
        proxy_http_version 1.1;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

Nginx yapılandırmasını test edin ve yeniden yükleyin:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Adım 6: PM2 Otomatik Başlatma

Sunucu yeniden başlatıldığında uygulamaların otomatik açılması için:

```bash
# Mevcut uygulamaları kaydedin
pm2 save

# Sistem başlangıcında PM2'yi başlatın
pm2 startup systemd
# Çıktıdaki komutu çalıştırın (sudo ile başlayan komut)
```

---

## 📊 Adım 7: Kontrol ve Yönetim

### PM2 Komutları

```bash
# Çalışan uygulamaları listele
pm2 list

# Logları izle
pm2 logs

# Bir uygulamayı yeniden başlat
pm2 restart gastropod
pm2 restart gastromatch

# Uygulamayı durdur
pm2 stop gastropod
pm2 stop gastromatch

# Kaynak kullanımını izle
pm2 monit
```

### Test

- GastroPod bilgi sayfası: `https://baranbasaran.com/gastropod`
- GastroPod uygulama: `https://baranbasaran.com/gastropod-app`
- GastroMatch uygulama: `https://baranbasaran.com/gastromatch-app`

---

## 🔍 Sorun Giderme

### Port kullanımda hatası

```bash
# 3001 ve 3002 portlarını kontrol edin
sudo netstat -tulpn | grep :3001
sudo netstat -tulpn | grep :3002

# Gerekirse uygulamayı durdurun
pm2 stop gastropod
pm2 stop gastromatch
```

### Build hatası

```bash
# node_modules'ü temizleyin ve yeniden yükleyin
cd /home/baran/sunucu/projects/gastropod
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Nginx hatası

```bash
# Nginx loglarını kontrol edin
sudo tail -f /var/log/nginx/error.log

# Nginx yapılandırmasını test edin
sudo nginx -t
```

---

## 🔄 Güncelleme (GitHub Actions ile Otomatik)

GitHub'a push attığınızda otomatik olarak güncellenir. Ancak manuel güncelleme için:

```bash
cd /home/baran/sunucu
git pull origin main

# GastroPod'u güncelle
cd projects/gastropod
npm install
npm run build
pm2 restart gastropod

# GastroMatch'i güncelle
cd ../gastromatch
npm install
npm run build
pm2 restart gastromatch

# Ana Flask uygulamasını yeniden başlat
sudo systemctl restart sunucu
```

---

## 📝 Notlar

- **GastroPod:** Port 3001'de çalışır, yemek puanlama uygulaması
- **GastroMatch:** Port 3002'de çalışır, profil analizi uygulaması
- Her iki uygulama da **Inrupt Pod** ile çalışır, kullanıcılar kendi Pod hesaplarıyla giriş yapar
- Veriler merkezi veritabanında **değil**, kullanıcıların Pod'larında saklanır

---

**Deployment tamamlandı! 🎉**

