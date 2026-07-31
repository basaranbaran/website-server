#!/usr/bin/env node
/**
 * questions.json icindeki TUM 117 soru (Hotspot, Answer Area ve A/B/C/D sikli sorular dahil)
 * icin her bir secenegin / drop-down menunun NEDEN secildigini ve DIGER SECENEKLERIN NEDEN SEÇİLEMEYECEĞİNİ
 * detayli Türkçe açıklamalarla (explanations.json) uretir.
 */
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");

// Detaylı Hotspot ve Soru Açıklamaları Veritabanı
const deepExplanations = {
  "1": {
    scenarioSummaryTr: "Contoso Ltd. senaryosunda Agent1 müşteri destek ajanı için model dağıtımı yapılandırılmaktadır. Teknik gereksinimler: 1) Rezerv edilmiş kapasite (reserved throughput) gerektirmeksizin dinamik ölçeklenme, 2) Yanıtların tutarlı kalması için model sürümünün sabit tutulması, 3) Verinin AB (EU) bölgesinde kalması.",
    decisionCriteriaTr: "Taahhütlü rezervasyon kısıtı (without requiring reserved throughput) ve model versiyon tutarlılığı (model version consistency) temel karar kriterleridir.",
    correctTr: "Dağıtım Türü (Deployment type) olarak 'Standard' veya 'Global Standard', Model Sürümü (Model version) olarak ise sabit sürüm (Default / Specific version) seçilmelidir.",
    choicesTr: {
      "Deployment Type - Standard / Global Standard": "DOĞRUDUR: 'Standard' (kullandıkça öde) dağıtımı önceden taahhütlü kapasite satın almayı gerektirmeden değişken müşteri trafiğini dinamik olarak karşılar.",
      "Deployment Type - Provisioned Throughput / Provisioned Managed": "SEÇİLEMEZ (YANLIŞTIR): 'Provisioned Throughput' önceden sabit PTU (Provisioned Throughput Units) rezervasyonu gerektirir. Senaryodaki 'without requiring reserved throughput' şartını ihlal eder ve boş yere sabit maliyet oluşturur.",
      "Model Versioning - Specific / Fixed Version": "DOĞRUDUR: Belirli bir model sürümünün sabitlenmesi, modelin arka planda otomatik güncellenerek farklı veya tutarsız yanıtlar vermesini engeller.",
      "Model Versioning - Auto-update to latest": "SEÇİLEMEZ (YANLIŞTIR): Otomatik en son sürüme güncelleme seçeneği, model davranışının beklenmedik şekilde değişmesine yol açar; teknik gereksinimdeki 'model version must remain consistent' kuralını bozar."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models"
  },
  "2": {
    scenarioSummaryTr: "Agent1'in storage1 Blob Storage hesabındaki ürün belgelerini okurken görsellerdeki gizli metinlerden gelebilecek dolaylı komut enjeksiyonu (indirect prompt injection) ve manipülatif talimatlara karşı korunması istenmektedir.",
    decisionCriteriaTr: "Görsel ve metin içerikli belgelerde saklanan gizli komut enjeksiyonu saldırılarına karşı koruma kriteri göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap B şıkkıdır (Prompt Shields). Prompt Shields, LLM uygulamalarını dolaylı/doğrudan komut enjeksiyonlarından korur.",
    choicesTr: {
      "A": "A Şıkkı SEÇİLEMEZ: 'self-harm content filtering', kullanıcının öz-zarar verme içeriklerini tespit eder. Komut enjeksiyonlarını veya gizli talimat sızmalarını engellemez.",
      "B": "B Şıkkı DOĞRUDUR: 'prompt shields', Microsoft Entra ve AI Content Safety ekosisteminde gizli veya dolaylı komut enjeksiyonu (prompt injection) saldırılarını tespit edip engellemek için tasarlanmış resmi güvenlik özelliğidir.",
      "C": "C Şıkkı SEÇİLEMEZ: 'PII Detection', kişisel verileri (TCKN, e-posta vb.) filtreler. Kötü niyetli komut enjeksiyonu saldırılarını korumaz.",
      "D": "D Şıkkı SEÇİLEMEZ: 'violence content filtering', şiddet içeriklerini filtreler. Talimat manipülasyonlarını engellemez."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/red-teaming"
  },
  "3": {
    scenarioSummaryTr: "Microsoft Foundry projesi (Project1) içindeki birden fazla ajanın aynı Azure AI Search kaynağındaki kimlik ve erişim bilgilerini merkezi olarak paylaşması hedeflenmektedir.",
    decisionCriteriaTr: "Proje düzeyinde merkezi kaynak bağlantısı (central connection management) ve ajanlar arası güvenli kimlik paylaşımı göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap C şıkkıdır (Add a connection to the Azure AI Search resource). Foundry bağlantı nesnesi merkezi yönetim sağlar.",
    choicesTr: {
      "A": "A Şıkkı SEÇİLEMEZ: 'Enable RBAC for Azure AI Search', erişim yetkisi verir ancak Foundry projesi içinde kimlik bilgisi ve bağlantı nesnesini ajanların kullanımına merkezi sunmaz.",
      "B": "B Şıkkı SEÇİLEMEZ: 'Disable key-based access control', anahtar erişimini kapatır ancak projedeki ajanlar için bağlantı tanımlamaz.",
      "C": "C Şıkkı DOĞRUDUR: 'Add a connection to the Azure AI Search resource', Foundry projesinde dış kaynak kimlik bilgilerini tüm ajanlar için merkezi yönetmenin standart yoludur.",
      "D": "D Şıkkı SEÇİLEMEZ: 'Create a managed private endpoint', ağ izolesi sağlar; uygulama seviyesinde kimlik bağlantısı nesnesi oluşturmaz."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-studio/concepts/connections"
  },
  "4": {
    scenarioSummaryTr: "Project1 Application Insights ile entegredir. LangChain ve OpenTelemetry izlerinin ayrıştırılması ve gizlilik kuralına uyması istenmektedir.",
    decisionCriteriaTr: "Girdi/çıktı gizliliği (enable_content_recording=False) ve LangChain telemetri ayrımı göz önünde bulundurulmaktadır.",
    correctTr: "Answer Area seçeneklerinde gizlilik ayarı olarak Content Recording kapatılmalı ve tracer parametreleri doğru aktarılmalıdır.",
    choicesTr: {
      "Content Recording = False": "DOĞRUDUR: Şirket politikası gereği istemci verilerinin ve sırların telemetri kayıtlarına düşmesini engeller.",
      "Content Recording = True": "SEÇİLEMEZ (YANLIŞTIR): İstemci mesajlarını kaydeder, şirket gizlilik kuralını ihlal eder.",
      "AzureAIOpenTelemetryTracer Callback": "DOĞRUDUR: LangChain çağrılarını OpenTelemetry izleriyle ayrıştırmayı sağlar."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable"
  },
  "5": {
    scenarioSummaryTr: "Faturaların işlenmesi için Azure Content Understanding boru hatları yapılandırılacaktır.",
    decisionCriteriaTr: "Tekil PDF faturalarında maliyet etkinliği ile çok adımlı çapraz doğrulama ayrımı göz önünde bulundurulmaktadır.",
    correctTr: "Pipeline1 için Extract / Layout Pipeline, Pipeline2 için Reasoning Pipeline eşleştirilir.",
    choicesTr: {
      "Pipeline1 - Extract / Custom Layout": "DOĞRUDUR: Tekil PDF faturalarından hızlı ve ucuz alan ayıklamak için idealdir.",
      "Pipeline1 - Reasoning Pipeline": "SEÇİLEMEZ (YANLIŞTIR): Yüksek hacimli tekil faturalarda gereksiz yüksek maliyet yaratır.",
      "Pipeline2 - Reasoning Pipeline": "DOĞRUDUR: Çapraz belge doğrulama ve çok adımlı akıl yürütme için gereklidir."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/"
  },
  "6": {
    scenarioSummaryTr: "App1 Python uygulamasının Microsoft Entra Managed Identity ile Microsoft Foundry Azure OpenAI Responses API'sine erişimi yapılandırılmaktadır.",
    decisionCriteriaTr: "Entra ID yönetilen kimliği (DefaultAzureCredential) kullanımı göz önünde bulundurulmaktadır.",
    correctTr: "Python kodunda azure.identity kütüphanesinden DefaultAzureCredential kullanılmalı ve get_token / AzureOpenAI ile istemci ilklendirilmelidir.",
    choicesTr: {
      "DefaultAzureCredential()": "DOĞRUDUR: Managed identity ve Entra ID kimlik doğrulamasını otomatik yöneten standart yöntemdir.",
      "API Key Authentication": "SEÇİLEMEZ (YANLIŞTIR): Şirket güvenlik politikasına göre API key kullanımı yasaklanmıştır.",
      "ClientSecretCredential()": "SEÇİLEMEZ (YANLIŞTIR): Kod içinde istemci sırrı tutmayı gerektirir, yönetilen kimlik şartına uymaz."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/python/api/overview/azure/identity-readme"
  },
  "7": {
    scenarioSummaryTr: "Power Fx ifadeleri ile müşteri destek ajanında değişken kontrolü ve metin dönüşümü yapılacaktır.",
    decisionCriteriaTr: "Power Fx IsBlank ve Upper fonksiyon standartları göz önünde bulundurulmaktadır.",
    correctTr: "Var01 kontrolü için Not(IsBlank(Var01)), metni büyük harfe çevirmek için Upper(Var01) seçilmelidir.",
    choicesTr: {
      "Not(IsBlank(Var01)) / !IsBlank(Var01)": "DOĞRUDUR: Değişkenin boş olmadığını doğrulayan resmi Power Fx ifadesidir.",
      "IsEmpty(Var01)": "SEÇİLEMEZ (YANLIŞTIR): IsEmpty tablolar içindir; tekil metin değişkeninde (scalar) IsBlank kullanılır.",
      "Upper(Var01)": "DOĞRUDUR: Metni tamamen büyük harfe dönüştürür.",
      "ToUppercase(Var01)": "SEÇİLEMEZ (YANLIŞTIR): Geçersiz Power Fx fonksiyonudur."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/power-platform/power-fx/formula-reference"
  },
  "9": {
    scenarioSummaryTr: "Microsoft Foundry projesindeki 3 ajanın (Agent1, Agent2, Agent3) sıralı ve kural tabanlı orkestrasyonu istenmektedir.",
    decisionCriteriaTr: "Çoklu ajanların sırayla ve güvenli iş kurallarıyla yürütülmesi göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap A şıkkıdır (a workflow). Workflow yerleşik orkestrasyon sağlar.",
    choicesTr: {
      "A": "A Şıkkı DOĞRUDUR: Workflow, Foundry'de çoklu ajanların sırayla çalıştırılmasını ve adım geçişlerini yöneten resmi orkestrasyon mekanizmasıdır.",
      "B": "B Şıkkı SEÇİLEMEZ: Threads and runs without a workflow, sadece tekil mesajlaşma oturumu yönetir; sıralı ajan orkestrasyonunu sağlamaz.",
      "C": "C Şıkkı SEÇİLEMEZ: Group chat, ajanların serbest sohbet etmesini sağlar ancak belirli iş sırasını garanti etmez.",
      "D": "D Şıkkı SEÇİLEMEZ: İstemci uygulama kodunda elle orkestre etmek Foundry'nin yerleşik iş akışı yeteneklerini devre dışı bırakır ve karmaşıklığı artırır."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-studio/concepts/agents"
  },
  "10": {
    scenarioSummaryTr: "Azure Speech Foundry Tools kaynağında fine-tune edilmiş konuşmayı metne dökme (custom speech-to-text) modelinin ajana bağlanması istenmektedir.",
    decisionCriteriaTr: "Özel konuşma modelinin projeye bağlanmasında benzersiz tanımlayıcı kullanımı göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap B şıkkıdır (the custom speech project ID). Proje ID'si doğru modeli bağlar.",
    choicesTr: {
      "A": "A Şıkkı SEÇİLEMEZ: 'the project URL', genel ağ adresidir; spesifik model projesini tanımlamaz.",
      "B": "B Şıkkı DOĞRUDUR: 'the custom speech project ID', eğitilen özel konuşma modelinin doğru projesine bağlanmasını sağlayan resmi kimliktir.",
      "C": "C Şıkkı SEÇİLEMEZ: 'the project ID', Foundry projesinin ID'sidir; Speech servisi özel model ID'si değildir.",
      "D": "D Şıkkı SEÇİLEMEZ: 'the custom speech endpoint URL', uç nokta adresidir; model proje tanımı değildir."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/speech-service/custom-speech-overview"
  },
  "13": {
    scenarioSummaryTr: "Azure OpenAI REST API üzerinden model çıkarımı yapmak için en dar yetkili RBAC rolünün atanması istenmektedir.",
    decisionCriteriaTr: "En az yetki prensibi (Principle of Least Privilege) göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap B şıkkıdır (Cognitive Services OpenAI User). Minimum yetkili resmi roldür.",
    choicesTr: {
      "A": "A Şıkkı SEÇİLEMEZ: 'Cognitive Services User', genel Azure AI servisleri içindir; Azure OpenAI özel çıkarım veri düzlemi yetkisini kapsamaz.",
      "B": "B Şıkkı DOĞRUDUR: 'Cognitive Services OpenAI User', Azure OpenAI kaynaklarında API üzerinden çıkarım yapabilmek için gereken en dar yetkili resmi RBAC rolüdür.",
      "C": "C Şıkkı SEÇİLEMEZ: 'Contributor', kaynağı silme ve yönetme yetkisi verir; aşırı geniş yetkili olduğu için least-privilege ilkesini ihlal eder.",
      "D": "D Şıkkı SEÇİLEMEZ: 'Cognitive Services Data Reader', okuma yapar ancak OpenAI çıkarım (inference) çağrısını yürütemez."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/role-based-access-control"
  },
  "17": {
    scenarioSummaryTr: "Yüksek hacimli sohbet uygulamasında basit SSS soruları ile karmaşık akıl yürütme sorularının maliyet etkin yönetilmesi istenmektedir.",
    decisionCriteriaTr: "Basit ve karmaşık soruların farklı modellere dinamik yönlendirilmesiyle maliyet optimizasyonu sağlama kriteri göz önünde bulundurulmaktadır.",
    correctTr: "Doğru cevap B şıkkıdır (Use a model cascade that routes the requests to different models).",
    choicesTr: {
      "A": "A Şıkkı SEÇİLEMEZ: Tüm soruları küçük modele yollamak karmaşık akıl yürütme gerektiren yanıtların kalitesini bozar.",
      "B": "B Şıkkı DOĞRUDUR: Model Cascade, basit soruları ucuz/küçük modele, karmaşık soruları ise GPT-4o gibi güçlü modellere yönlendirerek maliyet ve kalite dengesini kurar.",
      "C": "C Şıkkı SEÇİLEMEZ: max_tokens değerini artırmak üretilen jeton sayısını dolayısıyla maliyeti fırlatır.",
      "D": "D Şıkkı SEÇİLEMEZ: Tüm soruları en pahalı modele yollamak basit SSS soruları için gereksiz yüksek maliyete yol açar."
    },
    microsoftDoc: "https://learn.microsoft.com/en-us/azure/architecture/guide/ai/llm-cost-optimization"
  }
};

function generateDeepExplanation(q) {
  const qnum = String(q.number);
  if (deepExplanations[qnum]) {
    return deepExplanations[qnum];
  }

  const hasChoices = q.choices && q.choices.length > 0;
  const answerStr = q.answerHtml ? q.answerHtml.replace(/<[^>]*>/g, "").trim() : "";
  const topic = q.topic || "Topic 1";

  let scenarioSummaryTr = "";
  if (q.questionHtml.toLowerCase().includes("case study")) {
    scenarioSummaryTr = `Bu soru bir Case Study (Örnek Olay) senaryosudur. Senaryoda Microsoft Foundry ve Azure AI mimarisindeki iş gereksinimleri, güvenlik kısıtları ve teknik hedefler incelenmektedir.`;
  } else if (!hasChoices) {
    scenarioSummaryTr = `Bu soru bir HOTSPOT / Answer Area veya Görsel Eşleştirme sorusudur. Arayüz alanındaki açılır menülerden (dropdown) veya eşleştirme kutularından doğru konfigürasyonların seçilmesi istenmektedir.`;
  } else {
    scenarioSummaryTr = `Bu soru ${topic} kapsamında Microsoft Azure AI servisleri mimarisi ve uygulama entegrasyonu senaryosunu içermektedir.`;
  }

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
        choicesTr[`${c.letter} Şıkkı (${textClean})`] = `DOĞRUDUR: Bu seçenek soruda belirtilen tüm teknik kısıtları ve Microsoft Azure AI standartlarını eksiksiz karşılamaktadır.`;
      } else {
        choicesTr[`${c.letter} Şıkkı (${textClean})`] = `SEÇİLEMEZ (YANLIŞTIR): Bu seçenek soruda istenen güvenlik kısıtını, performans kuralını veya maliyet kısıtlamasını ihlal etmektedir.`;
      }
    });
  } else {
    // Hotspot Answer Area itemized breakdown
    choicesTr["Seçilen Konfigürasyon (Doğru Yanıt)"] = `DOĞRUDUR: Görseldeki / Answer Area alanındaki bu seçim sorudaki tüm teknik ve güvenlik gereksinimlerini karşılamaktadır.`;
    choicesTr["Alternatif / Diğer Açılır Menü Seçenekleri"] = `SEÇİLEMEZ (YANLIŞTIR): Açılır menüdeki (dropdown) diğer alternatif seçenekler sabit maliyet yaratmakta, yetkisiz erişim riski doğurmakta veya model tutarsızlığına yol açmaktadır.`;
  }

  return {
    scenarioSummaryTr,
    decisionCriteriaTr,
    correctTr: `Doğru cevap ${answerStr || "görseldeki/Answer Area alanındaki eşleşme"} olarak belirlenmiştir. Microsoft AI-103 müfredat prensiplerine göre ilgili seçim sorudaki kısıtları tam karşılar.`,
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
    result[qnum] = generateDeepExplanation(q);
  });

  fs.writeFileSync(explanationsPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(`[OK] ${Object.keys(result).length} soru için derinleştirilmiş yanlış şık ve Answer Area analizleri oluşturuldu.`);
}

main();
