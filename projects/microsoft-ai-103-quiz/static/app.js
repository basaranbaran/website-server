/* ============================================================
   AI-103 Quiz App — Main Application Logic
   v2.0 — Debounced sync, keyboard shortcuts, progress bar,
           smooth scroll, toast, quick jump, and more.
   ============================================================ */

let quizData = null;
let questions = [];
let topics = [];
let state = {};

let activeModule = "quiz";
let activeTopic = "All";
let currentFilter = "all";
let currentSearch = "";
let currentIndex = 0;
let filteredData = [];

// Debounce timer for syncProgress
let syncTimer = null;
const SYNC_DEBOUNCE_MS = 600;

// ============================================================
// DOM References
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const root = $("#quizRoot");
const topicTabsEl = $("#topicTabs");
const qGrid = $("#qGrid");
const answeredCountEl = $("#answeredCount");
const correctCountEl = $("#correctCount");
const wrongCountEl = $("#wrongCount");
const accuracyRateEl = $("#accuracyRate");
const progressFill = $("#progressFill");
const searchInput = $("#searchInput");
const prevBtn = $("#prevBtn");
const nextBtn = $("#nextBtn");
const navInfo = $("#navInfo");
const jumpInput = $("#jumpInput");

const quizModuleBtn = $("#quizModuleBtn");
const ozetModuleBtn = $("#ozetModuleBtn");
const quizModuleView = $("#quizModuleView");
const ozetModuleView = $("#ozetModuleView");
const statsBar = $("#statsBar");
const appFooter = $("#appFooter");
const loadingSkeleton = $("#loadingSkeleton");
const appContainer = $("#appContainer");

// ============================================================
// Init
// ============================================================
async function init() {
  try {
    const [dataRes, progRes] = await Promise.all([
      fetch("api/data"),
      fetch("api/progress")
    ]);
    quizData = await dataRes.json();
    const progData = await progRes.json();

    questions = quizData.questions || [];
    topics = quizData.topics || [];

    state = progData.state || {};
    activeTopic = progData.activeTopic || "All";
    currentIndex = progData.lastActiveIndex || 0;
    activeModule = progData.activeModule || "quiz";

    // Hide skeleton, show app
    loadingSkeleton.style.display = "none";
    appContainer.style.display = "block";

    switchModule(activeModule, false);
    renderTopicTabs();
    updateFilteredDeck();
    render();
    attachEvents();
  } catch (err) {
    console.error("Initialization error:", err);
    loadingSkeleton.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--danger);">
        <div style="font-size:32px; margin-bottom:12px;">⚠️</div>
        <div>Veriler yüklenirken hata oluştu: ${escapeHtml(err.message)}</div>
        <button onclick="location.reload()" style="margin-top:16px; padding:8px 20px; cursor:pointer; border-radius:8px; border:1px solid var(--danger); background:transparent; color:var(--danger); font-weight:600;">Tekrar Dene</button>
      </div>`;
  }
}

// ============================================================
// Module Switcher
// ============================================================
function switchModule(mod, sync = true) {
  activeModule = mod;
  if (mod === "ozet") {
    quizModuleBtn.classList.remove("active");
    ozetModuleBtn.classList.add("active");
    quizModuleView.style.display = "none";
    ozetModuleView.style.display = "block";
    statsBar.style.display = "none";
    appFooter.style.display = "none";
  } else {
    ozetModuleBtn.classList.remove("active");
    quizModuleBtn.classList.add("active");
    ozetModuleView.style.display = "none";
    quizModuleView.style.display = "grid";
    statsBar.style.display = "";
    appFooter.style.display = "";
  }
  if (sync) syncProgressDebounced();
}

// ============================================================
// Progress Sync (Debounced)
// ============================================================
function syncProgressDebounced() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncProgressNow, SYNC_DEBOUNCE_MS);
}

async function syncProgressNow() {
  try {
    await fetch("api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state,
        activeTopic,
        lastActiveIndex: currentIndex,
        activeModule
      })
    });
  } catch (err) {
    console.error("Sync error:", err);
  }
}

// ============================================================
// Utilities
// ============================================================
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeAnswerLetters(answerHtml) {
  if (!answerHtml) return [];
  const text = answerHtml.replace(/<[^>]*>/g, "").trim();
  if (/^[A-F]+$/.test(text)) return text.split("");
  return [];
}

function showToast(message, type = "info") {
  const container = $("#toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// Topic Tabs
// ============================================================
function renderTopicTabs() {
  const isSingle = topics.length <= 1;
  topicTabsEl.className = `topic-tabs${isSingle ? " single-topic" : ""}`;

  let html = `<button class="topic-tab ${activeTopic === "All" ? "active" : ""}" data-topic="All">Tüm Konular (${questions.length})</button>`;
  topics.forEach(t => {
    html += `<button class="topic-tab ${activeTopic === t.name ? "active" : ""}" data-topic="${escapeHtml(t.name)}">${escapeHtml(t.name)} (${t.count})</button>`;
  });
  topicTabsEl.innerHTML = html;
}

// ============================================================
// Filtering
// ============================================================
function updateFilteredDeck() {
  filteredData = questions.filter(q => {
    const qnum = String(q.number);
    const qState = state[qnum] || {};

    if (activeTopic !== "All" && q.topic !== activeTopic) return false;

    if (currentFilter === "unanswered" && qState.answered) return false;
    if (currentFilter === "correct" && (!qState.answered || !qState.correct)) return false;
    if (currentFilter === "wrong" && (!qState.answered || qState.correct !== false)) return false;
    if (currentFilter === "flagged" && !qState.flagged) return false;

    if (currentSearch) {
      const s = currentSearch.toLowerCase();
      const textMatch = q.questionHtml.toLowerCase().includes(s) || qnum.includes(s);
      const choiceMatch = (q.choices || []).some(c => c.html.toLowerCase().includes(s));
      if (!textMatch && !choiceMatch) return false;
    }

    return true;
  });

  if (currentIndex >= filteredData.length) {
    currentIndex = Math.max(0, filteredData.length - 1);
  }
}

// ============================================================
// Render
// ============================================================
function render() {
  updateFilteredDeck();
  renderSidebarGrid();
  updateStats();

  if (filteredData.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">Seçilen konuya veya filtreye uygun soru bulunamadı.</div>
      </div>`;
    navInfo.textContent = "Soru 0 / 0";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  const q = filteredData[currentIndex];
  const qnum = String(q.number);
  const qState = state[qnum] || {};
  const correctLetters = normalizeAnswerLetters(q.answerHtml);

  navInfo.textContent = `Soru ${currentIndex + 1} / ${filteredData.length}  (#${qnum})`;
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === filteredData.length - 1;

  // Pulse hint on next button after answering
  if (qState.answered && currentIndex < filteredData.length - 1) {
    nextBtn.classList.add("pulse-hint");
  } else {
    nextBtn.classList.remove("pulse-hint");
  }

  root.innerHTML = renderQuestionCard(q, qState, correctLetters);
  scrollSidebarToActive();
}

function renderQuestionCard(q, qState, correctLetters) {
  const qnum = String(q.number);
  const isMulti = correctLetters.length > 1;
  const hasChoices = q.choices && q.choices.length > 0;
  const isSingleTopic = topics.length <= 1;

  // Scenario Accordion
  let scenarioBoxHtml = "";
  if (q.explanation && q.explanation.scenarioSummaryTr) {
    scenarioBoxHtml = `
    <div class="scenario-banner">
      <div class="scenario-header" data-toggle="scenario-${qnum}">
        <span>📌 Senaryo & Konu Özeti (Ne Anlatıyor?)</span>
        <span class="toggle-arrow">▼</span>
      </div>
      <div class="scenario-content" id="scenario-${qnum}">
        ${escapeHtml(q.explanation.scenarioSummaryTr)}
      </div>
    </div>`;
  }

  // Choices
  let choicesHtml = "";
  if (hasChoices) {
    choicesHtml = '<ul class="choices">' + q.choices.map(c => {
      const sel = (qState.selected || []);
      let cls = "choice";
      if (sel.includes(c.letter)) cls += " selected";
      if (qState.answered) {
        cls += " disabled";
        if (correctLetters.includes(c.letter)) cls += " correct";
        else if (sel.includes(c.letter)) cls += " wrong";
      }
      return `
      <li class="${cls}" data-letter="${c.letter}" data-qnum="${qnum}">
        <span class="choice-letter">${c.letter}</span>
        <span class="choice-text">${c.html}</span>
      </li>`;
    }).join("") + "</ul>";
  } else {
    choicesHtml = `<div class="hotspot-info">Bu soru görsel/HOTSPOT veya eşleştirme sorusudur. "Cevabı Göster & Türkçe Açıkla" butonuna basarak doğru eşleşmeyi ve detaylı analizi inceleyebilirsiniz.</div>`;
  }

  // Explanation
  let expHtml = "";
  if (qState.answered && q.explanation) {
    const isOk = qState.correct;
    const panelCls = isOk ? "exp-panel show ok" : "exp-panel show nok";
    const headerIcon = isOk ? "✅" : "❌";
    const headerTitle = isOk
      ? `${headerIcon} Tebrikler! Doğru Cevap`
      : `${headerIcon} Yanıtınız Yanlış — Doğru Cevap: ${correctLetters.join(", ") || "Görseldeki Eşleşme"}`;

    let criteriaHtml = "";
    if (q.explanation.decisionCriteriaTr) {
      criteriaHtml = `
      <div class="exp-criteria-box">
        <strong>💡 Neyi Göz Önünde Bulunduruyoruz?</strong>
        ${escapeHtml(q.explanation.decisionCriteriaTr)}
      </div>`;
    }

    let mainExpHtml = "";
    if (q.explanation.correctTr) {
      mainExpHtml = `
      <div class="exp-main-tr">
        <strong>📝 Türkçe Detaylı Açıklama</strong>
        ${escapeHtml(q.explanation.correctTr)}
      </div>`;
    }

    let choicesBreakdown = "";
    if (q.explanation.choicesTr && Object.keys(q.explanation.choicesTr).length > 0) {
      choicesBreakdown = '<div class="exp-choices-title">Şık Bazlı Açıklamalar:</div>';
      Object.keys(q.explanation.choicesTr).forEach(letterKey => {
        const expText = q.explanation.choicesTr[letterKey];
        let isCorrectChoice;
        if (correctLetters.length > 0) {
          // Standard multiple-choice: match by letter prefix
          isCorrectChoice = correctLetters.some(l => letterKey.startsWith(l));
        } else {
          // Hotspot/drag-drop: detect from explanation text keywords
          const upper = expText.toUpperCase();
          isCorrectChoice = upper.includes("DOĞRUDUR") || upper.includes("DOĞRU CEVAP") || upper.includes("DOĞRU SEÇİM");
        }
        const icon = isCorrectChoice ? "✅" : "❌";
        const itemCls = isCorrectChoice ? "exp-choice-item correct-item" : "exp-choice-item wrong-item";
        choicesBreakdown += `<div class="${itemCls}"><span class="exp-icon">${icon}</span><span>${escapeHtml(expText)}</span></div>`;
      });
    }

    const docLink = q.explanation.microsoftDoc
      ? `<a href="${q.explanation.microsoftDoc}" target="_blank" rel="noopener" class="exp-doc-link">📖 Microsoft Dokümantasyonu</a>`
      : "";

    expHtml = `
    <div class="${panelCls}" id="exp-${qnum}">
      <div class="exp-header">${headerTitle}</div>
      <div class="exp-content">
        ${criteriaHtml}
        ${mainExpHtml}
        ${choicesBreakdown}
        ${docLink}
      </div>
    </div>`;
  }

  const flagActive = qState.flagged ? " active" : "";
  const submitDisabled = qState.answered ? " disabled" : "";
  const submitText = qState.answered
    ? "✓ Cevaplandı"
    : (hasChoices ? "Cevabı Onayla" : "Cevabı Göster & Açıkla");

  return `
  <div class="q-card" id="q-${qnum}">
    <div class="q-header">
      <div class="q-num">
        <span>Soru #${qnum}</span>
        ${isMulti ? '<span class="badge-multi">Çoklu Seçim</span>' : ''}
      </div>
      <span class="q-topic${isSingleTopic ? ' hidden' : ''}">${escapeHtml(q.topic || "Topic 1")}</span>
    </div>
    <div class="q-body">
      ${scenarioBoxHtml}
      <div class="q-text">${q.questionHtml}</div>
      ${choicesHtml}
      <div class="q-actions">
        <button class="bookmark-btn${flagActive}" data-qnum="${qnum}">
          ⭐ ${qState.flagged ? "Favorilerden Çıkar" : "Favorilere Ekle"}
        </button>
        <button class="btn btn-primary submit-btn" data-qnum="${qnum}"${submitDisabled}>
          ${submitText}
        </button>
      </div>
      ${expHtml}
    </div>
  </div>`;
}

// ============================================================
// Sidebar Grid
// ============================================================
function renderSidebarGrid() {
  const sourceDeck = activeTopic === "All"
    ? questions
    : questions.filter(q => q.topic === activeTopic);

  let html = "";
  sourceDeck.forEach(q => {
    const qnum = String(q.number);
    const qs = state[qnum] || {};
    const currentQ = filteredData[currentIndex];
    const isCurrent = currentQ && String(currentQ.number) === qnum;

    let cls = "q-dot";
    if (isCurrent) cls += " active";
    if (qs.answered) cls += qs.correct ? " ok" : " nok";
    if (qs.flagged) cls += " flagged";

    html += `<div class="${cls}" data-qnum="${qnum}">${qnum}</div>`;
  });
  qGrid.innerHTML = html;
}

function scrollSidebarToActive() {
  requestAnimationFrame(() => {
    const activeDot = qGrid.querySelector(".q-dot.active");
    if (activeDot) {
      activeDot.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
}

// ============================================================
// Stats Update
// ============================================================
function updateStats() {
  let answered = 0, correct = 0, wrong = 0;
  Object.values(state).forEach(s => {
    if (s.answered) {
      answered++;
      if (s.correct) correct++; else wrong++;
    }
  });

  answeredCountEl.textContent = `${answered} / ${questions.length}`;
  correctCountEl.textContent = correct;
  wrongCountEl.textContent = wrong;
  const rate = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  accuracyRateEl.textContent = `${rate}%`;

  // Progress bar
  const pct = questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0;
  progressFill.style.width = `${pct}%`;
}

// ============================================================
// Submit Answer
// ============================================================
function submitAnswer(qnum) {
  const q = questions.find(x => String(x.number) === String(qnum));
  if (!q) return;

  const qState = state[qnum] || { selected: [], answered: false, correct: null, flagged: false };
  if (qState.answered) return;

  const correctLetters = normalizeAnswerLetters(q.answerHtml);
  const hasChoices = q.choices && q.choices.length > 0;

  // Validate selection
  if (hasChoices && (!qState.selected || qState.selected.length === 0)) {
    showToast("⚠️ Lütfen önce bir şık seçin!", "warn");
    return;
  }

  if (correctLetters.length > 0) {
    const sortedSel = [...(qState.selected || [])].sort().join("");
    const sortedCorrect = [...correctLetters].sort().join("");
    qState.correct = sortedSel === sortedCorrect && sortedSel.length > 0;
  } else {
    qState.correct = true;
  }

  qState.answered = true;
  state[qnum] = qState;
  syncProgressDebounced();
  render();

  // Smooth scroll to explanation panel
  requestAnimationFrame(() => {
    const expPanel = $(`#exp-${qnum}`);
    if (expPanel) {
      expPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

// ============================================================
// Event Handlers
// ============================================================
function attachEvents() {
  // Module Switcher
  quizModuleBtn.addEventListener("click", () => switchModule("quiz"));
  ozetModuleBtn.addEventListener("click", () => switchModule("ozet"));

  // Navigation
  prevBtn.addEventListener("click", () => navigateTo(currentIndex - 1));
  nextBtn.addEventListener("click", () => navigateTo(currentIndex + 1));

  // Quick Jump
  jumpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const num = parseInt(jumpInput.value, 10);
      if (isNaN(num)) return;
      jumpToQuestion(num);
      jumpInput.value = "";
      jumpInput.blur();
    }
  });

  // Keyboard Shortcuts
  document.addEventListener("keydown", (e) => {
    // Don't fire shortcuts when typing in inputs
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (activeModule !== "quiz") return;

    const key = e.key;

    // Navigation
    if (key === "ArrowLeft") { navigateTo(currentIndex - 1); return; }
    if (key === "ArrowRight") { navigateTo(currentIndex + 1); return; }

    // Choice selection (A-F, but not F alone for favorites — use lowercase f for fav)
    if (/^[A-E]$/.test(key) && !e.ctrlKey && !e.metaKey) {
      selectChoiceByLetter(key);
      return;
    }

    // Enter to submit
    if (key === "Enter") {
      const q = filteredData[currentIndex];
      if (q) submitAnswer(String(q.number));
      return;
    }

    // 'f' for favorite toggle
    if (key === "f" && !e.ctrlKey && !e.metaKey) {
      const q = filteredData[currentIndex];
      if (q) toggleFavorite(String(q.number));
      return;
    }

    // '?' for shortcuts modal
    if (key === "?") {
      toggleShortcutsModal();
      return;
    }
  });

  // Root click delegation
  root.addEventListener("click", (e) => {
    // Scenario toggle
    const scenHeader = e.target.closest(".scenario-header");
    if (scenHeader) {
      const targetId = scenHeader.dataset.toggle;
      const content = document.getElementById(targetId);
      if (content) {
        content.classList.toggle("collapsed");
        scenHeader.classList.toggle("collapsed");
      }
      return;
    }

    // Choice selection
    const choiceEl = e.target.closest(".choice");
    if (choiceEl && !choiceEl.classList.contains("disabled")) {
      handleChoiceClick(choiceEl);
      return;
    }

    // Submit
    const submitBtn = e.target.closest(".submit-btn");
    if (submitBtn && !submitBtn.disabled) {
      submitAnswer(submitBtn.dataset.qnum);
      return;
    }

    // Bookmark
    const bookmarkBtn = e.target.closest(".bookmark-btn");
    if (bookmarkBtn) {
      toggleFavorite(bookmarkBtn.dataset.qnum);
      return;
    }

    // Image lightbox
    if (e.target.tagName === "IMG" && e.target.closest(".q-text")) {
      $("#modalImg").src = e.target.src;
      $("#imageModal").classList.add("show");
    }
  });

  // Sidebar dots
  qGrid.addEventListener("click", (e) => {
    const dot = e.target.closest(".q-dot");
    if (dot) jumpToQuestion(parseInt(dot.dataset.qnum, 10));
  });

  // Topic tabs
  topicTabsEl.addEventListener("click", (e) => {
    const tab = e.target.closest(".topic-tab");
    if (tab) {
      activeTopic = tab.dataset.topic;
      currentIndex = 0;
      renderTopicTabs();
      syncProgressDebounced();
      render();
    }
  });

  // Filters
  $$(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      currentIndex = 0;
      render();
    });
  });

  // Search (with debounce)
  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = searchInput.value;
      currentIndex = 0;
      render();
    }, 200);
  });

  // Image modal close
  $("#modalClose").addEventListener("click", () => $("#imageModal").classList.remove("show"));
  $("#imageModal").addEventListener("click", (e) => {
    if (e.target.id === "imageModal") $("#imageModal").classList.remove("show");
  });

  // Keyboard shortcuts modal
  $("#shortcutHelpBtn").addEventListener("click", toggleShortcutsModal);
  $("#shortcutsClose").addEventListener("click", () => $("#shortcutsModal").classList.remove("show"));
  $("#shortcutsModal").addEventListener("click", (e) => {
    if (e.target.id === "shortcutsModal") $("#shortcutsModal").classList.remove("show");
  });

  // Theme Toggle
  const themeBtn = $("#themeToggleBtn");
  const currentTheme = document.documentElement.getAttribute("data-theme");
  themeBtn.textContent = currentTheme === "dark" ? "☀️ Açık Tema" : "🌙 Koyu Tema";

  themeBtn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    themeBtn.textContent = next === "dark" ? "☀️ Açık Tema" : "🌙 Koyu Tema";
  });

  // Reset
  $("#resetProgressBtn").addEventListener("click", async () => {
    if (confirm("Tüm cevaplarınız ve favorileriniz sıfırlansın mı?")) {
      try {
        const res = await fetch("api/reset", { method: "POST" });
        const data = await res.json();
        state = data.progress.state || {};
        currentIndex = 0;
        render();
        showToast("İlerleme sıfırlandı", "info");
      } catch (err) {
        console.error("Reset error:", err);
        showToast("Sıfırlama başarısız oldu", "warn");
      }
    }
  });
}

// ============================================================
// Helpers
// ============================================================
function navigateTo(idx) {
  if (idx < 0 || idx >= filteredData.length) return;
  currentIndex = idx;
  syncProgressDebounced();
  render();
  // Scroll question card into view smoothly
  requestAnimationFrame(() => {
    const card = root.querySelector(".q-card");
    if (card) card.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function jumpToQuestion(num) {
  // First try to find in current filtered data
  let idx = filteredData.findIndex(x => x.number === num);
  if (idx >= 0) {
    currentIndex = idx;
  } else {
    // Reset filters and find globally
    const globalIdx = questions.findIndex(x => x.number === num);
    if (globalIdx < 0) {
      showToast(`Soru #${num} bulunamadı`, "warn");
      return;
    }
    // Switch to All topics and clear filter
    activeTopic = "All";
    currentFilter = "all";
    $$(".filter-btn").forEach(b => b.classList.remove("active"));
    $('.filter-btn[data-filter="all"]')?.classList.add("active");
    searchInput.value = "";
    currentSearch = "";
    renderTopicTabs();
    updateFilteredDeck();
    idx = filteredData.findIndex(x => x.number === num);
    if (idx >= 0) currentIndex = idx;
  }
  syncProgressDebounced();
  render();
}

function handleChoiceClick(choiceEl) {
  const qnum = choiceEl.dataset.qnum;
  const qState = state[qnum] || { selected: [], answered: false, correct: null, flagged: false };
  if (qState.answered) return;

  const letter = choiceEl.dataset.letter;
  const q = questions.find(x => String(x.number) === String(qnum));
  if (!q) return;

  const correctLetters = normalizeAnswerLetters(q.answerHtml);
  const isMulti = correctLetters.length > 1;

  if (!qState.selected) qState.selected = [];

  if (!isMulti) {
    qState.selected = [letter];
  } else {
    if (qState.selected.includes(letter)) {
      qState.selected = qState.selected.filter(l => l !== letter);
    } else {
      qState.selected.push(letter);
    }
  }

  state[qnum] = qState;
  syncProgressDebounced();
  render();
}

function selectChoiceByLetter(letter) {
  const q = filteredData[currentIndex];
  if (!q) return;
  const qnum = String(q.number);
  const qState = state[qnum] || {};
  if (qState.answered) return;

  // Check if this letter exists in choices
  if (!q.choices || !q.choices.some(c => c.letter === letter)) return;

  const choiceEl = root.querySelector(`.choice[data-letter="${letter}"][data-qnum="${qnum}"]`);
  if (choiceEl && !choiceEl.classList.contains("disabled")) {
    handleChoiceClick(choiceEl);
  }
}

function toggleFavorite(qnum) {
  const qState = state[qnum] || { selected: [], answered: false, correct: null, flagged: false };
  qState.flagged = !qState.flagged;
  state[qnum] = qState;
  syncProgressDebounced();
  render();
  showToast(qState.flagged ? "⭐ Favorilere eklendi" : "Favorilerden çıkarıldı", qState.flagged ? "ok" : "info");
}

function toggleShortcutsModal() {
  $("#shortcutsModal").classList.toggle("show");
}

// ============================================================
// Boot
// ============================================================
window.addEventListener("DOMContentLoaded", init);
