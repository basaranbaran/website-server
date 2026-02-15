document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const startUrlInput = document.getElementById('startUrl');
    const targetInput = document.getElementById('targetTopic');
    const keywordsInput = document.getElementById('keywords');
    const resultsArea = document.getElementById('resultsArea');
    const pathVis = document.getElementById('pathVisualization');
    const logArea = document.getElementById('logArea');
    const finalResult = document.getElementById('finalResult');

    const API = '/wiki-speedrun/api';

    startBtn.addEventListener('click', startSpeedrun);

    // Enter key on inputs
    [startUrlInput, targetInput, keywordsInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startSpeedrun();
        });
    });

    async function startSpeedrun() {
        const startUrl = startUrlInput.value.trim();
        const target = targetInput.value.trim();
        const keywords = keywordsInput.value.trim() || target;

        if (!startUrl) {
            alert('Lütfen bir başlangıç Wikipedia URL\'si girin');
            return;
        }
        if (!target) {
            alert('Lütfen bir hedef konu girin');
            return;
        }
        if (!startUrl.startsWith('https://en.wikipedia.org/wiki/')) {
            alert('Geçerli bir Wikipedia URL\'si girin (https://en.wikipedia.org/wiki/...)');
            return;
        }

        // Reset UI
        setLoading(startBtn, true);
        resultsArea.classList.remove('hidden');
        pathVis.innerHTML = '';
        logArea.innerHTML = '';
        finalResult.classList.add('hidden');
        finalResult.className = 'final-result hidden';

        try {
            const response = await fetch(`${API}/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_url: startUrl,
                    target: target,
                    keywords: keywords,
                    method: '2'
                })
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.replace('data: ', ''));
                            handleEvent(data, target);
                        } catch (e) {
                            console.log('Parse error:', e);
                        }
                    }
                }
            }
        } catch (error) {
            addLogLine('Bağlantı hatası: ' + error.message, 'log-error');
            showFinalResult('Hata: ' + error.message, false);
        } finally {
            setLoading(startBtn, false);
        }
    }

    function handleEvent(data, target) {
        switch (data.status) {
            case 'info':
                addLogLine(data.message, 'log-info');
                break;

            case 'start':
                addPathNode(data.page, true, false);
                addLogLine('🚀 ' + data.message, 'log-info');
                break;

            case 'fetching':
                addLogLine(data.message, 'log-info');
                break;

            case 'step':
                updateCurrentNode();
                addPathNode(data.to, true, false);
                addLogLine('👉 ' + data.message, 'log-step');
                break;

            case 'shortcut':
                updateCurrentNode();
                addPathNode(data.to, true, false);
                addLogLine('⚡ ' + data.message, 'log-shortcut');
                break;

            case 'win':
                updateCurrentNode();
                markLastNodeAsTarget();
                addLogLine('🏁 ' + data.message, 'log-win');
                showFinalResult(
                    `🏁 HEDEF BULUNDU!\n${data.steps} adımda, ${data.time} saniyede\nYol: ${data.path.join(' → ')}`,
                    true
                );
                break;

            case 'dead_end':
                addLogLine('💀 ' + data.message, 'log-error');
                showFinalResult('Çıkmaz sokak! Devam edilecek link bulunamadı.', false);
                break;

            case 'timeout':
                addLogLine('⏰ ' + data.message, 'log-error');
                showFinalResult(data.message, false);
                break;

            case 'error':
                addLogLine('❌ ' + data.message, 'log-error');
                showFinalResult('Hata: ' + data.message, false);
                break;
        }
    }

    function addPathNode(title, isCurrent, isTarget) {
        // Add arrow if not the first node
        if (pathVis.children.length > 0) {
            const arrow = document.createElement('span');
            arrow.className = 'path-arrow';
            arrow.textContent = '→';
            pathVis.appendChild(arrow);
        }

        const node = document.createElement('span');
        node.className = 'path-page';
        if (isCurrent) node.classList.add('current');
        if (isTarget) node.classList.add('target-reached');
        node.textContent = title;
        pathVis.appendChild(node);

        // Auto scroll to end
        pathVis.scrollLeft = pathVis.scrollWidth;
    }

    function updateCurrentNode() {
        pathVis.querySelectorAll('.path-page.current').forEach(el => {
            el.classList.remove('current');
        });
    }

    function markLastNodeAsTarget() {
        const nodes = pathVis.querySelectorAll('.path-page');
        if (nodes.length > 0) {
            const last = nodes[nodes.length - 1];
            last.classList.remove('current');
            last.classList.add('target-reached');
        }
    }

    function addLogLine(text, className) {
        const line = document.createElement('div');
        line.className = 'wiki-log-line ' + className;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
        logArea.appendChild(line);
        logArea.scrollTop = logArea.scrollHeight;
    }

    function showFinalResult(message, isWin) {
        finalResult.classList.remove('hidden', 'result-win', 'result-fail');
        finalResult.classList.add(isWin ? 'result-win' : 'result-fail');
        finalResult.textContent = message;
        finalResult.style.whiteSpace = 'pre-line';
    }

    function setLoading(btn, isLoading) {
        btn.classList.toggle('loading', isLoading);
        btn.disabled = isLoading;
    }
});

