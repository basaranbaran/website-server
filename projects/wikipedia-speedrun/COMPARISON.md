# 📊 Video vs Proje Karşılaştırması

## 🎥 Referans Video

**Video:** [I Tried Wikipedia Speedrun using AI - Green Code](https://www.youtube.com/watch?v=JvoUHe1OR68&t=1s)

Bu karşılaştırma, yukarıdaki videodaki yaklaşımla bu projenin teknik ve metodolojik farklarını detaylandırmaktadır.

---

## 🔍 Temel Farklar

### 1. Embedding Modeli Farkı

#### Video Yaklaşımı:
- **BERT** (Bidirectional Encoder Representations from Transformers)
- Kelime seviyesinde embedding
- Her kelime için ayrı vektör oluşturur

#### Proje Yaklaşımı:
- **SBERT** (Sentence-BERT) - `all-MiniLM-L6-v2`
- Cümle/tam metin seviyesinde embedding
- Tüm cümleyi tek bir vektöre dönüştürür

**Neden Önemli:**
- ✅ SBERT, cümle bağlamını daha iyi yakalar
- ✅ "White House" (bina) vs "White House at Night" (resim) ayrımı daha net olur
- ✅ Cümle seviyesi embedding, Wikipedia link başlıkları için daha uygun

---

### 2. LLM Yaklaşımı

#### Video Yaklaşımı:
- **API tabanlı LLM'ler** (Gemini, Claude, GPT)
- İnternet bağlantısı gerekir
- API maliyeti ve rate limit riski
- Veriler API sağlayıcısına gönderilir

#### Proje Yaklaşımı:
- **Local LLM:** Llama 3.1 (Ollama)
- Tamamen offline çalışır
- API maliyeti yok
- Veriler yerelde kalır (gizlilik)
- GPU ile hızlandırma

---

### 3. Algoritma Yaklaşımı

#### Video Yaklaşımı:
İki ayrı yaklaşım test edilmiş:
1. **Sadece BERT + Cosine Similarity** (vektör tabanlı)
2. **Sadece LLM API'leri** (doğrudan LLM)

#### Proje Yaklaşımı:
**Hibrit yaklaşım (Method 1):**
1. SBERT ile top 10 adayı filtrele (hızlı, matematiksel)
2. Sonra Llama 3.1 ile en mantıklı olanı seç (bağlamsal, akıllı)
3. LLM'in seçimini kullan

**Neden Önemli:**
- ✅ SBERT hızlı filtreleme yapar (binlerce linkten 10'a indirir)
- ✅ LLM bağlamı değerlendirir (homonim tuzaklarından kaçınır)
- ✅ Hız ve doğruluk dengesi sağlar
- ✅ Bu kombinasyon videoda yok - **özgün çözüm**

---

### 4. Metodoloji Karşılaştırması

#### Video Yaklaşımı:
- Farklı yaklaşımları ayrı ayrı test eder
- Karşılaştırmalı analiz yok
- Tek bir yaklaşım üzerinde odaklanır

#### Proje Yaklaşımı:
**3 metodolojiyi aynı senaryolarda karşılaştırır:**

| Metodoloji | Başarı Oranı | Ortalama Süre | Ortalama Adım | En İyi Kullanım |
|------------|--------------|---------------|---------------|-----------------|
| **Hybrid (SBERT + LLM)** | **%100** | **5.5s** | **5.3 adım** | **Genel kullanım - en güvenilir** |
| Pure SBERT (sadece vektör) | %67 | 6.1s | 10 adım | Basit, doğrudan bağlantılar |
| Chain-of-Thought (akıl yürütme) | %100 | 13.6s | 7 adım | Karmaşık, dolaylı yollar |

- ✅ Detaylı performans metrikleri
- ✅ Gerçek test sonuçları
- ✅ Her metodun artı/eksileri analiz edilmiş

---

### 5. Teknik Implementasyon

#### Video Yaklaşımı:
- NumPy ile vektörleştirme
- For döngüsünden matris çarpımına geçiş
- Optimizasyon: 52s → 6s

#### Proje Yaklaşımı:
- **PyTorch tensor işlemleri** (GPU desteği)
- `util.cos_sim()` ile optimize cosine similarity
- `torch.topk()` ile hızlı top-K seçimi
- **CUDA ile GPU hızlandırması**
- Daha modern ve optimize edilmiş kütüphaneler

---

### 6. Özgün Çözüm: Hibrit Yaklaşım

Projenin öne çıkan özelliği:

```python
# Method 1: Hibrit Yaklaşım
1. SBERT ile top 10 linki filtrele (hızlı, matematiksel)
2. Llama 3.1'e "bu 10'dan hangisi en mantıklı?" diye sor (bağlamsal, akıllı)
3. LLM'in seçimini kullan
```

**Bu yaklaşım:**
- ✅ Videodaki "sadece vektör" yaklaşımından **daha akıllı**
- ✅ Videodaki "sadece LLM" yaklaşımından **daha hızlı**
- ✅ İkisinin avantajlarını birleştirir
- ✅ **Videoda olmayan özgün bir çözüm**

---

## 📋 Özet: Projenin Farklılaştığı Noktalar

| Özellik | Video | Proje |
|---------|-------|-------|
| **Embedding** | BERT (kelime) | SBERT (cümle) |
| **LLM** | API (Gemini/Claude/GPT) | Local (Llama 3.1) |
| **Yaklaşım** | Ayrı (vektör VEYA LLM) | **Hibrit (vektör + LLM)** |
| **Karşılaştırma** | Yok | **3 metodoloji** |
| **Offline** | Hayır | **Evet** |
| **Maliyet** | API ücreti | **Ücretsiz** |
| **Gizlilik** | Veriler API'ye gider | **Tamamen local** |
| **GPU Desteği** | Belirtilmemiş | **CUDA desteği** |
| **Performans Analizi** | Basit | **Detaylı metrikler** |

---

## 🎯 Sonuç

Bu proje, videodaki yaklaşımları **birleştiren ve geliştiren** bir çözüm sunmaktadır:

1. **Hibrit yaklaşım** ile hem hız hem doğruluk sağlanmıştır
2. **Tamamen offline** çalışarak gizlilik ve maliyet avantajı sağlanmıştır
3. **3 metodoloji karşılaştırması** ile en optimal yaklaşım bulunmuştur
4. **SBERT kullanımı** ile daha iyi anlamsal eşleştirme sağlanmıştır

**Proje, videodaki yaklaşımların ötesine geçerek özgün bir çözüm sunmaktadır.** 🚀

---

## 📚 Referanslar

- [Video: I Tried Wikipedia Speedrun using AI](https://www.youtube.com/watch?v=JvoUHe1OR68&t=1s)
- [Sentence-BERT Documentation](https://www.sbert.net/)
- [Ollama - Local LLM](https://ollama.ai/)
- [Wikipedia Game](https://en.wikipedia.org/wiki/Wikipedia:Wiki_Game)

