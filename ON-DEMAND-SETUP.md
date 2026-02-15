# 🔋 On-Demand Servis Başlatma Kurulumu

Bu sistem, GastroPod ve GastroMatch uygulamalarını **sadece ziyaret edildiğinde** başlatır ve **20 dakika boyunca kullanılmazsa otomatik durdurur**.

## 🎯 Avantajlar

✅ **Enerji Tasarrufu:** Kullanılmayan servisler RAM/CPU harcamaz  
✅ **Daha Az Isınma:** Boşta sadece Flask (~65 MB) çalışır  
✅ **Otomatik Yönetim:** Manuel müdahale gerektirmez  
✅ **Kullanıcı Dostu:** İlk erişimde 3-5 saniye "yükleniyor" ekranı

## 📦 Kurulum Adımları

### 1️⃣ Dosyaları Sunucuya Deploy Et

```bash
# Lokal bilgisayarınızda
cd D:\Projeler\sunucu-deploy
git add .
git commit -m "feat: on-demand service management"
git push origin main
```

### 2️⃣ Sunucuda Çek ve Test Et

```bash
# Sunucuda
cd /home/baran/sunucu
git pull origin main

# Flask'ı yeniden başlat
sudo systemctl restart sunucu

# Test et
curl http://localhost:5000/
```

### 3️⃣ PM2 Servislerini Durdur (İlk Kurulum)

```bash
# Mevcut servisleri durdur (artık on-demand olacaklar)
pm2 stop gastropod gastromatch
pm2 save

# PM2 otomatik başlatmayı KALDIR
pm2 unstartup systemd
```

### 4️⃣ Idle Checker'ı Cron Job Olarak Ekle

```bash
# Script'i çalıştırılabilir yap
chmod +x /home/baran/sunucu/scripts/check_idle_services.sh

# Crontab'a ekle (her 5 dakikada bir kontrol eder)
crontab -e
```

Aşağıdaki satırı ekle:

```bash
*/5 * * * * /home/baran/sunucu/scripts/check_idle_services.sh >> /home/baran/sunucu/logs/idle_checker.log 2>&1
```

Kaydet ve çık (`:wq`).

```bash
# Cron job'u kontrol et
crontab -l
```

### 5️⃣ Nginx Reverse Proxy'yi Güncelle (ÖNEMLİ!)

```bash
sudo nano /etc/nginx/sites-available/baranbasaran.com
```

`/gastropod-app` ve `/gastromatch-app` location'larını ekle:

```nginx
server {
    listen 443 ssl http2;
    server_name baranbasaran.com www.baranbasaran.com;

    # ... SSL ayarları ...

    # GastroPod On-Demand
    location /gastropod-app {
        # İlk erişimde Flask yükleme ekranını gösterir
        # Servis başladıktan sonra buraya gelen istekler port 3001'e gider
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout ayarları (Next.js başlama süresi)
        proxy_connect_timeout 15s;
        proxy_send_timeout 15s;
        proxy_read_timeout 15s;
        
        # Eğer port 3001 kapalıysa Flask'a yönlendir
        error_page 502 503 504 = @flask_fallback;
    }

    # GastroMatch On-Demand
    location /gastromatch-app {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 15s;
        proxy_send_timeout 15s;
        proxy_read_timeout 15s;
        
        error_page 502 503 504 = @flask_fallback;
    }

    # Flask fallback (servis kapalıysa)
    location @flask_fallback {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Ana Flask uygulaması
    location / {
        proxy_pass http://127.0.0.1:5000;
        # ... diğer ayarlar ...
    }
}
```

Test et ve yeniden yükle:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 🧪 Test

```bash
# 1. PM2'de hiçbir servisin çalışmadığından emin ol
pm2 list

# 2. Tarayıcıdan test et
# https://www.baranbasaran.com/gastropod → "GastroPod'u Dene" butonuna bas
# İlk tıklamada: 3-5 saniye "Yükleniyor..." ekranı
# İkinci tıklamada: Direkt açılır (zaten çalışıyor)

# 3. 20 dakika bekle ve PM2'yi kontrol et
pm2 list
# gastropod ve gastromatch "stopped" olmalı

# 4. Idle checker loglarını kontrol et
tail -f /home/baran/sunucu/logs/idle_checker.log
```

## 📊 Kaynak Kullanımı Karşılaştırması

### Öncesi (Her Zaman Çalışır)
```
Flask:        65 MB
GastroPod:    60 MB
GastroMatch:  60 MB
--------------------
TOPLAM:      185 MB (sürekli)
```

### Sonrası (On-Demand)
```
Boşta:        65 MB (sadece Flask)
Aktif:       185 MB (ziyaret edildiğinde)
--------------------
Tasarruf:    120 MB RAM (boştayken)
```

## 🔍 Sorun Giderme

### "PM2Manager bulunamadı" hatası alıyorum

```bash
# utils/ klasörünün yapısını kontrol et
ls -la /home/baran/sunucu/utils/
# process_manager.py ve __init__.py olmalı

# Flask'ı yeniden başlat
sudo systemctl restart sunucu

# Logları kontrol et
journalctl -u sunucu -f
```

### Servis başlamıyor

```bash
# PM2 durumunu kontrol et
pm2 logs gastropod --lines 50

# Manuel olarak başlat
cd /home/baran/sunucu/projects/gastropod
pm2 start npm --name "gastropod" -- start -- -p 3001
```

### Idle checker çalışmıyor

```bash
# Cron job'u kontrol et
crontab -l

# Logları kontrol et
tail -f /home/baran/sunucu/logs/idle_checker.log

# Manuel çalıştır
bash /home/baran/sunucu/scripts/check_idle_services.sh
```

## 🎛️ Ayarlar

### Idle Süresini Değiştir

`scripts/check_idle_services.sh` dosyasında:

```bash
IDLE_MINUTES=20  # İstediğin değeri yaz (örn: 30)
```

### Başlatma Süresini Değiştir

`utils/process_manager.py` dosyasında:

```python
SERVICES = {
    'gastropod': {
        'startup_time': 8  # Saniye cinsinden
    }
}
```

---

**🎉 Kurulum Tamamlandı!** Artık sunucun enerji tasarruflu modda çalışıyor.

