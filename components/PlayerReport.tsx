
import React, { useMemo, useState, useEffect } from 'react';
import { 
  ChevronRight, Printer, Target, AlertTriangle, Clock, Calendar, 
  TrendingUp, Users, Shield, MapPin, Activity, Globe, Trophy, 
  CheckCircle, Award, GraduationCap, Home, StickyNote, CreditCard, BarChart3, PieChart,
  Hash, ClipboardList, User, Timer, FileText, Briefcase, Sparkles, Loader2, X, BrainCircuit,
  HeartPulse, ShieldAlert, Gavel, Smartphone, CalendarDays, Wallet, Zap, ShieldCheck,
  Medal, Swords, Star, UserPlus, Info, Phone, Fingerprint, Save, Edit3, ChevronDown,
  Map as MapIcon, BookOpen, School, BadgeCheck
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
  
  const months = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonthIndex]);

  if (!player || !state.currentUser) return null;

  const isStaff = player.role !== 'لاعب';
  const isViewer = state.currentUser.role === 'مشاهد';

  const matchStats = useMemo(() => {
    if (isStaff) return { totalMins: 0, goals: 0, assists: 0, yellows: 0, reds: 0, list: [] };
    let totalMins = 0;
    let totalGoals = 0;
    let totalAssists = 0;
    let totalYellows = 0;
    let totalReds = 0;
    const statsList = state.matches.filter(m => m.isCompleted).sort((a, b) => b.date.localeCompare(a.date)).map(m => {
        const starter = m.lineup.starters.find(s => s.playerId === player.id);
        const sub = m.lineup.subs.find(s => s.playerId === player.id);
        let mins = parseInt(starter?.minutesPlayed || sub?.minutesPlayed || '0') || 0;
        totalMins += mins;
        const goals = m.events ? m.events.filter(e => e.type === 'goal' && (e.player === player.id || e.player === player.name)).length : 0;
        const assists = m.events ? m.events.filter(e => e.type === 'assist' && (e.player === player.id || e.player === player.name)).length : 0;
        const matchYellows = m.events ? m.events.filter(e => e.type === 'yellow' && (e.player === player.id || e.player === player.name)).length : 0;
        const matchReds = m.events ? m.events.filter(e => e.type === 'red' && (e.player === player.id || e.player === player.name)).length : 0;
        totalGoals += goals; totalAssists += assists; totalYellows += matchYellows; totalReds += matchReds;
        return { opponent: m.opponent, date: m.date, mins, goals, assists, yellows: matchYellows, reds: matchReds, wasStarter: !!starter, played: !!(starter || sub) };
    }).filter(s => s.played);
    return { totalMins, goals: totalGoals, assists: totalAssists, yellows: totalYellows, reds: totalReds, list: statsList };
  }, [state.matches, player, isStaff]);

  const attendanceData = useMemo(() => {
    const sessions = state.sessions.filter(s => s.category === player.category);
    const records = state.attendance.filter(a => a.personId === player.id);
    const present = records.filter(r => r.status === 'حاضر').length;
    const rate = sessions.length > 0 ? Math.min(100, Math.round((present / sessions.length) * 100)) : 0;
    return { rate };
  }, [state.attendance, state.sessions, player]);

  const handleSaveMonthlyReport = async (monthKey: string) => {
    if (isViewer) return;
    setIsSavingReport(true);
    try {
      const { error } = await supabase.from('people').update({ monthlyReports: monthlyNotes }).eq('id', player.id);
      if (error) throw error;
      alert(`✅ تم تحديث التقرير بنجاح.`);
    } catch (err: any) { alert(err.message); } finally { setIsSavingReport(false); }
  };

  const DataRow = ({ icon: Icon, label, value, color = "text-slate-900" }: any) => (
    <div className="flex justify-between items-center py-5 border-b-2 border-slate-100 last:border-0 group">
      <div className="flex items-center gap-4">
        <Icon size={20} className="text-slate-900 drop-shadow-sm group-hover:text-orange-600" />
        <span className="text-xs font-black text-slate-500 uppercase tracking-tighter drop-shadow-sm">{label}</span>
      </div>
      <span className={`text-sm font-black ${color} tabular-nums drop-shadow-sm`}>{value || '---'}</span>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-12 animate-in fade-in duration-700 pb-24 px-2 md:px-0 text-right font-['Tajawal']" dir="rtl">
      <div className="flex flex-row justify-between items-center no-print gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-900 font-black bg-white border-4 border-slate-900 px-8 py-3.5 rounded-2xl text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
          <ChevronRight size={20} /> قائمة الفريق
        </button>
        <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-10 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-[6px_6px_0px_0px_rgba(255,107,0,1)] border-b-4 border-black hover:bg-black transition-all">
          <Printer size={20} /> طباعة السجل الكامل
        </button>
      </div>

      <div className="bg-white rounded-[4rem] overflow-hidden relative border-4 border-slate-900 shadow-[15px_15px_0px_0px_rgba(0,31,63,1)]">
        <div className="bg-[#001F3F] h-36 md:h-56 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
          <div className="absolute -bottom-20 right-10 md:right-24 flex items-end gap-8 md:gap-14">
            <div className="w-40 h-40 md:w-64 md:h-64 bg-white rounded-[3rem] md:rounded-[5rem] border-[10px] md:border-[16px] border-white flex items-center justify-center font-black text-7xl md:text-[10rem] text-[#001F3F] shadow-2xl relative z-10">
               {player.name.charAt(0)}
               <div className="absolute -top-8 -left-8 bg-orange-600 text-white w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center text-3xl md:text-5xl border-[8px] border-white shadow-2xl font-black drop-shadow-lg">
                  #{player.number || '0'}
               </div>
            </div>
            <div className="mb-12">
              <h1 className="text-4xl md:text-7xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] tracking-tight leading-none uppercase">{player.name}</h1>
              <div className="flex gap-4 mt-6">
                 <span className="bg-orange-600 text-white text-xs md:text-md font-black px-8 py-3 rounded-2xl border-2 border-white uppercase shadow-2xl drop-shadow-sm">{player.role}</span>
                 <span className="bg-blue-600 text-white text-xs md:text-md font-black px-8 py-3 rounded-2xl border-2 border-white uppercase shadow-2xl drop-shadow-sm">{player.category}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="h-28 md:h-44"></div>
        
        <div className="px-10 md:px-24 pb-16 grid grid-cols-2 md:grid-cols-7 gap-5 text-right">
           <div className="bg-slate-50 p-6 rounded-[2.5rem] border-4 border-slate-900 flex flex-col items-center shadow-md">
             <Timer className="text-[#001F3F] mb-3" size={36}/>
             <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter drop-shadow-sm">دقائق اللعب</span>
             <p className="text-3xl font-black text-[#001F3F] tabular-nums drop-shadow-sm">{matchStats.totalMins}</p>
           </div>
           <div className="bg-emerald-50 p-6 rounded-[2.5rem] border-4 border-emerald-700 flex flex-col items-center shadow-md">
             <Trophy className="text-emerald-700 mb-3" size={36}/>
             <span className="text-[11px] font-black text-emerald-900 uppercase tracking-tighter drop-shadow-sm">أهداف</span>
             <p className="text-3xl font-black text-emerald-800 tabular-nums drop-shadow-sm">{matchStats.goals}</p>
           </div>
           <div className="bg-blue-50 p-6 rounded-[2.5rem] border-4 border-blue-700 flex flex-col items-center shadow-md">
             <Zap className="text-blue-700 mb-3" size={36}/>
             <span className="text-[11px] font-black text-blue-900 uppercase tracking-tighter drop-shadow-sm">أسيست</span>
             <p className="text-3xl font-black text-blue-800 tabular-nums drop-shadow-sm">{matchStats.assists}</p>
           </div>
           <div className="bg-yellow-50 p-6 rounded-[2.5rem] border-4 border-yellow-600 flex flex-col items-center shadow-md">
             <div className="w-6 h-10 bg-yellow-400 rounded-lg mb-3 shadow-md border-2 border-yellow-700"></div>
             <span className="text-[11px] font-black text-yellow-900 uppercase tracking-tighter drop-shadow-sm">إنذارات</span>
             <p className="text-3xl font-black text-yellow-700 tabular-nums drop-shadow-sm">{matchStats.yellows}</p>
           </div>
           <div className="bg-red-50 p-6 rounded-[2.5rem] border-4 border-red-700 flex flex-col items-center shadow-md">
             <div className="w-6 h-10 bg-red-600 rounded-lg mb-3 shadow-md border-2 border-red-900"></div>
             <span className="text-[11px] font-black text-red-900 uppercase tracking-tighter drop-shadow-sm">طرد</span>
             <p className="text-3xl font-black text-red-700 tabular-nums drop-shadow-sm">{matchStats.reds}</p>
           </div>
           <div className="bg-orange-50 p-6 rounded-[2.5rem] border-4 border-orange-600 flex flex-col items-center shadow-md col-span-2 md:col-span-1">
             <TrendingUp className="text-orange-600 mb-3" size={36}/>
             <span className="text-[11px] font-black text-orange-900 uppercase tracking-tighter drop-shadow-sm">الالتزام</span>
             <p className="text-3xl font-black text-orange-700 drop-shadow-sm">%{attendanceData.rate}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-14">
        <div className="lg:col-span-1 space-y-10 md:space-y-14">
          <div className="bg-white p-12 rounded-[3.5rem] border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(0,31,63,1)]">
            <h3 className="text-md font-black text-slate-900 mb-10 flex items-center gap-4 border-r-8 border-orange-600 pr-4 uppercase drop-shadow-sm">
              <User size={28} className="text-orange-600" /> البيانات الشخصية الكاملة
            </h3>
            <div className="space-y-2">
              <DataRow icon={User} label="اسم الأب" value={player.fatherName} />
              <DataRow icon={User} label="اسم الأم" value={player.motherName} />
              <DataRow icon={Calendar} label="تاريخ الميلاد" value={player.birthDate} />
              <DataRow icon={MapPin} label="مكان الولادة" value={player.birthPlace} />
              <DataRow icon={Fingerprint} label="القيد (الخانة)" value={player.khana} />
              <DataRow icon={BadgeCheck} label="الرقم الوطني" value={player.nationalId} />
              <DataRow icon={Hash} label="الرقم الاتحادي" value={player.federalNumber} />
            </div>
          </div>

          <div className="bg-[#001F3F] p-12 rounded-[4.5rem] border-4 border-black text-white shadow-[12px_12px_0px_0px_rgba(255,107,0,1)] relative overflow-hidden">
             <h3 className="text-md font-black mb-10 flex items-center gap-4 border-r-8 border-orange-500 pr-4 uppercase drop-shadow-sm">
                <Briefcase size={28} className="text-orange-500" /> الوضعية التعاقدية والفنية
             </h3>
             <div className="space-y-2">
                <DataRow icon={CalendarDays} label="تاريخ الانضمام" value={player.joinDate} color="text-orange-400" />
                <DataRow icon={Wallet} label="قيمة العقد السنوية" value={player.contractValue} color="text-emerald-400" />
                <DataRow icon={Clock} label="نهاية العقد الحالي" value={player.contractEnd} color="text-white" />
                <DataRow icon={ShieldCheck} label="رقم القميص" value={`#${player.number}`} color="text-orange-500" />
             </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-10 md:space-y-14">
          <div className="bg-white p-12 rounded-[4rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(0,31,63,1)] overflow-hidden">
             <div className="flex justify-between items-center mb-10 border-r-8 border-orange-600 pr-6">
                <h3 className="text-2xl md:text-4xl font-black text-slate-900 flex items-center gap-4 drop-shadow-sm">
                   <ClipboardList className="text-blue-700" size={36}/> سجل المشاركة الفنية الحية
                </h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-right border-collapse min-w-[700px]">
                 <thead>
                    <tr className="bg-slate-100 border-y-4 border-slate-900 text-xs font-black uppercase text-slate-900">
                       <th className="p-6 border-l-2 border-slate-200">المنافس</th>
                       <th className="p-6 border-l-2 border-slate-200 text-center">الوضعية</th>
                       <th className="p-6 border-l-2 border-slate-200 text-center">الدقائق</th>
                       <th className="p-6 border-l-2 border-slate-200 text-center text-emerald-700">⚽</th>
                       <th className="p-6 border-l-2 border-slate-200 text-center text-blue-700">👟</th>
                       <th className="p-6 text-center">التاريخ</th>
                    </tr>
                 </thead>
                 <tbody>
                    {matchStats.list.length > 0 ? matchStats.list.map((m, i) => (
                      <tr key={i} className="border-b-4 border-slate-50 text-md font-black hover:bg-slate-50 transition-all">
                         <td className="p-6 border-l-2 border-slate-100 text-slate-900 drop-shadow-sm">الكرامة × {m.opponent}</td>
                         <td className="p-6 border-l-2 border-slate-100 text-center">
                            <span className={`text-[11px] px-4 py-2 rounded-xl font-black border-2 ${m.wasStarter ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>
                               {m.wasStarter ? 'أساسي' : 'بديل'}
                            </span>
                         </td>
                         <td className="p-6 border-l-2 border-slate-100 text-center text-slate-900 drop-shadow-sm">{m.mins} د</td>
                         <td className="p-6 border-l-2 border-slate-100 text-center text-emerald-700 drop-shadow-sm">{m.goals || '-'}</td>
                         <td className="p-6 border-l-2 border-slate-100 text-center text-blue-700 drop-shadow-sm">{m.assists || '-'}</td>
                         <td className="p-6 text-center text-slate-400 text-sm tabular-nums font-black">{m.date}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="p-24 text-center text-slate-300 font-black italic text-2xl">لا توجد مشاركات فنية مؤكدة حالياً.</td></tr>
                    )}
                 </tbody>
               </table>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div className="bg-white p-12 rounded-[4rem] border-4 border-red-700 shadow-[10px_10px_0px_0px_rgba(185,28,28,1)]">
                <h4 className="text-lg font-black text-red-700 mb-10 flex items-center gap-4 border-r-8 border-red-600 pr-4 uppercase drop-shadow-sm">
                  <HeartPulse size={28} className="text-red-600" /> الحالة الصحية والطبية الكاملة
                </h4>
                <div className="space-y-10">
                   <div>
                      <p className="text-[12px] font-black text-red-500 uppercase mb-4 flex items-center gap-2 drop-shadow-sm">
                        <ShieldAlert size={18}/> التاريخ الطبي والعمليات
                      </p>
                      <p className="text-[15px] font-black text-slate-900 leading-relaxed bg-red-50 p-8 rounded-[2.5rem] border-2 border-red-100 shadow-inner drop-shadow-sm">
                        {player.medicalHistory || "السجل الطبي نظيف تماماً."}
                      </p>
                   </div>
                   <div>
                      <p className="text-[12px] font-black text-orange-600 uppercase mb-4 flex items-center gap-2 drop-shadow-sm">
                        <Activity size={18}/> حالة الإصابات والجاهزية
                      </p>
                      <p className="text-[15px] font-black text-slate-900 leading-relaxed bg-orange-50 p-8 rounded-[2.5rem] border-2 border-orange-100 shadow-inner drop-shadow-sm">
                        {player.injuries || "اللاعب جاهز طبياً بنسبة 100%."}
                      </p>
                   </div>
                </div>
             </div>

             <div className="bg-red-50 p-12 rounded-[4rem] border-4 border-red-900 shadow-[12px_12px_0px_0px_rgba(127,29,29,1)]">
                <h4 className="text-lg font-black text-red-900 mb-10 flex items-center gap-4 border-r-8 border-red-700 pr-4 uppercase drop-shadow-sm">
                   <Gavel size={28} className="drop-shadow-sm" /> السجل الانضباطي والعقوبات
                </h4>
                <p className="text-[15px] font-black text-slate-900 leading-relaxed p-8 bg-white border-r-8 border-red-700 rounded-[2.5rem] shadow-md drop-shadow-sm min-h-[150px]">
                   {player.penalties || "السجل الانضباطي نظيف."}
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                   {matchStats.reds > 0 && <span className="bg-red-600 text-white text-xs font-black px-8 py-3 rounded-full border-4 border-red-900 shadow-xl">سجل طرد نشط</span>}
                   {matchStats.yellows >= 3 && <span className="bg-yellow-500 text-white text-xs font-black px-8 py-3 rounded-full border-4 border-yellow-700 shadow-xl">تراكم إنذارات</span>}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerReport;
