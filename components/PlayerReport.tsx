
import React, { useMemo, useState } from 'react';
import { 
  ChevronRight, Printer, Target, Calendar, 
  TrendingUp, Activity, Trophy, 
  CheckCircle, Hash, User, Timer, StickyNote, 
  HeartPulse, ShieldAlert, Gavel, Wallet, 
  Phone, Fingerprint, Ruler, Weight, BadgeCheck, MapPin, 
  Globe, BarChart, Users, Star, AlertCircle, FileText,
  Loader2, GraduationCap, Award, Home, Info, Zap, Medal,
  // Fix: Added missing Save icon import from lucide-react
  Save
} from 'lucide-react';
import { AppState, Person, Match } from '../types';
import { supabase } from '../App';
// Fix: Added missing ClubLogo import
import ClubLogo from './ClubLogo';

interface PlayerReportProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  player: Person | null;
  onBack: () => void;
}

const PlayerReport: React.FC<PlayerReportProps> = ({ state, setState, player, onBack }) => {
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [monthlyNotes, setMonthlyNotes] = useState<{ [key: string]: string }>(player?.monthlyReports || {});
  
  const months = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonthIndex]);

  if (!player || !state.currentUser) return null;

  const isViewer = state.currentUser.role === 'مشاهد';

  // --- حساب الإحصائيات الفنية من سجل المباريات ---
  const stats = useMemo(() => {
    let totalMins = 0;
    let goals = 0;
    let assists = 0;
    let yellows = 0;
    let reds = 0;
    let appearances = 0;
    const matchHistory: any[] = [];

    state.matches.filter(m => m.isCompleted).forEach(m => {
      const starter = m.lineup.starters.find(s => s.playerId === player.id);
      const sub = m.lineup.subs.find(s => s.playerId === player.id);
      
      if (starter || sub) {
        appearances++;
        const mins = parseInt(starter?.minutesPlayed || sub?.minutesPlayed || '0');
        totalMins += mins;

        const playerGoals = m.events.filter(e => e.type === 'goal' && e.player === player.id).length;
        const playerAssists = m.events.filter(e => e.type === 'assist' && e.player === player.id).length;
        const playerYellows = m.events.filter(e => e.type === 'yellow' && e.player === player.id).length;
        const playerReds = m.events.filter(e => e.type === 'red' && e.player === player.id).length;

        goals += playerGoals;
        assists += playerAssists;
        yellows += playerYellows;
        reds += playerReds;

        matchHistory.push({
          opponent: m.opponent,
          date: m.date,
          mins,
          goals: playerGoals,
          assists: playerAssists,
          cards: { y: playerYellows, r: playerReds },
          score: `${m.ourScore}-${m.opponentScore}`
        });
      }
    });

    return { totalMins, goals, assists, yellows, reds, appearances, matchHistory };
  }, [state.matches, player.id]);

  // --- حساب إحصائيات الحضور ---
  const attendanceStats = useMemo(() => {
    const catSessions = state.sessions.filter(s => s.category === player.category && s.isCompleted);
    const records = state.attendance.filter(a => a.personId === player.id);
    
    const present = records.filter(r => r.status === 'حاضر').length;
    const late = records.filter(r => r.status === 'متأخر').length;
    const absent = records.filter(r => r.status === 'غائب').length;
    const excused = records.filter(r => r.status === 'غياب بعذر').length;
    
    const score = catSessions.length > 0 ? ((present + (late * 0.7)) / catSessions.length) * 100 : 0;
    const rate = Math.min(100, Math.round(score));

    return { rate, present, late, absent, excused, total: catSessions.length };
  }, [state.sessions, state.attendance, player.id, player.category]);

  const handleSaveMonthlyReport = async () => {
    setIsSavingReport(true);
    try {
      const updatedReports = { ...monthlyNotes };
      const { error } = await supabase.from('people').update({ monthlyReports: updatedReports }).eq('id', player.id);
      if (error) throw error;
      setState(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === player.id ? { ...p, monthlyReports: updatedReports } : p)
      }));
      alert('تم تحديث التقرير بنجاح');
    } catch (err: any) { alert(err.message); } finally { setIsSavingReport(false); }
  };

  const InfoBlock = ({ icon: Icon, label, value, color = "text-white" }: any) => (
    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-1 hover:bg-white/10 transition-all group">
      <div className="flex items-center gap-2 text-slate-500 group-hover:text-orange-500">
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-sm font-black ${color} truncate`}>{value || '---'}</span>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 no-print" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0f172a] p-6 rounded-[2.5rem] border-2 border-slate-900 shadow-xl">
        <button onClick={onBack} className="bg-white/5 hover:bg-orange-500 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-3">
          <ChevronRight size={20} /> العودة للفريق
        </button>
        <div className="flex items-center gap-4">
           {/* Fix: ClubLogo is now imported and available */}
           <ClubLogo size={50} />
           <div className="text-right">
              <h1 className="text-xl font-black text-white">الملف الفني الشامل</h1>
              <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">Digital Technical Passport</p>
           </div>
        </div>
        <button onClick={() => window.print()} className="bg-white text-slate-950 px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl hover:bg-orange-600 hover:text-white transition-all">
          <Printer size={18} /> طباعة السجل
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar - Personal Info */}
        <div className="lg:col-span-4 space-y-6">
           <div className="modern-card p-8 text-center border-b-8 border-orange-500">
              <div className="w-32 h-32 bg-slate-800 rounded-full mx-auto flex items-center justify-center font-black text-5xl text-white mb-6 border-4 border-white/10 shadow-2xl relative">
                 {player.name.charAt(0)}
                 <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-xl border-4 border-[#0f172a]">#{player.number || '0'}</div>
              </div>
              <h2 className="text-2xl font-black text-white">{player.name}</h2>
              <p className="text-orange-500 font-bold mt-2 tracking-widest">{player.role} | {player.category}</p>
           </div>

           <div className="modern-card p-6 space-y-4">
              <h3 className="text-xs font-black text-orange-500 border-r-4 border-orange-500 pr-3 mb-6 flex items-center gap-2"><Fingerprint size={16}/> البيانات الشخصية والهوية</h3>
              <div className="grid grid-cols-1 gap-3">
                 <InfoBlock icon={User} label="اسم الأب" value={player.fatherName} />
                 <InfoBlock icon={User} label="اسم الأم" value={player.motherName} />
                 <InfoBlock icon={Calendar} label="تاريخ الميلاد" value={player.birthDate} />
                 <InfoBlock icon={MapPin} label="مكان الولادة" value={player.birthPlace} />
                 <InfoBlock icon={Fingerprint} label="القيد (الخانة)" value={player.khana} />
                 <InfoBlock icon={BadgeCheck} label="الرقم الوطني" value={player.nationalId} />
                 <InfoBlock icon={Hash} label="الرقم الاتحادي" value={player.federalNumber} />
                 <InfoBlock icon={Globe} label="الرقم الدولي" value={player.internationalId} />
                 <InfoBlock icon={Phone} label="رقم التواصل" value={player.phone} />
                 <InfoBlock icon={Home} label="عنوان السكن" value={player.address} />
              </div>
           </div>

           <div className="modern-card p-6 space-y-4">
              <h3 className="text-xs font-black text-blue-400 border-r-4 border-blue-400 pr-3 mb-6 flex items-center gap-2"><GraduationCap size={16}/> المؤهلات والشهادات</h3>
              <div className="grid grid-cols-1 gap-3">
                 <InfoBlock icon={GraduationCap} label="التحصيل العلمي" value={player.academicDegree} />
                 <InfoBlock icon={Award} label="الشهادات الفنية" value={player.coachingCertificate} />
              </div>
           </div>
        </div>

        {/* Main Stats Area */}
        <div className="lg:col-span-8 space-y-8">
           {/* Technical Dashboard */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="modern-card p-6 border-t-4 border-emerald-500 text-center">
                 <p className="text-[9px] font-black text-slate-500 mb-1">نسبة الالتزام</p>
                 <p className="text-3xl font-black text-emerald-500 tabular-nums">%{attendanceStats.rate}</p>
                 <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${attendanceStats.rate}%` }}></div>
                 </div>
              </div>
              <div className="modern-card p-6 border-t-4 border-orange-500 text-center">
                 <p className="text-[9px] font-black text-slate-500 mb-1">إجمالي الأهداف</p>
                 <p className="text-3xl font-black text-white tabular-nums">{stats.goals}</p>
                 <Zap size={14} className="text-orange-500 mx-auto mt-2" />
              </div>
              <div className="modern-card p-6 border-t-4 border-blue-500 text-center">
                 <p className="text-[9px] font-black text-slate-500 mb-1">تمريرات حاسمة</p>
                 <p className="text-3xl font-black text-white tabular-nums">{stats.assists}</p>
                 <TrendingUp size={14} className="text-blue-500 mx-auto mt-2" />
              </div>
              <div className="modern-card p-6 border-t-4 border-purple-500 text-center">
                 <p className="text-[9px] font-black text-slate-500 mb-1">دقائق اللعب</p>
                 <p className="text-3xl font-black text-white tabular-nums">{stats.totalMins}</p>
                 <Timer size={14} className="text-purple-500 mx-auto mt-2" />
              </div>
           </div>

           {/* Match Participation History */}
           <div className="modern-card p-8 border-r-8 border-orange-600 overflow-hidden">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                 <Trophy size={24} className="text-orange-600" /> سجل المشاركة في المباريات (الموسم الحالي)
              </h3>
              <div className="overflow-x-auto">
                 <table className="w-full text-right">
                    <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest">
                       <tr>
                          <th className="p-4 border-b border-white/10">المنافس</th>
                          <th className="p-4 border-b border-white/10 text-center">النتيجة</th>
                          <th className="p-4 border-b border-white/10 text-center">الدقائق</th>
                          <th className="p-4 border-b border-white/10 text-center text-emerald-500">⚽</th>
                          <th className="p-4 border-b border-white/10 text-center text-blue-500">👟</th>
                          <th className="p-4 border-b border-white/10 text-center">🟨/🟥</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-bold text-xs">
                       {stats.matchHistory.map((m, i) => (
                          <tr key={i} className="hover:bg-white/5">
                             <td className="p-4">
                                <p>{m.opponent}</p>
                                <p className="text-[9px] text-slate-500">{m.date}</p>
                             </td>
                             <td className="p-4 text-center tabular-nums">{m.score}</td>
                             <td className="p-4 text-center tabular-nums">{m.mins} د</td>
                             <td className="p-4 text-center text-emerald-500 tabular-nums">{m.goals || '-'}</td>
                             <td className="p-4 text-center text-blue-500 tabular-nums">{m.assists || '-'}</td>
                             <td className="p-4 text-center tabular-nums">
                                <span className="text-yellow-400">{m.cards.y}</span>/<span className="text-red-600">{m.cards.r}</span>
                             </td>
                          </tr>
                       ))}
                       {stats.matchHistory.length === 0 && (
                         <tr><td colSpan={6} className="p-8 text-center text-slate-500 italic">لم يتم تسجيل مشاركات في مباريات رسمية بعد.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           {/* Financial & Contracts */}
           <div className="modern-card p-8 border-r-8 border-yellow-500">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                 <Wallet size={24} className="text-yellow-500" /> الحالة التعاقدية والمالية
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <InfoBlock icon={Wallet} label="القيمة المالية" value={player.contractValue} color="text-emerald-400" />
                 <InfoBlock icon={Calendar} label="بداية التعاقد" value={player.contractStart} />
                 <InfoBlock icon={Calendar} label="نهاية التعاقد" value={player.contractEnd} color="text-red-400" />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="modern-card p-8 border-r-8 border-red-500">
                 <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                    <HeartPulse size={24} className="text-red-500" /> السجل الطبي والبدني
                 </h3>
                 <div className="space-y-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                       <p className="text-[9px] font-black text-slate-500 uppercase">السوابق الطبية</p>
                       <p className="text-sm font-bold text-slate-200">{player.medicalHistory || 'سليم طبياً'}</p>
                    </div>
                    <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/10">
                       <p className="text-[9px] font-black text-orange-500 uppercase">سجل الإصابات الرياضية</p>
                       <p className="text-sm font-bold text-orange-100">{player.injuries || 'لا توجد إصابات مسجلة'}</p>
                    </div>
                    <div className="flex gap-4">
                       <div className="flex-1 bg-white/5 p-4 rounded-xl text-center">
                          <p className="text-[9px] font-black text-slate-500 uppercase">الطول</p>
                          <p className="text-lg font-black">{player.height || '---'} سم</p>
                       </div>
                       <div className="flex-1 bg-white/5 p-4 rounded-xl text-center">
                          <p className="text-[9px] font-black text-slate-500 uppercase">الوزن</p>
                          <p className="text-lg font-black">{player.weight || '---'} كغ</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="modern-card p-8 border-r-8 border-orange-600">
                 <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                    <ShieldAlert size={24} className="text-orange-600" /> الانضباط والعقوبات
                 </h3>
                 <div className="space-y-4">
                    <div className="bg-red-600/10 p-4 rounded-xl border border-red-600/20">
                       <p className="text-[9px] font-black text-red-600 uppercase">سجل العقوبات الإدارية</p>
                       <p className="text-sm font-bold text-red-100">{player.penalties || 'سجل نظيف'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/5 p-4 rounded-xl text-center">
                          <p className="text-[9px] font-black text-yellow-500 uppercase">إنذارات</p>
                          <p className="text-lg font-black text-yellow-500">{stats.yellows}</p>
                       </div>
                       <div className="bg-white/5 p-4 rounded-xl text-center">
                          <p className="text-[9px] font-black text-red-600 uppercase">طرد</p>
                          <p className="text-lg font-black text-red-600">{stats.reds}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Monthly Report Section */}
           <div className="modern-card p-8 border-t-8 border-blue-600">
              <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                 <StickyNote size={24} className="text-blue-600" /> التقرير الفني الشهري ({selectedMonth})
              </h3>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 custom-scrollbar no-print">
                 {months.map(m => (
                    <button key={m} onClick={() => setSelectedMonth(m)} className={`px-4 py-2 rounded-xl text-[9px] font-black whitespace-nowrap transition-all border-2 ${selectedMonth === m ? 'bg-blue-600 border-blue-900 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                       {m}
                    </button>
                 ))}
              </div>
              <textarea 
                 className="w-full bg-slate-900 border border-white/10 rounded-2xl p-6 text-sm text-slate-200 h-48 resize-none outline-none focus:border-blue-600 transition-all shadow-inner"
                 placeholder="اكتب التقييم الفني لهذا الشهر..."
                 value={monthlyNotes[selectedMonth] || ""}
                 onChange={e => setMonthlyNotes({...monthlyNotes, [selectedMonth]: e.target.value})}
                 readOnly={isViewer}
              ></textarea>
              {!isViewer && (
                <button onClick={handleSaveMonthlyReport} disabled={isSavingReport} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition-all">
                   {/* Fix: Added missing Save icon from lucide-react */}
                  {isSavingReport ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} تثبيت تقرير شهر {selectedMonth}
                </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerReport;
