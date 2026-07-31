#!/usr/bin/env node
/**
 * questions.json + explanations.json dosyalarini birlestirip
 * Python backend'in kullanacagi birlesik data/quiz_data.json dosyasini olusturur.
 */
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");
const DATA_DIR = path.join(ROOT, "data");

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

  const enrichedQuestions = questions.map((q) => {
    const qnum = String(q.number);
    const exp = explanations[qnum] || null;
    return {
      number: qnum,
      topic: q.topic || "Topic 1",
      questionHtml: q.questionHtml,
      choices: q.choices || [],
      answerHtml: q.answerHtml || "",
      voteBars: q.voteBars || "",
      discussionCount: q.discussionCount || "0",
      explanation: exp
    };
  });

  // Extract unique topics
  const topicsMap = {};
  enrichedQuestions.forEach((q) => {
    const t = q.topic;
    if (!topicsMap[t]) topicsMap[t] = 0;
    topicsMap[t]++;
  });

  const topicsList = Object.keys(topicsMap).map(t => ({
    name: t,
    count: topicsMap[t]
  }));

  const quizData = {
    examSlug: examSlug,
    title: examSlug.toUpperCase(),
    totalQuestions: enrichedQuestions.length,
    topics: topicsList,
    questions: enrichedQuestions
  };

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const outQuizDataPath = path.join(DATA_DIR, "quiz_data.json");
  const outProgressPath = path.join(DATA_DIR, "progress.json");

  fs.writeFileSync(outQuizDataPath, JSON.stringify(quizData, null, 2), "utf-8");

  if (!fs.existsSync(outProgressPath)) {
    fs.writeFileSync(outProgressPath, JSON.stringify({ state: {}, activeTopic: "All", lastActiveIndex: 0 }, null, 2), "utf-8");
  }

  console.log(`[OK] Python birlesik veri dosyasi kaydedildi: ${outQuizDataPath}`);
  console.log(`[OK] Toplam soru: ${enrichedQuestions.length}, Konular: ${topicsList.map(t=>t.name).join(", ")}`);
}

main();
