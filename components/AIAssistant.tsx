
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Send, Bot, User, Loader2, BrainCircuit, Zap, X, ZapOff } from 'lucide-react';
import { AppState } from '../types';

interface AIAssistantProps {
  state: AppState;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ state }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'fast' | 'deep'>('fast');
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
        أنت المحلل الذكي الرسمي لنادي الكرامة الرياضي. بيانات النادي المتوفرة والمتاحة لصلاحياتك الحالية هي:
        ${restrictedCat ? `- أنت تعمل حصراً على فئة: ${restrictedCat}` : `- أنت تعمل على كافة فئات النادي: ${state.categories.join(', ')}`}
        - عدد الكوادر واللاعبين المتاحين: ${filteredPeople.length}
        - عدد المباريات المسجلة: ${filteredMatches.length}
        - عدد التمارين المسجلة: ${filteredSessions.length}
        
        بيانات اللاعبين المتاحة: ${filteredPeople.filter(p => p.role === 'لاعب').map(p => `${p.name} (#${p.number}${restrictedCat ? '' : ` - ${p.category}`})`).join(', ')}
        نتائج آخر المباريات المتاحة: ${filteredMatches.filter(m => m.isCompleted).map(m => `ضد ${m.opponent} (${m.ourScore}-${m.opponentScore})${restrictedCat ? '' : ` [${m.category}]`}`).join(' | ')}
        
        أجب باحترافية رياضية وباللغة العربية الفصحى. كن فخوراً بعراقة نادي الكرامة السوري وتاريخه الحافل بالبطولات.
      `;

      const isDeep = aiMode === 'deep';
      const response = await ai.models.generateContent({
        model: isDeep ? 'gemini-3-pro-preview' : 'gemini-flash-lite-latest',
        contents: `${context}\nالمستخدم يسأل: ${userQuery}`,
        config: isDeep ? {
          thinkingConfig: { thinkingBudget: 32768 }
        } : undefined
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "عذراً، لم أستطع تحليل الطلب." }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', text: "حدث خطأ في الاتصال بـ Gemini: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "حلل أداء فئتي في المباريات الأخيرة",
    "اقترح لي تمرين لتقوية الدفاع",
    "من هو اللاعب الأكثر التزاماً في التمارين؟",
    "اعطني ملخصاً إحصائياً عاماً"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-2xl shadow-lg">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">مساعد "الكرامة" الذكي (AI)</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تحليل فني وإداري متقدم بذكاء Gemini</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border-2 border-slate-200">
           <button 
             onClick={() => setAiMode('fast')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] transition-all ${aiMode === 'fast' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
           >
             <Zap size={14} className={aiMode === 'fast' ? 'animate-pulse' : ''} /> استجابة سريعة
           </button>
           <button 
             onClick={() => setAiMode('deep')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] transition-all ${aiMode === 'deep' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}
           >
             <BrainCircuit size={14} className={aiMode === 'deep' ? 'animate-bounce' : ''} /> تفكير عميق (Pro)
           </button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[3rem] border-2 border-slate-900 shadow-inner overflow-hidden flex flex-col relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40">
              <Bot size={80} className="text-slate-200" />
              <div>
                <p className="font-black text-slate-400 text-lg">أنا جاهز لتحليل بيانات النادي وإفادتك..</p>
                <p className="text-xs font-black text-slate-300 mt-1">اطرح سؤالاً عن أداء أي لاعب أو فئة أو اطلب نصيحة تدريبية</p>
              </div>
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
              <div className={`max-w-[85%] p-5 rounded-[2rem] flex gap-4 ${msg.role === 'user' ? 'bg-slate-100 border-2 border-slate-900 text-slate-900 rounded-tr-none' : 'bg-[#001F3F] text-white rounded-tl-none shadow-xl border-b-4 border-orange-600'}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-orange-600 text-white'}`}>
                  {msg.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                </div>
                <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <div className="bg-[#001F3F] text-white p-5 rounded-[2rem] rounded-tl-none flex items-center gap-3 shadow-lg">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-xs font-black animate-pulse">
                  {aiMode === 'deep' ? 'جاري التفكير بعمق وتحليل البيانات المعقدة...' : 'جاري جلب الرد السريع...'}
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
            placeholder={aiMode === 'deep' ? "اسأل المحلل الخبير (تحليل عميق)..." : "اسأل سؤالاً سريعاً..."}
            className="flex-1 bg-white border-2 border-slate-900 rounded-2xl px-6 py-4 font-black text-slate-900 outline-none focus:ring-4 focus:ring-orange-600/10 transition-all"
          />
          <button 
            onClick={handleAsk}
            disabled={loading || !input.trim()}
            className={`p-4 rounded-2xl transition-all shadow-lg disabled:opacity-50 text-white ${aiMode === 'deep' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#001F3F] hover:bg-black'}`}
          >
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
