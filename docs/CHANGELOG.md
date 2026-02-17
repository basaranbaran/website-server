# Değişiklik Günlüğü (Changelog)

## 2025-02-17 — GastroPod & GastroMatch Entegrasyonu + Sistem Düzeltmeleri

### 1. Yeni Dosyalar Eklendi

| Dosya | Açıklama |
|-------|----------|
| `templates/gastropod.html` | GastroPod & GastroMatch proje tanıtım sayfası (/gastropod) |
| `templates/service_loading.html` | Servis başlatılırken gösterilen yükleme ekranı (progress bar + auto-redirect) |
| `templates/service_error.html` | Servis başlatma hatası ekranı |
| `utils/__init__.py` | utils klasörünü Python paketi yapmak için |
| `utils/process_manager.py` | PM2 ile Next.js uygulamalarını on-demand başlatma/durdurma modülü |
| `scripts/check_idle_services.sh` | 20 dk idle kalan servisleri otomatik durduran cron script |
| `docs/CHANGELOG.md` | Bu dosya — yapılan değişikliklerin kaydı |

### 2. Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `app.py` | GastroPod/GastroMatch route'ları eklendi (/gastropod, /gastropod-app, /gastromatch-app, /api/service-status/&lt;name&gt;). PM2Manager import'u eklendi. |
| `templates/index.html` | Ana sayfaya GastroPod & GastroMatch proje kartı eklendi |
| `static/css/main.css` | Yeni proje kartı stilleri (gastropod-gradient, gastropod-icon), proje detay sayfası stilleri eklendi |
| `deploy/nginx.conf` | GastroPod (port 3001) ve GastroMatch (port 3002) için reverse proxy blokları + @flask_fallback eklendi |
| `projects/gastropod/next.config.ts` | `basePath: '/gastropod-app'` eklendi (Nginx altında çalışması için) |
| `projects/gastromatch/next.config.ts` | `basePath: '/gastromatch-app'` eklendi (Nginx altında çalışması için) |

### 3. Silinen Dosyalar

| Dosya | Neden |
|-------|-------|
| `GASTROPOD-DEPLOYMENT.md` | Geçici deployment notu, artık gereksiz — bilgiler bu changelog'a taşındı |
| `ON-DEMAND-SETUP.md` | Geçici kurulum kılavuzu, artık gereksiz |
| `README-ON-DEMAND.md` | Geçici quick start notu, artık gereksiz |
| `__pycache__/` | Python bytecode cache, .gitignore'da olmalı, sunucuda otomatik yeniden oluşur |

### 4. Sunucu Konfigürasyonu (Manuel)

Bu değişiklikler sunucuda elle yapıldı, repo'da karşılığı `deploy/` altındadır:

| Ayar | Detay |
|------|-------|
| **Nginx** | `/etc/nginx/sites-available/baranbasaran.com` güncellendi. GastroPod (localhost:3001) ve GastroMatch (localhost:3002) için location blokları + @flask_fallback eklendi. Repo karşılığı: `deploy/nginx.conf` |
| **PM2** | `pm2 start npm --name gastropod -- start -- -p 3001` (cwd: projects/gastropod). `pm2 start npm --name gastromatch -- start -- -p 3002` (cwd: projects/gastromatch). `pm2 save` ile kaydedildi. |
| **Cron Job** | `crontab -e` ile eklendi: `*/5 * * * * /home/baran/sunucu/scripts/check_idle_services.sh >> /home/baran/sunucu/logs/idle_checker.log 2>&1` — Her 5 dakikada idle servisleri kontrol eder. |
| **Next.js Build** | Her iki proje için `npm install && npm run build` çalıştırıldı (sunucuda). basePath ayarlandıktan sonra rebuild gerekti. |
| **Gunicorn/venv** | Virtual environment yeniden oluşturuldu, `pip install -r requirements.txt` ile tüm bağımlılıklar yüklendi. |
| **package-lock.json** | Sunucu root'taki `/home/baran/sunucu/package-lock.json` silindi — Next.js yanlış workspace root algılıyordu. |

### 5. Mimari Özet

```
İstek Akışı:
Kullanıcı → Nginx (443) → /gastropod-app → localhost:3001 (Next.js GastroPod)
                        → /gastromatch-app → localhost:3002 (Next.js GastroMatch)
                        → / (diğer tüm) → localhost:5000 (Flask/Gunicorn)

Next.js kapalıysa:
Nginx 502 → @flask_fallback → Flask /gastropod-app route → PM2 başlat → loading screen → redirect
```

### 6. On-Demand Sistem Nasıl Çalışır

1. Kullanıcı `/gastropod-app` veya `/gastromatch-app` adresine gider
2. Next.js çalışıyorsa → Nginx direkt proxy yapar
3. Next.js kapalıysa → Nginx 502 alır → @flask_fallback → Flask route'u çalışır
4. Flask, PM2Manager ile servisi başlatır, loading screen gösterir
5. Loading screen her 2 sn'de `/api/service-status/gastropod` kontrol eder
6. Servis hazır olunca otomatik redirect yapar
7. Cron job her 5 dk'da çalışır, 20 dk idle olan servisleri `pm2 stop` ile durdurur

