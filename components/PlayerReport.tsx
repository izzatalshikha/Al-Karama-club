
import React, { useMemo, useState } from 'react';
import { 
  ChevronRight, Printer, Target, AlertTriangle, Clock, Calendar, 
  TrendingUp, Users, Shield, MapPin, Activity, Globe, Trophy, 
  CheckCircle, Award, GraduationCap, Home, StickyNote, CreditCard, BarChart3, PieChart,
  Hash, ClipboardList, User, Timer, FileText, Briefcase, Sparkles, Loader2, X, BrainCircuit,
  HeartPulse, ShieldAlert, Gavel, Smartphone, CalendarDays, Wallet, Zap, ShieldCheck,
  Medal, Swords, Star, UserPlus, Info, Phone, Fingerprint
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

  // إحصائيات المشاركة
  const matchStats = useMemo(() => {
    if (isStaff) return { officialMins: 0, friendlyMins: 0, goals: 0, assists: 0, list: [] };

    let officialMins = 0;
    let friendlyMins = 0;
    
    const statsList = state.matches
      .filter(m => m.isCompleted)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(m => {
        const starter = m.lineup.starters.find(s => s.playerId === player.id);
        const sub = m.lineup.subs.find(s => s.playerId === player.id);
        
        let mins = 0;
        if (starter) {
          mins = parseInt(starter.minutesPlayed || '90') || 0;
        } else if (sub) {
          mins = parseInt(sub.minutesPlayed || '0') || 0;
        }

        const isOfficial = ['دوري', 'كأس', 'مباراة دولية'].includes(m.matchType);
        if (isOfficial) officialMins += mins;
        else friendlyMins += mins;

        const goals = m.events.filter(e => e.type === 'goal' && (e.player === player.name || e.player === player.id)).length;
        const assists = m.events.filter(e => e.type === 'assist' && (e.player === player.name || e.player === player.id)).length;

        return { 
          opponent: m.opponent, 
          date: m.date, 
          type: m.matchType,
          isOfficial,
          mins, 
          goals, 
          assists,
          played: !!(starter || sub) 
        };
      })
      .filter(s => s.played);

    return {
      officialMins,
      friendlyMins,
      goals: statsList.reduce((a, b) => a + b.goals, 0),
      assists: statsList.reduce((a, b) => a + b.assists, 0),
      list: statsList
    };
  }, [state.matches, player, isStaff]);

  // إحصائيات الحضور
  const attendanceData = useMemo(() => {
    const sessions = state.sessions.filter(s => s.category === player.category);
    const sessionIds = sessions.map(s => s.id);
    
    const allRecords = state.attendance.filter(a => a.personId === player.id && sessionIds.includes(a.sessionId));
    const uniqueRecords = Array.from(new Map(allRecords.map(r => [r.sessionId, r])).values()) as AttendanceRecord[];
    
    const present = uniqueRecords.filter(r => r.status === 'حاضر').length;
    const late = uniqueRecords.filter(r => r.status === 'متأخر').length;
    const excused = uniqueRecords.filter(r => r.status === 'غياب بعذر').length;
    
    const totalSessions = sessions.length || 1;
    const weightedAttendance = present + excused + (late * 0.7);
    const rate = Math.min(100, Math.round((weightedAttendance / totalSessions) * 100));

    return { rate, total: sessions.length, present, late, excused };
  }, [state.attendance, state.sessions, player]);

  const radarData = useMemo(() => {
    return [
      { label: 'بدني', val: 8.5 },
      { label: 'تكتيك', val: 7.2 },
      { label: 'تقني', val: 9.0 },
      { label: 'ذهني', val: 6.5 },
      { label: 'سرعة', val: 8.8 }
    ];
  }, []);

  const handleGenerateAiAnalysis = async () => {
    setLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `أنت محلل تقني لنادي الكرامة السوري. حلل بيانات اللاعب ${player.name}: دقائق رسمية(${matchStats.officialMins}), ودية(${matchStats.friendlyMins}), أهداف(${matchStats.goals}), التزام(${attendanceData.rate}%). قدم تقريراً مختصراً واحترافياً.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiAnalysis(response.text || "فشل توليد التحليل.");
    } catch (error: any) {
      setAiAnalysis("خطأ في الاتصال.");
    } finally {
      setLoadingAi(false);
    }
  };

  // فئات التصنيفات الموحدة لضمان التباين العالي
  const labelStyle = "text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1 block";
  const valueStyle = "text-sm font-bold text-[#001F3F] bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm";

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-24 px-2 md:px-0 text-right font-['Tajawal']" dir="rtl">
      {/* الأزرار العلوية */}
      <div className="flex flex-row justify-between items-center no-print gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-[#001F3F] font-black bg-white border-2 border-[#001F3F] px-6 py-3 rounded-2xl text-sm shadow-md active:scale-95 transition-all">
          <ChevronRight size={20} /> رجوع للمديرية
        </button>
        <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl border-b-4 border-black hover:bg-black transition-all">
          <Printer size={20} /> تصدير التقرير الشامل
        </button>
      </div>

      {/* بطاقة التعريف الرأسية */}
      <div className="solid-panel overflow-hidden relative !shadow-none md:!shadow-[10px_10px_0px_0px_#001F3F] border-4 border-[#001F3F]">
        <div className="bg-[#001F3F] h-28 md:h-40 relative">
          <div className="absolute -bottom-14 right-8 md:right-16 flex items-end gap-6 md:gap-10">
            <div className="w-28 h-28 md:w-48 md:h-48 bg-white rounded-3xl md:rounded-[3rem] border-[6px] md:border-[10px] border-white flex items-center justify-center font-black text-5xl md:text-8xl text-[#001F3F] uppercase shadow-2xl relative z-10">
               {player.name.charAt(0)}
               <div className="absolute -top-4 -left-4 bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl border-4 border-white">
                  #{player.number || '0'}
               </div>
            </div>
            <div className="mb-4">
              <h1 className="text-2xl md:text-5xl font-black text-white drop-shadow-lg tracking-tight">{player.name}</h1>
              <div className="flex gap-3 mt-2">
                 <span className="bg-orange-600 text-white text-[10px] md:text-[12px] font-black px-4 md:px-6 py-1.5 rounded-xl border-2 border-white uppercase shadow-lg">{player.role}</span>
                 <span className="bg-blue-600 text-white text-[10px] md:text-[12px] font-black px-4 md:px-6 py-1.5 rounded-xl border-2 border-white uppercase shadow-lg">{player.category}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-16 md:h-24"></div>
        
        {/* ملخص الأداء السريع */}
        <div className="px-6 md:px-16 pb-10 grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8">
           <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center shadow-sm">
             <Medal className="text-[#001F3F] mb-2" size={24}/>
             <span className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase">دقائق رسمية</span>
             <p className="text-xl md:text-3xl font-black text-[#001F3F]">{matchStats.officialMins}</p>
           </div>
           <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center shadow-sm">
             <Swords className="text-orange-600 mb-2" size={24}/>
             <span className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase">دقائق ودية</span>
             <p className="text-xl md:text-3xl font-black text-[#001F3F]">{matchStats.friendlyMins}</p>
           </div>
           <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center shadow-sm">
             <Trophy className="text-blue-600 mb-2" size={24}/>
             <span className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase">الأهداف</span>
             <p className="text-xl md:text-3xl font-black text-[#001F3F]">{matchStats.goals}</p>
           </div>
           <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center shadow-sm">
             <Zap className="text-orange-500 mb-2" size={24}/>
             <span className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase">تمريرات حاسمة</span>
             <p className="text-xl md:text-3xl font-black text-[#001F3F]">{matchStats.assists}</p>
           </div>
           <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center col-span-2 md:col-span-1 shadow-sm">
             <TrendingUp className="text-emerald-600 mb-2" size={24}/>
             <span className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase">الالتزام العام</span>
             <p className="text-xl md:text-3xl font-black text-emerald-700">%{attendanceData.rate}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        <div className="lg:col-span-2 space-y-8 md:space-y-10">
          
          {/* قسم البيانات الثبوتية والعائلية (البيانات الشاملة) */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-[#001F3F] shadow-md">
             <h3 className="text-lg md:text-2xl font-black text-[#001F3F] mb-8 flex items-center gap-3 border-r-4 border-orange-600 pr-4">
                <Fingerprint className="text-blue-700" size={28}/> البيانات الثبوتية والعائلية الكاملة
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                   <label className={labelStyle}>اسم الأب</label>
                   <div className={valueStyle}>{player.fatherName || 'غير مسجل'}</div>
                </div>
                <div>
                   <label className={labelStyle}>اسم الأم</label>
                   <div className={valueStyle}>{player.motherName || 'غير مسجل'}</div>
                </div>
                <div>
                   <label className={labelStyle}>مكان وتاريخ الولادة</label>
                   <div className={valueStyle}>{player.birthPlace || 'دمشق'} / {player.birthDate}</div>
                </div>
                <div>
                   <label className={labelStyle}>القيد (الخانة)</label>
                   <div className={valueStyle}>{player.khana || 'غير متوفر'}</div>
                </div>
                <div>
                   <label className={labelStyle}>الرقم الوطني</label>
                   <div className={valueStyle}>{player.nationalId || '--- --- ---'}</div>
                </div>
                <div>
                   <label className={labelStyle}>الرقم الاتحادي</label>
                   <div className={valueStyle}>{player.federalNumber || 'لم يصدر بعد'}</div>
                </div>
                <div>
                   <label className={labelStyle}>الرقم الدولي (ID)</label>
                   <div className={valueStyle}>{player.internationalId || 'غير متوفر'}</div>
                </div>
                <div>
                   <label className={labelStyle}>تاريخ الانضمام للنادي</label>
                   <div className={valueStyle}>{player.joinDate || '2024/01/01'}</div>
                </div>
                <div>
                   <label className={labelStyle}>رقم الهاتف</label>
                   <div className={valueStyle} dir="ltr">{player.phone || '09-- --- ---'}</div>
                </div>
             </div>
             <div className="mt-8 pt-6 border-t border-slate-200">
                <label className={labelStyle}>العنوان السكني التفصيلي</label>
                <div className={`${valueStyle} flex items-center gap-2`}>
                   <MapPin size={18} className="text-orange-600 shrink-0"/> {player.address || 'العنوان غير محدد بدقة في سجلات المكتب.'}
                </div>
             </div>
          </div>

          {/* الرادار الفني والتقييم */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-4 border-[#001F3F] shadow-sm flex flex-col md:flex-row items-center gap-12">
             <div className="w-full md:w-1/2">
                <h3 className="text-lg md:text-xl font-black flex items-center gap-3 mb-8 text-[#001F3F]">
                   <Target className="text-orange-600" size={24}/> البصمة الفنية (Radar Metrics)
                </h3>
                <div className="relative w-full aspect-square max-w-[300px] mx-auto">
                   <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#001F3F" strokeWidth="0.5" strokeDasharray="2 2" />
                      <circle cx="50" cy="50" r="30" fill="none" stroke="#001F3F" strokeWidth="0.5" strokeDasharray="2 2" />
                      <circle cx="50" cy="50" r="15" fill="none" stroke="#001F3F" strokeWidth="0.5" strokeDasharray="2 2" />
                      {[0, 72, 144, 216, 288].map(angle => (
                        <line 
                          key={angle}
                          x1="50" y1="50" 
                          x2={50 + 45 * Math.cos(angle * Math.PI / 180)} 
                          y2={50 + 45 * Math.sin(angle * Math.PI / 180)} 
                          stroke="#cbd5e1" strokeWidth="0.5"
                        />
                      ))}
                      <polygon 
                        points={radarData.map((d, i) => {
                          const angle = i * 72;
                          const r = d.val * 4.5;
                          const x = 50 + r * Math.cos(angle * Math.PI / 180);
                          const y = 50 + r * Math.sin(angle * Math.PI / 180);
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="rgba(255, 107, 0, 0.4)"
                        stroke="#FF6B00"
                        strokeWidth="3"
                      />
                   </svg>
                   {radarData.map((d, i) => {
                      const angle = i * 72;
                      const x = 50 + 48 * Math.cos(angle * Math.PI / 180);
                      const y = 50 + 48 * Math.sin(angle * Math.PI / 180);
                      return (
                        <div key={i} className="absolute font-black text-[10px] md:text-[12px] uppercase text-[#001F3F] bg-white/80 px-1 rounded" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                          {d.label}
                        </div>
                      );
                   })}
                </div>
             </div>
             <div className="w-full md:w-1/2 space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-200 shadow-inner">
                   <h4 className="text-[11px] font-black text-slate-900 mb-3 uppercase tracking-widest">تقييم المدرب الحالي</h4>
                   <div className="flex gap-2 text-orange-400 mb-4">
                      {[1,2,3,4].map(s => <Star key={s} size={20} fill="currentColor"/>)}
                      <Star size={20} />
                   </div>
                   <p className="text-[12px] font-black text-slate-800 leading-relaxed italic">"لاعب ذو خصائص هجومية ممتازة، يتميز بسرعة البديهة في المساحات الضيقة، يحتاج لرفع منسوب الارتداد الدفاعي."</p>
                </div>
                <div className="bg-blue-900 text-white p-6 rounded-3xl shadow-lg border-b-4 border-black">
                   <p className="text-[10px] font-black uppercase opacity-60 mb-2">الحالة الجاهزية</p>
                   <div className="flex items-center gap-3">
                      <div className="h-4 flex-1 bg-white/20 rounded-full overflow-hidden">
                         <div className="h-full bg-orange-500 w-[85%]"></div>
                      </div>
                      <span className="font-black text-lg">85%</span>
                   </div>
                </div>
             </div>
          </div>

          {/* التحليل الذكي AI */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-[#001F3F] shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-24 h-24 bg-blue-50 -ml-12 -mt-12 rounded-full opacity-50"></div>
             <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-lg md:text-2xl font-black flex items-center gap-3 text-[#001F3F]">
                   <BrainCircuit className="text-blue-900" size={28}/> تقرير المحلل التكتيكي الذكي (AI Analysis)
                </h3>
                <button onClick={handleGenerateAiAnalysis} disabled={loadingAi} className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 active:scale-95 transition-all shadow-lg">
                   {loadingAi ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} تحديث التحليل الرقمي
                </button>
             </div>
             {aiAnalysis ? (
               <div className="text-sm md:text-md font-bold text-slate-900 leading-relaxed bg-blue-50 p-6 rounded-[2rem] border-r-8 border-blue-900 shadow-inner whitespace-pre-wrap">
                  {aiAnalysis}
               </div>
             ) : (
               <div className="text-center py-12 text-slate-900 font-black italic bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  يرجى النقر على "تحديث التحليل" لقراءة البيانات الرقمية للاعب وتوليد التقرير التكتيكي...
               </div>
             )}
          </div>

          {/* سجل المشاركات الميدانية */}
          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border-2 border-[#001F3F] shadow-sm overflow-hidden">
             <h3 className="text-lg md:text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
               <ClipboardList className="text-[#001F3F]" size={28}/> الأجندة الفنية وسجل المباريات
             </h3>
             <div className="overflow-x-auto -mx-6 md:mx-0">
               <table className="w-full text-right border-collapse min-w-[600px]">
                 <thead>
                    <tr className="bg-slate-100 border-y-2 border-[#001F3F] text-[11px] font-black uppercase text-slate-900">
                       <th className="p-4 border-l">المنافس / النوع</th>
                       <th className="p-4 border-l text-center">الدقائق</th>
                       <th className="p-4 border-l text-center">أهداف</th>
                       <th className="p-4 text-center">أسيست</th>
                    </tr>
                 </thead>
                 <tbody>
                    {matchStats.list.length > 0 ? matchStats.list.map((m, i) => (
                      <tr key={i} className="border-b border-slate-200 text-[12px] md:text-sm font-black hover:bg-slate-50 transition-colors">
                         <td className="p-4 border-l">
                            <div className="flex flex-col">
                               <span className="text-[#001F3F]">{m.opponent}</span>
                               <span className={`text-[9px] font-black px-2 py-0.5 rounded w-fit mt-1.5 border ${m.isOfficial ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>{m.type}</span>
                            </div>
                         </td>
                         <td className="p-4 border-l text-center font-bold text-[#001F3F]">{m.mins} دقيقة</td>
                         <td className="p-4 border-l text-center text-emerald-700">{m.goals || '-'}</td>
                         <td className="p-4 text-center text-blue-700">{m.assists || '-'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="p-16 text-center text-slate-300 font-black italic">لا توجد سجلات مشاركة فنية حالياً</td></tr>
                    )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* الشريط الجانبي - البيانات المالية والإدارية */}
        <div className="space-y-8">
          <div className="bg-[#001F3F] p-8 md:p-10 rounded-[3rem] border-4 border-black text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full -mr-16 -mt-16"></div>
             <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
                <ShieldCheck className="text-orange-500" size={24}/>
                <h3 className="text-sm md:text-lg font-black uppercase tracking-tighter">الحالة المالية والتعاقدية</h3>
             </div>
             <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                   <span className="text-slate-400 font-black text-xs">الرقم الوطني:</span>
                   <span className="font-black text-sm">{player.nationalId || '--- --- ---'}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                   <span className="text-slate-400 font-black text-xs">تاريخ الميلاد:</span>
                   <span className="font-black text-sm">{player.birthDate}</span>
                </div>
                
                {/* تفاصيل العقد المالي */}
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mt-8 space-y-4">
                   <p className="text-orange-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mb-4">
                      <CreditCard size={16}/> وضع التعاقد المالي الصريح
                   </p>
                   <div className="flex justify-between text-xs">
                      <span className="text-slate-400">بداية العقد:</span>
                      <span className="font-bold">{player.contractStart || 'غير محدد'}</span>
                   </div>
                   <div className="flex justify-between text-xs">
                      <span className="text-slate-400">نهاية العقد:</span>
                      <span className="font-bold">{player.contractEnd || 'غير محدد'}</span>
                   </div>
                   <div className="flex justify-between items-center pt-2 border-t border-white/10">
                      <span className="text-slate-400 text-[10px]">القيمة السنوية:</span>
                      <span className="font-black text-emerald-400 text-lg">{player.contractValue || '0.00 SP'}</span>
                   </div>
                </div>

                {/* الشهادات (للكوادر) */}
                {isStaff && (
                  <div className="bg-blue-600/20 p-6 rounded-3xl border border-blue-400/30 space-y-4">
                    <p className="text-blue-300 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <GraduationCap size={16}/> الشهادات والمؤهلات العلمية
                    </p>
                    <div className="flex flex-col gap-1">
                        <span className="text-slate-400 text-[9px] uppercase">الدرجة العلمية:</span>
                        <span className="font-bold text-xs">{player.academicDegree || 'شهادة ثانوية'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-slate-400 text-[9px] uppercase">شهادات التدريب:</span>
                        <span className="font-bold text-xs">{player.coachingCertificate || 'AFC-C License'}</span>
                    </div>
                  </div>
                )}

                {/* الحضور والالتزام الموثق */}
                <div className="bg-white/10 p-5 rounded-3xl mt-6 border border-white/5">
                   <span className="text-[10px] text-orange-500 font-black uppercase mb-3 block">مؤشر الانضباط الرقمي</span>
                   <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                         <p className="text-emerald-400 font-black text-lg">{attendanceData.present}</p>
                         <p className="text-slate-400 text-[9px] uppercase mt-1">حاضر</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                         <p className="text-yellow-400 font-black text-lg">{attendanceData.late}</p>
                         <p className="text-slate-400 text-[9px] uppercase mt-1">تأخير</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                         <p className="text-blue-400 font-black text-lg">{attendanceData.excused}</p>
                         <p className="text-slate-400 text-[9px] uppercase mt-1">عذر</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* سجل العقوبات والخصومات (مطلوب) */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-red-900 shadow-md">
             <h4 className="text-sm md:text-lg font-black text-red-700 mb-6 flex items-center gap-3">
                <Gavel className="text-red-700" size={24}/> سجل العقوبات والخصومات الإدارية
             </h4>
             <div className="p-5 bg-red-50 rounded-2xl border-r-4 border-red-700">
                <p className="text-[13px] font-black text-slate-900 leading-relaxed italic">
                   {player.penalties || "السجل نظيف إدارياً، لا توجد أي عقوبات أو إنذارات انضباطية مسجلة في ملف هذا اللاعب حتى الآن."}
                </p>
             </div>
          </div>

          {/* الملاحظات الإدارية (مطلوب) */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-[#001F3F] shadow-md">
             <h4 className="text-sm md:text-lg font-black text-[#001F3F] mb-6 flex items-center gap-3">
                <StickyNote className="text-blue-900" size={24}/> ملاحظات المكتب الإداري العامة
             </h4>
             <div className="p-5 bg-slate-50 rounded-2xl border-r-4 border-blue-900">
                <p className="text-[13px] font-black text-slate-900 leading-relaxed italic">
                   {player.notes || "لا توجد ملاحظات إدارية إضافية مسجلة في ملف اللاعب حالياً."}
                </p>
             </div>
          </div>

          {/* التاريخ الطبي */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-emerald-900 shadow-md">
             <h4 className="text-sm md:text-lg font-black text-emerald-800 mb-6 flex items-center gap-3">
                <HeartPulse className="text-emerald-600" size={24}/> التاريخ الطبي وسجل الإصابات
             </h4>
             <div className="p-5 bg-emerald-50 rounded-2xl border-r-4 border-emerald-600">
                <p className="text-[13px] font-black text-slate-900 leading-relaxed italic">
                   {player.medicalHistory || player.injuries || "لا يوجد سجل إصابات سابق أو عمليات جراحية موثقة في الملف الطبي للاعب."}
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerReport;
