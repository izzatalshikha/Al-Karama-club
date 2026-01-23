
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2, BrainCircuit } from 'lucide-react';

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'أهلاً بك! أنا مساعدك الذكي الخاص بنادي الكرامة. كيف يمكنني مساعدتك اليوم في إدارة فريقك أو تحليل البيانات؟' }
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

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userQuery = input;
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `أنت مساعد إداري وفني ذكي تعمل داخل النظام الداخلي لنادي الكرامة الرياضي السوري. 
        أجب باحترافية، وساعد المستخدم في فهم كيفية استخدام النظام أو تقديم نصائح رياضية.
        المستخدم يسأل: ${userQuery}`,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });

      setMessages(prev => [...prev, { role: 'ai', text: response.text || "عذراً، لم أستطع معالجة طلبك." }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', text: "خطأ في الاتصال: " + error.message }]);
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
          <span className="absolute right-full mr-4 bg-slate-900 text-white text-[10px] font-black py-2 px-4 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">مساعد الكرامة الذكي</span>
        </button>
      ) : (
        <div className="bg-white w-[380px] h-[550px] rounded-[2.5rem] shadow-2xl border-4 border-slate-900 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-[#001F3F] p-5 flex justify-between items-center border-b-4 border-orange-600">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl">
                 <Bot size={20} className="text-[#001F3F]" />
              </div>
              <div>
                <h4 className="text-white font-black text-sm">مساعد الكرامة (Pro)</h4>
                <p className="text-[8px] text-orange-400 font-black uppercase tracking-widest flex items-center gap-1">
                  <BrainCircuit size={10} /> وضع التفكير العميق نشط
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
                  <span className="text-[10px] font-black animate-pulse">جاري التفكير...</span>
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
              placeholder="كيف أساعدك..."
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
