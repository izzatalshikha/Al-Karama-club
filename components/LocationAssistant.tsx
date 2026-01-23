
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MapPin, Search, Navigation, Hospital, Utensils, Trophy, ExternalLink, Loader2, Info, Zap } from 'lucide-react';

const LocationAssistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ text: string, links: any[] } | null>(null);

  const searchLocations = async (type: string) => {
    setLoading(true);
    setResponse(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      let latLng = { latitude: 34.7324, longitude: 36.7137 }; // إحداثيات حمص افتراضياً
      
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej)
        );
        latLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) {
        console.warn("Geolocation denied, using default coordinates.");
      }

      const prompt = `بناءً على موقعي الحالي، أريد معلومات دقيقة عن ${type === 'custom' ? query : type} في مدينة حمص أو المناطق المحيطة بها، مع التركيز على المرافق الرياضية المناسبة لنادي الكرامة.`;

      // استخدام موديل Flash Lite لاستجابة سريعة جداً (Low-Latency)
      const result = await ai.models.generateContent({
        model: "gemini-flash-lite-latest",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: latLng
            }
          }
        },
      });

      const text = result.text || "لم يتم العثور على تفاصيل محددة.";
      const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      const links = chunks
        .filter((chunk: any) => chunk.maps)
        .map((chunk: any) => ({
          title: chunk.maps.title,
          uri: chunk.maps.uri
        }));

      setResponse({ text, links });
    } catch (error: any) {
      alert("حدث خطأ أثناء الاتصال بخدمة الخرائط: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const quickButtons = [
    { id: 'stadiums', label: 'ملاعب قريبة', icon: Trophy, prompt: 'الملاعب الرياضية والمجمعات التدريبية' },
    { id: 'medical', label: 'عيادات رياضية', icon: Hospital, prompt: 'مراكز الطب الرياضي والمشافي القريبة' },
    { id: 'food', label: 'مطاعم صحية', icon: Utensils, prompt: 'مطاعم تقدم وجبات صحية مناسبة للرياضيين' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[3rem] border-2 border-slate-900 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-2 h-full bg-orange-600"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <Navigation size={32} className="text-[#001F3F] animate-pulse" /> المساعد اللوجستي الفوري
              <span className="bg-emerald-100 text-emerald-700 text-[9px] px-2 py-1 rounded flex items-center gap-1"><Zap size={10}/> Fast Lite Mode</span>
            </h2>
            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">بحث فوري عن الملاعب والخدمات باستخدام Flash Lite</p>
          </div>
          
          <div className="flex gap-2">
            {quickButtons.map(btn => (
              <button 
                key={btn.id}
                onClick={() => searchLocations(btn.prompt)}
                className="bg-slate-50 border-2 border-slate-900 p-4 rounded-2xl hover:bg-[#001F3F] hover:text-white transition-all flex flex-col items-center gap-2 group"
              >
                <btn.icon size={20} />
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
            placeholder="أين يقع ملعب تشرين؟ (بحث فوري...)"
            className="flex-1 bg-slate-100 border-2 border-slate-900 rounded-2xl px-6 py-4 font-black outline-none focus:ring-4 focus:ring-blue-600/10"
          />
          <button 
            onClick={() => searchLocations('custom')}
            disabled={loading || !query}
            className="bg-[#001F3F] text-white px-8 rounded-2xl font-black flex items-center gap-2 hover:bg-black disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Zap size={20} />}
            بحث سريع
          </button>
        </div>
      </div>

      {response && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border-2 border-slate-900 shadow-sm">
            <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-blue-900">
              <Info size={20}/> المعلومات (استجابة فورية)
            </h3>
            <div className="prose prose-slate max-w-none text-right font-medium leading-relaxed">
              {response.text.split('\n').map((line, i) => (
                <p key={i} className="mb-2">{line}</p>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-black text-sm uppercase tracking-widest text-slate-400 mr-4">المواقع الجغرافية</h3>
            {response.links.length > 0 ? response.links.map((link, i) => (
              <a 
                key={i} 
                href={link.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block bg-white p-6 rounded-2xl border-2 border-slate-900 hover:border-orange-600 hover:shadow-lg transition-all group"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                      <MapPin size={20}/>
                    </div>
                    <span className="font-black text-sm">{link.title}</span>
                  </div>
                  <ExternalLink size={16} className="text-slate-300 group-hover:text-orange-600" />
                </div>
              </a>
            )) : (
              <div className="bg-slate-100 p-8 rounded-2xl text-center border-2 border-dashed border-slate-300">
                <p className="text-[10px] font-black text-slate-400 uppercase">لا توجد خرائط مباشرة</p>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-blue-900" size={48} />
          <p className="font-black text-slate-900 animate-pulse uppercase tracking-widest text-xs">جاري البحث الفوري عبر Flash Lite...</p>
        </div>
      )}
    </div>
  );
};

export default LocationAssistant;
