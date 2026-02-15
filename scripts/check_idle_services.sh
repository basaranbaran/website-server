#!/bin/bash
# ============================================================
# Idle Service Checker - 20 dakika boyunca kullanılmayan
# PM2 servislerini durdurur (enerji tasarrufu için)
# ============================================================

IDLE_MINUTES=20
SERVICES=("gastropod" "gastromatch")

check_and_stop_service() {
    local service_name=$1
    local access_file="/tmp/${service_name}_last_access.txt"
    
    # Erişim dosyası yoksa skip
    if [ ! -f "$access_file" ]; then
        return
    fi
    
    # Son erişim zamanını oku
    last_access=$(cat "$access_file")
    current_time=$(date +%s)
    idle_seconds=$((current_time - last_access))
    idle_minutes=$((idle_seconds / 60))
    
    # 20 dakikadan fazla idle ise durdur
    if [ $idle_minutes -ge $IDLE_MINUTES ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $service_name idle ($idle_minutes dk) - durduruluyor..."
        pm2 stop "$service_name" 2>/dev/null
        
        # Erişim dosyasını sil
        rm -f "$access_file"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $service_name aktif (son erişim: $idle_minutes dk önce)"
    fi
}

# Her servis için kontrol
for service in "${SERVICES[@]}"; do
    check_and_stop_service "$service"
done

