"use client";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { 
  login, 
  handleIncomingRedirect, 
  getDefaultSession, 
} from "@inrupt/solid-client-authn-browser";
import { 
  getSolidDataset, 
  getThing, 
  setThing, 
  addStringNoLocale, 
  saveSolidDatasetAt,
  createThing,
  setDecimal,
  getDecimal
} from "@inrupt/solid-client";
import { SCHEMA_INRUPT } from "@inrupt/vocab-common-rdf";
import { FOODS } from "./foods";

const STORAGE_URL = "https://storage.inrupt.com/e10a52c8-2228-404c-94b0-9feff66653b8"; 
const FILE_PATH = `${STORAGE_URL}/private/taste/food-preferences.ttl`;

export default function Home() {
  const [session, setSession] = useState(getDefaultSession());
  const [status, setStatus] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const fetchRatings = useCallback(async () => {
    if (!session.info.isLoggedIn) return;

    try {
      const myDataset = await getSolidDataset(FILE_PATH, { fetch: session.fetch });
      const newRatings: Record<string, number> = {};

      FOODS.forEach((food) => {
        const foodUrl = `${FILE_PATH}#${food.id}`;
        const foodThing = getThing(myDataset, foodUrl);
        if (foodThing) {
          const rating = getDecimal(foodThing, "http://schema.org/ratingValue");
          if (rating) newRatings[food.id] = rating;
        }
      });
      setRatings(newRatings);
    } catch (e) { console.log("Veri okunamadı.", e); }
  }, [session]);

  useEffect(() => {
    // --- BURASI KRİTİK DEĞİŞİKLİK ---
    // restorePreviousSession: false yaparak "Eski oturumu hatırlama" diyoruz.
    // Bu sayede seni Battle sayfasına fırlatamaz. Sadece olduğu yerde kalır.
    handleIncomingRedirect({
      restorePreviousSession: false, 
      url: window.location.href
    }).then((info) => {
      if (info) {
        setStatus(`Hoşgeldin! WebID: ${info.webId}`);
        setSession(getDefaultSession());
      }
    });
  }, []);

  useEffect(() => {
    if (session.info.isLoggedIn) fetchRatings();
  }, [session.info.isLoggedIn, fetchRatings]);

  const handleLogin = async () => {
    if (!session.info.isLoggedIn) {
      await login({
        oidcIssuer: "https://login.inrupt.com",
        // Redirect URL'i mevcut sayfa (Ana Sayfa) olarak sabitliyoruz
        redirectUrl: window.location.origin + "/gastropod-app", 
        clientName: "GastroPod App",
      });
    }
  };

  const rateFood = async (foodId: string, foodName: string, rating: number) => {
    if (!session.info.isLoggedIn) { alert("Lütfen önce giriş yap!"); return; }
    setRatings((prev) => ({ ...prev, [foodId]: rating }));
    setStatus(`⏳ ${foodName} kaydediliyor...`);

    try {
      let myDataset;
      try { myDataset = await getSolidDataset(FILE_PATH, { fetch: session.fetch }); } 
      catch (e) { setStatus("Dosya yok."); return; }

      const foodUrl = `${FILE_PATH}#${foodId}`;
      let foodThing = getThing(myDataset, foodUrl) || createThing({ name: foodId });

      foodThing = addStringNoLocale(foodThing, SCHEMA_INRUPT.name, foodName);
      foodThing = setDecimal(foodThing, "http://schema.org/ratingValue", rating);

      myDataset = setThing(myDataset, foodThing);
      await saveSolidDatasetAt(FILE_PATH, myDataset, { fetch: session.fetch });
      setStatus(`✅ ${foodName} kaydedildi!`);
    } catch (error) { setStatus("Hata: " + error); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight">GastroPod 🌮</h1>
          <Link href="/battle" className="bg-pink-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-pink-600 transition text-sm">
          ⚔️ Turnuvaya Git
          </Link>
        </div>
        
        <div className="text-center mb-8 bg-gray-50 p-4 rounded-lg">
          {session.info.isLoggedIn ? (
            <div>
              <p className="text-green-600 font-bold mb-2">● Bağlantı Aktif</p>
              <p className="text-xs text-gray-400 break-all">{session.info.webId}</p>
            </div>
          ) : (
            <button onClick={handleLogin} className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition w-full">Pod'a Bağlan</button>
          )}
          <p className="mt-4 text-sm font-medium text-indigo-500 min-h-[24px]">{status}</p>
        </div>

        <div className="space-y-3">
          {FOODS.map((food) => (
            <div key={food.id} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition bg-white group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl filter grayscale group-hover:grayscale-0 transition">{food.emoji}</span>
                  <span className="text-lg font-bold text-gray-700">{food.name}</span>
                </div>
                {ratings[food.id] && <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-bold">Puan: {ratings[food.id]}</span>}
              </div>
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isSelected = ratings[food.id] === star;
                  return (
                    <button key={star} onClick={() => rateFood(food.id, food.name, star)} className={`flex-1 h-9 rounded-md font-bold transition text-sm ${isSelected ? "bg-yellow-400 text-white shadow-md transform scale-105" : "bg-gray-100 text-gray-400 hover:bg-yellow-200 hover:text-yellow-700"}`}>{star}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}