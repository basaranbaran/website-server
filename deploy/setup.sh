#!/bin/bash
# ============================================================
# baranbasaran.com - Debian 12 Sunucu Kurulum Scripti
# ============================================================
# Bu script'i sunucuda çalıştırın:
#   ssh baran@192.168.1.104
#   chmod +x deploy/setup.sh
#   sudo ./deploy/setup.sh
# ============================================================

set -e

# Renkli çıktı
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_DIR="/home/baran/sunucu"
DOMAIN="baranbasaran.com"
USER="baran"

echo ""
echo "============================================================"
echo "  baranbasaran.com - Sunucu Kurulum Başlıyor"
echo "============================================================"
echo ""

# ============================================================
# 1. Sistem Güncelleme & Gerekli Paketler
# ============================================================
info "Sistem güncelleniyor..."
apt update && apt upgrade -y

info "Gerekli paketler kuruluyor..."
apt install -y \
    python3 \
    python3-pip \
    python3-venv \
    nginx \
    certbot \
    python3-certbot-nginx \
    ffmpeg \
    git \
    curl \
    ufw

# ============================================================
# 2. Firewall (UFW) Ayarları
# ============================================================
info "Firewall yapılandırılıyor..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
info "Firewall aktif. SSH, HTTP ve HTTPS açık."

# ============================================================
# 3. Proje Dizini Hazırlama
# ============================================================
info "Proje dizini hazırlanıyor..."

# Eğer proje dizini yoksa oluştur
if [ ! -d "$PROJECT_DIR" ]; then
    warn "Proje dizini bulunamadı. Lütfen projeyi sunucuya kopyalayın:"
    warn "  Windows'tan: scp -r D:\\Projeler\\sunucu baran@192.168.1.104:/home/baran/"
    warn "  Linux'tan: scp -r /path/to/sunucu baran@192.168.1.104:/home/baran/"
    error "Proje dosyaları kopyalandıktan sonra bu scripti tekrar çalıştırın."
    exit 1
fi

# Log dizini oluştur
mkdir -p "$PROJECT_DIR/logs"
chown -R $USER:$USER "$PROJECT_DIR/logs"

# Static img dizini oluştur ve dosyaları kopyala
mkdir -p "$PROJECT_DIR/static/img"
if [ -f "$PROJECT_DIR/youtube-download/static/favicon.png" ]; then
    cp "$PROJECT_DIR/youtube-download/static/favicon.png" "$PROJECT_DIR/static/img/favicon.png"
    info "Favicon kopyalandı."
fi
chown -R $USER:$USER "$PROJECT_DIR/static"

# ============================================================
# 4. Python Virtual Environment & Bağımlılıklar
# ============================================================
info "Python virtual environment oluşturuluyor..."

cd "$PROJECT_DIR"

# venv oluştur (eğer yoksa)
if [ ! -d "venv" ]; then
    sudo -u $USER python3 -m venv venv
fi

info "Python bağımlılıkları kuruluyor (bu biraz sürebilir)..."
sudo -u $USER bash -c "
    source $PROJECT_DIR/venv/bin/activate
    pip install --upgrade pip
    pip install -r $PROJECT_DIR/requirements.txt
"

info "Python bağımlılıkları kuruldu."

# ============================================================
# 5. Nginx Yapılandırması
# ============================================================
info "Nginx yapılandırılıyor..."

# Nginx config dosyasını kopyala
cp "$PROJECT_DIR/deploy/nginx.conf" "/etc/nginx/sites-available/$DOMAIN"

# Mevcut symlink varsa kaldır
rm -f "/etc/nginx/sites-enabled/$DOMAIN"

# Yeni symlink oluştur
ln -s "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"

# Default site'ı kaldır (opsiyonel)
rm -f /etc/nginx/sites-enabled/default

# Nginx konfigürasyon testi
nginx -t
info "Nginx konfigürasyonu geçerli."

# ============================================================
# 6. SSL Sertifikası (Let's Encrypt)
# ============================================================
info "SSL sertifikası alınıyor..."
warn "NOT: Domain'in DNS ayarlarının bu sunucunun PUBLIC IP adresine"
warn "yönlendirilmiş olması gerekir!"
echo ""

# Public IP'yi göster
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "tespit edilemedi")
info "Bu sunucunun public IP adresi: $PUBLIC_IP"
echo ""

# Önce HTTP-only nginx ile başlat (SSL sertifikası almak için)
# Geçici olarak SSL satırlarını yorum haline getir
TEMP_CONF="/etc/nginx/sites-available/${DOMAIN}.tmp"
grep -v "ssl_" "/etc/nginx/sites-available/$DOMAIN" | \
    grep -v "listen 443" | \
    sed 's/return 301 https/# return 301 https/' > "$TEMP_CONF"

# Certbot dizini oluştur
mkdir -p /var/www/certbot

# Certbot ile sertifika al
warn "SSL sertifikası alınıyor. İlk seferde email adresiniz istenecek."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
    warn "SSL sertifikası otomatik alınamadı."
    warn "Manuel olarak çalıştırın: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
}

# Temizlik
rm -f "$TEMP_CONF"

# Orijinal nginx config'i geri koy
cp "$PROJECT_DIR/deploy/nginx.conf" "/etc/nginx/sites-available/$DOMAIN"

# ============================================================
# 7. Systemd Service
# ============================================================
info "Systemd servisi yapılandırılıyor..."

cp "$PROJECT_DIR/deploy/sunucu.service" /etc/systemd/system/sunucu.service
systemctl daemon-reload
systemctl enable sunucu
systemctl start sunucu

info "Sunucu servisi başlatıldı."

# ============================================================
# 8. Nginx'i Yeniden Başlat
# ============================================================
systemctl restart nginx
info "Nginx yeniden başlatıldı."

# ============================================================
# 9. Certbot Otomatik Yenileme
# ============================================================
info "SSL sertifika otomatik yenileme ayarlanıyor..."
# Certbot'un cron job'ı zaten /etc/cron.d/certbot'ta mevcut olmalı
# Yine de kontrol edelim
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true

# ============================================================
# 10. Sonuç
# ============================================================
echo ""
echo "============================================================"
echo -e "  ${GREEN}KURULUM TAMAMLANDI!${NC}"
echo "============================================================"
echo ""
echo "  Domain:    https://$DOMAIN"
echo "  Public IP: $PUBLIC_IP"
echo "  Lokal IP:  192.168.1.104"
echo ""
echo "  Servis Durumu:"
echo "    sudo systemctl status sunucu"
echo "    sudo systemctl status nginx"
echo ""
echo "  Loglar:"
echo "    journalctl -u sunucu -f"
echo "    tail -f $PROJECT_DIR/logs/error.log"
echo ""
echo "============================================================"
echo ""
echo -e "  ${YELLOW}ÖNEMLİ ADIMLAR:${NC}"
echo ""
echo "  1. Domain DNS Ayarları:"
echo "     - baranbasaran.com  ->  A Record  -> $PUBLIC_IP"
echo "     - www.baranbasaran.com -> CNAME   -> baranbasaran.com"
echo ""
echo "  2. Router Port Forwarding:"
echo "     - Port 80  (HTTP)  -> 192.168.1.104:80"
echo "     - Port 443 (HTTPS) -> 192.168.1.104:443"
echo ""
echo "  3. GitHub/LinkedIn Linklerini Güncelle:"
echo "     $PROJECT_DIR/app.py dosyasındaki PERSONAL_INFO"
echo ""
echo "============================================================"

