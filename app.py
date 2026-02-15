"""
baranbasaran.com - Kişisel Portfolio ve Proje Sunucusu
=====================================================
Ana Flask uygulaması. Tüm projeleri tek bir web uygulamasında birleştirir.
"""

from flask import (
    Flask, render_template, request, jsonify,
    Response, send_file, send_from_directory,
    stream_with_context
)
import os
import re
import uuid
import json
import time
import shutil
import tempfile
import threading
import zipfile

# ============================================================
# Flask App Yapılandırması
# ============================================================
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PERSONAL_INFO = {
    'name': 'Baran Başaran',
    'github': 'https://github.com/basaranbaran',
    'linkedin': 'https://www.linkedin.com/in/baran-basaran/',
    'domain': 'baranbasaran.com',
}


@app.context_processor
def inject_globals():
    """Tüm template'lerde erişilebilir global değişkenler."""
    return {'info': PERSONAL_INFO}


# ============================================================
# Yardımcı Fonksiyonlar
# ============================================================
def schedule_cleanup(path, delay=120):
    """Geçici dosya/dizin temizliğini zamanla."""
    def _do():
        try:
            if os.path.isdir(path):
                shutil.rmtree(path, ignore_errors=True)
            elif os.path.isfile(path):
                os.unlink(path)
        except Exception:
            pass
    t = threading.Timer(delay, _do)
    t.daemon = True
    t.start()


# ============================================================
# YouTube Downloader - Backend
# ============================================================
YT_HTTP_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

yt_active_downloads = {}
yt_download_lock = threading.Lock()
yt_playlist_zips = {}  # {session_id: {'path', 'filename', 'temp_dir', 'created'}}


def yt_process_single(url, file_type, quality):
    """
    Tek video/ses indir. Geçici dizine kaydeder.
    Returns: (dosya_yolu, dosya_adı, geçici_dizin)
    """
    import yt_dlp

    temp_dir = tempfile.mkdtemp(prefix='ytdl_')

    common_opts = {
        'quiet': True,
        'no_warnings': True,
        'http_headers': YT_HTTP_HEADERS,
        'nocheckcertificate': True,
        'noplaylist': True,
    }

    if file_type == 'audio':
        output_tpl = os.path.join(temp_dir, '%(title)s.%(ext)s')
        ydl_opts = {
            **common_opts,
            'outtmpl': output_tpl,
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            temp = ydl.prepare_filename(info)
            filepath = os.path.splitext(temp)[0] + '.mp3'

            if not os.path.exists(filepath):
                for f in os.listdir(temp_dir):
                    if f.endswith('.mp3'):
                        filepath = os.path.join(temp_dir, f)
                        break
                else:
                    raise Exception("İndirilen ses dosyası bulunamadı")

            clean_title = re.sub(r'[\\/*?:"<>|]', '', info.get('title', 'audio'))
            return filepath, f"{clean_title}.mp3", temp_dir

    else:
        if quality and quality != 'best':
            fmt = (f'bestvideo[ext=mp4][height<={quality}]+bestaudio[ext=m4a]/'
                   f'bestvideo[height<={quality}]+bestaudio/'
                   f'best[height<={quality}]/best')
        else:
            fmt = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best'

        output_tpl = os.path.join(temp_dir, '%(title)s.%(ext)s')
        ydl_opts = {
            **common_opts,
            'format': fmt,
            'outtmpl': output_tpl,
            'merge_output_format': 'mp4',
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filepath = ydl.prepare_filename(info)
            if not filepath.endswith('.mp4'):
                mp4 = os.path.splitext(filepath)[0] + '.mp4'
                if os.path.exists(mp4):
                    filepath = mp4

        if not os.path.exists(filepath):
            for f in os.listdir(temp_dir):
                if f.endswith(('.mp4', '.mkv', '.webm')):
                    filepath = os.path.join(temp_dir, f)
                    break
            else:
                raise Exception("İndirilen video dosyası bulunamadı")

        safe_title = re.sub(r'[\\/*?:"<>|]', '', info.get('title', 'video'))
        return filepath, f"{safe_title}.mp4", temp_dir


# ============================================================
# Wikipedia Speedrun - Backend
# ============================================================
_sbert_model = None
_sbert_lock = threading.Lock()
WIKI_MAX_STEPS = 15


def get_sbert_model():
    """SBERT modelini lazy-load et (ilk kullanımda yükle)."""
    global _sbert_model
    if _sbert_model is None:
        with _sbert_lock:
            if _sbert_model is None:
                from sentence_transformers import SentenceTransformer
                _sbert_model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
    return _sbert_model


def wiki_get_links(url):
    """Wikipedia sayfasından geçerli makale linklerini çıkar."""
    import requests
    from bs4 import BeautifulSoup

    try:
        resp = requests.get(url, headers={'User-Agent': 'SpeedrunBot/1.0'}, timeout=10)
        if resp.status_code != 200:
            return {}
    except Exception:
        return {}

    soup = BeautifulSoup(resp.content, 'html.parser')
    content = soup.find(id="mw-content-text")
    if not content:
        return {}

    links = {}
    for a in content.find_all('a', href=True):
        href = a['href']
        title = a.get_text().strip()
        if (href.startswith('/wiki/') and ':' not in href and title
                and 'Main_Page' not in href and 'Identifier' not in title
                and 'Wayback' not in title):
            links[title] = 'https://en.wikipedia.org' + href
    return links


def wiki_find_matches(link_titles, target_text, top_k=1):
    """SBERT ile hedef metne en yakın linkleri bul."""
    from sentence_transformers import util
    import torch

    model = get_sbert_model()
    target_emb = model.encode(target_text, convert_to_tensor=True)
    link_embs = model.encode(link_titles, convert_to_tensor=True)
    scores = util.cos_sim(target_emb, link_embs)[0]
    k = min(top_k, len(link_titles))
    top_results = torch.topk(scores, k=k)
    return [link_titles[idx] for idx in top_results.indices]


# ============================================================
# Route: Ana Sayfa (Landing Page)
# ============================================================
@app.route('/')
def index():
    return render_template('index.html')


# ============================================================
# Route: YouTube Downloader
# ============================================================
@app.route('/yt-downloader')
def yt_page():
    return render_template('yt_downloader.html')


@app.route('/yt-downloader/api/analyze', methods=['POST'])
def yt_analyze():
    import yt_dlp

    data = request.json
    url = data.get('url')
    if not url:
        return jsonify({'error': 'URL gerekli'}), 400

    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'http_headers': YT_HTTP_HEADERS,
            'nocheckcertificate': True,
            'extract_flat': 'in_playlist',
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

            is_playlist = 'entries' in info

            if is_playlist:
                title = info.get('title', 'Playlist')
                thumbnail = None
                if info.get('thumbnails'):
                    thumbnail = info['thumbnails'][-1]['url']
                elif info.get('entries') and len(info['entries']) > 0:
                    first = info['entries'][0]
                    thumbs = first.get('thumbnails', [{}])
                    thumbnail = thumbs[-1].get('url') if thumbs else None
                resolutions = ['1080p', '720p', '480p']
                uploader = None
                duration = None
                playlist_count = len(info.get('entries', []))
            else:
                title = info.get('title')
                thumbnail = info.get('thumbnail')
                formats = info.get('formats', [])
                heights = set()
                for f in formats:
                    if f.get('vcodec') != 'none' and f.get('height'):
                        heights.add(f['height'])
                resolutions = [f"{h}p" for h in sorted(heights, reverse=True)]
                uploader = info.get('uploader', 'Unknown')
                dur = info.get('duration')
                duration = f"{dur // 60}:{dur % 60:02d}" if dur else None
                playlist_count = 0

            return jsonify({
                'title': title,
                'thumbnail': thumbnail,
                'is_playlist': is_playlist,
                'playlist_count': playlist_count,
                'resolutions': resolutions,
                'uploader': uploader,
                'duration': duration,
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/yt-downloader/api/download', methods=['POST'])
def yt_download():
    import yt_dlp

    data = request.json
    url = data.get('url')
    file_type = data.get('type', 'video')
    quality = data.get('quality', 'best')
    mode = data.get('mode', 'single')

    if not url:
        return jsonify({'error': 'URL gerekli'}), 400

    try:
        if mode == 'playlist':
            session_id = str(uuid.uuid4())

            def generate():
                temp_dir = tempfile.mkdtemp(prefix='ytpl_')
                try:
                    with yt_download_lock:
                        yt_active_downloads[session_id] = {'cancelled': False}

                    yield f"data: {json.dumps({'status': 'info', 'message': 'Playlist bilgileri aliniyor...', 'session_id': session_id})}\n\n"

                    with yt_dlp.YoutubeDL({
                        'quiet': True,
                        'extract_flat': 'in_playlist',
                        'http_headers': YT_HTTP_HEADERS
                    }) as ydl:
                        pl_info = ydl.extract_info(url, download=False)
                        pl_title = pl_info.get('title', 'Album')
                        safe_title = re.sub(r'[\\/*?:"<>|]', '', pl_title)

                    entries = pl_info.get('entries', [])
                    total = len(entries)
                    yield f"data: {json.dumps({'status': 'info', 'message': f'{pl_title} - {total} parca bulundu'})}\n\n"

                    downloaded_files = []

                    for i, entry in enumerate(entries):
                        with yt_download_lock:
                            if yt_active_downloads.get(session_id, {}).get('cancelled'):
                                yield f"data: {json.dumps({'status': 'cancelled', 'message': 'Indirme iptal edildi'})}\n\n"
                                return

                        try:
                            video_url = entry.get('url') or f"https://www.youtube.com/watch?v={entry.get('id')}"
                            track_title = entry.get('title', f'Track {i+1}')

                            yield f"data: {json.dumps({'status': 'progress', 'current': i+1, 'total': total, 'message': f'Indiriliyor: {track_title}'})}\n\n"

                            filepath, filename, track_temp = yt_process_single(video_url, file_type, quality)
                            dest = os.path.join(temp_dir, filename)
                            # Aynı isimde dosya varsa numara ekle
                            counter = 1
                            base, ext = os.path.splitext(dest)
                            while os.path.exists(dest):
                                dest = f"{base} ({counter}){ext}"
                                counter += 1
                            shutil.move(filepath, dest)
                            shutil.rmtree(track_temp, ignore_errors=True)
                            downloaded_files.append(dest)

                            yield f"data: {json.dumps({'status': 'success', 'message': f'Tamamlandi: {track_title}'})}\n\n"
                        except Exception as e:
                            yield f"data: {json.dumps({'status': 'error', 'message': f'Hata: {track_title} - {str(e)}'})}\n\n"

                    if downloaded_files:
                        zip_path = os.path.join(temp_dir, f'{safe_title}.zip')
                        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                            for fp in downloaded_files:
                                zf.write(fp, os.path.basename(fp))

                        yt_playlist_zips[session_id] = {
                            'path': zip_path,
                            'filename': f'{safe_title}.zip',
                            'temp_dir': temp_dir,
                            'created': time.time(),
                        }
                        schedule_cleanup(temp_dir, delay=600)

                        yield f"data: {json.dumps({'status': 'done', 'message': 'Tum indirmeler tamamlandi!', 'zip_session': session_id})}\n\n"
                    else:
                        yield f"data: {json.dumps({'status': 'error', 'message': 'Hicbir dosya indirilemedi'})}\n\n"
                        shutil.rmtree(temp_dir, ignore_errors=True)

                except Exception as e:
                    yield f"data: {json.dumps({'status': 'error', 'message': f'Playlist Hatasi: {str(e)}'})}\n\n"
                finally:
                    with yt_download_lock:
                        yt_active_downloads.pop(session_id, None)

            return Response(stream_with_context(generate()), mimetype='text/event-stream')

        else:
            # Tek video/ses indirme
            single_url = url
            if 'list=' in url or '&index=' in url:
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(url)
                params = parse_qs(parsed.query)
                if 'v' in params:
                    single_url = f"https://www.youtube.com/watch?v={params['v'][0]}"

            filepath, filename, temp_dir = yt_process_single(single_url, file_type, quality)
            response = send_file(filepath, as_attachment=True, download_name=filename)
            schedule_cleanup(temp_dir, delay=120)
            return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/yt-downloader/api/download-zip/<session_id>')
def yt_download_zip(session_id):
    if session_id not in yt_playlist_zips:
        return jsonify({'error': 'Dosya bulunamadı veya süresi doldu'}), 404

    info = yt_playlist_zips[session_id]
    return send_file(info['path'], as_attachment=True, download_name=info['filename'])


@app.route('/yt-downloader/api/cancel', methods=['POST'])
def yt_cancel():
    data = request.json
    session_id = data.get('session_id')
    if not session_id:
        return jsonify({'error': 'session_id gerekli'}), 400

    with yt_download_lock:
        if session_id in yt_active_downloads:
            yt_active_downloads[session_id]['cancelled'] = True
            return jsonify({'status': 'cancelled'})
    return jsonify({'error': 'Indirme bulunamadı'}), 404


# ============================================================
# Route: Docker Hardened Image Karşılaştırma
# ============================================================
@app.route('/docker')
def docker_page():
    docker_dir = os.path.join(BASE_DIR, 'projects', 'docker-hardened-image')

    standard = hardened = app_code = ''
    try:
        with open(os.path.join(docker_dir, 'Dockerfile.standard'), 'r') as f:
            standard = f.read()
    except Exception:
        pass
    try:
        with open(os.path.join(docker_dir, 'Dockerfile.hardened'), 'r') as f:
            hardened = f.read()
    except Exception:
        pass
    try:
        with open(os.path.join(docker_dir, 'app', 'main.py'), 'r') as f:
            app_code = f.read()
    except Exception:
        pass

    return render_template('docker_compare.html',
                           standard=standard,
                           hardened=hardened,
                           app_code=app_code)


@app.route('/docker/images/<path:filename>')
def docker_images(filename):
    img_dir = os.path.join(BASE_DIR, 'projects', 'docker-hardened-image', 'images')
    return send_from_directory(img_dir, filename)


# ============================================================
# Route: GastroPod & GastroMatch (Solid Protocol Demo)
# ============================================================
@app.route('/gastropod')
def gastropod_info():
    """GastroPod proje bilgilendirme sayfası"""
    return render_template('gastropod.html')


@app.route('/gastropod-app')
def gastropod_app():
    """GastroPod Next.js uygulaması (Reverse proxy gerekli - Nginx üzerinden)"""
    return '''
    <html>
    <head><title>GastroPod Redirect</title></head>
    <body style="font-family: system-ui; text-align: center; padding: 50px;">
        <h1>🍕 GastroPod</h1>
        <p>GastroPod uygulaması port 3001'de çalışmalıdır.</p>
        <p>Lütfen Nginx yapılandırmasında <code>/gastropod-app</code> için reverse proxy ayarlarını kontrol edin.</p>
        <a href="/gastropod">← Bilgilendirme Sayfasına Dön</a>
    </body>
    </html>
    ''', 503


@app.route('/gastromatch-app')
def gastromatch_app():
    """GastroMatch Next.js uygulaması (Reverse proxy gerekli - Nginx üzerinden)"""
    return '''
    <html>
    <head><title>GastroMatch Redirect</title></head>
    <body style="font-family: system-ui; text-align: center; padding: 50px;">
        <h1>📊 GastroMatch</h1>
        <p>GastroMatch uygulaması port 3002'de çalışmalıdır.</p>
        <p>Lütfen Nginx yapılandırmasında <code>/gastromatch-app</code> için reverse proxy ayarlarını kontrol edin.</p>
        <a href="/gastropod">← Bilgilendirme Sayfasına Dön</a>
    </body>
    </html>
    ''', 503


# ============================================================
# Route: Wikipedia Speedrun
# ============================================================
@app.route('/wiki-speedrun')
def wiki_page():
    return render_template('wiki_speedrun.html')


@app.route('/wiki-speedrun/api/run', methods=['POST'])
def wiki_run():
    data = request.json
    start_url = data.get('start_url', '').strip()
    target = data.get('target', '').strip()
    keywords = data.get('keywords', '').strip() or target
    method = data.get('method', '2')

    if method != '2':
        return jsonify({
            'error': 'Bu method GPU gerektirir. Sunucuda sadece Method 2 (Saf SBERT) kullanılabilir.'
        }), 400

    if not start_url or not target:
        return jsonify({'error': 'Başlangıç URL ve hedef konu gerekli'}), 400

    if not start_url.startswith('https://en.wikipedia.org/wiki/'):
        return jsonify({
            'error': 'Geçerli bir Wikipedia URL\'si girin (https://en.wikipedia.org/wiki/...)'
        }), 400

    def generate():
        try:
            yield f"data: {json.dumps({'status': 'info', 'message': 'SBERT modeli yükleniyor...'})}\n\n"
            get_sbert_model()
            yield f"data: {json.dumps({'status': 'info', 'message': 'Model hazır! Speedrun başlıyor...'})}\n\n"

            current_url = start_url
            visited = {start_url}
            path = []
            start_time = time.time()

            page_title = current_url.split('/wiki/')[-1].replace('_', ' ')
            yield f"data: {json.dumps({'status': 'start', 'message': f'Başlangıç: {page_title}', 'page': page_title})}\n\n"

            for step in range(1, WIKI_MAX_STEPS + 1):
                page_title = current_url.split('/wiki/')[-1].replace('_', ' ')
                path.append(page_title)

                # Hedef kontrolü
                if target.lower() in page_title.lower():
                    elapsed = time.time() - start_time
                    yield f"data: {json.dumps({'status': 'win', 'message': f'HEDEF BULUNDU! {elapsed:.1f}s, {step} adım', 'path': path, 'time': round(elapsed, 2), 'steps': step})}\n\n"
                    return

                yield f"data: {json.dumps({'status': 'fetching', 'message': f'[Adım {step}] Linkler alınıyor: {page_title}', 'step': step})}\n\n"

                links = wiki_get_links(current_url)
                valid = {k: v for k, v in links.items() if v not in visited}

                if not valid:
                    yield f"data: {json.dumps({'status': 'dead_end', 'message': f'Çıkmaz sokak: {page_title}', 'path': path})}\n\n"
                    return

                # Doğrudan eşleşme kontrolü
                direct = None
                for t in valid.keys():
                    if target.lower() in t.lower():
                        direct = t
                        break

                if direct:
                    choice = direct
                    yield f"data: {json.dumps({'status': 'shortcut', 'step': step, 'from': page_title, 'to': choice, 'message': f'[Adım {step}] Kısayol: {choice}'})}\n\n"
                else:
                    link_titles = list(valid.keys())
                    candidates = wiki_find_matches(link_titles, keywords, top_k=1)
                    choice = candidates[0] if candidates else link_titles[0]
                    yield f"data: {json.dumps({'status': 'step', 'step': step, 'from': page_title, 'to': choice, 'message': f'[Adım {step}] {page_title} → {choice}'})}\n\n"

                if choice not in valid:
                    choice = list(valid.keys())[0]

                current_url = valid[choice]
                visited.add(current_url)
                time.sleep(0.3)

            # Son sayfa kontrolü
            final_title = current_url.split('/wiki/')[-1].replace('_', ' ')
            path.append(final_title)
            if target.lower() in final_title.lower():
                elapsed = time.time() - start_time
                yield f"data: {json.dumps({'status': 'win', 'message': f'HEDEF BULUNDU! {elapsed:.1f}s, {WIKI_MAX_STEPS} adım', 'path': path, 'time': round(elapsed, 2), 'steps': WIKI_MAX_STEPS})}\n\n"
            else:
                yield f"data: {json.dumps({'status': 'timeout', 'message': f'Zaman aşımı! {WIKI_MAX_STEPS} adımda hedefe ulaşılamadı.', 'path': path})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'message': f'Hata: {str(e)}'})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')


# ============================================================
# Favicon
# ============================================================
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(BASE_DIR, 'static', 'img'),
        'favicon.png', mimetype='image/png'
    )


# ============================================================
# Main
# ============================================================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

