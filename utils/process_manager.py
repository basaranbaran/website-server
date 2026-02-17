"""
Process Manager - PM2 Servis Kontrol Modülü
==========================================
Next.js uygulamalarını (GastroPod, GastroMatch) on-demand olarak başlatır/durdurur.
"""

import subprocess
import json
import time
import os
from datetime import datetime

class PM2Manager:
    """PM2 process yönetimi için helper sınıf."""
    
    SERVICES = {
        'gastropod': {
            'name': 'gastropod',
            'port': 3001,
            'dir': '/home/baran/sunucu/projects/gastropod',
            'startup_time': 8  # Başlatma süresi (saniye)
        },
        'gastromatch': {
            'name': 'gastromatch',
            'port': 3002,
            'dir': '/home/baran/sunucu/projects/gastromatch',
            'startup_time': 8
        }
    }
    
    @staticmethod
    def get_process_status(service_name):
        """PM2'den process durumunu al."""
        try:
            result = subprocess.run(
                ['pm2', 'jlist'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode != 0:
                return {'status': 'error', 'message': 'PM2 hatası'}
            
            processes = json.loads(result.stdout)
            
            for proc in processes:
                if proc.get('name') == service_name:
                    status = proc.get('pm2_env', {}).get('status', 'unknown')
                    uptime = proc.get('pm2_env', {}).get('pm_uptime', 0)
                    
                    return {
                        'status': status,  # online, stopped, errored
                        'uptime': uptime,
                        'memory': proc.get('monit', {}).get('memory', 0),
                        'cpu': proc.get('monit', {}).get('cpu', 0)
                    }
            
            return {'status': 'not_found'}
            
        except subprocess.TimeoutExpired:
            return {'status': 'error', 'message': 'PM2 zaman aşımı'}
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    @staticmethod
    def start_service(service_name):
        """PM2 ile servisi başlat."""
        if service_name not in PM2Manager.SERVICES:
            return {'success': False, 'message': 'Bilinmeyen servis'}
        
        service = PM2Manager.SERVICES[service_name]
        
        try:
            # Önce durumu kontrol et
            status = PM2Manager.get_process_status(service_name)
            
            if status.get('status') == 'online':
                return {'success': True, 'message': 'Zaten çalışıyor', 'already_running': True}
            
            # Durdurulmuşsa restart, yoksa start
            if status.get('status') in ['stopped', 'errored']:
                result = subprocess.run(
                    ['pm2', 'restart', service_name],
                    capture_output=True,
                    text=True,
                    timeout=15
                )
            else:
                # İlk kez başlatılıyor - port argümanı ile
                result = subprocess.run(
                    ['pm2', 'start', 'npm', '--name', service_name,
                     '--cwd', service['dir'],
                     '--', 'start', '--', '-p', str(service['port'])],
                    capture_output=True,
                    text=True,
                    timeout=15
                )
            
            if result.returncode == 0:
                # Başlatma süresini bekle
                time.sleep(2)
                return {
                    'success': True,
                    'message': 'Servis başlatıldı',
                    'startup_time': service['startup_time']
                }
            else:
                return {
                    'success': False,
                    'message': f'Başlatma hatası: {result.stderr}'
                }
                
        except subprocess.TimeoutExpired:
            return {'success': False, 'message': 'Zaman aşımı'}
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def stop_service(service_name):
        """PM2 ile servisi durdur."""
        try:
            result = subprocess.run(
                ['pm2', 'stop', service_name],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                return {'success': True, 'message': 'Servis durduruldu'}
            else:
                return {'success': False, 'message': result.stderr}
                
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def update_last_access(service_name):
        """Son erişim zamanını kaydet (idle checker için)."""
        try:
            access_file = f'/tmp/{service_name}_last_access.txt'
            with open(access_file, 'w') as f:
                f.write(str(int(time.time())))
            return True
        except:
            return False
    
    @staticmethod
    def check_idle_and_stop(service_name, idle_minutes=20):
        """20 dakika idle kalmışsa servisi durdur."""
        try:
            access_file = f'/tmp/{service_name}_last_access.txt'
            
            if not os.path.exists(access_file):
                return False
            
            with open(access_file, 'r') as f:
                last_access = int(f.read().strip())
            
            idle_seconds = time.time() - last_access
            
            if idle_seconds > (idle_minutes * 60):
                # 20 dakika geçmiş, durdur
                PM2Manager.stop_service(service_name)
                return True
            
            return False
            
        except:
            return False

