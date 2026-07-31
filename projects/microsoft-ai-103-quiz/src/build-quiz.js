#!/usr/bin/env node
/**
 * questions.json + explanations.json dosyalarini birlestirip
 * TEK SORU ODAKLI (Single Question Slide View), Senaryo Özetli ve Karar Kriterli
 * modern bir HTML quiz uygulamasi uretir.
 *
 * Kullanim:
 *   node src/build-quiz.js microsoft-ai-103
 */
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");

function escapeHtml(s) {
  return String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function main() {
  const examSlug = process.argv[2] || "microsoft-ai-103";
  const dir = path.join(OUTPUT_DIR, examSlug);
  const questionsPath = path.join(dir, "questions.json");
  const explanationsPath = path.join(dir, "explanations.json");

  if (!fs.existsSync(questionsPath)) {
    console.error(`Bulunamadi: ${questionsPath}`);
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(questionsPath, "utf-8"));
  const explanations = fs.existsSync(explanationsPath)
    ? JSON.parse(fs.readFileSync(explanationsPath, "utf-8"))
    : {};

  let missing = 0;
  const enriched = questions.map((q) => {
    const exp = explanations[q.number];
    if (!exp) missing += 1;
    return { ...q, explanation: exp || null };
  });

  const dataJs = `window.__QUIZ_DATA__ = ${JSON.stringify(enriched)};\nwindow.__EXAM_TITLE__ = ${JSON.stringify(examSlug.toUpperCase())};`;
  const html = renderHtml(examSlug.toUpperCase(), enriched.length);

  const outHtmlPath = path.join(dir, `${examSlug}-quiz.html`);
  const outDataPath = path.join(dir, "quiz-data.js");

  fs.writeFileSync(outDataPath, dataJs, "utf-8");
  fs.writeFileSync(outHtmlPath, html, "utf-8");

  console.log(`[OK] Single-Question HTML Quiz olusturuldu: ${outHtmlPath}`);
  console.log(`[OK] Data JS olusturuldu: ${outDataPath}`);
}

function renderHtml(examTitle, totalQuestions) {
  return `<!DOCTYPE html>
<html lang="tr" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(examTitle)} - Dinamik Sınav & Türkçe Açıklamalar</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-main: #0f172a;
    --bg-card: #1e293b;
    --bg-header: rgba(15, 23, 42, 0.85);
    --border-color: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --accent-blue: #0078d4;
    --accent-blue-hover: #005a9e;
    --accent-glow: rgba(0, 120, 212, 0.25);
    --success: #107c41;
    --success-bg: rgba(16, 124, 65, 0.15);
    --success-border: #27ac5d;
    --danger: #d13438;
    --danger-bg: rgba(209, 52, 56, 0.15);
    --danger-border: #f87171;
    --warning: #f59e0b;
    --warning-bg: rgba(245, 158, 11, 0.12);
    --card-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
    --radius-lg: 14px;
    --radius-md: 10px;
    --radius-sm: 6px;
  }

  [data-theme="light"] {
    --bg-main: #f1f5f9;
    --bg-card: #ffffff;
    --bg-header: rgba(255, 255, 255, 0.9);
    --border-color: #e2e8f0;
    --text-primary: #0f172a;
    --text-secondary: #475569;
    --text-muted: #94a3b8;
    --accent-blue: #0284c7;
    --accent-blue-hover: #0369a1;
    --accent-glow: rgba(2, 132, 199, 0.2);
    --success: #16a34a;
    --success-bg: #f0fdf4;
    --success-border: #86efac;
    --danger: #dc2626;
    --danger-bg: #fef2f2;
    --danger-border: #fca5a5;
    --warning-bg: #fffbeb;
    --card-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background-color: var(--bg-main);
    color: var(--text-primary);
    line-height: 1.6;
    padding-bottom: 60px;
  }

  /* Header */
  header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--bg-header);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-color);
    padding: 12px 24px;
  }

  .header-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-logo {
    background: linear-gradient(135deg, #0078d4, #50e6ff);
    color: white;
    font-weight: 800;
    font-size: 15px;
    padding: 5px 12px;
    border-radius: var(--radius-md);
  }
  .brand-title {
    font-size: 17px;
    font-weight: 700;
  }

  .stats-bar {
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    padding: 6px 16px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 600;
  }
  .stat-val { color: var(--accent-blue); }
  .stat-val.success { color: var(--success); }
  .stat-val.danger { color: var(--danger); }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-primary);
    transition: all 0.2s ease;
  }
  .btn:hover:not(:disabled) {
    border-color: var(--accent-blue);
    background: var(--border-color);
  }
  .btn-primary {
    background: var(--accent-blue);
    color: white;
    border: none;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--accent-blue-hover);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Main Layout */
  main {
    max-width: 1200px;
    margin: 20px auto;
    padding: 0 20px;
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 20px;
  }

  @media (max-width: 900px) {
    main { grid-template-columns: 1fr; }
    .sidebar { order: -1; }
  }

  /* Toolbar */
  .toolbar {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 12px 16px;
    margin-bottom: 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .filter-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .filter-btn {
    padding: 5px 12px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    background: transparent;
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .filter-btn.active {
    background: var(--accent-blue);
    color: white;
    border-color: var(--accent-blue);
  }

  .search-input {
    padding: 6px 12px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    background: var(--bg-main);
    color: var(--text-primary);
    font-size: 12.5px;
    width: 200px;
    outline: none;
  }

  /* Pagination Bar */
  .nav-bar {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 12px 18px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-info {
    font-weight: 700;
    font-size: 14px;
    color: var(--text-primary);
  }

  /* Single Question Card */
  .q-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--card-shadow);
    overflow: hidden;
  }

  .q-header {
    background: rgba(0, 0, 0, 0.15);
    border-bottom: 1px solid var(--border-color);
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .q-num {
    font-weight: 700;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .q-topic {
    background: rgba(0, 120, 212, 0.15);
    color: var(--accent-blue);
    border: 1px solid var(--accent-glow);
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11.5px;
    font-weight: 600;
  }

  .q-body { padding: 20px; }

  /* Scenario / Hotspot Accordion Banner */
  .scenario-banner {
    background: var(--warning-bg);
    border: 1px solid var(--warning);
    border-radius: var(--radius-md);
    margin-bottom: 18px;
    overflow: hidden;
  }
  .scenario-header {
    padding: 10px 14px;
    font-weight: 700;
    font-size: 13px;
    color: var(--warning);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
  }
  .scenario-content {
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.6;
    border-top: 1px solid rgba(245, 158, 11, 0.2);
    color: var(--text-primary);
  }

  .q-text {
    font-size: 14.5px;
    color: var(--text-primary);
    line-height: 1.65;
    margin-bottom: 18px;
  }
  .q-text img {
    max-width: 100%;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);
    margin: 12px 0;
    cursor: pointer;
  }

  /* Choices */
  .choices {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 18px;
  }

  .choice {
    background: var(--bg-main);
    border: 1.5px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    transition: all 0.2s ease;
    font-size: 14px;
  }
  .choice:hover:not(.disabled) {
    border-color: var(--accent-blue);
    background: rgba(0, 120, 212, 0.05);
  }
  .choice.selected {
    border-color: var(--accent-blue);
    background: rgba(0, 120, 212, 0.12);
  }
  .choice.correct {
    border-color: var(--success-border);
    background: var(--success-bg);
  }
  .choice.wrong {
    border-color: var(--danger-border);
    background: var(--danger-bg);
  }
  .choice.disabled { cursor: default; }

  .choice-letter {
    font-weight: 700;
    min-width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(255,255,255,0.08);
    font-size: 12px;
    flex-shrink: 0;
  }
  .choice-text { flex-grow: 1; line-height: 1.5; }

  .q-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px dashed var(--border-color);
  }

  .bookmark-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .bookmark-btn.active { color: var(--warning); }

  /* Explanation Panel */
  .exp-panel {
    display: none;
    margin-top: 18px;
    border-radius: var(--radius-md);
    overflow: hidden;
    border: 1.5px solid var(--border-color);
  }
  .exp-panel.show { display: block; }
  .exp-panel.ok { border-color: var(--success-border); }
  .exp-panel.nok { border-color: var(--danger-border); }

  .exp-header {
    padding: 12px 18px;
    font-weight: 700;
    font-size: 14px;
  }
  .exp-panel.ok .exp-header { background: var(--success-bg); color: var(--success); }
  .exp-panel.nok .exp-header { background: var(--danger-bg); color: var(--danger); }

  .exp-content {
    background: var(--bg-card);
    padding: 18px;
    font-size: 13.5px;
    line-height: 1.65;
  }

  .exp-criteria-box {
    background: rgba(245, 158, 11, 0.1);
    border-left: 4px solid var(--warning);
    padding: 10px 14px;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    margin-bottom: 12px;
    font-size: 13px;
  }

  .exp-main-tr {
    background: rgba(0, 120, 212, 0.08);
    border-left: 4px solid var(--accent-blue);
    padding: 10px 14px;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    margin-bottom: 14px;
  }

  .exp-choices-title {
    font-weight: 700;
    margin: 14px 0 8px;
    font-size: 13px;
  }
  .exp-choice-item {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    margin-bottom: 8px;
    background: var(--bg-main);
    border-left: 3px solid var(--border-color);
    font-size: 13px;
  }
  .exp-choice-item.correct-item { border-left-color: var(--success); background: var(--success-bg); }
  .exp-choice-item.wrong-item { border-left-color: var(--danger); background: var(--danger-bg); }

  .exp-doc-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    color: var(--accent-blue);
    font-weight: 600;
    text-decoration: none;
    font-size: 12.5px;
  }

  /* Sidebar Grid Map */
  .sidebar-box {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 16px;
  }
  .sidebar-title {
    font-size: 14px;
    font-weight: 700;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
  }
  .q-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(34px, 1fr));
    gap: 5px;
    max-height: 440px;
    overflow-y: auto;
  }
  .q-dot {
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    background: var(--bg-main);
    border: 1px solid var(--border-color);
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-secondary);
  }
  .q-dot.active {
    border-color: var(--accent-blue);
    box-shadow: 0 0 0 2px var(--accent-glow);
    color: var(--text-primary);
  }
  .q-dot.ok { background: var(--success); color: white; border-color: var(--success); }
  .q-dot.nok { background: var(--danger); color: white; border-color: var(--danger); }
  .q-dot.flagged { border-color: var(--warning); }

  /* Modal */
  .modal {
    display: none;
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.85);
    z-index: 1000;
    justify-content: center; align-items: center; padding: 20px;
  }
  .modal.show { display: flex; }
  .modal-img { max-width: 90%; max-height: 90vh; border-radius: var(--radius-md); }
  .modal-close { position: absolute; top: 20px; right: 24px; color: white; font-size: 28px; cursor: pointer; }
</style>
</head>
<body>

<header>
  <div class="header-container">
    <div class="brand">
      <div class="brand-logo">AI-103</div>
      <div class="brand-title">Microsoft AI-103 Quiz Application</div>
    </div>
    <div class="stats-bar">
      <div>Cevaplanan: <span class="stat-val" id="answeredCount">0 / ${totalQuestions}</span></div>
      <div>Doğru: <span class="stat-val success" id="correctCount">0</span></div>
      <div>Yanlış: <span class="stat-val danger" id="wrongCount">0</span></div>
      <div>Başarı: <span class="stat-val" id="accuracyRate">0%</span></div>
    </div>
    <div class="header-actions">
      <button class="btn" id="themeToggleBtn">🌙 Koyu Tema</button>
      <button class="btn" id="resetProgressBtn">🔄 Sıfırla</button>
    </div>
  </div>
</header>

<main>
  <div class="content-area">
    <div class="toolbar">
      <div class="filter-group">
        <button class="filter-btn active" data-filter="all">Tüm Sorular (${totalQuestions})</button>
        <button class="filter-btn" data-filter="unanswered">Cevaplanmamış</button>
        <button class="filter-btn" data-filter="correct">Doğru ✅</button>
        <button class="filter-btn" data-filter="wrong">Yanlış ❌</button>
        <button class="filter-btn" data-filter="flagged">Favoriler ⭐</button>
      </div>
      <input type="text" class="search-input" id="searchInput" placeholder="Soru ara...">
    </div>

    <!-- Navigation Control Bar -->
    <div class="nav-bar">
      <button class="btn" id="prevBtn">← Önceki Soru</button>
      <div class="nav-info" id="navInfo">Soru 1 / ${totalQuestions}</div>
      <button class="btn btn-primary" id="nextBtn">Sonraki Soru →</button>
    </div>

    <!-- Single Question Container -->
    <div id="quizRoot"></div>
  </div>

  <aside class="sidebar">
    <div class="sidebar-box">
      <div class="sidebar-title">
        <span>Soru Haritası</span>
        <span style="font-size: 11px; color: var(--text-muted);">Soruya Git</span>
      </div>
      <div class="q-grid" id="qGrid"></div>
    </div>
  </aside>
</main>

<div class="modal" id="imageModal">
  <span class="modal-close" id="modalClose">&times;</span>
  <img class="modal-img" id="modalImg" src="" alt="Görsel Büyütme">
</div>

<script src="quiz-data.js"></script>
<script>
const data = window.__QUIZ_DATA__ || [];
const root = document.getElementById("quizRoot");
const qGrid = document.getElementById("qGrid");
const answeredCountEl = document.getElementById("answeredCount");
const correctCountEl = document.getElementById("correctCount");
const wrongCountEl = document.getElementById("wrongCount");
const accuracyRateEl = document.getElementById("accuracyRate");
const searchInput = document.getElementById("searchInput");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const navInfo = document.getElementById("navInfo");

const STORAGE_KEY = "AI103_QUIZ_SINGLE_VIEW_V2";
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); // qnum -> { selected: [], answered: bool, correct: bool, flagged: bool }

let currentFilter = "all";
let currentSearch = "";
let currentIndex = 0; // Index in filtered deck
let filteredData = [...data];

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeAnswerLetters(answerHtml) {
  if (!answerHtml) return [];
  const text = answerHtml.replace(/<[^>]*>/g, "").trim();
  if (/^[A-F]+$/.test(text)) return text.split("");
  return [];
}

function updateFilteredDeck() {
  filteredData = data.filter(q => {
    const qnum = String(q.number);
    const qState = state[qnum] || { selected: [], answered: false, correct: null, flagged: false };

    let matchesFilter = true;
    if (currentFilter === "unanswered" && qState.answered) matchesFilter = false;
    if (currentFilter === "correct" && (!qState.answered || !qState.correct)) matchesFilter = false;
    if (currentFilter === "wrong" && (!qState.answered || qState.correct !== false)) matchesFilter = false;
    if (currentFilter === "flagged" && !qState.flagged) matchesFilter = false;

    if (currentSearch && matchesFilter) {
      const s = currentSearch.toLowerCase();
      const textMatch = q.questionHtml.toLowerCase().includes(s) || qnum.includes(s);
      const choiceMatch = q.choices.some(c => c.html.toLowerCase().includes(s));
      if (!textMatch && !choiceMatch) matchesFilter = false;
    }
    return matchesFilter;
  });

  if (currentIndex >= filteredData.length) {
    currentIndex = Math.max(0, filteredData.length - 1);
  }
}

function render() {
  updateFilteredDeck();
  renderSidebarGrid();

  if (filteredData.length === 0) {
    root.innerHTML = '<div style="text-align:center; padding: 50px; background:var(--bg-card); border-radius:var(--radius-lg); border:1px solid var(--border-color); color:var(--text-muted);">Aramanıza veya seçilen filtreye uygun soru bulunamadı.</div>';
    navInfo.textContent = "Soru 0 / 0";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    updateStats();
    return;
  }

  const q = filteredData[currentIndex];
  const qnum = String(q.number);
  const qState = state[qnum] || { selected: [], answered: false, correct: null, flagged: false };
  const correctLetters = normalizeAnswerLetters(q.answerHtml);

  navInfo.textContent = \`Soru \${currentIndex + 1} / \${filteredData.length} (Toplam Soru #\${qnum})\`;
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === filteredData.length - 1;

  root.innerHTML = renderQuestionCard(q, qState, correctLetters);
  updateStats();
}

function renderQuestionCard(q, qState, correctLetters) {
  const qnum = String(q.number);
  const isMulti = correctLetters.length > 1;
  const hasChoices = q.choices && q.choices.length > 0;

  // Scenario / Case Study / Hotspot Summary Box
  let scenarioBoxHtml = "";
  if (q.explanation && q.explanation.scenarioSummaryTr) {
    scenarioBoxHtml = \`
    <div class="scenario-banner">
      <div class="scenario-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
        <span>📌 Senaryo & Konu Özeti (Ne Anlatıyor?)</span>
        <span>▼</span>
      </div>
      <div class="scenario-content">
        \${escapeHtml(q.explanation.scenarioSummaryTr)}
      </div>
    </div>\`;
  }

  // Choices List
  let choicesHtml = "";
  if (hasChoices) {
    choicesHtml = '<ul class="choices">' + q.choices.map(c => {
      let choiceClass = "choice";
      if (qState.selected.includes(c.letter)) choiceClass += " selected";
      if (qState.answered) {
        choiceClass += " disabled";
        if (correctLetters.includes(c.letter)) choiceClass += " correct";
        else if (qState.selected.includes(c.letter)) choiceClass += " wrong";
      }

      return \`
      <li class="\${choiceClass}" data-letter="\${c.letter}" data-qnum="\${qnum}">
        <span class="choice-letter">\${c.letter}</span>
        <span class="choice-text">\${c.html}</span>
      </li>\`;
    }).join("") + "</ul>";
  } else {
    choicesHtml = '<div style="font-size:13px; color: var(--text-muted); font-style:italic; margin-bottom:14px;">Bu soru görsel/HOTSPOT veya sürükle-bırak sorusudur. "Cevabı Göster & Türkçe Açıkla" butonuna basarak doğru eşleşmeyi ve detaylı analizi görebilirsiniz.</div>';
  }

  // Explanation Panel
  let expHtml = "";
  if (qState.answered && q.explanation) {
    const isOk = qState.correct;
    const panelClass = isOk ? "exp-panel show ok" : "exp-panel show nok";
    const headerTitle = isOk ? "Tebrikler! Doğru Cevap ✅" : \`Yanıtınız Yanlış ❌ (Doğru Cevap: \${correctLetters.join(", ") || "Görseldeki Eşleşme"})\`;

    // Decision Criteria Box ("Neyi göz önünde bulunduruyoruz?")
    let criteriaHtml = "";
    if (q.explanation.decisionCriteriaTr) {
      criteriaHtml = \`
      <div class="exp-criteria-box">
        <strong>💡 Neyi Göz Önünde Bulunduruyoruz? (Temel Karar Kriterleri):</strong><br>
        \${escapeHtml(q.explanation.decisionCriteriaTr)}
      </div>\`;
    }

    let choicesBreakdown = "";
    if (q.explanation.choicesTr && Object.keys(q.explanation.choicesTr).length > 0) {
      choicesBreakdown = '<div class="exp-choices-title">Şık Bazlı Türkçe Açıklamalar (Neden Seçilebilir / Seçilemez?):</div>';
      Object.keys(q.explanation.choicesTr).forEach(letter => {
        const isChoiceCorrect = correctLetters.includes(letter);
        const itemClass = isChoiceCorrect ? "exp-choice-item correct-item" : "exp-choice-item wrong-item";
        choicesBreakdown += \`<div class="\${itemClass}">\${escapeHtml(q.explanation.choicesTr[letter])}</div>\`;
      });
    }

    const docLink = q.explanation.microsoftDoc ? \`<a href="\${q.explanation.microsoftDoc}" target="_blank" class="exp-doc-link">📖 Microsoft Dokümantasyonu & Kaynak</a>\` : "";

    expHtml = \`
    <div class="\${panelClass}">
      <div class="exp-header">\${headerTitle}</div>
      <div class="exp-content">
        \${criteriaHtml}
        <div class="exp-main-tr">
          <strong>Türkçe Detaylı Açıklama:</strong><br>
          \${escapeHtml(q.explanation.correctTr || "")}
        </div>
        \${choicesBreakdown}
        \${docLink}
      </div>
    </div>\`;
  }

  const flagClass = qState.flagged ? "bookmark-btn active" : "bookmark-btn";
  const submitText = qState.answered ? "Cevaplandı" : (hasChoices ? "Cevabı Onayla" : "Cevabı Göster & Türkçe Açıkla");

  return \`
  <div class="q-card" id="q-\${qnum}">
    <div class="q-header">
      <div class="q-num">
        <span>Soru #\${qnum}</span>
        \${isMulti ? '<span style="font-size:11px; background:var(--warning); color:#000; padding:2px 8px; border-radius:10px; font-weight:700;">Çoklu Seçim</span>' : ''}
      </div>
      <span class="q-topic">\${escapeHtml(q.topic || "Topic 1")}</span>
    </div>
    <div class="q-body">
      \${scenarioBoxHtml}
      <div class="q-text">\${q.questionHtml}</div>
      \${choicesHtml}
      <div class="q-actions">
        <button class="\${flagClass}" data-qnum="\${qnum}">
          ⭐ \${qState.flagged ? "Favorilerden Çıkar" : "Favorilere Ekle"}
        </button>
        <button class="btn btn-primary submit-btn" data-qnum="\${qnum}" \${qState.answered ? "disabled" : ""}>
          \${submitText}
        </button>
      </div>
      \${expHtml}
    </div>
  </div>\`;
}

function renderSidebarGrid() {
  let gridHtml = "";
  data.forEach((q) => {
    const qnum = String(q.number);
    const qState = state[qnum] || { selected: [], answered: false, correct: null, flagged: false };
    const currentQ = filteredData[currentIndex];
    const isCurrent = currentQ && String(currentQ.number) === qnum;

    let dotClass = "q-dot";
    if (isCurrent) dotClass += " active";
    if (qState.answered) dotClass += qState.correct ? " ok" : " nok";
    if (qState.flagged) dotClass += " flagged";

    gridHtml += \`<div class="\${dotClass}" data-qnum="\${qnum}">\${qnum}</div>\`;
  });
  qGrid.innerHTML = gridHtml;
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function updateStats() {
  let answered = 0, correct = 0, wrong = 0;
  Object.values(state).forEach(s => {
    if (s.answered) {
      answered++;
      if (s.correct) correct++; else wrong++;
    }
  });

  answeredCountEl.textContent = \`\${answered} / \${data.length}\`;
  correctCountEl.textContent = correct;
  wrongCountEl.textContent = wrong;
  const rate = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  accuracyRateEl.textContent = \`\${rate}%\`;
}

function attachEvents() {
  // Navigation
  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) { currentIndex--; render(); }
  });
  nextBtn.addEventListener("click", () => {
    if (currentIndex < filteredData.length - 1) { currentIndex++; render(); }
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" && currentIndex > 0) { currentIndex--; render(); }
    if (e.key === "ArrowRight" && currentIndex < filteredData.length - 1) { currentIndex++; render(); }
  });

  // Choice Selection & Actions
  root.addEventListener("click", (e) => {
    const choiceEl = e.target.closest(".choice");
    if (choiceEl) {
      const qnum = choiceEl.dataset.qnum;
      const qState = state[qnum] || { selected: [], answered: false, correct: null, flagged: false };
      if (qState.answered) return;

      const letter = choiceEl.dataset.letter;
      const q = data.find(x => String(x.number) === String(qnum));
      const correctLetters = normalizeAnswerLetters(q.answerHtml);
      const isMulti = correctLetters.length > 1;

      if (!isMulti) qState.selected = [letter];
      else {
        if (qState.selected.includes(letter)) qState.selected = qState.selected.filter(l => l !== letter);
        else qState.selected.push(letter);
      }

      state[qnum] = qState;
      saveState();
      render();
      return;
    }

    const submitBtn = e.target.closest(".submit-btn");
    if (submitBtn) {
      submitAnswer(submitBtn.dataset.qnum);
      return;
    }

    const bookmarkBtn = e.target.closest(".bookmark-btn");
    if (bookmarkBtn) {
      const qnum = bookmarkBtn.dataset.qnum;
      const qState = state[qnum] || { selected: [], answered: false, correct: null, flagged: false };
      qState.flagged = !qState.flagged;
      state[qnum] = qState;
      saveState();
      render();
      return;
    }

    if (e.target.tagName === "IMG" && e.target.closest(".q-text")) {
      document.getElementById("modalImg").src = e.target.src;
      document.getElementById("imageModal").classList.add("show");
    }
  });

  // Sidebar Dot Jump
  qGrid.addEventListener("click", (e) => {
    const dot = e.target.closest(".q-dot");
    if (dot) {
      const qnum = dot.dataset.qnum;
      const idx = filteredData.findIndex(x => String(x.number) === qnum);
      if (idx >= 0) {
        currentIndex = idx;
        render();
      } else {
        // Switch to "all" filter if question is hidden in current filter
        currentFilter = "all";
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        document.querySelector('.filter-btn[data-filter="all"]').classList.add("active");
        updateFilteredDeck();
        const newIdx = filteredData.findIndex(x => String(x.number) === qnum);
        if (newIdx >= 0) currentIndex = newIdx;
        render();
      }
    }
  });

  // Image Modal
  document.getElementById("modalClose").addEventListener("click", () => document.getElementById("imageModal").classList.remove("show"));
  document.getElementById("imageModal").addEventListener("click", (e) => { if (e.target.id === "imageModal") document.getElementById("imageModal").classList.remove("show"); });

  // Filters & Search
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      currentIndex = 0;
      render();
    });
  });

  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    currentIndex = 0;
    render();
  });

  // Theme & Reset
  const themeBtn = document.getElementById("themeToggleBtn");
  themeBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    themeBtn.textContent = nextTheme === "dark" ? "🌙 Koyu Tema" : "☀️ Açık Tema";
  });

  document.getElementById("resetProgressBtn").addEventListener("click", () => {
    if (confirm("Tüm cevaplarınız ve favorileriniz sıfırlansın mı?")) {
      state = {};
      saveState();
      render();
    }
  });
}

function submitAnswer(qnum) {
  const q = data.find(x => String(x.number) === String(qnum));
  if (!q) return;

  const qState = state[qnum] || { selected: [], answered: false, correct: null, flagged: false };
  if (qState.answered) return;

  const correctLetters = normalizeAnswerLetters(q.answerHtml);
  if (correctLetters.length > 0) {
    const sortedSel = [...qState.selected].sort().join("");
    const sortedCorrect = [...correctLetters].sort().join("");
    qState.correct = sortedSel === sortedCorrect && sortedSel.length > 0;
  } else {
    qState.correct = true;
  }

  qState.answered = true;
  state[qnum] = qState;
  saveState();
  render();
}

render();
attachEvents();
</script>
</body>
</html>`;
}

main();
