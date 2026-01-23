
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Send, Bot, User, Loader2, BrainCircuit, Zap, X, Globe, ExternalLink } from 'lucide-react';
import { AppState } from '../types';

interface AIAssistantProps {
  state: AppState;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ state }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string, links?: {title: string, uri: string}[] }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'fast' | 'deep' | 'search'>('fast');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAsk = async () => {
    if (!input.trim() || loading) return;

    const userQuery = input;
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const restrictedCat = state.currentUser?.restrictedCategory;
      const filteredPeople = restrictedCat ? state.people.filter(p => p.category === restrictedCat) : state.people;
      const filteredMatches = restrictedCat ? state.matches.filter(m => m.category === restrictedCat) : state.matches;
      const filteredSessions = restrictedCat ? state.sessions.filter(s => s.category === restrictedCat) : state.sessions;

      const context = `
        أنت المحلل الذكي الرسمي لنادي الكرامة الرياضي السوري. 
        ${restrictedCat ? `- صلاحياتك محدودة بفئة: ${restrictedCat}` : `- صلاحياتك شاملة لكل الفئات: ${state.categories.join(', ')}`}
        بيانات النادي الداخلية حالياً: ${filteredPeople.length} عضو، ${filteredMatches.length} مباراة، ${filteredSessions.length} تمرين.
        في حال استخدام وضع "البحث"، ادمج معلوماتك العامة مع بيانات النادي لتقديم رد متكامل.
      `;

      let responseText = "";
      let groundingLinks: {title: string, uri: string}[] = [];

      if (aiMode === 'search') {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `${context}\nسؤال المستخدم: ${userQuery}`,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
        responseText = response.text || "عذراً، لم أجد نتائج بحث دقيقة.";
        
        // استخراج مراجع البحث
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        groundingLinks = chunks
          .filter((c: any) => c.web)
          .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

      } else {
        const isDeep = aiMode === 'deep';
        const response = await ai.models.generateContent({
          model: isDeep ? 'gemini-3-pro-preview' : 'gemini-flash-lite-latest',
          contents: `${context}\nسؤال المستخدم: ${userQuery}`,
          config: isDeep ? {
            thinkingConfig: { thinkingBudget: 32768 }
          } : undefined
        });
        responseText = response.text || "عذراً، لم أستطع تحليل الطلب.";
      }

      setMessages(prev => [...prev, { role: 'ai', text: responseText, links: groundingLinks }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', text: "حدث خطأ في الاتصال بـ Gemini: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "آخر أخبار الدوري السوري والكرامة",
    "تحليل تكتيكي لأداء فئتي",
    "اقترح لي تمرين لرفع اللياقة",
    "قوانين الفيفا الجديدة للتسلل"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-2xl shadow-lg">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">المحلل الذكي المتكامل</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تغطية داخلية (بيانات النادي) وعالمية (جوجل)</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-2xl border-2 border-slate-200">
           <button 
             onClick={() => setAiMode('fast')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] transition-all ${aiMode === 'fast' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
           >
             <Zap size={14} /> سريع
           </button>
           <button 
             onClick={() => setAiMode('search')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] transition-all ${aiMode === 'search' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
           >
             <Globe size={14} /> بحث مباشر
           </button>
           <button 
             onClick={() => setAiMode('deep')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] transition-all ${aiMode === 'deep' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
           >
             <BrainCircuit size={14} /> تفكير (Pro)
           </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[3rem] border-2 border-slate-900 shadow-inner overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
              <Bot size={80} className="text-slate-200" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => setInput(s)} className="p-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-[10px] font-black hover:border-orange-600 hover:text-orange-600 transition-all text-right">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] p-5 rounded-[2rem] flex flex-col gap-3 ${msg.role === 'user' ? 'bg-slate-100 border-2 border-slate-900 text-slate-900 rounded-tr-none' : 'bg-[#001F3F] text-white rounded-tl-none border-b-4 border-orange-600 shadow-xl'}`}>
                <div className="flex gap-4">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-orange-600 text-white'}`}>
                    {msg.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                  </div>
                  <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap flex-1">
                    {msg.text}
                  </div>
                </div>
                {msg.links && msg.links.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                    <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">المصادر المعتمدة:</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.links.map((link, idx) => (
                        <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-[9px] font-black flex items-center gap-2 transition-all">
                          <ExternalLink size={10}/> {link.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <div className="bg-[#001F3F] text-white p-5 rounded-[2rem] rounded-tl-none flex items-center gap-3 shadow-lg">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-xs font-black animate-pulse">
                  {aiMode === 'search' ? 'جاري البحث عبر جوجل...' : 'جاري التحليل المعمق...'}
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 bg-slate-50 border-t-2 border-slate-900 flex gap-3 items-center">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder={aiMode === 'search' ? "ابحث عن أي معلومة رياضية عالمية..." : "اسأل المحلل الذكي..."}
            className="flex-1 bg-white border-2 border-slate-900 rounded-2xl px-6 py-4 font-black text-slate-900 outline-none focus:ring-4 focus:ring-orange-600/10 transition-all"
          />
          <button 
            onClick={handleAsk}
            disabled={loading || !input.trim()}
            className={`p-4 rounded-2xl transition-all shadow-lg disabled:opacity-50 text-white ${aiMode === 'search' ? 'bg-emerald-600 hover:bg-emerald-700' : (aiMode === 'deep' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#001F3F] hover:bg-black')}`}
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
