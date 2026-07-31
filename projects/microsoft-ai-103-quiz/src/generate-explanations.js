#!/usr/bin/env node
/**
 * questions.json icindeki tum sorular icin detayli Turkce aciklamalar (explanations.json) uretir.
 * Dogru cevabin neden dogru oldugunu, yanlis siklarin neden yanlis oldugunu ve
 * Microsoft dokuman referanslarini ekler.
 */
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");

// Microsoft AI-103 Sorulari icin Bilgi Tabani ve Aciklama Motoru
const explanationKnowledgeBase = {
  "1": {
    correctTr: "Bu hotspot sorusunda Agent1 için scalable, yüksek başarımlı ve dinamik ölçeklenen generative AI iş yükü konfigürasyonu istenmektedir. 'Provisioned Throughput' rezervasyon gerektirirken, 'Standard' (pay-as-you-go) veya 'Global Standard' dağıtımları önceden rezervasyon kapasitesi gerektirmeden dinamik ölçeklenme sağlar.",
    choicesTr: {},
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models"
  },
  "2": {
    correctTr: "Doğru cevap B şıkkıdır (Prompt Shields). Prompt Shields, LLM (Büyük Dil Modeli) uygulamalarına yöneltilen dolaylı (indirect) ve doğrudan (direct) komut enjeksiyonu (prompt injection) saldırılarını ve belgelerdeki gizli zararlı talimatları tespit edip engellemek üzere tasarlanmıştır.",
    choicesTr: {
      "A": "self-harm content filtering: Kullanıcının kendine zarar verme içeriklerini tespit eden güvenlik filtresidir. Prompt injection veya gizli talimat engellemez.",
      "B": "prompt shields: Belgelerdeki veya kullanıcı girdilerindeki dolaylı komut enjeksiyonlarını ve kötü niyetli veri manipülasyonlarını engellemek için tam uygun Microsoft güvenlik özelliğidir.",
      "C": "Personally identifiable information (PII) Detection: Kişisel verilerin (TCKN, E-posta vb.) sızmasını engeller; komut enjeksiyonu koruması sağlamaz.",
      "D": "violence content filtering: Şiddet içeren metin ve görselleri filtreler; güvenlik açığı sızmalarını önlemez."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/red-teaming"
  },
  "3": {
    correctTr: "Doğru cevap C şıkkıdır (Add a connection to the Azure AI Search resource). Microsoft Foundry projelerinde dış kaynakların (Azure AI Search gibi) kimlik bilgilerini ve erişim yapılandırmalarını merkezi olarak yönetmek için 'Connection' (Bağlantı) yapısı kullanılır. Bu sayede projedeki tüm ajanlar aynı kaynağa merkezi erişim sağlar.",
    choicesTr: {
      "A": "Enable RBAC for Azure AI Search: RBAC yetkilendirme sağlar ancak Foundry projesi içinde kimlik bilgisi ve bağlantı nesnesini merkezi yönetmez.",
      "B": "Disable key-based access control: Erişim anahtarlarını kapatır, ancak projedeki ajanların aramasya erişim bağlantısını otomatik kurmaz.",
      "C": "Add a connection to the Azure AI Search resource: Microsoft Foundry projelerinde dış kaynakların kimlik ve erişim bilgilerini ajanlar arasında merkezi paylaşmanın standart yoludur.",
      "D": "Create a managed private endpoint: Ağ seviyesinde özel kanal sağlar, uygulama seviyesinde bağlantı nesnesi tanımlamaz."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-studio/concepts/connections"
  },
  "4": {
    correctTr: "Application Insights ve OpenTelemetry entegrasyonunda LangChain ile Foundry Telemetry ayrımı ve güvenlik kuralları. Konfigürasyonda 'enable_content_recording=False' yapılandırıldığı için girdi/çıktı metinleri kaydedilmez ve gizlilik korunur.",
    choicesTr: {},
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable"
  },
  "5": {
    correctTr: "Azure Content Understanding ve Foundry Tools boru hatları (pipelines) karşılaştırması. Pipeline1 için tekil PDF faturalarını maliyet etkin işlemek için Custom Layout / Extract pipeline, Pipeline2 için çok adımlı mantıksal doğrulama gerektiren senaryolarda Reasoning/Agentic pipeline kullanılır.",
    choicesTr: {},
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/"
  },
  "6": {
    correctTr: "Python ve Microsoft Foundry entegrasyonunda Entra ID Managed Identity kullanımı ve Azure OpenAI Responses API çağrısı için DefaultAzureCredential ve AzureOpenAI istemcisi birlikte yapılandırılır.",
    choicesTr: {},
    microsoftDoc: "https://learn.microsoft.com/en-us/python/api/overview/azure/identity-readme"
  },
  "7": {
    correctTr: "Power Fx ifadelerinde Var01 değişkeninin dolu olduğunu kontrol etmek için IsBlank(Var01) / Not(IsBlank(Var01)) ve metni büyük harfe çevirmek için Upper(Var01) fonksiyonları kullanılır.",
    choicesTr: {},
    microsoftDoc: "https://learn.microsoft.com/en-us/power-platform/power-fx/formula-reference"
  },
  "8": {
    correctTr: "Azure AI Search ve RAG mimarisinde vektör indeksleme ve anlamsal arama (semantic search) konfigürasyonu.",
    choicesTr: {},
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/search/search-what-is-azure-search"
  },
  "9": {
    correctTr: "Doğru cevap A şıkkıdır. Azure OpenAI servislerinde ince ayar (fine-tuning) yapılmış modellerin dağıtımında kapasite birimleri (Provisioned Throughput Units - PTU) kullanılır veya model sürümü dondurulur.",
    choicesTr: {
      "A": "Doğru yapılandırma model versiyonunun sabit tutulmasını ve dinamik güncellemenin kapatılmasını sağlar.",
      "B": "Yanlış model güncellemeleri otomatik alındığında davranış değişiklikleri yaşanabilir.",
      "C": "Erişim yöntemi gereksinimleri tam karşılamaz.",
      "D": "Vektör indeksi bu aşamada doğrudan model sürümünü bağlamaz."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/fine-tuning"
  },
  "10": {
    correctTr: "Doğru cevap B şıkkıdır. Azure AI Search kullanılarak yapılan anlamsal aramada (semantic search) hibrit arama (hybrid search = BM25 keyword + Vector search + Semantic reranker) en doğru ve ilgili sonuçları üretir.",
    choicesTr: {
      "A": "Yalnızca anahtar kelime araması anlamsal ilişkileri kaçırır.",
      "B": "Hybrid search (Vector + Keyword) üzerine Semantic Reranking uygulanması Microsoft önerilen en yüksek doğruluklu RAG yöntemidir.",
      "C": "Yalnızca düz metin filtreleme anlamsal derinlik sağlamaz.",
      "D": "Klasik SQL aramaları vektörel benzerliği desteklemez."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview"
  }
};

// Genel soru şablon üreticisi (Eğer özel soru eklenmemişse dinamik açıklama üretir)
function generateGenericExplanation(q) {
  const number = q.number;
  if (explanationKnowledgeBase[number]) {
    return explanationKnowledgeBase[number];
  }

  const hasChoices = q.choices && q.choices.length > 0;
  const answer = q.answerHtml ? q.answerHtml.replace(/<[^>]*>/g, "").trim() : "";

  if (!hasChoices) {
    return {
      correctTr: `Bu soru (${number}. soru) bir görsel/HOTSPOT veya sürükle-bırak senaryo sorusudur. Doğru cevap görselde gösterilen eşleşmedir. İlgili Microsoft Azure AI / Foundry konfigürasyonu adımlarını inceleyiniz.`,
      choicesTr: {},
      microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/"
    };
  }

  const choicesTr = {};
  q.choices.forEach(c => {
    const isCorrect = answer.includes(c.letter);
    if (isCorrect) {
      choicesTr[c.letter] = `${c.letter} Şıkkı DOĞRU cevaptır: Soruda istenen Microsoft Azure AI mimari gereksinimini tam olarak karşılamaktadır.`;
    } else {
      choicesTr[c.letter] = `${c.letter} Şıkkı YANLIŞTIR: Bu seçenek sorudaki senaryo kısıtlamalarını veya güvenlik/mimari gereksinimlerini sağlamamaktadır.`;
    }
  });

  return {
    correctTr: `Doğru cevap ${answer} şıkkıdır. Microsoft AI mimari prensiplerine göre ilgili servis konfigürasyonu ve güvenlik gereksinimleri bu seçeneği doğrulamaktadır.`,
    choicesTr: choicesTr,
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/"
  };
}

function main() {
  const examSlug = process.argv[2] || "microsoft-ai-103";
  const dir = path.join(OUTPUT_DIR, examSlug);
  const questionsPath = path.join(dir, "questions.json");
  const explanationsPath = path.join(dir, "explanations.json");

  if (!fs.existsSync(questionsPath)) {
    console.error(`Dosya bulunamadı: ${questionsPath}`);
    process.exit(1);
  }

  const questions = JSON.parse(fs.readFileSync(questionsPath, "utf-8"));
  let existingExplanations = {};
  if (fs.existsSync(explanationsPath)) {
    try {
      existingExplanations = JSON.parse(fs.readFileSync(explanationsPath, "utf-8"));
    } catch (e) {
      existingExplanations = {};
    }
  }

  const result = {};
  questions.forEach(q => {
    const qnum = String(q.number);
    if (existingExplanations[qnum] && existingExplanations[qnum].correctTr) {
      result[qnum] = existingExplanations[qnum];
    } else {
      result[qnum] = generateGenericExplanation(q);
    }
  });

  fs.writeFileSync(explanationsPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`[OK] ${Object.keys(result).length} soru için açıklamalar kaydedildi: ${explanationsPath}`);
}

main();
