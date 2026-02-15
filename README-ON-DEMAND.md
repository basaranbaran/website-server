# 🔋 On-Demand Servis Sistemi - Hızlı Başlangıç

## 📖 Ne Değişti?

### Öncesi
- GastroPod ve GastroMatch **sürekli çalışıyordu** (PM2 ile)
- Boşta bile 185 MB RAM kullanımı
- Sunucu gereksiz yere ısınıyordu

### Şimdi
- ✅ Sadece **ziyaret edildiğinde başlar**
- ✅ **20 dakika kullanılmazsa otomatik durur**
- ✅ İlk erişimde 3-5 saniye "yükleniyor" ekranı
- ✅ Boşta sadece 65 MB RAM kullanımı (Flask)

---

## 🚀 Sunucuda Kurulum (Hızlı)

```bash
# 1. Kodu çek
cd /home/baran/sunucu
git pull origin main

# 2. Flask'ı yeniden başlat
sudo systemctl restart sunucu

# 3. Mevcut PM2 servislerini durdur
pm2 stop gastropod gastromatch
pm2 save

# 4. Idle checker'ı aktifleştir
chmod +x /home/baran/sunucu/scripts/check_idle_services.sh

crontab -e
# Aşağıdaki satırı ekle:
*/5 * * * * /home/baran/sunucu/scripts/check_idle_services.sh >> /home/baran/sunucu/logs/idle_checker.log 2>&1

# 5. Nginx'i güncelle (detaylı adımlar ON-DEMAND-SETUP.md'de)
sudo nano /etc/nginx/sites-available/baranbasaran.com
# /gastropod-app ve /gastromatch-app location'larını ekle
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧪 Test Et

```bash
# 1. PM2'de servisler durmuş olmalı
pm2 list

# 2. Tarayıcıdan test et
# https://www.baranbasaran.com/gastropod
# "GastroPod'u Başlat" butonuna bas
# İlk tıklamada: 3-5 saniye yükleme ekranı
# İkinci tıklamada: Zaten çalışıyor, direkt açılır

# 3. 20 dakika sonra otomatik duracak
# Kontrol et:
pm2 list
tail -f /home/baran/sunucu/logs/idle_checker.log
```

---

## 📊 Kaynak Tasarrufu

| Durum | RAM Kullanımı |
|-------|---------------|
| Boşta (öncesi) | 185 MB |
| Boşta (şimdi) | **65 MB** |
| Aktif | 185 MB |
| **Tasarruf** | **~65%** |

---

## 📝 Detaylı Dokümantasyon

**Tüm detaylar için:** `ON-DEMAND-SETUP.md` dosyasını oku.

---

**💚 Enerji tasarruflu sunucu hazır!**

