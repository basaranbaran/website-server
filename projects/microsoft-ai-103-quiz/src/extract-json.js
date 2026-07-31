#!/usr/bin/env node
/**
 * Daha once scrape.js ile uretilmis <exam>.html dosyasini okuyup
 * yapilandirilmis JSON'a (questions.json) cevirir.
 *
 * Kullanim:
 *   node src/extract-json.js microsoft-ai-103
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");

async function main() {
  const examSlug = process.argv[2];
  if (!examSlug) {
    console.error("Kullanim: node src/extract-json.js <exam-slug>");
    process.exit(1);
  }

  const htmlPath = path.join(OUTPUT_DIR, examSlug, `${examSlug}.html`);
  if (!fs.existsSync(htmlPath)) {
    console.error(`Bulunamadi: ${htmlPath}`);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });

  const data = await page.evaluate(() => {
    const result = [];
    let currentTopic = null;
    const body = document.body;

    for (const child of Array.from(body.children)) {
      if (child.classList.contains("topic-header")) {
        currentTopic = child.textContent.trim();
        continue;
      }
      if (child.classList.contains("question-card")) {
        const headerEl = child.querySelector(".question-header");
        const numberRaw = headerEl ? headerEl.childNodes[0].textContent.trim() : "";
        const number = numberRaw.replace(/^Soru\s*#*/i, "").trim();
        const topicTag = child.querySelector(".topic-tag");
        const topic = topicTag ? topicTag.textContent.trim() : currentTopic;

        const questionTextEl = child.querySelector(".question-text");
        const questionHtml = questionTextEl ? questionTextEl.innerHTML.trim() : "";

        const choices = [];
        const choiceLis = child.querySelectorAll(".choices li");
        choiceLis.forEach((li) => {
          const strong = li.querySelector("strong");
          const letter = strong ? strong.textContent.replace(/\./g, "").trim() : "";
          const clone = li.cloneNode(true);
          const strongClone = clone.querySelector("strong");
          if (strongClone) strongClone.remove();
          const mostVotedSpan = clone.querySelector(".most-voted");
          if (mostVotedSpan) mostVotedSpan.remove();
          choices.push({ letter, html: clone.innerHTML.trim() });
        });

        const answerBox = child.querySelector(".answer-box");
        const answerHtml = answerBox ? answerBox.innerHTML.replace(/<strong>.*?<\/strong>/, "").trim() : "";

        const voteBarsEl = child.querySelector(".vote-bars");
        const voteBars = voteBarsEl ? voteBarsEl.textContent.replace("Topluluk oy dagilimi:", "").trim() : "";

        const discussionEl = child.querySelector(".discussion-count");
        const discussionCount = discussionEl ? discussionEl.textContent.replace("Tartisma yorum sayisi:", "").trim() : "";

        result.push({
          number,
          topic,
          questionHtml,
          choices,
          answerHtml,
          voteBars,
          discussionCount,
        });
      }
    }
    return result;
  });

  await browser.close();

  const jsonPath = path.join(OUTPUT_DIR, examSlug, "questions.json");
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`Cikarilan soru sayisi: ${data.length}`);
  console.log(`Kaydedildi: ${jsonPath}`);
}

main().catch((err) => {
  console.error("Hata:", err);
  process.exit(1);
});
