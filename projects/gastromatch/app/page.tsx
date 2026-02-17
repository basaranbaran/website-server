"use client";

import { useState, useEffect } from "react";
import { 
  login, 
  handleIncomingRedirect, 
  getDefaultSession, 
} from "@inrupt/solid-client-authn-browser";
import { 
  getSolidDataset, 
  getStringNoLocale, 
  getThingAll
} from "@inrupt/solid-client";
import { SCHEMA_INRUPT } from "@inrupt/vocab-common-rdf";

// --- AYARLAR ---
// GastroPod ile AYNI Pod adresini kullanıyoruz, çünkü veri orada.
const STORAGE_URL = "https://storage.inrupt.com/e10a52c8-2228-404c-94b0-9feff66653b8"; 
const HISTORY_FILE_PATH = `${STORAGE_URL}/private/taste/history.ttl`;

export default function Home() {
  const [session, setSession] = useState(getDefaultSession());
  const [status, setStatus] = useState("Bekleniyor...");
  
  // Profil Verileri (Başarılı Kısım)
  const [favoriteFood, setFavoriteFood] = useState<string>("");
  const [totalBattles, setTotalBattles] = useState<number>(0);
  const [userTitle, setUserTitle] = useState<string>(""); // Örn: Kebap Lordu

  // Global Tarama Demo State'leri (Başarısız Kısım)
  const [isScanningGlobal, setIsScanningGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string>("");

  // 1. Sayfa Yüklendiğinde Redirect Kontrolü
  useEffect(() => {
    handleIncomingRedirect({
      restorePreviousSession: false, // Döngüyü kırmak için false
      url: window.location.href
    }).then((info) => {
      if (info) {
        setStatus(`Hoşgeldin! WebID: ${info.webId}`);
        setSession(getDefaultSession());
      }
    });
  }, []);

  // 2. Giriş yapılmışsa otomatik analiz et
  useEffect(() => {
    if (session.info.isLoggedIn) {
      generateProfile();
    }
  }, [session.info.isLoggedIn]);

  // Login Fonksiyonu
  const handleLogin = async () => {
    if (!session.info.isLoggedIn) {
      await login({
        oidcIssuer: "https://login.inrupt.com",
        redirectUrl: window.location.href,
        clientName: "Foodie Profile Maker",
      });
    }
  };

  // Kişisel Profil Oluşturucu (Pod Okuma)
  const generateProfile = async () => {
    setStatus("GastroPod verileri taranıyor...");
    
    try {
      // Pod'dan dosyayı çek
      const dataset = await getSolidDataset(HISTORY_FILE_PATH, { fetch: session.fetch });
      const things = getThingAll(dataset);
      
      if (things.length === 0) {
        setStatus("Veri yok. Önce diğer sitede (GastroPod) savaş yapmalısın.");
        return;
      }

      // İstatistikleri hesapla
      const stats: Record<string, number> = {};
      things.forEach((thing) => {
        const foodName = getStringNoLocale(thing, SCHEMA_INRUPT.name);
        if (foodName) stats[foodName] = (stats[foodName] || 0) + 1;
      });

      // En çok sevilen yemeği bul
      let maxCount = 0;
      let winner = "";
      Object.entries(stats).forEach(([food, count]) => {
        if (count > maxCount) {
          maxCount = count;
          winner = food;
        }
      });

      // Havalı bir unvan uydur
      let title = "Acemi Gurme";
      if (maxCount > 5) title = `Grandmaster of ${winner}`;
      else if (maxCount > 2) title = `${winner} Aşığı`;
      else title = `${winner} Meraklısı`;

      setTotalBattles(things.length);
      setFavoriteFood(winner);
      setUserTitle(title);
      setStatus("Profil Hazır! ✅");

    } catch (e) {
      console.error(e);
      setStatus("Veriye erişilemedi. İzin sorunu olabilir veya dosya yok.");
    }
  };

  // Global Tarama Fonksiyonu (Eğitici Hata Gösterimi)
  const tryGlobalScan = () => {
    setIsScanningGlobal(true);
    setGlobalError(""); // Önceki hatayı temizle

    // 2 saniye "tarıyormuş gibi" yap, sonra gerçeği söyle
    setTimeout(() => {
        setGlobalError("FAILED"); 
        setIsScanningGlobal(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-2 text-yellow-400">GastroIdentity 🆔</h1>
        <p className="text-gray-400">Verilerinle konuşan uygulama</p>
      </div>

      {!session.info.isLoggedIn ? (
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 max-w-md text-center">
          <p className="mb-6 text-lg">
            "Merhaba! Ben GastroIdentity. Seni tanımıyorum ama <b>GastroPod</b> uygulamasında ne yediğini biliyorum."
          </p>
          <button 
            onClick={handleLogin} 
            className="bg-yellow-500 text-black px-8 py-3 rounded-full font-bold hover:bg-yellow-400 transition"
          >
            Kanıtla (Pod ile Giriş)
          </button>
        </div>
      ) : (
        <div className="w-full max-w-2xl flex flex-col gap-8">
          
          {/* 1. KISIM: BAŞARILI OLAN KISIM (Kişisel Veri) */}
          {favoriteFood && (
            <div className="bg-gradient-to-b from-gray-800 to-black p-8 rounded-3xl border-2 border-yellow-500 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl">
                SOLID VERIFIED
              </div>

              <div className="text-center">
                <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto flex items-center justify-center text-5xl mb-4 border-4 border-yellow-500">
                  {favoriteFood.includes("Pizza") ? "🍕" : 
                   favoriteFood.includes("Kebap") ? "🍢" : 
                   favoriteFood.includes("Burger") ? "🍔" : "😋"}
                </div>
                
                <h2 className="text-2xl font-bold text-gray-200">Gurme Kartı</h2>
                <h1 className="text-3xl font-extrabold text-yellow-400 mt-2 uppercase">{userTitle}</h1>
                
                <div className="mt-6 flex justify-between text-sm text-gray-400 border-t border-gray-700 pt-4">
                  <div className="text-center">
                    <span className="block text-xl font-bold text-white">{totalBattles}</span>
                    <span>Savaş</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xl font-bold text-white">{favoriteFood}</span>
                    <span>Favori</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xl font-bold text-white">Pod</span>
                    <span>Kaynak</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center text-xs text-green-500 font-mono">
                ✅ Veri Pod'undan başarıyla okundu.
              </div>
            </div>
          )}

          {/* 2. KISIM: BAŞARISIZ OLAN KISIM (Eğitici Hata) */}
          <div className={`p-8 rounded-3xl border-2 relative transition-all duration-500 ${globalError ? "bg-red-900/20 border-red-500/50" : "bg-gray-800/50 border-gray-600 border-dashed"}`}>
            
            <div className={`absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-xl ${globalError ? "bg-red-500 text-white" : "bg-gray-600 text-gray-300"}`}>
              {globalError ? "ERİŞİM YOK" : "GLOBAL VERİ"}
            </div>
            
            <div className="text-center">
              <h2 className={`text-2xl font-bold mb-2 ${globalError ? "text-red-300" : "text-gray-300"}`}>
                Global Lider Tablosu
              </h2>
              
              {!globalError ? (
                <>
                  <p className="text-sm text-gray-400 mb-6">
                    "Dünyada en çok hangi yemek seviliyor?" sorusunu sor.
                  </p>
                  <button 
                    onClick={tryGlobalScan}
                    disabled={isScanningGlobal}
                    className="bg-gray-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-600 transition disabled:opacity-50"
                  >
                    {isScanningGlobal ? "Tüm Dünyadaki Pod'lar Taranıyor..." : "Global Veriyi Getir"}
                  </button>
                </>
              ) : (
                <div className="text-left bg-black/40 p-6 rounded-xl border border-red-500/30">
                  <div className="flex items-center gap-3 mb-4 text-red-400">
                    <span className="text-3xl">🚫</span>
                    <h3 className="text-xl font-bold">İşlem Gerçekleştirilemedi</h3>
                  </div>
                  
                  <div className="space-y-4 text-sm text-gray-300">
                    <p>
                      <strong className="text-white block mb-1">Neden Göremiyorum?</strong>
                      Çünkü GastroMatch uygulamasının <b>Merkezi Bir Veritabanı</b> yoktur. Kullanıcıların verileri tek bir havuzda toplanmaz.
                    </p>
                    
                    <p>
                      <strong className="text-white block mb-1">Teknik Engel:</strong>
                      Şu an dünyada binlerce "Pod" var. Bu sitenin "En popüler yemek hangisi?" diyebilmesi için, dünyadaki tüm Pod'ların kapısını tek tek çalıp izin istemesi gerekir. Bu hem imkansızdır hem de çok yavaştır.
                    </p>

                    <div className="bg-green-900/30 p-3 rounded border border-green-500/30 mt-4">
                      <p className="text-green-300 text-xs font-bold">
                        💡 POZİTİF YANI:
                      </p>
                      <p className="text-green-100 text-xs mt-1">
                        Bu bir hata değil, <b>Mahremiyetin Garantisidir.</b> Mark Zuckerberg veya başka bir yönetici tek bir tuşla "Herkes ne yiyor?" diye bakamaz. Veriniz kalabalıklar içinde kaybolmaz, sadece sizin kontrolünüzdedir.
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setGlobalError("")}
                    className="mt-6 text-xs text-gray-500 hover:text-white underline w-full text-center"
                  >
                    Tekrar Dene
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}