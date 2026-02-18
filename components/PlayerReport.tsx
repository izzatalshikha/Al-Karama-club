
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

  const InfoBlock = ({ icon: Icon, label, value, color = "text-white" }: any) => (
    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-1 hover:bg-white/10 transition-all group">
      <div className="flex items-center gap-2 text-slate-500 group-hover:text-orange-500">
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
  }, [monthlyNotes]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 no-print" dir="rtl">
      {/* هيدر الملف الفني */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#0f172a] p-6 rounded-[2.5rem] border-2 border-slate-900 shadow-xl gap-6">
        <button onClick={onBack} className="w-full md:w-auto bg-white/5 hover:bg-orange-500 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3">
          <ChevronRight size={20} /> العودة للقائمة
        </button>
        <div className="flex items-center gap-4 text-center md:text-right">
           <ClubLogo size={60} />
           <div>
              <h1 className="text-2xl font-black text-white bg-gradient-to-l from-orange-500 to-white bg-clip-text text-transparent">EAGLE OS | سجل العضو الشامل</h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Centralized Management Passport</p>
           </div>
        </div>
        <button onClick={() => window.print()} className="w-full md:w-auto bg-white text-slate-950 px-8 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-orange-600 hover:text-white transition-all">
          <Printer size={18} /> طباعة السجل الكامل
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* العمود الأيمن: الهوية والالتزام */}
        <div className="lg:col-span-4 space-y-6">
           {/* بطاقة البروفايل */}
           <div className="modern-card p-8 text-center border-b-8 border-orange-500 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
              <div className="w-40 h-40 bg-slate-800 rounded-full mx-auto flex items-center justify-center font-black text-6xl text-white mb-6 border-8 border-white/5 shadow-2xl relative">
                 {player.name.charAt(0)}
                 <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-2xl border-4 border-[#0f172a] shadow-xl">#{player.number || '0'}</div>
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter">{player.name}</h2>
              <p className="text-orange-500 font-black mt-2 tracking-widest uppercase bg-orange-500/10 inline-block px-4 py-1 rounded-full text-xs">
                {player.role} • {player.category}
              </p>
           </div>

           {/* تحليل الالتزام */}
           <div className="modern-card p-6 space-y-4">
              <SectionTitle icon={TrendingUp} title="تحليل الانضباط والحضور" color="text-emerald-500" />
              <div className="space-y-4">
                 <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-500">مؤشر الالتزام السلوكي</span>
                    <span className={`px-3 py-1 rounded-lg font-black text-[10px] ${attendanceStats.rate > 80 ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                       {attendanceStats.commitmentIndex} (%{attendanceStats.rate})
                    </span>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-center">
                       <CheckCircle size={14} className="text-emerald-500 mx-auto mb-1"/>
                       <p className="text-[8px] font-black text-slate-500 uppercase">حاضر</p>
                       <p className="text-lg font-black text-white">{attendanceStats.present}</p>
                    </div>
                    <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-center">
                       <Clock size={14} className="text-amber-500 mx-auto mb-1"/>
                       <p className="text-[8px] font-black text-slate-500 uppercase">متأخر</p>
                       <p className="text-lg font-black text-white">{attendanceStats.late}</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* البيانات الشخصية (الهوية) - تشمل كافة الحقول الجديدة */}
           <div className="modern-card p-6 space-y-4">
              <SectionTitle icon={Fingerprint} title="الهوية والبيانات الشخصية" />
              <div className="grid grid-cols-1 gap-3">
                 <InfoBlock icon={User} label="الاسم الكامل" value={player.name} />
                 <InfoBlock icon={User} label="اسم الأب" value={player.fatherName} />
                 <InfoBlock icon={User} label="اسم الأم" value={player.motherName} />
                 <InfoBlock icon={Calendar} label="تاريخ الميلاد" value={player.birthDate} />
                 <InfoBlock icon={MapPin} label="مكان الولادة" value={player.birthPlace} />
                 <InfoBlock icon={Home} label="الخانة (القيد)" value={player.khana} />
                 <InfoBlock icon={BadgeCheck} label="الرقم الوطني" value={player.nationalId} />
                 <InfoBlock icon={Hash} label="الرقم الاتحادي" value={player.federalNumber} />
                 <InfoBlock icon={Globe} label="الرقم الدولي ID" value={player.internationalId} />
                 <InfoBlock icon={Phone} label="رقم الهاتف" value={player.phone} color="text-blue-400" />
                 <InfoBlock icon={Map} label="عنوان السكن" value={player.address} />
              </div>
           </div>
        </div>

        {/* العمود الأيسر: الإحصائيات الفنية، العقود، والتقارير */}
        <div className="lg:col-span-8 space-y-8">
           
           {/* مؤشرات الأداء السريعة */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="modern-card p-6 border-t-4 border-emerald-500 text-center group hover:bg-emerald-500/5 transition-all">
                 <p className="text-[9px] font-black text-slate-500 mb-1 uppercase">كفاءة الأداء</p>
                 <p className="text-4xl font-black text-emerald-500 tabular-nums">%{attendanceStats.rate}</p>
                 <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${attendanceStats.rate}%` }}></div>
                 </div>
              </div>
              <div className="modern-card p-6 border-t-4 border-orange-500 text-center group hover:bg-orange-500/5 transition-all">
                 <p className="text-[9px] font-black text-slate-500 mb-1 uppercase">الأهداف</p>
                 <p className="text-4xl font-black text-white tabular-nums">{stats.goals}</p>
                 <Zap size={16} className="text-orange-500 mx-auto mt-2 animate-pulse" />
              </div>
              <div className="modern-card p-6 border-t-4 border-blue-500 text-center group hover:bg-blue-500/5 transition-all">
                 <p className="text-[9px] font-black text-slate-500 mb-1 uppercase">مساهمات</p>
                 <p className="text-4xl font-black text-white tabular-nums">{stats.assists}</p>
                 <TrendingUp size={16} className="text-blue-500 mx-auto mt-2" />
              </div>
              <div className="modern-card p-6 border-t-4 border-purple-500 text-center group hover:bg-purple-500/5 transition-all">
                 <p className="text-[9px] font-black text-slate-500 mb-1 uppercase">دقائق لعب</p>
                 <p className="text-4xl font-black text-white tabular-nums">{stats.totalMins}</p>
                 <Timer size={16} className="text-purple-500 mx-auto mt-2" />
              </div>
           </div>

           {/* المواصفات الفنية والرياضية */}
           <div className="modern-card p-8 border-r-8 border-emerald-600">
              <SectionTitle icon={Activity} title="المواصفات الفنية والبدنية" color="text-emerald-500" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <InfoBlock icon={Target} label="المركز الأساسي" value={player.position} />
                 <InfoBlock icon={CalendarCheck} label="تاريخ الانضمام" value={player.joinDate} />
                 <InfoBlock icon={Ruler} label="الطول (سم)" value={player.height} color="text-emerald-400" />
                 <InfoBlock icon={Weight} label="الوزن (كغ)" value={player.weight} color="text-emerald-400" />
                 <InfoBlock icon={GraduationCap} label="الشهادة التدريبية" value={player.coachingCertificate} />
                 <InfoBlock icon={Medal} label="الدرجة العلمية" value={player.academicDegree} />
              </div>
           </div>

           {/* السجل المالي والتعاقدي */}
           <div className="modern-card p-8 border-r-8 border-yellow-600 bg-yellow-600/5">
              <SectionTitle icon={Wallet} title="السجل التعاقدي والمالي" color="text-yellow-500" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <InfoBlock icon={Calendar} label="بداية العقد" value={player.contractStart} />
                 <InfoBlock icon={Calendar} label="نهاية العقد" value={player.contractEnd} />
                 <InfoBlock icon={DollarSign} label="قيمة العقد / الراتب" value={player.contractValue} color="text-yellow-400" />
              </div>
           </div>

           {/* الحالة الطبية والسلوك الانضباطي */}
           <div className="modern-card p-8 border-r-8 border-red-600 bg-red-600/5">
              <SectionTitle icon={ShieldAlert} title="الحالة الطبية والسلوك الانضباطي" color="text-red-500" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><HeartPulse size={14}/> السجل الطبي والعمليات</p>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 min-h-[80px] text-xs font-medium leading-relaxed italic text-slate-300">
                       {player.medicalHistory || 'لا يوجد سجلات طبية مسجلة.'}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={14}/> الإصابات المزمنة</p>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 min-h-[80px] text-xs font-medium leading-relaxed italic text-slate-300">
                       {player.injuries || 'لا يوجد إصابات مسجلة حالياً.'}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Gavel size={14}/> العقوبات والسوابق</p>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 min-h-[80px] text-xs font-medium leading-relaxed italic text-slate-300">
                       {player.penalties || 'السجل الانضباطي نظيف.'}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><StickyNote size={14}/> ملاحظات المدرب</p>
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 min-h-[80px] text-xs font-medium leading-relaxed italic text-slate-300">
                       {player.notes || 'لا توجد ملاحظات إضافية.'}
                    </div>
                 </div>
              </div>
           </div>

           {/* سجل المشاركة التنافسي */}
           <div className="modern-card p-8 border-r-8 border-orange-600 overflow-hidden shadow-2xl">
              <SectionTitle icon={Trophy} title="سجل المشاركة التنافسي" color="text-orange-500" />
              <div className="overflow-x-auto">
                 <table className="w-full text-right">
                    <thead className="bg-white/5 text-[9px] font-black uppercase tracking-widest border-b border-white/10">
                       <tr>
                          <th className="p-4">المنافس والبطولة</th>
                          <th className="p-4 text-center">النتيجة</th>
                          <th className="p-4 text-center">دقائق</th>
                          <th className="p-4 text-center text-emerald-500">⚽</th>
                          <th className="p-4 text-center text-blue-500">👟</th>
                          <th className="p-4 text-center">🟨/🟥</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-bold text-[11px]">
                       {stats.matchHistory.map((m, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors">
                             <td className="p-4 font-black">{m.opponent} <span className="text-[9px] text-slate-500 block font-medium">{m.date}</span></td>
                             <td className="p-4 text-center tabular-nums">{m.score}</td>
                             <td className="p-4 text-center tabular-nums text-slate-400">{m.mins} د</td>
                             <td className="p-4 text-center tabular-nums text-emerald-500">{m.goals || '-'}</td>
                             <td className="p-4 text-center tabular-nums text-blue-500">{m.assists || '-'}</td>
                             <td className="p-4 text-center tabular-nums">
                                <span className="text-yellow-400">{m.cards.y}</span>/<span className="text-red-600">{m.cards.r}</span>
                             </td>
                          </tr>
                       ))}
                       {stats.matchHistory.length === 0 && (
                          <tr><td colSpan={6} className="p-10 text-center text-slate-500 italic">لم يشارك اللاعب في أي مباريات معتمدة بعد.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>

           {/* التقييم الفني الشهري */}
           <div className="modern-card p-8 border-t-8 border-blue-600 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <SectionTitle icon={StickyNote} title="التقييم الفني الشهري" color="text-blue-500" />
              </div>
              <div className="flex gap-2 mb-8 overflow-x-auto pb-4 custom-scrollbar no-print">
                 {months.map(m => (
                    <button key={m} onClick={() => setSelectedMonth(m)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap transition-all border-2 ${selectedMonth === m ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}>
                       {m} {monthlyNotes[m] ? '✓' : ''}
                    </button>
                 ))}
              </div>
              <div className="space-y-4">
                <textarea 
                  className="w-full bg-slate-900 border-4 border-white/5 rounded-3xl p-8 text-sm text-slate-200 h-56 resize-none outline-none focus:border-blue-600 transition-all shadow-inner font-medium leading-relaxed"
                  placeholder={`اكتب الملاحظات الفنية لشهر ${selectedMonth}...`}
                  value={monthlyNotes[selectedMonth] || ""}
                  onChange={e => setMonthlyNotes({...monthlyNotes, [selectedMonth]: e.target.value})}
                  readOnly={isViewer}
                ></textarea>
                {!isViewer && (
                  <button onClick={handleSaveMonthlyReport} disabled={isSavingReport} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl transition-all border-b-8 border-blue-900 active:translate-y-1 active:border-b-0">
                    {isSavingReport ? <Loader2 size={24} className="animate-spin"/> : <Save size={24}/>} 
                    حفظ تقرير شهر {selectedMonth}
                  </button>
                )}
              </div>
              
              <div className="mt-16 space-y-8">
                 <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <History size={24} className="text-blue-500" />
                    <h4 className="font-black text-lg text-white">السجل الزمني للتقييمات</h4>
                 </div>
                 <div className="space-y-6">
                    {sortedSavedReports.length > 0 ? sortedSavedReports.map((report, idx) => (
                      <div key={idx} className="bg-white/5 border-r-8 border-blue-600 p-8 rounded-3xl relative group hover:bg-white/10 transition-all shadow-lg">
                         <div className="flex justify-between items-start mb-4">
                            <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{report.month}</span>
                         </div>
                         <p className="text-sm font-medium text-slate-300 leading-loose italic">"{report.content}"</p>
                      </div>
                    )) : (
                      <div className="py-16 text-center border-4 border-dashed border-white/5 rounded-[3rem]">
                         <p className="text-sm font-black text-slate-600 uppercase tracking-widest">لا توجد تقارير مؤرشفة</p>
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
