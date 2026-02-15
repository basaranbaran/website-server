document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const resultArea = document.getElementById('resultArea');
    const errorMsg = document.getElementById('errorMsg');
    const downloadBtn = document.getElementById('downloadBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    const thumbnail = document.getElementById('thumbnail');
    const videoTitle = document.getElementById('videoTitle');
    const uploader = document.getElementById('uploader');
    const duration = document.getElementById('duration');
    const durationWrap = document.getElementById('durationWrap');
    const qualitySelect = document.getElementById('qualitySelect');
    const qualityGroup = document.getElementById('qualityGroup');
    const typeInputs = document.querySelectorAll('input[name="fileType"]');

    const playlistArea = document.getElementById('playlistArea');
    const playlistCount = document.getElementById('playlistCount');
    const modeInputs = document.querySelectorAll('input[name="downloadMode"]');
    const downloadBtnText = document.querySelector('#downloadBtn .btn-text');
    const successMessage = document.getElementById('successMessage');
    const successText = document.getElementById('successText');

    let currentUrl = '';
    let currentSessionId = null;
    let abortController = null;

    // API base path
    const API = '/yt-downloader/api';

    analyzeBtn.addEventListener('click', analyzeVideo);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') analyzeVideo();
    });

    typeInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            qualityGroup.style.display = e.target.value === 'audio' ? 'none' : 'block';
        });
    });

    modeInputs.forEach(input => {
        input.addEventListener('change', updateDownloadButtonText);
    });

    downloadBtn.addEventListener('click', downloadVideo);
    cancelBtn.addEventListener('click', cancelDownload);

    function updateDownloadButtonText() {
        const mode = document.querySelector('input[name="downloadMode"]:checked').value;
        downloadBtnText.textContent = mode === 'playlist' ? 'Tüm Playlist\'i İndir' : 'İndir';
    }

    async function analyzeVideo() {
        const url = urlInput.value.trim();
        if (!url) {
            showError('Lütfen geçerli bir YouTube URL\'si girin');
            return;
        }

        resetUI();
        setLoading(analyzeBtn, true);
        currentUrl = url;

        try {
            const response = await fetch(`${API}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Analiz başarısız');

            videoTitle.textContent = data.title;
            uploader.textContent = data.uploader || 'YouTube';
            if (data.duration) {
                duration.textContent = data.duration;
                durationWrap.style.display = 'inline';
            } else {
                durationWrap.style.display = 'none';
            }
            thumbnail.src = data.thumbnail || '';

            if (data.is_playlist) {
                playlistArea.classList.remove('hidden');
                playlistCount.textContent = `${data.playlist_count} video bulundu`;
                document.getElementById('modePlaylist').checked = true;
                updateDownloadButtonText();
            } else {
                document.getElementById('modeSingle').checked = true;
                updateDownloadButtonText();
            }

            qualitySelect.innerHTML = '';
            const resolutions = data.resolutions || ['1080p', '720p', '480p'];

            const bestOpt = document.createElement('option');
            bestOpt.value = 'best';
            bestOpt.textContent = 'En İyi Kalite';
            qualitySelect.appendChild(bestOpt);

            resolutions.forEach(res => {
                const opt = document.createElement('option');
                opt.value = res.replace('p', '');
                opt.textContent = res;
                qualitySelect.appendChild(opt);
            });

            resultArea.classList.remove('hidden');

        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(analyzeBtn, false);
        }
    }

    async function downloadVideo() {
        if (!currentUrl) return;

        setLoading(downloadBtn, true);
        cancelBtn.classList.remove('hidden');
        currentSessionId = null;
        abortController = new AbortController();

        const type = document.querySelector('input[name="fileType"]:checked').value;
        const quality = qualitySelect.value;
        const mode = document.querySelector('input[name="downloadMode"]:checked').value;

        if (mode === 'playlist') {
            document.getElementById('progressLog').classList.remove('hidden');
            document.getElementById('logContent').innerHTML = '';
            document.getElementById('progressStats').textContent = 'Başlatılıyor...';
        }

        try {
            const response = await fetch(`${API}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: currentUrl, type, quality, mode }),
                signal: abortController.signal
            });

            const contentType = response.headers.get('content-type');

            // Playlist: SSE stream
            if (contentType && contentType.includes('text/event-stream')) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let cancelled = false;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.replace('data: ', ''));

                                if (data.session_id) currentSessionId = data.session_id;

                                if (data.status === 'cancelled') {
                                    cancelled = true;
                                    showError('İndirme iptal edildi');
                                    break;
                                }

                                addLog(data);

                                // Playlist tamamlandı - zip indir
                                if (data.status === 'done' && data.zip_session) {
                                    const a = document.createElement('a');
                                    a.href = `${API}/download-zip/${data.zip_session}`;
                                    a.download = '';
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                }
                            } catch (e) {
                                console.log('Parse error:', e);
                            }
                        }
                    }

                    if (cancelled) break;
                }

                if (!cancelled) showSuccess('Playlist İndirildi!');
                setLoading(downloadBtn, false);
                cancelBtn.classList.add('hidden');
                return;
            }

            // Error response
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'İndirme başarısız');
            }

            // Single file: blob download to user's browser
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;

            const cd = response.headers.get('Content-Disposition');
            let filename = 'download';
            if (cd) {
                // Handle UTF-8 filenames
                const utf8Match = cd.match(/filename\*=UTF-8''(.+)/);
                const normalMatch = cd.match(/filename="?([^"]+)"?/);
                if (utf8Match) {
                    filename = decodeURIComponent(utf8Match[1]);
                } else if (normalMatch) {
                    filename = normalMatch[1];
                }
            } else {
                filename += (type === 'audio' ? '.mp3' : '.mp4');
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();

            showSuccess(type === 'audio' ? 'Müzik İndirildi!' : 'Video İndirildi!');

        } catch (error) {
            if (error.name === 'AbortError') {
                showError('İndirme iptal edildi');
            } else {
                showError(error.message);
                if (mode === 'playlist') {
                    addLog({ status: 'error', message: error.message });
                }
            }
        } finally {
            setLoading(downloadBtn, false);
            cancelBtn.classList.add('hidden');
            currentSessionId = null;
            abortController = null;
        }
    }

    async function cancelDownload() {
        if (abortController) abortController.abort();

        addLog({ status: 'error', message: 'Kullanıcı tarafından iptal edildi' });

        if (currentSessionId) {
            try {
                await fetch(`${API}/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_id: currentSessionId })
                });
            } catch (e) {
                console.error('Cancel failed:', e);
            }
        }

        setLoading(downloadBtn, false);
        cancelBtn.classList.add('hidden');
        showError('İndirme iptal edildi');
    }

    function showSuccess(msg) {
        successText.textContent = msg;
        successMessage.classList.remove('hidden');
        setTimeout(() => successMessage.classList.add('hidden'), 5000);
    }

    function addLog(data) {
        const logContent = document.getElementById('logContent');
        const stats = document.getElementById('progressStats');

        const line = document.createElement('div');
        line.className = `log-line ${data.status}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${data.message}`;

        logContent.appendChild(line);
        logContent.scrollTop = logContent.scrollHeight;

        if (data.total) {
            stats.textContent = `${data.current}/${data.total}`;
        }
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        setTimeout(() => { errorMsg.textContent = ''; }, 5000);
    }

    function resetUI() {
        resultArea.classList.add('hidden');
        playlistArea.classList.add('hidden');
        successMessage.classList.add('hidden');
        errorMsg.textContent = '';
        updateDownloadButtonText();
    }

    function setLoading(btn, isLoading) {
        btn.classList.toggle('loading', isLoading);
        btn.disabled = isLoading;
    }
});

