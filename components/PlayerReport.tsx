
import React, { useMemo, useState } from 'react';
import { 
  ChevronRight, Printer, Target, AlertTriangle, Clock, Calendar, 
  TrendingUp, Users, Shield, MapPin, Activity, Globe, Trophy, 
  CheckCircle, Award, GraduationCap, Home, StickyNote, CreditCard, BarChart3, PieChart,
  Hash, ClipboardList, User, Timer, FileText, Briefcase, Sparkles, Loader2, X, BrainCircuit
} from 'lucide-react';
import { AppState, Person, Match, AttendanceRecord } from '../types';
import ClubLogo from './ClubLogo';
import { GoogleGenAI } from "@google/genai";

interface PlayerReportProps {
  state: AppState;
  player: Person | null;
  onBack: () => void;
}

const PlayerReport: React.FC<PlayerReportProps> = ({ state, player, onBack }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  if (!player || !state.currentUser) return null;

  const isStaff = player.role !== 'لاعب';

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const matchStats = useMemo(() => {
    if (isStaff) return { played: 0, goals: 0, assists: 0, yellows: 0, reds: 0, minutes: 0, list: [] };

    let totalMinutes = 0;
    const statsList = state.matches.filter(m => m.isCompleted).map(m => {
      const starter = m.lineup.starters.find(s => s.playerId === player.id);
      const sub = m.lineup.subs.find(s => s.playerId === player.id);
      
      let mins = 0;
      if (starter) {
        mins = parseInt(starter.minutesPlayed || '90') || 0;
      } else if (sub) {
        mins = parseInt(sub.minutesPlayed || '0') || 0;
      }

      totalMinutes += mins;

      const goals = m.events.filter(e => e.type === 'goal' && e.player === player.name).length;
      const assists = m.events.filter(e => e.type === 'assist' && e.player === player.name).length;
      const yellow = m.events.filter(e => e.type === 'yellow' && e.player === player.name).length;
      const red = m.events.filter(e => e.type === 'red' && e.player === player.name).length;

      return { 
        opponent: m.opponent, 
        date: m.date, 
        type: m.matchType,
        mins, 
        goals, 
        assists, 
        yellow, 
        red, 
        played: !!(starter || sub) 
      };
    }).filter(s => s.played);

    return {
      played: statsList.length,
      goals: statsList.reduce((a, b) => a + b.goals, 0),
      assists: statsList.reduce((a, b) => a + b.assists, 0),
      yellows: statsList.reduce((a, b) => a + b.yellow, 0),
      reds: statsList.reduce((a, b) => a + b.red, 0),
      minutes: totalMinutes,
      list: statsList
    };
  }, [state.matches, player, isStaff]);

  const attendanceData = useMemo(() => {
    const records = state.attendance.filter(a => a.personId === player.id);
    const sessions = state.sessions.filter(s => s.category === player.category);
    const present = records.filter(r => r.status === 'حاضر').length;
    const late = records.filter(r => r.status === 'متأخر').length;
    const rate = sessions.length > 0 ? Math.round(((present + late * 0.7) / sessions.length) * 100) : 0;

    return { rate, total: sessions.length };
  }, [state.attendance, state.sessions, player]);

  const handleGenerateAiAnalysis = async () => {
    setLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        أنت محلل تقني محترف لكرة القدم. قم بكتابة تقرير فني شامل واحترافي للاعب التالي في نادي الكرامة:
        الاسم: ${player.name}
        الفئة: ${player.category}
        إجمالي الدقائق الملعوبة: ${matchStats.minutes} دقيقة في ${matchStats.played} مباريات.
        الأهداف: ${matchStats.goals} | التمريرات الحاسمة: ${matchStats.assists}
        معدل الالتزام بالتمارين: ${attendanceData.rate}%
        البطاقات: ${matchStats.yellows} صفراء، ${matchStats.reds} حمراء.

        التقرير يجب أن يكون بأسلوب "Scout Report" ويتضمن:
        1. تقييم الأداء العام.
        2. تحليل الانضباط.
        3. توصية فنية للمدرب لتطوير مستوى اللاعب.
        استخدم اللغة العربية الفصحى وبأسلوب احترافي.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      });

      setAiAnalysis(response.text || "فشل توليد التحليل.");
    } catch (error: any) {
      setAiAnalysis("حدث خطأ أثناء الاتصال بـ Gemini: " + error.message);
    } finally {
      setLoadingAi(false);
    }
  };

  const maxVal = Math.max(matchStats.goals, matchStats.assists, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex justify-between items-center no-print">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-[#001F3F] font-black transition-all">
          <ChevronRight size={20} /> العودة لقائمة الفريق
        </button>
        <div className="flex items-center gap-3">
           <button 
             onClick={handleGenerateAiAnalysis} 
             disabled={loadingAi}
             className="bg-gradient-to-r from-blue-900 to-orange-600 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-3 shadow-lg hover:shadow-blue-900/20 transition-all border-b-4 border-black disabled:opacity-50"
           >
             {loadingAi ? <Loader2 className="animate-spin" size={18}/> : <BrainCircuit size={18} />}
             تحليل فني مع "التفكير العميق"
           </button>
           <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-black transition-all border-b-4 border-black">
             <Printer size={18} /> طباعة التقرير الفني
           </button>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-gradient-to-br from-white to-blue-50/30 p-8 rounded-[3rem] border-4 border-blue-900 shadow-xl animate-in zoom-in-95 duration-500 no-print relative">
           <button onClick={() => setAiAnalysis(null)} className="absolute top-6 left-6 text-slate-400 hover:text-red-600"><X size={24}/></button>
           <h3 className="text-xl font-black text-blue-900 flex items-center gap-3 mb-6 uppercase tracking-tighter">
             <Sparkles size={24}/> التقرير الفني المولد بموديل التفكير (Pro Thinking)
           </h3>
           <div className="prose prose-slate max-w-none text-right font-black leading-loose text-slate-700 whitespace-pre-wrap">
              {aiAnalysis}
           </div>
           <p className="mt-6 pt-4 border-t border-blue-100 text-[9px] font-black text-blue-400 uppercase tracking-widest">تحليل ذكاء اصطناعي فائق الدقة • نادي الكرامة</p>
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-xl border-4 border-slate-900 overflow-hidden relative">
        <div className="bg-[#001F3F] h-32 relative">
          <div className="absolute top-6 left-10 opacity-10">
             <ClubLogo size={180} />
          </div>
          <div className="absolute -bottom-16 right-12 flex items-end gap-6">
            <div className="w-40 h-40 bg-white rounded-[2.5rem] shadow-2xl border-8 border-white flex items-center justify-center overflow-hidden font-black text-6xl text-blue-900 uppercase">
               {player.name.charAt(0)}
            </div>
            <div className="mb-4">
              <h1 className="text-3xl font-black text-white drop-shadow-lg uppercase">{player.name}</h1>
              <div className="flex gap-2 mt-2">
                 <span className="bg-orange-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase border-2 border-white shadow-md">{player.role}</span>
                 <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase border-2 border-white shadow-md">{player.category}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-20"></div>
        <div className="px-12 pb-10 grid grid-cols-1 md:grid-cols-4 gap-8">
           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><MapPin size={14} className="text-orange-600"/> مكان وتاريخ الولادة</p>
             <p className="text-sm font-black text-slate-900">{player.birthPlace || 'غير محدد'} | {player.birthDate} ({calculateAge(player.birthDate)} سنة)</p>
           </div>
           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Users size={14} className="text-blue-900"/> الأب والأم</p>
             <p className="text-sm font-black text-slate-900">{player.fatherName} / {player.motherName}</p>
           </div>
           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Hash size={14} className="text-orange-600"/> الرقم الرسمي</p>
             <p className="text-xl font-black text-blue-900">#{player.number || '00'}</p>
           </div>
           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Timer size={14} className="text-emerald-600"/> إجمالي دقائق اللعب</p>
             <p className="text-xl font-black text-emerald-700">{matchStats.minutes} دقيقة</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerReport;
