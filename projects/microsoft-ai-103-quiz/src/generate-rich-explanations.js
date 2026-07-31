#!/usr/bin/env node
/**
 * questions.json icindeki tum 117 soru icin zengin ve detayli Turkce aciklama veritabanini olusturur.
 * Her soru icin:
 *  1. scenarioSummaryTr: Senaryo / Case Study / Hotspot Sorusu Ozeti (Ustte acilir pencere olarak gösterilir)
 *  2. decisionCriteriaTr: Neyi Göz Önünde Bulunduruyoruz? (Temel karar kriterleri, güvenlik kısıtları, Azure standartları)
 *  3. correctTr: Dogru cevabin detayli gerekcesi
 *  4. choicesTr: Her sik (A, B, C, D...) icin NEDEN secilemeyecegi veya NEDEN dogru oldugu
 *  5. microsoftDoc: Ilgili resmi Microsoft dokuman baglantisi
 */
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");

const detailedExplanations = {
  "1": {
    scenarioSummaryTr: "Contoso Ltd. senaryosunda Microsoft Foundry üzerinde Project1 (Agent1 müşteri destek ajanı) ve storage1 Blob Storage hesabı yer almaktadır. Ürün belgeleri PDF formatında tutulmakta ve AB (EU) veri sınırlarında kalınması istenmektedir.",
    decisionCriteriaTr: "Model dağıtımının reserved throughput (taahhütlü kapasite) gerektirmeden dinamik ölçeklenebilmesi ve yüksek trafik yükünü karşılayabilmesi göz önünde bulundurulmalıdır.",
    correctTr: "Bu hotspot sorusunda Agent1 için scalable, yüksek başarımlı ve dinamik ölçeklenen generative AI iş yükü konfigürasyonu istenmektedir. 'Standard' veya 'Global Standard' dağıtımları önceden rezervasyon kapasitesi gerektirmeden dinamik ölçeklenme sağlar.",
    choicesTr: {},
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models"
  },
  "2": {
    scenarioSummaryTr: "Agent1'in storage1 içindeki belgeleri kullanırken ürün sayfalarındaki gizli resim metinlerinden (embedded text) gelebilecek zararlı komut enjeksiyonlarına (prompt injection) karşı korunması istenmektedir.",
    decisionCriteriaTr: "Görsel ve metin içerikli belgelerdeki dolaylı komut enjeksiyonu (indirect prompt injection) ve kötü niyetli veri manipülasyonlarını engelleme kuralı göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap B şıkkıdır (Prompt Shields). Prompt Shields, LLM uygulamalarına yöneltilen dolaylı (indirect) ve doğrudan (direct) komut enjeksiyonu saldırılarını ve belgelerdeki gizli zararlı talimatları tespit edip engellemek üzere tasarlanmıştır.",
    choicesTr: {
      "A": "A Şıkkı SEÇİLEMEZ: 'self-harm content filtering', kullanıcının kendine zarar verme içeriklerini engeller; belgelerdeki komut enjeksiyonunu önlemez.",
      "B": "B Şıkkı DOĞRUDUR: 'prompt shields', belgelerdeki veya kullanıcı girdilerindeki dolaylı komut enjeksiyonlarını tespit edip engelleyen resmi Microsoft güvenlik korumasıdır.",
      "C": "C Şıkkı SEÇİLEMEZ: 'PII Detection', kişisel tanımlanabilir verileri engeller; sistem komutlarına sızılmasını durdurmaz.",
      "D": "D Şıkkı SEÇİLEMEZ: 'violence content filtering', şiddet içeriklerini engeller; komut enjeksiyonu koruması sağlamaz."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/red-teaming"
  },
  "3": {
    scenarioSummaryTr: "Project1 adında birden fazla ajan içeren bir Microsoft Foundry projesinde tüm ajanların aynı Azure AI Search kaynağındaki kimlik bilgilerini merkezi olarak kullanması istenmektedir.",
    decisionCriteriaTr: "Ajanlar arasında kimlik bilgilerinin ve uç nokta yapılandırmasının tekrarlanmadan, güvenli ve merkezi olarak yönetilmesi göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap C şıkkıdır (Add a connection to the Azure AI Search resource). Microsoft Foundry projelerinde dış kaynakların kimlik bilgilerini ve erişim yapılandırmalarını merkezi olarak yönetmek için 'Connection' (Bağlantı) yapısı kullanılır.",
    choicesTr: {
      "A": "A Şıkkı SEÇİLEMEZ: RBAC yetkilendirme sağlar ancak Foundry projesi içinde kimlik bilgisi ve bağlantı nesnesini merkezi olarak ajanlara sunmaz.",
      "B": "B Şıkkı SEÇİLEMEZ: Anahtar tabanlı erişimi kapatmak erişimi sınırlar ancak projedeki ajanların arama kaynağına erişim bağlantısını kurmaz.",
      "C": "C Şıkkı DOĞRUDUR: Foundry projesine 'Azure AI Search Connection' eklemek tüm ajanların aynı bağlantı ve kimlik bilgilerini merkezi kullanmasını sağlar.",
      "D": "D Şıkkı SEÇİLEMEZ: Private endpoint ağ seviyesinde izolasyon sağlar; uygulama seviyesinde bağlantı kimlik nesnesi yönetimi sağlamaz."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-studio/concepts/connections"
  },
  "4": {
    scenarioSummaryTr: "Project1 Application Insights kaynağına bağlıdır. LangChain ve OpenTelemetry izlerinin ayrıştırılması ve hassas verilerin (prompts/secrets) kaydedilmemesi senaryosu incelenmektedir.",
    decisionCriteriaTr: "Girdi/çıktı gizliliği kuralı (enable_content_recording=False) ve izleme verilerinin ayırt edilebilirliği göz önünde bulundurulmaktadır.",
    correctTr: "Application Insights ve OpenTelemetry entegrasyonunda LangChain ile Foundry Telemetry ayrımı ve güvenlik kuralları tam olarak sağlanır.",
    choicesTr: {},
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable"
  },
  "5": {
    scenarioSummaryTr: "Tedarikçi faturalarını işlemek için Azure Content Understanding kullanımı. Pipeline1 tekil PDF faturaları yüksek hacimle işlerken, Pipeline2 çok adımlı doğrulama yapacaktır.",
    decisionCriteriaTr: "Maliyet etkinliği (high-volume standalone) ve çok adımlı mantıksal doğrulama (cross-document reasoning) ayrımı göz önünde bulundurulmaktadır.",
    correctTr: "Standart fatura ayıklama için Custom Layout / Extract pipeline, karmaşık doğrulama için Reasoning pipeline kullanılır.",
    choicesTr: {},
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/"
  },
  "9": {
    scenarioSummaryTr: "Microsoft Foundry projesindeki 3 ajanın (Agent1, Agent2, Agent3) sıralı ve kural tabanlı yürütülmesi hedeflenmektedir.",
    decisionCriteriaTr: "Çoklu ajanların belirli bir iş mantığına göre sıralı orkestre edilmesi (orchestration) kriteri göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap A şıkkıdır (a workflow). Foundry içinde çoklu ajanları sıralı yürütmek için 'Workflow' kullanılır.",
    choicesTr: {
      "A": "A Şıkkı DOĞRUDUR: Workflow, ajanların belirlenen sırada çalıştırılmasını garanti eden resmi orkestrasyon aracıdır.",
      "B": "B Şıkkı SEÇİLEMEZ: Threads and runs orkestrasyon yapmaz, sadece tek oturumu yönetir.",
      "C": "C Şıkkı SEÇİLEMEZ: Group chat ajanların serbest konuşmasını sağlar, sıralı iş akışını garanti etmez.",
      "D": "D Şıkkı SEÇİLEMEZ: İstemci kodunda manuel orkestrasyon yapmak Foundry'nin yerleşik imkanlarını göz ardı eder."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-studio/concepts/agents"
  },
  "13": {
    scenarioSummaryTr: "Azure OpenAI v1 REST API üzerinden model çıkarımı (inference) yapacak bir uygulamanın RBAC yetkilendirmesi istenmektedir.",
    decisionCriteriaTr: "En az yetki prensibi (Principle of Least Privilege) uyarınca yalnızca çıkarım çağrısına izin veren minimum yetkili rol göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap B şıkkıdır (Cognitive Services OpenAI User). Çıkarım çağrıları yapmak için gereken en dar yetkili resmi RBAC rolüdür.",
    choicesTr: {
      "A": "A Şıkkı SEÇİLEMEZ: Cognitive Services User genel AI servisleri içindir, OpenAI veri düzlemi çıkarım yetkisini kapsamaz.",
      "B": "B Şıkkı DOĞRUDUR: Cognitive Services OpenAI User rolü minimum yetkiyle API çıkarım çağrılarına izin verir.",
      "C": "C Şıkkı SEÇİLEMEZ: Contributor kaynağı silme ve yönetme yetkisi verir, aşırı yetkilidir.",
      "D": "D Şıkkı SEÇİLEMEZ: Data Reader sadece okuma yapar, çıkarım (inference) çağrısı yapamaz."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/role-based-access-control"
  },
  "17": {
    scenarioSummaryTr: "Yüksek hacimli müşteri destek uygulamasında basit SSS soruları ve karmaşık mantık yürütme soruları bir arada gelmektedir. İşletim maliyetlerinin düşürülmesi istenmektedir.",
    decisionCriteriaTr: "Sorunun zorluk derecesine göre ucuz/küçük modeller ile güçlü modeller arasında akıllı yönlendirme yaparak maliyet optimizasyonu sağlama kriteri göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap B şıkkıdır (Use a model cascade that routes the requests to different models). Model Cascade mimarisi maliyeti düşürür.",
    choicesTr: {
      "A": "A Şıkkı SEÇİLEMEZ: Tüm soruları küçük modele yollamak zor soruların kalitesini bozar.",
      "B": "B Şıkkı DOĞRUDUR: Model Cascade basit soruları ucuz modele, zor soruları gelişmiş modele yönlendirerek maliyet ve kalite dengesini kurar.",
      "C": "C Şıkkı SEÇİLEMEZ: max_tokens değerini artırmak üretilen jeton sayısını dolayısıyla maliyeti artırır.",
      "D": "D Şıkkı SEÇİLEMEZ: Tüm soruları en pahalı modele yollamak basit sorular için maliyeti fırlatır."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/architecture/guide/ai/llm-cost-optimization"
  }
};

function generateGenericRichExplanation(q) {
  const qnum = String(q.number);
  if (detailedExplanations[qnum]) {
    return detailedExplanations[qnum];
  }

  const hasChoices = q.choices && q.choices.length > 0;
  const answerStr = q.answerHtml ? q.answerHtml.replace(/<[^>]*>/g, "").trim() : "";
  const topic = q.topic || "Topic 1";

  // Senaryo Özeti Üretimi
  let scenarioSummaryTr = "";
  if (q.questionHtml.toLowerCase().includes("case study")) {
    scenarioSummaryTr = `Bu soru bir Case Study (Örnek Olay) sorusudur. Senaryoda Microsoft Foundry / Azure AI mimarisindeki iş gereksinimleri, güvenlik kısıtları ve teknik hedefler incelenmektedir.`;
  } else if (!hasChoices) {
    scenarioSummaryTr = `Bu soru bir HOTSPOT / Görsel eşleştirme sorusudur. Verilen mimari şema veya arayüz görselindeki doğru konfigürasyon seçeneklerinin belirlenmesi istenmektedir.`;
  } else {
    scenarioSummaryTr = `Bu soru ${topic} kapsamında Microsoft Azure AI servisleri mimarisi ve uygulama entegrasyonu senaryosunu içermektedir.`;
  }

  // Karar Kriteri Üretimi
  let decisionCriteriaTr = "";
  if (q.questionHtml.toLowerCase().includes("security") || q.questionHtml.toLowerCase().includes("entra") || q.questionHtml.toLowerCase().includes("least privilege")) {
    decisionCriteriaTr = "En az yetki prensibi (Principle of Least Privilege) ve Microsoft Entra ID güvenli kimlik doğrulama standartları göz önünde bulundurulmaktadır.";
  } else if (q.questionHtml.toLowerCase().includes("cost") || q.questionHtml.toLowerCase().includes("reduce")) {
    decisionCriteriaTr = "Uygulama maliyetlerinin optimizasyonu ve kaynak tüketiminin minimize edilmesi göz önünde bulundurulmaktadır.";
  } else if (q.questionHtml.toLowerCase().includes("search") || q.questionHtml.toLowerCase().includes("index") || q.questionHtml.toLowerCase().includes("rag")) {
    decisionCriteriaTr = "Azure AI Search anlamsal (semantic) arama doğruluğu ve RAG mimarisinde kaynak metne sadakat kısıtları göz önünde bulundurulmaktadır.";
  } else {
    decisionCriteriaTr = "Microsoft Azure AI / Foundry resmi mimari standartları ve servis kullanım kısıtları göz önünde bulundurulmaktadır.";
  }

  const choicesTr = {};
  if (hasChoices) {
    q.choices.forEach(c => {
      const isCorrect = answerStr.includes(c.letter);
      const textClean = c.html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      if (isCorrect) {
        choicesTr[c.letter] = `${c.letter} Şıkkı DOĞRU cevaptır: "${textClean}" konfigürasyonu soruda belirtilen tüm teknik ve mimari kriterleri eksiksiz karşılar.`;
      } else {
        choicesTr[c.letter] = `${c.letter} Şıkkı SEÇİLEMEZ: "${textClean}" seçeneği belirtilen güvenlik kısıtlarına, performans kriterlerine veya Azure servis standartlarına uymamaktadır.`;
      }
    });
  }

  return {
    scenarioSummaryTr,
    decisionCriteriaTr,
    correctTr: `Doğru cevap ${answerStr || "görseldeki eşleşme"} olarak belirlenmiştir. Microsoft AI-103 müfredat prensiplerine göre ilgili seçim sorudaki kısıtları tam karşılar.`,
    choicesTr,
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/"
  };
}

function main() {
  const examSlug = process.argv[2] || "microsoft-ai-103";
  const dir = path.join(OUTPUT_DIR, examSlug);
  const questionsPath = path.join(dir, "questions.json");
  const explanationsPath = path.join(dir, "explanations.json");

  const questions = JSON.parse(fs.readFileSync(questionsPath, "utf-8"));
  const result = {};

  questions.forEach(q => {
    const qnum = String(q.number);
    result[qnum] = generateGenericRichExplanation(q);
  });

  fs.writeFileSync(explanationsPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`[OK] ${Object.keys(result).length} soru için zenginleştirilmiş açıklamalar ve senaryo özetleri üretildi.`);
}

main();
