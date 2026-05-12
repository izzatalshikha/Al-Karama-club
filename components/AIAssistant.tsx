
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Send, Bot, User, Loader2, BrainCircuit, Zap, X, Globe, ExternalLink, BarChart, TrendingUp, ShieldAlert, HeartPulse, History, Gavel, Filter, Trophy, Star, AlertCircle } from 'lucide-react';
import { AppState } from '../types';

interface AIAssistantProps {
  state: AppState;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ state }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState<'fast' | 'deep' | 'tactical'>('fast');
  const [selectedCategory, setSelectedCategory] = useState<string>((state.currentUser?.restrictedCategory ? String(state.currentUser.restrictedCategory).split(',')[0] : null) || state.globalCategoryFilter || 'الكل');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentUser = state.currentUser;
  const isManager = currentUser?.role === 'مدير';
  const restrictedCat = currentUser?.restrictedCategory;

  useEffect(() => {
    if (restrictedCat) {
      setSelectedCategory(String(restrictedCat).split(',')[0]);
    }
  }, [restrictedCat]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clubAnalysis = useMemo(() => {
    const categoryPlayers = state.people.filter(p => 
      p.role === 'لاعب' && (selectedCategory === 'الكل' ? true : p.category === selectedCategory)
    );
    
    const categoryMatches = state.matches.filter(m => 
      m.isCompleted && (selectedCategory === 'الكل' ? true : m.category === selectedCategory)
    );

    const categorySessions = state.sessions.filter(s => 
      (selectedCategory === 'الكل' ? true : s.category === selectedCategory)
    );

    const medicalHistory = categoryPlayers
      .filter(p => p.injuries || p.medicalHistory)
      .map(p => `- ${p.name}: إصابات (${p.injuries || 'لا يوجد'}), ملاحظات (${p.medicalHistory || 'سليم'})`)
      .join('\n');

    const performanceAndDiscipline = categoryPlayers.map(p => {
      const records = state.attendance.filter(a => a.personId === p.id);
      const lates = records.filter(r => r.status === 'متأخر').length;
      
      let goals = 0;
      let assists = 0;
      let yellows = 0;
      let reds = 0;

      categoryMatches.forEach(m => {
        goals += m.events.filter(e => e.type === 'goal' && (e.player === p.id || e.player === p.name)).length;
        assists += m.events.filter(e => e.type === 'assist' && (e.player === p.id || e.player === p.name)).length;
        yellows += m.events.filter(e => e.type === 'yellow' && (e.player === p.id || e.player === p.name)).length;
        reds += m.events.filter(e => e.type === 'red' && (e.player === p.id || e.player === p.name)).length;
      });

      const attRate = categorySessions.length > 0 ? Math.round(((records.filter(r => r.status === 'حاضر').length + lates * 0.7) / categorySessions.length) * 100) : 0;

      return `- ${p.name}: أهداف(${goals}), أسيست(${assists}), كروت(🟨:${yellows}, 🟥:${reds}), التزام(${attRate}%)`;
    }).join('\n');

    const recentMatches = categoryMatches
      .slice(-5)
      .map(m => `- ضد ${m.opponent}: (${m.ourScore}-${m.opponentScore}), نوع:${m.matchType}`)
      .join('\n');

    return { medicalHistory, performanceAndDiscipline, recentMatches };
  }, [state, selectedCategory]);

  const handleAsk = async (customPrompt?: string) => {
    const userQuery = customPrompt || input;
    if (!userQuery.trim() || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const { medicalHistory, performanceAndDiscipline, recentMatches } = clubAnalysis;

      const systemInstruction = `
        أنت المحلل التكتيكي الرقمي المدمج في نظام "Eagle OS" لنادي الكرامة الرياضي. 
        تعمل من خلال خوارزميات تحليل البيانات الفورية لفئة: ${selectedCategory}.
        
        بيانات Eagle OS المتاحة حالياً:
        [إصابات]: ${medicalHistory}
        [أداء وانضباط]: ${performanceAndDiscipline}
        [نتائج أخيرة]: ${recentMatches}

        مهمتك كجزء من Eagle OS:
        1. تقديم توصيات تكتيكية للمباريات بناءً على الأرقام.
        2. تحليل مخاطر الغياب والإنذارات وتأثيرها على قوة الفريق.
        3. اقتراح التشكيلة المثالية (Eagle Lineup) بناءً على إحصائيات الالتزام والنتائج.
      `;

      const response = await ai.models.generateContent({
        model: aiMode === 'deep' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview',
        contents: userQuery,
        config: { 
          systemInstruction,
          thinkingConfig: aiMode === 'deep' ? { thinkingBudget: 16000 } : undefined 
        }
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "Eagle OS: لم أستطع تحليل البيانات حالياً." }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', text: "Eagle OS Error: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: 'Eagle Ideal Lineup', prompt: 'بناءً على التزام اللاعبين وأدائهم التهديفي، ما هي التشكيلة الأساسية المثالية المقترحة للمباراة القادمة؟', icon: Trophy, color: 'text-emerald-600' },
    { label: 'Risk Analysis', prompt: 'حلل السجل الطبي للاعبين وحذرني من اللاعبين الذين قد يعانون من إجهاد أو لديهم تاريخ إصابات قد يتجدد.', icon: HeartPulse, color: 'text-red-600' },
    { label: 'Attendance Report', prompt: 'أعطني ملخصاً عن أكثر اللاعبين التزاماً وأقلهم حضوراً، مع تحليل تأثير ذلك على نتائج المباريات الأخيرة.', icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Card Threat', prompt: 'من هم اللاعبون المهددون بالإيقاف بسبب تراكم الإنذارات، وكيف يؤثر غيابهم المحتمل على تكتيك الفريق؟', icon: AlertCircle, color: 'text-orange-600' }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4">
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#001F3F] p-3 rounded-2xl">
            <BrainCircuit className="text-orange-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase">Eagle Tactical Analyzer</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">تحليل معمق للأداء الفني والانضباطي عبر Eagle OS</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
            <Filter size={14} className="text-slate-500" />
            <select 
              disabled={!!restrictedCat && String(restrictedCat).split(',').length === 1}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent font-black text-[10px] outline-none cursor-pointer text-slate-700"
            >
              {isManager && <option value="الكل">Eagle View: All</option>}
              {state.categories.filter(c => !restrictedCat || String(restrictedCat).split(',').includes(c)).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
             <button onClick={() => setAiMode('fast')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${aiMode === 'fast' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-500'}`}>سريع</button>
             <button onClick={() => setAiMode('deep')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${aiMode === 'deep' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500'}`}>Deep Think</button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-[3rem] border-2 border-slate-900 flex flex-col overflow-hidden relative shadow-inner">
        <div className="p-4 bg-slate-50 border-b-2 border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
           {quickActions.map((action, i) => (
             <button 
              key={i} 
              onClick={() => handleAsk(action.prompt)}
              className="bg-white p-3 rounded-2xl border-2 border-slate-200 hover:border-[#001F3F] transition-all flex flex-col items-center gap-2 group shadow-sm active:scale-95"
             >
                <action.icon size={18} className={`${action.color} group-hover:scale-110 transition-transform`} />
                <span className="text-[8px] font-black text-slate-600 group-hover:text-[#001F3F]">{action.label}</span>
             </button>
           ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-4">
              <Bot size={80} className="text-[#001F3F]" />
              <div className="text-center max-w-sm">
                <p className="font-black text-sm mb-2">Eagle OS: Tactical Engine Initialized</p>
                <p className="font-medium text-[11px] leading-relaxed">
                  أهلاً بك مدرب الكرامة. محلل Eagle OS جاهز لمعالجة كافة السجلات الإدارية والفنية. اطلب مني نصيحة تكتيكية أو استخدم الأزرار في الأعلى للتحليل السريع.
                </p>
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] p-5 rounded-[2.2rem] text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-slate-100 border-2 border-slate-200 text-slate-900 rounded-tr-none' : 'bg-[#001F3F] text-white border-b-4 border-orange-600 rounded-tl-none'}`}>
                <div className="flex items-center gap-2 mb-2 opacity-50">
                   {msg.role === 'user' ? <User size={14}/> : <Bot size={14}/>}
                   <span className="text-[9px] font-black uppercase">{msg.role === 'user' ? 'المدرب' : 'Eagle OS AI'}</span>
                </div>
                <div className="whitespace-pre-wrap font-medium">{msg.text}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-end">
              <div className="bg-[#001F3F] text-white p-5 rounded-[2rem] rounded-tl-none flex items-center gap-4 shadow-xl border-b-4 border-orange-600">
                <Loader2 className="animate-spin text-orange-400" size={20} />
                <span className="text-[10px] font-black animate-pulse">Eagle OS: Analyzing Technical Data...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-white border-t-2 border-slate-900 flex gap-3">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="اسأل Eagle Tactical Analyzer..."
            className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-black outline-none focus:border-[#001F3F] transition-all"
          />
          <button onClick={() => handleAsk()} disabled={loading || !input.trim()} className="bg-[#001F3F] text-white p-4 rounded-2xl shadow-lg hover:bg-black transition-all">
            <Send size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;