
import React, { useMemo, useState, useEffect } from 'react';
import { 
  ChevronRight, Printer, Target, AlertTriangle, Clock, Calendar, 
  TrendingUp, Users, Shield, MapPin, Activity, Globe, Trophy, 
  CheckCircle, Award, GraduationCap, Home, StickyNote, CreditCard, BarChart3, PieChart,
  Hash, ClipboardList, User, Timer, FileText, Briefcase, Sparkles, Loader2, X, BrainCircuit,
  HeartPulse, ShieldAlert, Gavel, Smartphone, CalendarDays, Wallet, Zap, ShieldCheck,
  Medal, Swords, Star, UserPlus, Info, Phone, Fingerprint, Save, Edit3, ChevronDown
} from 'lucide-react';
import { AppState, Person, Match, AttendanceRecord, MatchEvent } from '../types';
import ClubLogo from './ClubLogo';
import { GoogleGenAI } from "@google/genai";
import { supabase } from '../App';

interface PlayerReportProps {
  state: AppState;
  player: Person | null;
  onBack: () => void;
}

const PlayerReport: React.FC<PlayerReportProps> = ({ state, player, onBack }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [monthlyNotes, setMonthlyNotes] = useState<{ [key: string]: string }>(player?.monthlyReports || {});
  
  // نظام اختيار الشهر المتطور
  const months = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "تشرين الثاني"];
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonthIndex]);

  if (!player || !state.currentUser) return null;

  const isStaff = player.role !== 'لاعب';
  const isViewer = state.currentUser.role === 'مشاهد';

  // --- حساب إحصائيات المشاركة الرسمية والودية بدقة ---
  const matchStats = useMemo(() => {
    if (isStaff) return { officialMins: 0, friendlyMins: 0, goals: 0, assists: 0, yellows: 0, reds: 0, list: [] };

    let officialMins = 0;
    let friendlyMins = 0;
    let totalYellows = 0;
    let totalReds = 0;
    
    const statsList = state.matches
      .filter(m => m.isCompleted)
      .sort((a, b) => b.date.localeCompare(a.date))
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

        const goals = m.events ? m.events.filter(e => e.type === 'goal' && (e.player === player.id || e.player === player.name)).length : 0;
        const assists = m.events ? m.events.filter(e => e.type === 'assist' && (e.player === player.id || e.player === player.name)).length : 0;
        const matchYellows = m.events ? m.events.filter(e => e.type === 'yellow' && (e.player === player.id || e.player === player.name)).length : 0;
        const matchReds = m.events ? m.events.filter(e => e.type === 'red' && (e.player === player.id || e.player === player.name)).length : 0;

        totalYellows += matchYellows;
        totalReds += matchReds;

        return { 
          opponent: m.opponent, 
          date: m.date, 
          type: m.matchType,
          isOfficial,
          mins, 
          goals, 
          assists,
          yellows: matchYellows,
          reds: matchReds,
          played: !!(starter || sub) 
        };
      })
      .filter(s => s.played);

    return {
      officialMins,
      friendlyMins,
      goals: statsList.reduce((a, b) => a + b.goals, 0),
      assists: statsList.reduce((a, b) => a + b.assists, 0),
      yellows: totalYellows,
      reds: totalReds,
      list: statsList
    };
  }, [state.matches, player, isStaff]);

  // --- حساب الالتزام من التمارين ---
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

  const handleSaveMonthlyReport = async (monthKey: string) => {
    if (isViewer) return;
    setIsSavingReport(true);
    try {
      const updatedReports = { ...monthlyNotes };
      const { error } = await supabase
        .from('people')
        .update({ monthlyReports: updatedReports })
        .eq('id', player.id);

      if (error) throw error;
      alert(`تم حفظ تقرير شهر ${monthKey} بنجاح.`);
    } catch (err: any) {
      alert("خطأ في الحفظ: " + err.message);
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleGenerateAiAnalysis = async () => {
    setLoadingAi(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `أنت محلل تقني لنادي الكرامة السوري. حلل بيانات اللاعب ${player.name}: دقائق رسمية(${matchStats.officialMins}), ودية(${matchStats.friendlyMins}), أهداف(${matchStats.goals}), بطاقات صفراء(${matchStats.yellows}), بطاقات حمراء(${matchStats.reds}), التزام(${attendanceData.rate}%). قدم تقريراً مختصراً واحترافياً يوضح نقاط القوة والضعف والإنتاجية التهديفية والانضباط السلوكي.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiAnalysis(response.text || "فشل توليد التحليل.");
    } catch (error: any) {
      setAiAnalysis("خطأ في الاتصال بخادم الذكاء الاصطناعي.");
    } finally {
      setLoadingAi(false);
    }
  };

  const labelStyle = "text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1 block";
  const valueStyle = "text-sm font-bold text-[#001F3F] bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm";

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500 pb-24 px-2 md:px-0 text-right font-['Tajawal']" dir="rtl">
      
      <div className="flex flex-row justify-between items-center no-print gap-3 text-right">
        <button onClick={onBack} className="flex items-center gap-2 text-[#001F3F] font-black bg-white border-2 border-[#001F3F] px-6 py-3 rounded-2xl text-sm shadow-md active:scale-95 transition-all">
          <ChevronRight size={20} /> رجوع للمديرية
        </button>
        <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl border-b-4 border-black hover:bg-black transition-all">
          <Printer size={20} /> تصدير التقرير الشامل
        </button>
      </div>

      <div className="solid-panel overflow-hidden relative !shadow-none md:!shadow-[10px_10px_0px_0px_#001F3F] border-4 border-[#001F3F] text-right">
        <div className="bg-[#001F3F] h-28 md:h-40 relative">
          <div className="absolute -bottom-14 right-8 md:right-16 flex items-end gap-6 md:gap-10">
            <div className="w-28 h-28 md:w-48 md:h-48 bg-white rounded-3xl md:rounded-[3rem] border-[6px] md:border-[10px] border-white flex items-center justify-center font-black text-5xl md:text-8xl text-[#001F3F] uppercase shadow-2xl relative z-10">
               {player.name.charAt(0)}
               <div className="absolute -top-4 -left-4 bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl border-4 border-white">
                  #{player.number || '0'}
               </div>
            </div>
            <div className="mb-4 text-right">
              <h1 className="text-2xl md:text-5xl font-black text-white drop-shadow-lg tracking-tight leading-tight">{player.name}</h1>
              <div className="flex gap-3 mt-2 justify-end">
                 <span className="bg-orange-600 text-white text-[10px] md:text-[12px] font-black px-4 md:px-6 py-1.5 rounded-xl border-2 border-white uppercase shadow-lg">{player.role}</span>
                 <span className="bg-blue-600 text-white text-[10px] md:text-[12px] font-black px-4 md:px-6 py-1.5 rounded-xl border-2 border-white uppercase shadow-lg">{player.category}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-16 md:h-24"></div>
        
        {/* ملخص الأداء السريع المتطور */}
        <div className="px-6 md:px-16 pb-10 grid grid-cols-2 md:grid-cols-7 gap-3 md:gap-4 text-right">
           <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center shadow-sm">
             <Medal className="text-[#001F3F] mb-1" size={18}/>
             <span className="text-[8px] font-black text-slate-900 uppercase">دقائق رسمية</span>
             <p className="text-lg md:text-xl font-black text-[#001F3F]">{matchStats.officialMins}</p>
           </div>
           <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center shadow-sm">
             <Activity className="text-blue-600 mb-1" size={18}/>
             <span className="text-[8px] font-black text-slate-900 uppercase">دقائق ودية</span>
             <p className="text-lg md:text-xl font-black text-blue-800">{matchStats.friendlyMins}</p>
           </div>
           <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center shadow-sm">
             <Trophy className="text-emerald-600 mb-1" size={18}/>
             <span className="text-[8px] font-black text-slate-900 uppercase">الأهداف</span>
             <p className="text-lg md:text-xl font-black text-emerald-700">{matchStats.goals}</p>
           </div>
           <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center shadow-sm">
             <Zap className="text-blue-600 mb-1" size={18}/>
             <span className="text-[8px] font-black text-slate-900 uppercase">أسيست</span>
             <p className="text-lg md:text-xl font-black text-blue-700">{matchStats.assists}</p>
           </div>
           <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center shadow-sm">
             <div className="w-2.5 h-4 bg-yellow-400 rounded-sm mb-1 shadow-sm"></div>
             <span className="text-[8px] font-black text-slate-900 uppercase">إنذارات</span>
             <p className="text-lg md:text-xl font-black text-yellow-600">{matchStats.yellows}</p>
           </div>
           <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border-2 border-[#001F3F] flex flex-col items-center shadow-sm">
             <div className="w-2.5 h-4 bg-red-600 rounded-sm mb-1 shadow-sm"></div>
             <span className="text-[8px] font-black text-slate-900 uppercase">طرد</span>
             <p className="text-lg md:text-xl font-black text-red-600">{matchStats.reds}</p>
           </div>
           <div className="bg-emerald-50 p-3 md:p-4 rounded-2xl border-2 border-emerald-600 flex flex-col items-center shadow-sm col-span-2 md:col-span-1">
             <TrendingUp className="text-emerald-600 mb-1" size={18}/>
             <span className="text-[8px] font-black text-emerald-900 uppercase">الالتزام</span>
             <p className="text-lg md:text-xl font-black text-emerald-700">%{attendanceData.rate}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 text-right">
        <div className="lg:col-span-2 space-y-8 md:space-y-10">
          
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-[#001F3F] shadow-md text-right">
             <h3 className="text-lg md:text-2xl font-black text-[#001F3F] mb-8 flex items-center gap-3 border-r-4 border-orange-600 pr-4 justify-end">
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
                   <div className={valueStyle}>{player.birthPlace || 'حمص'} / {player.birthDate}</div>
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
          </div>

          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-[#001F3F] shadow-sm relative overflow-hidden text-right">
             <div className="flex justify-between items-center mb-8 relative z-10">
                <h3 className="text-lg md:text-2xl font-black flex items-center gap-3 text-[#001F3F] justify-end">
                   <BrainCircuit className="text-blue-900" size={28}/> تقرير المحلل التكتيكي الذكي (AI Analysis)
                </h3>
                <button onClick={handleGenerateAiAnalysis} disabled={loadingAi} className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 active:scale-95 transition-all shadow-lg">
                   {loadingAi ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>} تحديث التحليل
                </button>
             </div>
             {aiAnalysis ? (
               <div className="text-sm md:text-md font-bold text-slate-900 leading-relaxed bg-blue-50 p-6 rounded-[2rem] border-r-8 border-blue-900 shadow-inner whitespace-pre-wrap text-right">
                  {aiAnalysis}
               </div>
             ) : (
               <div className="text-center py-12 text-slate-900 font-black italic bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                  انقر على التحديث لتوليد التقرير التكتيكي بناءً على إحصائيات المباريات والأهداف والبطاقات المسجلة حالياً..
               </div>
             )}
          </div>

          {/* التقرير الفني الشهري المستمر - قائمة منسدلة ذكية */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-blue-900 shadow-sm no-print text-right">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-r-4 border-blue-600 pr-4">
                <h3 className="text-lg md:text-2xl font-black text-[#001F3F] flex items-center gap-3 justify-end">
                   <CalendarDays className="text-blue-700" size={28}/> التقرير الفني الشهري المستمر
                </h3>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                   <div className="relative flex-1 md:w-48">
                      <select 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full bg-slate-100 border-2 border-blue-900 rounded-xl py-2 px-4 font-black text-sm text-blue-900 outline-none appearance-none cursor-pointer text-right"
                      >
                         {months.map((m, idx) => (
                            <option key={m} value={m} disabled={idx > currentMonthIndex}>
                               {m} {idx > currentMonthIndex ? '(لم يفتح بعد)' : ''}
                            </option>
                         ))}
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-900 pointer-events-none" size={16}/>
                   </div>
                   {!isViewer && (
                      <button 
                        onClick={() => handleSaveMonthlyReport(selectedMonth)} 
                        disabled={isSavingReport}
                        className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] flex items-center gap-2 hover:bg-emerald-700 shadow-md transition-all"
                      >
                         {isSavingReport ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} حفظ التقرير
                      </button>
                   )}
                </div>
             </div>

             <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 text-right">
                <label className="text-[10px] font-black text-blue-900 mb-2 block uppercase tracking-widest text-right">محتوى تقرير شهر {selectedMonth}</label>
                <textarea 
                   className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-800 h-40 resize-none outline-none focus:border-blue-600 transition-all shadow-inner text-right"
                   placeholder={`اكتب ملخص الأداء والتحليل الفني لشهر ${selectedMonth}...`}
                   value={monthlyNotes[selectedMonth] || ''}
                   onChange={(e) => setMonthlyNotes({ ...monthlyNotes, [selectedMonth]: e.target.value })}
                   readOnly={isViewer}
                ></textarea>
                <p className="mt-3 text-[9px] font-black text-slate-400 italic flex items-center gap-1 justify-end">
                   <Info size={10}/> التقرير الشهري هو وثيقة أساسية لتقييم تطور اللاعب المستمر.
                </p>
             </div>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border-2 border-[#001F3F] shadow-sm overflow-hidden text-right">
             <h3 className="text-lg md:text-2xl font-black text-slate-900 mb-8 flex items-center gap-3 justify-end">
               <ClipboardList className="text-[#001F3F]" size={28}/> الأجندة الفنية وسجل المباريات المكتملة
             </h3>
             <div className="overflow-x-auto -mx-6 md:mx-0">
               <table className="w-full text-right border-collapse min-w-[600px]">
                 <thead>
                    <tr className="bg-slate-100 border-y-2 border-[#001F3F] text-[11px] font-black uppercase text-slate-900">
                       <th className="p-4 border-l">المنافس / النوع</th>
                       <th className="p-4 border-l text-center">الدقائق</th>
                       <th className="p-4 border-l text-center">أهداف</th>
                       <th className="p-4 border-l text-center">أحداث</th>
                       <th className="p-4 text-center">التاريخ</th>
                    </tr>
                 </thead>
                 <tbody>
                    {matchStats.list.length > 0 ? matchStats.list.map((m, i) => (
                      <tr key={i} className="border-b border-slate-200 text-[12px] md:text-sm font-black hover:bg-slate-50 transition-colors">
                         <td className="p-4 border-l">
                            <div className="flex flex-col text-right">
                               <span className="text-[#001F3F] font-bold">{m.opponent}</span>
                               <span className={`text-[9px] font-black px-2 py-0.5 rounded w-fit mt-1.5 border self-end ${m.isOfficial ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>{m.type}</span>
                            </div>
                         </td>
                         <td className="p-4 border-l text-center font-bold text-[#001F3F] tabular-nums">{m.mins} د</td>
                         <td className="p-4 border-l text-center text-emerald-700 font-bold">{m.goals || '-'}</td>
                         <td className="p-4 border-l text-center">
                            <div className="flex justify-center gap-1.5">
                               {m.yellows > 0 && <div className="w-2.5 h-4 bg-yellow-400 rounded-sm shadow-sm" title="إنذار"></div>}
                               {m.reds > 0 && <div className="w-2.5 h-4 bg-red-600 rounded-sm shadow-sm" title="طرد"></div>}
                               {!m.yellows && !m.reds && <span className="text-slate-200">-</span>}
                            </div>
                         </td>
                         <td className="p-4 text-center text-slate-400 text-[10px] tabular-nums">{m.date}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="p-16 text-center text-slate-300 font-black italic">لا توجد سجلات مشاركة فنية حالياً لهذا اللاعب.</td></tr>
                    )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        <div className="space-y-8 text-right">
          <div className="bg-[#001F3F] p-8 md:p-10 rounded-[3rem] border-4 border-black text-white shadow-2xl relative overflow-hidden text-right">
             <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4 justify-end">
                <ShieldCheck className="text-orange-500" size={24}/>
                <h3 className="text-sm md:text-lg font-black uppercase tracking-tighter">الوضعية التعاقدية والمالية</h3>
             </div>
             <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                   <span className="text-slate-400 font-black text-xs">تاريخ الميلاد:</span>
                   <span className="font-black text-sm">{player.birthDate}</span>
                </div>
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 mt-8 space-y-4">
                   <p className="text-orange-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mb-4 justify-end">
                      <CreditCard size={16}/> وضع التعاقد المالي
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
             </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-red-900 shadow-md text-right">
             <h4 className="text-sm md:text-lg font-black text-red-700 mb-6 flex items-center gap-3 justify-end">
                <Gavel className="text-red-700" size={24}/> سجل العقوبات والانضباط (Disciplinary)
             </h4>
             <div className="p-5 bg-red-50 rounded-2xl border-r-4 border-red-700 text-right">
                <p className="text-[13px] font-black text-slate-900 leading-relaxed italic">
                   {player.penalties || "السجل نظيف إدارياً، لا توجد أي عقوبات مسجلة لهذا اللاعب."}
                </p>
             </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-slate-900 shadow-md text-right">
             <h4 className="text-sm md:text-lg font-black text-[#001F3F] mb-6 flex items-center gap-3 justify-end">
                <StickyNote className="text-blue-900" size={24}/> ملاحظات إدارية عامة (Admin Notes)
             </h4>
             <div className="p-5 bg-slate-50 rounded-2xl border-r-4 border-blue-900 text-right">
                <p className="text-[13px] font-black text-slate-900 leading-relaxed italic">
                   {player.notes || "لا توجد ملاحظات إدارية إضافية مسجلة."}
                </p>
             </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-emerald-900 shadow-md text-right">
             <h4 className="text-sm md:text-lg font-black text-emerald-800 mb-6 flex items-center gap-3 justify-end">
                <HeartPulse className="text-emerald-600" size={24}/> السجل الطبي الموثق
             </h4>
             <div className="p-5 bg-emerald-50 rounded-2xl border-r-4 border-emerald-600 text-right">
                <p className="text-[13px] font-black text-slate-900 leading-relaxed italic">
                   {player.medicalHistory || player.injuries || "لا يوجد سجل إصابات سابق موثق في أرشيف النادي."}
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerReport;
