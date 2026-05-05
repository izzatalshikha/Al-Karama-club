
import React, { useMemo, useState } from 'react';
import { 
  ChevronRight, Printer, Target, Calendar, 
  TrendingUp, Activity, Trophy, 
  CheckCircle, Hash, User, Timer, StickyNote, 
  HeartPulse, ShieldAlert, Gavel, Wallet, 
  Phone, Fingerprint, Ruler, Weight, BadgeCheck, MapPin, 
  Globe, BarChart, Users, Star, AlertCircle, FileText,
  Loader2, GraduationCap, Award, Home, Info, Zap, Medal,
  Save, History, BookOpen, Briefcase, DollarSign, CalendarCheck, UserX, Clock, Map
} from 'lucide-react';
import { AppState, Person, Match } from '../types';
import { supabase } from '../App';
import ClubLogo from './ClubLogo';

interface PlayerReportProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  player: Person | null;
  onBack: () => void;
  addLog?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const PlayerReport: React.FC<PlayerReportProps> = ({ state, setState, player, onBack, addLog }) => {
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [monthlyNotes, setMonthlyNotes] = useState<{ [key: string]: string }>(player?.monthlyReports || {});
  
  const months = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(months[currentMonthIndex]);

  if (!player || !state.currentUser) return null;

  const isViewer = state.currentUser.role === 'مشاهد';

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

        const playerGoals = m.events.filter(e => e.type === 'goal' && (e.player === player.id || e.player === player.name)).length;
        const playerAssists = m.events.filter(e => e.type === 'assist' && (e.player === player.id || e.player === player.name)).length;
        const playerYellows = m.events.filter(e => e.type === 'yellow' && (e.player === player.id || e.player === player.name)).length;
        const playerReds = m.events.filter(e => e.type === 'red' && (e.player === player.id || e.player === player.name)).length;

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
  }, [state.matches, player]);

  const attendanceStats = useMemo(() => {
    const catSessions = state.sessions.filter(s => s.category === player.category && s.isCompleted);
    const records = state.attendance.filter(a => a.personId === player.id);
    
    const present = records.filter(r => r.status === 'حاضر').length;
    const late = records.filter(r => r.status === 'متأخر').length;
    const absent = records.filter(r => r.status === 'غائب').length;
    const excused = records.filter(r => r.status === 'غياب بعذر').length;
    
    const effectiveTotal = Math.max(0, catSessions.length - excused);
    const score = effectiveTotal > 0 ? ((present + (late * 0.5)) / effectiveTotal) * 100 : 0;
    const rate = Math.min(100, Math.round(score));

    const commitmentIndex = rate >= 90 ? 'ممتاز' : rate >= 75 ? 'جيد جداً' : rate >= 50 ? 'متوسط' : 'ضعيف';

    return { rate, present, late, absent, excused, total: catSessions.length, commitmentIndex };
  }, [state.sessions, state.attendance, player]);

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
      addLog?.(`تم حفظ تقرير شهر ${selectedMonth} بنجاح`, 'success');
    } catch (err: any) { alert(err.message); } finally { setIsSavingReport(false); }
  };

  const InfoBlock = ({ icon: Icon, label, value, color = "text-blue-950" }: any) => (
    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-1 hover:bg-slate-100 transition-all group">
      <div className="flex items-center gap-2 text-slate-500 group-hover:text-orange-600">
        <Icon size={14} />
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-xs font-black ${color} truncate`}>{value || '---'}</span>
    </div>
  );

  const SectionTitle = ({ icon: Icon, title, color = "text-orange-500" }: any) => (
    <h3 className={`text-xs font-black ${color} border-r-4 border-current pr-3 mb-6 flex items-center gap-2 uppercase tracking-widest`}>
      <Icon size={16}/> {title}
    </h3>
  );

  const sortedSavedReports = useMemo(() => {
    return months
      .map(m => ({ month: m, content: monthlyNotes[m] }))
      .filter(r => r.content && r.content.trim().length > 0);
  }, [monthlyNotes, months]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 print:pb-0 px-2 md:px-0" dir="rtl">
      {/* Print-only Header */}
      <div className="hidden print:flex flex-col items-center justify-center text-center space-y-2 mb-8 border-b-4 border-slate-900 pb-6 w-full">
         <img src="https://rbrkrntnjmwgtspmhbau.supabase.co/storage/v1/object/public/courts/LOGO.jpeg" alt="Logo" className="w-24 h-24 rounded-full object-contain mb-2 border-2 border-slate-200" />
         <h1 className="text-3xl font-black text-slate-900">نادي الكرامة الرياضي</h1>
         <h2 className="text-xl font-bold text-slate-700">مكتب كرة القدم</h2>
         <div className="mt-2 text-xl font-black bg-slate-900 text-white px-6 py-2 rounded-full inline-block tracking-widest">
            تقرير عن {player.role === 'لاعب' ? 'لاعب' : 'عضو كادر'} - {player.name}
         </div>
      </div>

      {/* هيدر الملف الفني */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#0f172a] p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border-2 border-slate-900 shadow-xl gap-4 md:gap-6 print:hidden">
        <button onClick={onBack} className="w-full md:w-auto bg-white/5 hover:bg-orange-500 text-white px-6 py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2">
          <ChevronRight size={18} /> العودة
        </button>
        <div className="flex items-center gap-3 md:gap-4 text-center md:text-right">
           <ClubLogo size={40} className="md:w-[60px] md:h-[60px]" />
           <div>
              <h1 className="text-xl md:text-2xl font-black text-white bg-gradient-to-l from-orange-500 to-white bg-clip-text text-transparent leading-none">سجل العضو الرقمي</h1>
              <p className="text-[8px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">EAGLE OS PERFORMANCE PASSPORT</p>
           </div>
        </div>
        <button onClick={() => window.print()} className="w-full md:w-auto bg-white text-slate-950 px-6 py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-orange-600 hover:text-white transition-all">
          <Printer size={16} /> طباعة السجل
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
         
         {/* العمود الأيمن: الهوية والالتزام */}
         <div className="lg:col-span-4 space-y-6">
            {/* بطاقة البروفايل */}
            <div className="modern-card p-6 md:p-8 text-center border-b-8 border-orange-500 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
               <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-800 rounded-full mx-auto flex items-center justify-center font-black text-5xl md:text-6xl text-white mb-6 border-8 border-white/5 shadow-2xl relative">
                  {player.name.charAt(0)}
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 md:w-14 md:h-14 bg-orange-600 rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl border-4 border-[#0f172a] shadow-xl">#{player.number || '0'}</div>
               </div>
               <h2 className="text-2xl md:text-3xl font-black text-blue-950 tracking-tighter leading-tight">{player.name}</h2>
               <p className="text-orange-500 font-black mt-3 tracking-widest uppercase bg-orange-500/10 inline-block px-4 py-1 rounded-full text-[10px]">
                 {player.role} • {player.category}
               </p>
            </div>

            {/* تحليل الالتزام */}
            <div className="modern-card p-5 md:p-6 space-y-4">
               <SectionTitle icon={TrendingUp} title="تحليل الانضباط" color="text-emerald-500" />
               <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 md:p-4 rounded-xl">
                     <span className="text-[9px] md:text-[10px] font-black text-slate-500">مؤشر الالتزام</span>
                     <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-lg font-black text-[9px] md:text-[10px] ${attendanceStats.rate > 80 ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                        {attendanceStats.commitmentIndex} (%{attendanceStats.rate})
                     </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                        <CheckCircle size={14} className="text-emerald-600 mx-auto mb-1"/>
                        <p className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase">حاضر</p>
                        <p className="text-base md:text-lg font-black text-blue-950">{attendanceStats.present}</p>
                     </div>
                     <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                        <Clock size={14} className="text-amber-600 mx-auto mb-1"/>
                        <p className="text-[7px] md:text-[8px] font-black text-slate-600 uppercase">متأخر</p>
                        <p className="text-base md:text-lg font-black text-blue-950">{attendanceStats.late}</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* البيانات الشخصية (الهوية) */}
            <div className="modern-card p-5 md:p-6 space-y-4">
               <SectionTitle icon={Fingerprint} title="الهوية والبيانات" />
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3">
                  <InfoBlock icon={User} label="الاسم الكامل" value={player.name} />
                  <InfoBlock icon={User} label="اسم الأب" value={player.fatherName} />
                  <InfoBlock icon={User} label="اسم الأم" value={player.motherName} />
                  <InfoBlock icon={Calendar} label="تاريخ الميلاد" value={player.birthDate} />
                  <InfoBlock icon={MapPin} label="مكان الولادة" value={player.birthPlace} />
                  <InfoBlock icon={Home} label="الخانة (القيد)" value={player.khana} />
                  <InfoBlock icon={BadgeCheck} label="الرقم الوطني" value={player.nationalId} />
                  <InfoBlock icon={Hash} label="الرقم الاتحادي" value={player.federalNumber} />
                  <InfoBlock icon={Globe} label="الرقم الدولي ID" value={player.internationalId} />
                  <InfoBlock icon={Phone} label="رقم الهاتف" value={player.phone} color="text-blue-600" />
                  <InfoBlock icon={Map} label="عنوان السكن" value={player.address} />
               </div>
            </div>
         </div>

         {/* العمود الأيسر: الإحصائيات الفنية */}
         <div className="lg:col-span-8 space-y-6 md:space-y-8">
            
            {/* مؤشرات الأداء السريعة */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
               <div className="modern-card p-4 md:p-6 border-t-4 border-emerald-500 text-center group transition-all">
                  <p className="text-[8px] md:text-[9px] font-black text-slate-500 mb-1 uppercase">الأداء</p>
                  <p className="text-2xl md:text-4xl font-black text-emerald-500">%{attendanceStats.rate}</p>
                  <div className="w-full bg-slate-100 h-1 md:h-1.5 rounded-full mt-3 overflow-hidden">
                     <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${attendanceStats.rate}%` }}></div>
                  </div>
               </div>
               <div className="modern-card p-4 md:p-6 border-t-4 border-orange-500 text-center group transition-all">
                  <p className="text-[8px] md:text-[9px] font-black text-slate-600 mb-1 uppercase">أهداف</p>
                  <p className="text-2xl md:text-4xl font-black text-blue-950">{stats.goals}</p>
                  <Zap size={14} className="text-orange-600 mx-auto mt-1" />
               </div>
               <div className="modern-card p-4 md:p-6 border-t-4 border-blue-500 text-center group transition-all">
                  <p className="text-[8px] md:text-[9px] font-black text-slate-600 mb-1 uppercase">صناعة</p>
                  <p className="text-2xl md:text-4xl font-black text-blue-950">{stats.assists}</p>
                  <TrendingUp size={14} className="text-blue-600 mx-auto mt-1" />
               </div>
               <div className="modern-card p-4 md:p-6 border-t-4 border-purple-500 text-center group transition-all">
                  <p className="text-[8px] md:text-[9px] font-black text-slate-600 mb-1 uppercase">دقائق</p>
                  <p className="text-2xl md:text-4xl font-black text-blue-950">{stats.totalMins}</p>
                  <Timer size={14} className="text-purple-600 mx-auto mt-1" />
               </div>
            </div>

            {/* المواصفات الفنية والبدنية */}
            <div className="modern-card p-6 md:p-8 border-r-8 border-emerald-600">
               <SectionTitle icon={Activity} title="المواصفات الفنية" color="text-emerald-500" />
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <InfoBlock icon={Target} label="المركز" value={player.position} />
                  <InfoBlock icon={CalendarCheck} label="الانضمام" value={player.joinDate} />
                  <InfoBlock icon={Ruler} label="الطول" value={player.height} color="text-emerald-700" />
                  <InfoBlock icon={Weight} label="الوزن" value={player.weight} color="text-emerald-700" />
                  <InfoBlock icon={GraduationCap} label="الشهادة" value={player.coachingCertificate} />
                  <InfoBlock icon={Medal} label="الدرجة" value={player.academicDegree} />
               </div>
            </div>

            {/* السجل المالي والتعاقدي */}
            <div className="modern-card p-6 md:p-8 border-r-8 border-yellow-600 bg-yellow-600/5">
               <SectionTitle icon={Wallet} title="السجل التعاقدي" color="text-yellow-500" />
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <InfoBlock icon={Calendar} label="بداية العقد" value={player.contractStart} />
                  <InfoBlock icon={Calendar} label="نهاية العقد" value={player.contractEnd} />
                  <InfoBlock icon={DollarSign} label="قيمة العقد" value={player.contractValue} color="text-yellow-700" />
               </div>
            </div>

            {/* الحالة الطبية */}
            <div className="modern-card p-6 md:p-8 border-r-8 border-red-600 bg-red-600/5">
               <SectionTitle icon={ShieldAlert} title="الحالة الطبية والانضباط" color="text-red-500" />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><HeartPulse size={12}/> السجل الطبي</p>
                     <div className="bg-white p-3 md:p-4 rounded-xl border border-red-100 shadow-sm min-h-[60px] text-[10px] md:text-xs font-medium leading-relaxed italic text-red-950">
                        {player.medicalHistory || 'لا يوجد سجلات طبية.'}
                     </div>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><AlertCircle size={12}/> الإصابات</p>
                     <div className="bg-white p-3 md:p-4 rounded-xl border border-red-100 shadow-sm min-h-[60px] text-[10px] md:text-xs font-medium leading-relaxed italic text-red-950">
                        {player.injuries || 'لا يوجد إصابات.'}
                     </div>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><Gavel size={12}/> العقوبات</p>
                     <div className="bg-white p-3 md:p-4 rounded-xl border border-red-100 shadow-sm min-h-[60px] text-[10px] md:text-xs font-medium leading-relaxed italic text-red-950">
                        {player.penalties || 'نظيف.'}
                     </div>
                  </div>
                  <div className="space-y-2">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1"><StickyNote size={12}/> ملاحظات</p>
                     <div className="bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-200 min-h-[60px] text-[10px] md:text-xs font-medium leading-relaxed italic text-slate-700 shadow-sm">
                        {player.notes || 'لا ملاحظات.'}
                     </div>
                  </div>
               </div>
            </div>

            {/* سجل المشاركة التنافسي */}
            <div className="modern-card p-6 md:p-8 border-r-8 border-orange-600 overflow-hidden shadow-2xl">
               <SectionTitle icon={Trophy} title="سجل المشاركة" color="text-orange-500" />
               
               {/* Mobile Cards for Match History */}
               <div className="block md:hidden space-y-3">
                  {stats.matchHistory.map((m, i) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-200 shadow-sm">
                       <div className="flex justify-between items-center">
                          <div>
                             <p className="text-[11px] font-black text-blue-950">{m.opponent}</p>
                             <p className="text-[8px] text-slate-600 font-bold">{m.date}</p>
                          </div>
                          <span className="text-xs font-black text-orange-600">{m.score}</span>
                       </div>
                       <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black">
                          <div className="text-slate-600">{m.mins}د</div>
                          <div className="text-emerald-600">⚽ {m.goals || '-'}</div>
                          <div className="text-blue-600">👟 {m.assists || '-'}</div>
                          <div className="text-slate-700">🟨{m.cards.y} 🟥{m.cards.r}</div>
                       </div>
                    </div>
                  ))}
                  {stats.matchHistory.length === 0 && <p className="p-6 text-center text-slate-500 text-xs italic">لا مشاركات مسجلة.</p>}
               </div>

               {/* Desktop Table View */}
               <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right">
                     <thead className="bg-slate-50 text-slate-700 text-[9px] font-black uppercase tracking-widest border-b border-slate-200">
                        <tr>
                           <th className="p-4 rounded-tr-xl">المنافس</th>
                           <th className="p-4 text-center">النتيجة</th>
                           <th className="p-4 text-center">دقائق</th>
                           <th className="p-4 text-center text-emerald-600">⚽</th>
                           <th className="p-4 text-center text-blue-600">👟</th>
                           <th className="p-4 text-center rounded-tl-xl">🟨/🟥</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 font-bold text-[11px] text-blue-950">
                        {stats.matchHistory.map((m, i) => (
                           <tr key={i} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-black">{m.opponent} <span className="text-[9px] text-slate-500 block font-medium">{m.date}</span></td>
                              <td className="p-4 text-center tabular-nums">{m.score}</td>
                              <td className="p-4 text-center tabular-nums text-slate-600">{m.mins} د</td>
                              <td className="p-4 text-center tabular-nums text-emerald-600">{m.goals || '-'}</td>
                              <td className="p-4 text-center tabular-nums text-blue-600">{m.assists || '-'}</td>
                              <td className="p-4 text-center tabular-nums">
                                 <span className="text-amber-500">{m.cards.y}</span>/<span className="text-red-600">{m.cards.r}</span>
                              </td>
                           </tr>
                        ))}
                        {stats.matchHistory.length === 0 && (
                           <tr><td colSpan={6} className="p-10 text-center text-slate-500 italic">لا مشاركات مسجلة.</td></tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* التقييم الفني الشهري */}
            <div className="modern-card p-6 md:p-8 border-t-8 border-blue-600 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                 <SectionTitle icon={StickyNote} title="التقييم الشهري" color="text-blue-500" />
               </div>
               <div className="flex gap-1.5 mb-6 overflow-x-auto no-scrollbar pb-2 print:hidden">
                  {months.map(m => (
                     <button key={m} onClick={() => setSelectedMonth(m)} className={`px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black whitespace-nowrap transition-all border-2 shrink-0 ${selectedMonth === m ? 'bg-blue-900 border-blue-900 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-900'}`}>
                        {m} {monthlyNotes[m] ? '✓' : ''}
                     </button>
                  ))}
               </div>
               <div className="space-y-4 print:hidden">
                 <textarea 
                   className="w-full bg-slate-50 border border-slate-200 shadow-inner rounded-2xl p-5 md:p-8 text-xs md:text-sm text-blue-950 h-48 md:h-56 resize-none outline-none focus:border-blue-900 transition-all font-medium leading-relaxed"
                   placeholder={`اكتب الملاحظات الفنية لشهر ${selectedMonth}...`}
                   value={monthlyNotes[selectedMonth] || ""}
                   onChange={e => setMonthlyNotes({...monthlyNotes, [selectedMonth]: e.target.value})}
                   readOnly={isViewer}
                 ></textarea>
                 {!isViewer && (
                   <button onClick={handleSaveMonthlyReport} disabled={isSavingReport} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 md:py-5 rounded-2xl font-black text-sm md:text-lg flex items-center justify-center gap-2 shadow-xl transition-all border-b-8 border-blue-900 active:translate-y-1 active:border-b-0">
                     {isSavingReport ? <Loader2 size={24} className="animate-spin"/> : <Save size={18}/>} 
                     حفظ تقرير {selectedMonth}
                   </button>
                 )}
               </div>
               
               <div className="mt-12 md:mt-16 space-y-6 md:space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                     <History size={20} className="text-blue-600" />
                     <h4 className="font-black text-base md:text-lg text-blue-950">الأرشيف الزمني</h4>
                  </div>
                  <div className="space-y-4 md:space-y-6">
                     {sortedSavedReports.length > 0 ? sortedSavedReports.map((report, idx) => (
                       <div key={idx} className="bg-slate-50 border-r-8 border-blue-600 border border-slate-200 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] transition-all shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                             <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest">{report.month}</span>
                          </div>
                          <p className="text-[11px] md:text-sm font-medium text-slate-700 leading-loose italic">"{report.content}"</p>
                       </div>
                     )) : (
                       <div className="py-12 text-center border-4 border-dashed border-slate-200 rounded-[2rem]">
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">أرشيف فارغ</p>
                       </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default PlayerReport;
