
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2, BrainCircuit } from 'lucide-react';
import { AppState } from '../types';

interface ChatBotProps {
  state: AppState;
}

const ChatBot: React.FC<ChatBotProps> = ({ state }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'أهلاً بك! أنا مساعدك الذكي الخاص بنادي الكرامة. لقد قمت الآن بمزامنة كافة بيانات النادي، كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // توليد سياق البيانات المحدث للذكاء الاصطناعي
  const dataContext = useMemo(() => {
    const playersCount = state.people.filter(p => p.role === 'لاعب').length;
    const staffCount = state.people.filter(p => p.role !== 'لاعب').length;
    
    const upcomingMatches = state.matches
      .filter(m => !m.isCompleted)
      .slice(0, 5)
      .map(m => `- ضد ${m.opponent} (${m.category}) بتاريخ ${m.date} في ${m.time} بموقع ${m.pitch}`)
      .join('\n');

    const upcomingSessions = state.sessions
      .filter(s => !s.isCompleted)
      .slice(0, 5)
      .map(s => `- تمرين ${s.category}: ${s.objective} بتاريخ ${s.date} في ${s.time}`)
      .join('\n');

    const categoriesList = state.categories.join(', ');

    return `
      إليك ملخص حي لقاعدة بيانات نادي الكرامة السوري حالياً:
      - عدد اللاعبين الإجمالي: ${playersCount}
      - عدد الكوادر الفنية والإدارية: ${staffCount}
      - الفئات المسجلة: ${categoriesList}
      
      المباريات القادمة المجدولة:
      ${upcomingMatches || 'لا توجد مباريات قادمة حالياً.'}
      
      التمارين القادمة المجدولة:
      ${upcomingSessions || 'لا توجد تمارين مجدولة حالياً.'}
      
      المستخدم الحالي: ${state.currentUser?.username} برتبة ${state.currentUser?.role}.
    `;
  }, [state]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userQuery = input;
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        أنت "مساعد الكرامة الذكي" (Pro Edition). 
        تعمل كمستشار إداري وفني داخل مكتب كرة القدم لنادي الكرامة الرياضي السوري.
        لديك وصول كامل للبيانات التالية لاستخدامها في إجاباتك:
        
        ${dataContext}
        
        قواعد الإجابة:
        1. كن مهنياً، ودوداً، ومخلصاً لهوية نادي الكرامة.
        2. استخدم البيانات أعلاه للإجابة بدقة على أسئلة المستخدم حول المواعيد أو أعداد اللاعبين.
        3. إذا سأل المستخدم عن شيء غير موجود في البيانات، أخبره بلباقة أنك لا تملك هذه المعلومة حالياً.
        4. شجع دائماً على الروح الرياضية والتميز الفني.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: userQuery,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingBudget: 16000 }
        }
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "عذراً، لم أستطع معالجة طلبك بناءً على البيانات المتاحة." }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', text: "خطأ في الاتصال بقاعدة البيانات الذكية: " + error.message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[9999] no-print" dir="rtl">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-[#001F3F] text-white p-4 rounded-full shadow-[0_10px_40px_-10px_rgba(0,31,63,0.5)] border-4 border-white hover:scale-110 transition-all group relative"
        >
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-600 rounded-full animate-ping"></div>
          <MessageSquare size={28} />
          <span className="absolute right-full mr-4 bg-slate-900 text-white text-[10px] font-black py-2 px-4 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">مساعد الكرامة الذكي (متصل بالبيانات)</span>
        </button>
      ) : (
        <div className="bg-white w-[380px] h-[550px] rounded-[2.5rem] shadow-2xl border-4 border-slate-900 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-[#001F3F] p-5 flex justify-between items-center border-b-4 border-orange-600">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl">
                 <Bot size={20} className="text-[#001F3F]" />
              </div>
              <div>
                <h4 className="text-white font-black text-sm">مساعد الكرامة (Data-Linked)</h4>
                <p className="text-[8px] text-orange-400 font-black uppercase tracking-widest flex items-center gap-1">
                  <BrainCircuit size={10} /> الوصول لقاعدة البيانات نشط
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <Minimize2 size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                  ? 'bg-white border-2 border-slate-200 text-slate-900 rounded-tr-none' 
                  : 'bg-slate-900 text-white rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-slate-900 text-white p-4 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-sm">
                  <Loader2 className="animate-spin" size={14} />
                  <span className="text-[10px] font-black animate-pulse">جاري تحليل البيانات...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="اسأل عن اللاعبين أو المواعيد..."
              className="flex-1 bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-orange-600 transition-all"
            />
            <button 
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="bg-[#001F3F] text-white p-3 rounded-xl hover:bg-black transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
