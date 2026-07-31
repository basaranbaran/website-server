#!/usr/bin/env node
/**
 * ExamTopics soru scraper -> PDF
 *
 * Kullanim:
 *   node src/scrape.js "https://www.examtopics.com/exams/microsoft/ai-103/"
 *
 * Notlar:
 * - Ilk calistirmada gercek bir Chromium penceresi acilir, kendi hesabinla
 *   giris yapman istenir. Oturum "browser-profile/" klasorunde saklanir,
 *   bir dahaki calistirmada tekrar giris istemez.
 * - Script sadece zaten erisimin olan (contributor access) sayfalari okur,
 *   herhangi bir odeme/paywall bypass islemi yapmaz.
 */

const path = require("path");
const fs = require("fs");
const readline = require("readline");
const { chromium } = require("playwright");
const { ensureDir, randomDelay, slugify, extOf } = require("./utils");

const ROOT = path.join(__dirname, "..");
const PROFILE_DIR = path.join(ROOT, "browser-profile");
const OUTPUT_DIR = path.join(ROOT, "output");

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer);
  }));
}

function normalizeStartUrl(inputUrl) {
  const u = new URL(inputUrl);
  let p = u.pathname;
  if (!p.endsWith("/")) p += "/";
  if (!/\/view\/(\d+\/)?$/.test(p)) {
    p += "view/";
  }
  u.pathname = p;
  return u.toString();
}

function examSlugFromUrl(inputUrl) {
  const u = new URL(inputUrl);
  const parts = u.pathname.split("/").filter(Boolean); // ["exams","microsoft","ai-103", ...]
  const idx = parts.indexOf("exams");
  if (idx >= 0 && parts.length > idx + 2) {
    return slugify(`${parts[idx + 1]}-${parts[idx + 2]}`);
  }
  return slugify(u.pathname);
}

// Sayfa icindeki .questions-container yapisini ayristirir.
async function extractPage(page) {
  return page.evaluate(() => {
    const container = document.querySelector(".questions-container");
    if (!container) return { items: [], nextHref: null };

    const items = [];
    let currentTopic = null;

    for (const child of Array.from(container.children)) {
      if (child.classList.contains("topic-card")) {
        const h2 = child.querySelector("h2");
        currentTopic = h2 ? h2.textContent.trim() : null;
        items.push({ type: "topic", title: currentTopic });
        continue;
      }

      if (child.classList.contains("exam-question-card")) {
        const headerEl = child.querySelector(".card-header");
        const numberText = headerEl ? headerEl.childNodes[0].textContent.trim() : "";
        const topicBadge = child.querySelector(".question-title-topic");
        const topicLabel = topicBadge ? topicBadge.textContent.trim() : currentTopic;

        const questionBody = child.querySelector(".question-body");
        const questionTextEl = questionBody ? questionBody.querySelector("p.card-text") : null;
        const questionHtml = questionTextEl ? questionTextEl.innerHTML : "";

        const choices = [];
        const choiceItems = questionBody
          ? questionBody.querySelectorAll(".question-choices-container ul li.multi-choice-item")
          : [];
        choiceItems.forEach((li) => {
          const letterEl = li.querySelector(".multi-choice-letter");
          const letter = letterEl ? letterEl.getAttribute("data-choice-letter") : "";
          const clone = li.cloneNode(true);
          const letterClone = clone.querySelector(".multi-choice-letter");
          if (letterClone) letterClone.remove();
          const mostVoted = !!li.querySelector(".most-voted-answer-badge");
          choices.push({
            letter,
            html: clone.innerHTML.trim(),
            mostVoted,
          });
        });

        const answerBox = questionBody ? questionBody.querySelector(".correct-answer-box") : null;
        const correctAnswerHtml = answerBox
          ? (answerBox.querySelector(".correct-answer")
              ? answerBox.querySelector(".correct-answer").innerHTML.trim()
              : "")
          : "";

        const answerDescEl = questionBody ? questionBody.querySelector(".answer-description") : null;
        const answerDescHtml = answerDescEl ? answerDescEl.innerHTML.trim() : "";

        const voteBars = [];
        const voteBarEls = questionBody ? questionBody.querySelectorAll(".vote-distribution-bar .vote-bar") : [];
        voteBarEls.forEach((bar) => {
          const style = bar.getAttribute("style") || "";
          const displayNone = /display:\s*none/.test(style);
          if (!displayNone) {
            voteBars.push(bar.textContent.trim());
          }
        });

        const discussionBtn = child.querySelector(".question-discussion-button .badge");
        const discussionCount = discussionBtn ? discussionBtn.textContent.trim() : "0";

        items.push({
          type: "question",
          number: numberText,
          topic: topicLabel,
          questionHtml,
          choices,
          correctAnswerHtml,
          answerDescHtml,
          voteBars,
          discussionCount,
        });
      }
    }

    const nextLink = document.querySelector(".nextBtn a.btn-success, a.btn.btn-success.pull-right");
    const nextHref = nextLink ? nextLink.getAttribute("href") : null;

    return { items, nextHref };
  });
}

async function downloadImage(requestContext, url, destDir, imageMap) {
  if (imageMap.has(url)) return imageMap.get(url);
  const ext = extOf(url);
  const filename = `img-${imageMap.size + 1}${ext}`;
  const destPath = path.join(destDir, filename);
  try {
    const resp = await requestContext.get(url);
    if (resp.ok()) {
      const buffer = await resp.body();
      fs.writeFileSync(destPath, buffer);
      const rel = path.join("images", filename);
      imageMap.set(url, rel);
      return rel;
    }
  } catch (err) {
    console.warn(`  ! Resim indirilemedi: ${url} (${err.message})`);
  }
  imageMap.set(url, url); // indirilemezse orijinal url'i kullan
  return url;
}

// html icindeki <img src="..."> lerini local dosyaya indirip yollarini degistirir
async function localizeImages(html, requestContext, destDir, imageMap) {
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  let result = html;
  const matches = [...html.matchAll(imgRegex)];
  for (const m of matches) {
    const originalSrc = m[1];
    const localRel = await downloadImage(requestContext, originalSrc, destDir, imageMap);
    result = result.split(originalSrc).join(localRel);
  }
  return result;
}

function renderQuestionHtml(item) {
  let html = `<div class="question-card">`;
  html += `<div class="question-header">Soru #${item.number.replace(/^Question\s*/i, "")}<span class="topic-tag">${item.topic || ""}</span></div>`;
  html += `<div class="question-text">${item.questionHtml}</div>`;

  if (item.choices && item.choices.length) {
    html += `<ul class="choices">`;
    for (const c of item.choices) {
      html += `<li><strong>${c.letter}.</strong> ${c.html}${c.mostVoted ? ' <span class="most-voted">(En cok oylanan)</span>' : ""}</li>`;
    }
    html += `</ul>`;
  }

  html += `<div class="answer-box"><strong>Dogru Cevap:</strong> ${item.correctAnswerHtml || "-"}</div>`;

  if (item.answerDescHtml) {
    html += `<div class="answer-desc">${item.answerDescHtml}</div>`;
  }

  if (item.voteBars && item.voteBars.length) {
    html += `<div class="vote-bars"><em>Topluluk oy dagilimi:</em> ${item.voteBars.join(", ")}</div>`;
  }

  html += `<div class="discussion-count">Tartisma yorum sayisi: ${item.discussionCount}</div>`;
  html += `</div>`;
  return html;
}

function renderFullHtml(examTitle, sections) {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>${examTitle}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 22px; border-bottom: 2px solid #333; padding-bottom: 8px; }
  .topic-header { background: #0d6efd; color: #fff; padding: 8px 14px; margin: 24px 0 12px; border-radius: 4px; font-size: 15px; page-break-after: avoid; }
  .question-card { border: 1px solid #ccc; border-radius: 6px; padding: 14px 16px; margin-bottom: 18px; page-break-inside: avoid; }
  .question-header { font-weight: bold; background: #333; color: #fff; padding: 6px 10px; margin: -14px -16px 10px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; }
  .topic-tag { font-weight: normal; font-size: 11px; opacity: 0.85; }
  .question-text img, .answer-box img { max-width: 100%; margin-top: 8px; }
  .choices { list-style: none; padding-left: 0; margin: 10px 0; }
  .choices li { padding: 4px 0; border-bottom: 1px dashed #ddd; }
  .most-voted { color: #0d6efd; font-size: 11px; }
  .answer-box { background: #f1f8ff; border-left: 4px solid #0d6efd; padding: 8px 10px; margin-top: 10px; }
  .answer-desc { margin-top: 6px; font-size: 12px; color: #444; }
  .vote-bars { margin-top: 6px; font-size: 11px; color: #555; }
  .discussion-count { margin-top: 6px; font-size: 11px; color: #888; }
</style>
</head>
<body>
<h1>${examTitle}</h1>
${sections}
</body>
</html>`;
}

async function main() {
  const inputUrl = process.argv[2];
  if (!inputUrl) {
    console.error("Kullanim: node src/scrape.js <examtopics-exam-url>");
    process.exit(1);
  }

  const startUrl = normalizeStartUrl(inputUrl);
  const examSlug = examSlugFromUrl(inputUrl);
  const imagesDir = path.join(OUTPUT_DIR, examSlug, "images");
  ensureDir(imagesDir);
  ensureDir(PROFILE_DIR);

  console.log(`Baslangic URL: ${startUrl}`);
  console.log(`Tarayici aciliyor (oturum: ${PROFILE_DIR})...`);

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    locale: "tr-TR",
  });

  const page = context.pages()[0] || (await context.newPage());

  // Google uzerinden gecmis gibi davranmak icin once google.com'a ugrayalim
  await page.goto("https://www.google.com/", { waitUntil: "domcontentloaded" });
  await randomDelay(800, 1600);
  await page.goto(startUrl, { waitUntil: "domcontentloaded" });

  const hasAccess = await page.locator("text=Contributor Access").first().isVisible().catch(() => false);
  if (!hasAccess) {
    await ask(
      "\nSayfada 'Contributor Access' ibaresi gorunmuyor. Gerekirse giris yap / erisimini kontrol et,\n" +
      "hazir oldugunda terminale donup Enter'a bas...\n"
    );
    await page.reload({ waitUntil: "domcontentloaded" });
  }

  const imageMap = new Map();
  const sectionsHtml = [];
  let examTitle = examSlug;
  let pageCount = 0;

  const titleEl = await page.locator("h2").first();
  if (await titleEl.count()) {
    examTitle = (await titleEl.textContent() || examSlug).trim();
  }

  let currentUrl = startUrl;
  const visited = new Set();

  while (currentUrl && !visited.has(currentUrl)) {
    visited.add(currentUrl);
    pageCount += 1;
    console.log(`Sayfa ${pageCount} isleniyor: ${currentUrl}`);

    if (currentUrl !== startUrl) {
      await page.goto(currentUrl, { waitUntil: "domcontentloaded" });
    }

    await page.waitForSelector(".questions-container", { timeout: 15000 }).catch(() => {});

    const { items, nextHref } = await extractPage(page);

    for (const item of items) {
      if (item.type === "topic") {
        sectionsHtml.push(`<div class="topic-header">${item.title}</div>`);
        continue;
      }

      item.questionHtml = await localizeImages(item.questionHtml, page.context().request, imagesDir, imageMap);
      item.correctAnswerHtml = await localizeImages(item.correctAnswerHtml, page.context().request, imagesDir, imageMap);
      for (const c of item.choices) {
        c.html = await localizeImages(c.html, page.context().request, imagesDir, imageMap);
      }

      sectionsHtml.push(renderQuestionHtml(item));
      console.log(`  + ${item.number} (${item.topic || "?"})`);
    }

    if (nextHref) {
      currentUrl = new URL(nextHref, currentUrl).toString();
      console.log("  ... sonraki sayfaya gecmeden once bekleniyor (~15sn)");
      await randomDelay(13000, 17000); // insan gibi bekleme, siteyi yormamak icin
    } else {
      currentUrl = null;
    }
  }

  await context.close();

  const finalHtml = renderFullHtml(examTitle, sectionsHtml.join("\n"));
  const htmlPath = path.join(OUTPUT_DIR, examSlug, `${examSlug}.html`);
  fs.writeFileSync(htmlPath, finalHtml, "utf-8");
  console.log(`HTML kaydedildi: ${htmlPath}`);

  console.log("PDF olusturuluyor...");
  const pdfBrowser = await chromium.launch({ headless: true });
  const pdfPage = await pdfBrowser.newPage();
  await pdfPage.goto(`file://${htmlPath}`, { waitUntil: "load" });
  const pdfPath = path.join(OUTPUT_DIR, examSlug, `${examSlug}.pdf`);
  await pdfPage.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", bottom: "18mm", left: "14mm", right: "14mm" },
  });
  await pdfBrowser.close();

  console.log(`\nTamamlandi! ${sectionsHtml.filter((s) => s.includes("question-card")).length} soru islendi.`);
  console.log(`PDF: ${pdfPath}`);
}

main().catch((err) => {
  console.error("Hata:", err);
  process.exit(1);
});
