
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MapPin, Search, Navigation, Hospital, Utensils, Trophy, ExternalLink, Loader2, Info, Zap, Globe, Compass } from 'lucide-react';

const LocationAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ text: string, links: any[] } | null>(null);

  const searchLocations = async (promptText: string) => {
    setLoading(true);
    setResponse(null);
    
    try {
      // استخدام موديل Gemini 2.5 Flash كما هو مطلوب للميزات المتقدمة وتحديد الخرائط
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let latLng = { latitude: 34.7324, longitude: 36.7137 }; // إحداثيات حمص افتراضياً (مركز نادي الكرامة)
      
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        latLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) {
        console.warn("Geolocation denied or timed out, using default coordinates (Homs).");
      }

      const fullPrompt = `أنا إداري في نادي الكرامة الرياضي السوري. بناءً على موقعي الحالي (${latLng.latitude}, ${latLng.longitude})، أحتاج لمعلومات دقيقة ومحدثة عن: ${promptText}. 
      يرجى توضيح المسافات التقريبية والمميزات الفنية للمرافق (مثل ملاعب عشبية، مشافي طوارئ، أو فنادق إقامة بعثات).`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: latLng
            }
          }
        },
      });

      const text = result.text || "لم يتم العثور على معلومات دقيقة لهذه المنطقة حالياً.";
      const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      // استخراج الروابط من groundingChunks المخصصة للخرائط
      const links = chunks
        .filter((chunk: any) => chunk.maps)
        .map((chunk: any) => ({
          title: chunk.maps.title || "عرض الموقع",
          uri: chunk.maps.uri
        }));

      setResponse({ text, links });
    } catch (error: any) {
      console.error("Maps Grounding Error:", error);
      alert("حدث خطأ أثناء الاتصال بخدمة الخرائط الذكية: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const quickButtons = [
    { id: 'stadiums', label: 'ملاعب تدريب', icon: Trophy, prompt: 'ملاعب كرة قدم عشبية ومجمعات رياضية في حمص' },
    { id: 'medical', label: 'طوارئ طبية', icon: Hospital, prompt: 'مراكز طب رياضي ومشافي طوارئ قريبة' },
    { id: 'hotels', label: 'فنادق إقامة', icon: Globe, prompt: 'فنادق قريبة لإقامة بعثات الأندية الزائرة' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[3rem] border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(0,31,63,1)] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-3 h-full bg-orange-600"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Navigation size={32} className="text-[#001F3F] animate-pulse" /> المساعد اللوجستي الفوري (Maps AI)
              <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1 font-black"><Zap size={10}/> Gemini 2.5 Flash</span>
            </h2>
            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">بحث جغرافي دقيق للمرافق والخدمات اللوجستية</p>
          </div>
          
          <div className="flex gap-2">
            {quickButtons.map(btn => (
              <button 
                key={btn.id}
                onClick={() => searchLocations(btn.prompt)}
                className="bg-slate-50 border-2 border-slate-900 p-4 rounded-2xl hover:bg-[#001F3F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-sm"
              >
                <btn.icon size={20} className="group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchLocations(query)}
            placeholder="مثال: مطاعم صحية قريبة من ملعب الباسل... (بحث جغرافي ذكي)"
            className="flex-1 bg-slate-50 border-4 border-slate-900 rounded-2xl px-6 py-4 font-black text-slate-900 outline-none focus:border-orange-600 shadow-inner"
          />
          <button 
            onClick={() => searchLocations(query)}
            disabled={loading || !query}
            className="bg-[#001F3F] text-white px-10 rounded-2xl font-black flex items-center gap-3 hover:bg-black transition-all shadow-xl disabled:opacity-50 border-b-4 border-black active:translate-y-1 active:border-b-0"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Search size={24} />}
            بحث
          </button>
        </div>
      </div>

      {response && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-6 duration-500">
          <div className="lg:col-span-2 bg-white p-8 rounded-[3.5rem] border-4 border-slate-900 shadow-xl">
            <h3 className="font-black text-lg mb-6 flex items-center gap-3 text-[#001F3F] border-b-2 border-slate-100 pb-4">
              <Info size={24} className="text-orange-600"/> التوصيات والتحليل اللوجستي
            </h3>
            <div className="prose prose-slate max-w-none text-right font-bold leading-relaxed text-slate-800 space-y-4">
              {response.text.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500 mr-6 mb-2">المواقع المقترحة (Google Maps)</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {response.links.length > 0 ? response.links.map((link, i) => (
                <a 
                  key={i} 
                  href={link.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block bg-white p-6 rounded-[2rem] border-4 border-slate-900 hover:border-orange-600 hover:shadow-2xl transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-slate-100 group-hover:bg-orange-600 transition-colors"></div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-100 text-slate-900 rounded-xl group-hover:bg-[#001F3F] group-hover:text-white transition-all shadow-sm">
                        <MapPin size={24}/>
                      </div>
                      <span className="font-black text-sm text-slate-900">{link.title}</span>
                    </div>
                    <ExternalLink size={20} className="text-slate-300 group-hover:text-orange-600 transition-colors" />
                  </div>
                </a>
              )) : (
                <div className="bg-slate-50 p-10 rounded-[2.5rem] text-center border-4 border-dashed border-slate-200">
                  <MapPin className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">لم يتم رصد مواقع خرائط مباشرة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="py-24 flex flex-col items-center justify-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <Loader2 className="animate-spin text-[#001F3F] relative z-10" size={64} />
          </div>
          <div className="text-center">
            <p className="font-black text-[#001F3F] text-xl animate-pulse">جاري تحليل البيانات الجغرافية...</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Connecting to Gemini 2.5 Maps Grounding Engine</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationAssistant;
