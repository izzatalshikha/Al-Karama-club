
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Send, Bot, User, Loader2, BrainCircuit, Zap, X, Globe, ExternalLink, BarChart, TrendingUp, ShieldAlert, HeartPulse, History, Gavel, Filter } from 'lucide-react';
import { AppState } from '../types';

interface AIAssistantProps {
  state: AppState;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ state }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'fast' | 'deep' | 'tactical'>('fast');
  const [selectedCategory, setSelectedCategory] = useState<string>(state.currentUser?.restrictedCategory || state.globalCategoryFilter || 'الكل');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentUser = state.currentUser;
  const isManager = currentUser?.role === 'مدير';
  const restrictedCat = currentUser?.restrictedCategory;

  // التحقق من صحة الفئة المختارة بناءً على الصلاحيات
  useEffect(() => {
    if (restrictedCat) {
      setSelectedCategory(restrictedCat);
    }
  }, [restrictedCat]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clubAnalysis = useMemo(() => {
    // تصفية اللاعبين والمباريات والحضور بناءً على الفئة المختارة
    const categoryPlayers = state.people.filter(p => 
      p.role === 'لاعب' && (selectedCategory === 'الكل' ? true : p.category === selectedCategory)
    );
    
    const categoryMatches = state.matches.filter(m => 
      m.isCompleted && (selectedCategory === 'الكل' ? true : m.category === selectedCategory)
    );

    const categorySessions = state.sessions.filter(s => 
      (selectedCategory === 'الكل' ? true : s.category === selectedCategory)
    );

    // 1. تحليل الإصابات والتاريخ الطبي (للفئة المختارة)
    const medicalHistory = categoryPlayers
      .filter(p => p.injuries || p.medicalHistory)
      .map(p => `- ${p.name}: إصابات سابقة (${p.injuries || 'لا يوجد'})، ملاحظات طبية (${p.medicalHistory || 'سليم'})`)
      .join('\n');

    // 2. تحليل الانضباط والأداء الفني المفصل (للفئة المختارة)
    const performanceAndDiscipline = categoryPlayers.map(p => {
      const records = state.attendance.filter(a => a.personId === p.id);
      const absences = records.filter(r => r.status === 'غائب').length;
      const lates = records.filter(r => r.status === 'متأخر').length;
      
      // إحصائيات المباريات لهذا اللاعب
      let goals = 0;
      let assists = 0;
      let yellows = 0;
      let reds = 0;

      categoryMatches.forEach(m => {
        goals += m.events.filter(e => e.type === 'goal' && e.player === p.name).length;
        assists += m.events.filter(e => e.type === 'assist' && e.player === p.name).length;
        yellows += m.events.filter(e => e.type === 'yellow' && e.player === p.name).length;
        reds += m.events.filter(e => e.type === 'red' && e.player === p.name).length;
      });

      const attRate = categorySessions.length > 0 ? Math.round(((records.filter(r => r.status === 'حاضر').length + lates * 0.7) / categorySessions.length) * 100) : 0;

      return `- ${p.name}: أهداف (${goals})، تمريرات حاسمة (${assists})، بطاقات (صفراء: ${yellows}, حمراء: ${reds})، التزام (${attRate}%)، غيابات (${absences})`;
    }).join('\n');

    // 3. تحليل النتائج الأخيرة (للفئة المختارة)
    const recentMatches = categoryMatches
      .slice(-5)
      .map(m => `- ضد ${m.opponent}: النتيجة (${m.ourScore}-${m.opponentScore})، نوع المباراة (${m.matchType})`)
      .join('\n');

    return { 
      medicalHistory: medicalHistory || "لا توجد بيانات طبية حرجة مسجلة لهذه الفئة.", 
      performanceAndDiscipline: performanceAndDiscipline || "لا توجد بيانات أداء كافية.", 
      recentMatches: recentMatches || "لا توجد مباريات مكتملة مؤخراً لهذه الفئة."
    };
  }, [state, selectedCategory]);

  const handleAsk = async () => {
    if (!input.trim() || loading) return;

    const userQuery = input;
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const { medicalHistory, performanceAndDiscipline, recentMatches } = clubAnalysis;

      const systemInstruction = `
        أنت المحلل التكتيكي الرقمي لنادي الكرامة الرياضي - مكتب كرة القدم. 
        تعمل الآن على تحليل بيانات فئة: ${selectedCategory}.
        
        لديك البيانات التالية المحدثة من قاعدة البيانات:
        
        [السجل الطبي والإصابات]:
        ${medicalHistory}
        
        [إحصائيات الأداء، الالتزام، والبطاقات الملونة لكل لاعب]:
        ${performanceAndDiscipline}
        
        [سجل النتائج الأخيرة للفئة]:
        ${recentMatches}

        مهمتك الأساسية هي تقديم "توصيات تكتيكية وانضباطية" للمدربين والكوادر:
        1. توصيات تكتيكية: اقترح تشكيلة بناءً على اللاعبين الأكثر فعالية (أهداف/تمريرات) والأكثر التزاماً.
        2. تحليل المخاطر: حذر المدرب من لاعبين مهددين بالإيقاف بسبب تراكم البطاقات الصفراء أو تدني مستوى الالتزام.
        3. تقييم الإصابات: ربط التاريخ الطبي بمستوى المشاركة الحالي.
        4. نصائح للمباريات القادمة: بناءً على النتائج السابقة، اقترح حلولاً دفاعية أو هجومية.
        
        تحدث بصيغة "المساعد التكتيكي المحترف" واستخدم مفاهيم نادي الكرامة "النسور".
      `;

      const response = await ai.models.generateContent({
        model: aiMode === 'deep' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
        contents: userQuery,
        config: { 
          systemInstruction,
          thinkingConfig: aiMode === 'deep' ? { thinkingBudget: 16000 } : undefined 
        }
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "لم أستطع تحليل البيانات حالياً." }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', text: "حدث خطأ في الاتصال بالمحلل: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4">
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#001F3F] p-3 rounded-2xl">
            <BrainCircuit className="text-orange-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase">المحلل التكتيكي الذكي</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">توصيات فنية مبنية على البيانات والانضباط</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
            <Filter size={14} className="text-slate-500" />
            <select 
              disabled={!!restrictedCat}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-black text-[10px] outline-none cursor-pointer text-slate-700"
            >
              {isManager && <option value="الكل">جميع الفئات</option>}
              {state.categories.filter(c => !restrictedCat || c === restrictedCat).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
             <button onClick={() => setAiMode('fast')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${aiMode === 'fast' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-500'}`}>سريع</button>
             <button onClick={() => setAiMode('deep')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${aiMode === 'deep' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500'}`}>تفكير عميق</button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[3rem] border-2 border-slate-900 flex flex-col overflow-hidden relative shadow-inner">
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                <Bot size={80} className="relative z-10 text-[#001F3F]" />
              </div>
              <div className="text-center max-w-sm">
                <p className="font-black text-sm mb-2">محلل فئة: {selectedCategory}</p>
                <p className="font-medium text-[11px] leading-relaxed">
                  أهلاً بك مدرب الكرامة. قمت بتحليل سجلات الحضور، الإصابات، ونتائج المباريات الأخيرة.
                  اطلب مني اقتراح "تشكيلة بناءً على الالتزام" أو "تحليل مخاطر تراكم البطاقات" أو "توصية تكتيكية".
                </p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] p-5 rounded-[2.2rem] text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-slate-100 border-2 border-slate-200 text-slate-900 rounded-tr-none' : 'bg-[#001F3F] text-white border-b-4 border-orange-600 rounded-tl-none'}`}>
                <div className="flex items-center gap-2 mb-2 opacity-50">
                   {msg.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
                   <span className="text-[9px] font-black uppercase">{msg.role === 'user' ? 'المدرب' : 'المحلل الذكي'}</span>
                </div>
                <div className="whitespace-pre-wrap font-medium">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <div className="bg-[#001F3F] text-white p-5 rounded-[2rem] rounded-tl-none flex items-center gap-4 shadow-xl border-b-4 border-orange-600">
                <div className="relative">
                  <Loader2 className="animate-spin text-orange-400" size={20} />
                  <div className="absolute inset-0 animate-ping opacity-20 bg-orange-400 rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black animate-pulse">جاري تحليل بيانات فئة {selectedCategory}...</span>
                  <span className="text-[8px] opacity-60">أقوم بمراجعة الإصابات والالتزام والنتائج الفنية</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-slate-50 border-t-2 border-slate-900 flex gap-3">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="مثلاً: ما هي توصياتك التكتيكية للمباراة القادمة بناءً على جاهزية اللاعبين؟"
            className="flex-1 bg-white border-2 border-slate-300 rounded-2xl px-6 py-4 font-black outline-none focus:border-[#001F3F] focus:ring-4 focus:ring-blue-600/5 transition-all"
          />
          <button onClick={handleAsk} disabled={loading || !input.trim()} className="bg-[#001F3F] text-white p-4 rounded-2xl shadow-lg hover:bg-black transition-all disabled:opacity-50 group">
            <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
