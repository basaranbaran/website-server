"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { 
  login, 
  handleIncomingRedirect, 
  getDefaultSession, 
} from "@inrupt/solid-client-authn-browser";
import { 
  getSolidDataset, 
  setThing, 
  addStringNoLocale, 
  addDatetime,
  saveSolidDatasetAt,
  createThing,
} from "@inrupt/solid-client";
import { SCHEMA_INRUPT } from "@inrupt/vocab-common-rdf";
import { FOODS } from "../foods"; 

// --- AYARLAR ---
const STORAGE_URL = "https://storage.inrupt.com/e10a52c8-2228-404c-94b0-9feff66653b8"; 
const HISTORY_FILE_PATH = `${STORAGE_URL}/private/taste/history.ttl`;

// Redirect URL: basePath ile birlikte tam URL oluşturuluyor
// Sunucuda /gastropod-app/battle adresine geri dönecek
const MY_CURRENT_URL = typeof window !== "undefined" 
  ? window.location.origin + "/gastropod-app/battle" 
  : "http://localhost:3001/gastropod-app/battle";

export default function BattlePage() {
  const [session, setSession] = useState(getDefaultSession());
  const [status, setStatus] = useState("Hazır.");
  const authProcessed = useRef(false);

  // Turnuva State'leri
  const [candidates, setCandidates] = useState(FOODS);
  const [currentPair, setCurrentPair] = useState<any[]>([]);
  const [nextRound, setNextRound] = useState<any[]>([]);
  const [winner, setWinner] = useState<any>(null);

  useEffect(() => {
    if (authProcessed.current) return;
    authProcessed.current = true;

    // Sayfa açılır açılmaz: "Acaba URL'de giriş kodu var mı?" diye bakıyoruz.
    // restorePreviousSession: false yaptık ki eski oturumlarla kafası karışmasın.
    handleIncomingRedirect({ 
      restorePreviousSession: false,
      url: window.location.href 
    }).then((info) => {
      if (info) {
        console.log("✅ GİRİŞ BAŞARILI:", info.webId);
        setStatus(`Giriş yapıldı: ${info.webId}`);
        setSession(getDefaultSession());
      }
    });
  }, []);

  const handleLogin = async () => {
    console.log("🚀 Giriş başlatılıyor... Hedef:", MY_CURRENT_URL);
    
    if (!session.info.isLoggedIn) {
      await login({
        oidcIssuer: "https://login.inrupt.com",
        redirectUrl: MY_CURRENT_URL, // <--- BURAYI ELLE SABİTLEDİK
        clientName: "GastroPod Battle Arena",
      });
    }
  };

  // --- OYUN FONKSİYONLARI ---
  const startTournament = () => {
    setWinner(null);
    setNextRound([]);
    const shuffled = [...FOODS].sort(() => 0.5 - Math.random());
    setCandidates(shuffled);
    setCurrentPair([shuffled[0], shuffled[1]]);
  };

  const handleVote = (selectedFood: any) => {
    const newNextRound = [...nextRound, selectedFood];
    const remainingCandidates = candidates.slice(2);

    if (remainingCandidates.length >= 2) {
      setCandidates(remainingCandidates);
      setNextRound(newNextRound);
      setCurrentPair([remainingCandidates[0], remainingCandidates[1]]);
    } else {
      if (remainingCandidates.length === 1) { newNextRound.push(remainingCandidates[0]); }
      if (newNextRound.length === 1) {
        setWinner(newNextRound[0]);
        saveWinnerToPod(newNextRound[0]);
      } else {
        setStatus(`🏆 Yeni Tur! Kalan: ${newNextRound.length}`);
        setCandidates(newNextRound);
        setNextRound([]);
        setCurrentPair([newNextRound[0], newNextRound[1]]);
      }
    }
  };

  const saveWinnerToPod = async (food: any) => {
    if (!session.info.isLoggedIn) { alert("Hata: Giriş yapmamışsınız."); return; }
    setStatus(`⏳ ${food.name} kaydediliyor...`);

    try {
      let historyDataset;
      try {
        historyDataset = await getSolidDataset(HISTORY_FILE_PATH, { fetch: session.fetch });
      } catch (e) { console.warn("Dosya yok."); }

      const timestamp = new Date().getTime();
      let newLog = createThing({ name: `meal-${timestamp}` });

      newLog = addStringNoLocale(newLog, SCHEMA_INRUPT.name, food.name);
      newLog = addDatetime(newLog, "http://schema.org/dateCreated", new Date());
      newLog = addStringNoLocale(newLog, "http://schema.org/description", "Battle Mode Winner");

      if (historyDataset) {
        historyDataset = setThing(historyDataset, newLog);
        await saveSolidDatasetAt(HISTORY_FILE_PATH, historyDataset, { fetch: session.fetch });
        setStatus(`✅ ${food.name} geçmişe kaydedildi!`);
      } else { setStatus(`⚠️ history.ttl dosyası bulunamadı.`); }

    } catch (error) { setStatus("❌ Kayıt hatası: " + error); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center py-10 px-4">
      <Link href="/" className="mb-6 text-gray-400 hover:text-white underline text-sm">
        ← Ana Sayfaya Dön
      </Link>

      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-500 mb-8 text-center">
        ⚔️ FOOD BATTLE ⚔️
      </h1>

      {/* Giriş Butonu */}
      {!session.info.isLoggedIn && (
        <button onClick={handleLogin} className="bg-white text-black px-6 py-2 rounded-full font-bold mb-6 hover:bg-gray-200 transition">
          Pod'a Bağlan (Battle)
        </button>
      )}

      <p className="mb-4 text-gray-400 text-center min-h-[24px]">{status}</p>

      {winner ? (
        <div className="text-center animate-bounce mt-10">
          <p className="text-2xl mb-4">🏆 GÜNÜN KAZANANI 🏆</p>
          <div className="text-9xl mb-4">{winner.emoji}</div>
          <h2 className="text-5xl font-bold text-yellow-400">{winner.name}</h2>
          <button onClick={startTournament} className="mt-10 bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-bold transition">
            Tekrar Oyna
          </button>
        </div>
      ) : (
        candidates.length > 0 && currentPair.length === 2 ? (
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-center justify-center w-full max-w-4xl">
            <button onClick={() => handleVote(currentPair[0])} className="flex-1 bg-gray-800 p-8 rounded-2xl border-2 border-transparent hover:border-pink-500 flex flex-col items-center">
              <div className="text-6xl mb-4">{currentPair[0].emoji}</div>
              <div className="text-2xl font-bold">{currentPair[0].name}</div>
            </button>
            <div className="text-2xl font-black text-gray-500 py-2">VS</div>
            <button onClick={() => handleVote(currentPair[1])} className="flex-1 bg-gray-800 p-8 rounded-2xl border-2 border-transparent hover:border-yellow-500 flex flex-col items-center">
              <div className="text-6xl mb-4">{currentPair[1].emoji}</div>
              <div className="text-2xl font-bold">{currentPair[1].name}</div>
            </button>
          </div>
        ) : (
          <div className="mt-10">
             <button onClick={startTournament} className="bg-gradient-to-r from-green-400 to-blue-500 text-white px-10 py-4 rounded-xl font-bold text-xl shadow-lg">
            Turnuvayı Başlat 🚀
          </button>
          </div>
        )
      )}
    </div>
  );
}