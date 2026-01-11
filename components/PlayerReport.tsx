
import React, { useMemo } from 'react';
import { 
  ChevronRight, Printer, Target, AlertTriangle, Clock, Calendar, 
  TrendingUp, Users, Shield, MapPin, Activity, Globe, Trophy, 
  CheckCircle, Award, GraduationCap, Home, StickyNote, CreditCard, BarChart3, PieChart,
  Hash, ClipboardList, User, Timer, FileText, Briefcase
} from 'lucide-react';
import { AppState, Person, Match, AttendanceRecord } from '../types';
import ClubLogo from './ClubLogo';

interface PlayerReportProps {
  state: AppState;
  player: Person | null;
  onBack: () => void;
}

const PlayerReport: React.FC<PlayerReportProps> = ({ state, player, onBack }) => {
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

  // Advanced Stats: Matches & Exact Minutes
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

  // Advanced Stats: Attendance & Excuses Linked with Sessions
  const attendanceData = useMemo(() => {
    const records = state.attendance.filter(a => a.personId === player.id);
    const sessions = state.sessions.filter(s => s.category === player.category);
    
    const present = records.filter(r => r.status === 'حاضر').length;
    const late = records.filter(r => r.status === 'متأخر').length;
    const absent = records.filter(r => r.status === 'غائب').length;
    const excused = records.filter(r => r.status === 'غياب بعذر').length;
    
    const rate = sessions.length > 0 ? Math.round(((present + late * 0.7) / sessions.length) * 100) : 0;

    const detailedRecords = records.map(r => {
      const session = state.sessions.find(s => s.id === r.sessionId);
      return { ...r, objective: session?.objective || 'تمرين عام' };
    }).sort((a,b) => b.date.localeCompare(a.date));

    return { records: detailedRecords, present, late, absent, excused, rate, total: sessions.length };
  }, [state.attendance, state.sessions, player]);

  // Helper for Charts
  const maxVal = Math.max(matchStats.goals, matchStats.assists, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex justify-between items-center no-print">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-[#001F3F] font-black transition-all">
          <ChevronRight size={20} /> العودة لقائمة الفريق
        </button>
        <div className="flex items-center gap-4">
           <span className="text-xs font-black text-slate-400 uppercase tracking-widest">الملف الفني الشامل - نادي الكرامة</span>
           <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-black transition-all border-b-4 border-black">
             <Printer size={18} /> طباعة التقرير الفني
           </button>
        </div>
      </div>

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

      {/* NEW SUMMARY SECTION FOR PLAYERS ONLY */}
      {!isStaff && (
        <div className="bg-white p-8 rounded-[3rem] border-4 border-slate-900 shadow-sm no-print">
           <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3 border-r-8 border-blue-900 pr-4 uppercase">
             <BarChart3 size={28} className="text-blue-900"/> ملخص إحصائيات الأداء التنافسي
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-900 text-center shadow-inner group hover:bg-[#001F3F] transition-all">
                 <Trophy size={20} className="mx-auto mb-2 text-slate-400 group-hover:text-white" />
                 <p className="text-3xl font-black text-slate-900 group-hover:text-white">{matchStats.played}</p>
                 <p className="text-[10px] font-black text-slate-500 group-hover:text-slate-300 uppercase mt-1">المباريات</p>
              </div>
              <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-600 text-center shadow-inner group hover:bg-emerald-600 transition-all">
                 <Target size={20} className="mx-auto mb-2 text-emerald-600 group-hover:text-white" />
                 <p className="text-3xl font-black text-emerald-600 group-hover:text-white">{matchStats.goals}</p>
                 <p className="text-[10px] font-black text-emerald-400 group-hover:text-emerald-100 uppercase mt-1">الأهداف</p>
              </div>
              <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-600 text-center shadow-inner group hover:bg-blue-600 transition-all">
                 <TrendingUp size={20} className="mx-auto mb-2 text-blue-600 group-hover:text-white" />
                 <p className="text-3xl font-black text-blue-600 group-hover:text-white">{matchStats.assists}</p>
                 <p className="text-[10px] font-black text-blue-400 group-hover:text-blue-100 uppercase mt-1">صناعة</p>
              </div>
              <div className="bg-yellow-50 p-6 rounded-3xl border-2 border-yellow-400 text-center shadow-inner group hover:bg-yellow-400 transition-all">
                 <div className="bg-yellow-400 w-4 h-5 mx-auto mb-2 rounded-sm shadow-sm group-hover:bg-white"></div>
                 <p className="text-3xl font-black text-yellow-700 group-hover:text-yellow-900">{matchStats.yellows}</p>
                 <p className="text-[10px] font-black text-yellow-600 group-hover:text-yellow-800 uppercase mt-1">إنذار أصفر</p>
              </div>
              <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-600 text-center shadow-inner group hover:bg-red-600 transition-all">
                 <div className="bg-red-600 w-4 h-5 mx-auto mb-2 rounded-sm shadow-sm group-hover:bg-white"></div>
                 <p className="text-3xl font-black text-red-700 group-hover:text-white">{matchStats.reds}</p>
                 <p className="text-[10px] font-black text-red-400 group-hover:text-red-100 uppercase mt-1">طرد أحمر</p>
              </div>
           </div>

           {/* Visual Charts Section */}
           <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t-2 border-slate-100">
              {/* Performance Bar Chart (SVG) */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm">
                 <h4 className="text-xs font-black text-slate-800 mb-6 flex items-center gap-2 uppercase">
                   <BarChart3 size={16} className="text-blue-900" /> تحليل المساهمات البصرية
                 </h4>
                 <div className="h-48 flex items-end justify-around px-4 border-b-2 border-slate-300">
                    <div className="flex flex-col items-center w-full max-w-[40px]">
                       <div className="bg-emerald-500 w-full rounded-t-lg transition-all duration-1000 shadow-lg" style={{ height: `${(matchStats.goals / maxVal) * 100}%` }}></div>
                       <span className="text-[8px] font-black text-slate-500 mt-2 uppercase">الأهداف</span>
                    </div>
                    <div className="flex flex-col items-center w-full max-w-[40px]">
                       <div className="bg-blue-500 w-full rounded-t-lg transition-all duration-1000 shadow-lg" style={{ height: `${(matchStats.assists / maxVal) * 100}%` }}></div>
                       <span className="text-[8px] font-black text-slate-500 mt-2 uppercase">صناعة</span>
                    </div>
                    <div className="flex flex-col items-center w-full max-w-[40px]">
                       <div className="bg-[#001F3F] w-full rounded-t-lg transition-all duration-1000 shadow-lg" style={{ height: `${(matchStats.played / (matchStats.played || 1)) * 100}%` }}></div>
                       <span className="text-[8px] font-black text-slate-500 mt-2 uppercase">المشاركة</span>
                    </div>
                    <div className="flex flex-col items-center w-full max-w-[40px]">
                       <div className="bg-yellow-400 w-full rounded-t-lg transition-all duration-1000 shadow-lg" style={{ height: `${(matchStats.yellows / maxVal) * 100}%` }}></div>
                       <span className="text-[8px] font-black text-slate-500 mt-2 uppercase">إنذار</span>
                    </div>
                 </div>
              </div>

              {/* Attendance Stacked Bar */}
              <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm flex flex-col justify-center">
                 <h4 className="text-xs font-black text-slate-800 mb-6 flex items-center gap-2 uppercase">
                   <Activity size={16} className="text-orange-600" /> تحليل توزيع الانضباط التدريبي
                 </h4>
                 <div className="w-full h-10 bg-slate-200 rounded-full overflow-hidden flex shadow-inner border border-slate-300">
                    <div className="bg-emerald-500 h-full flex items-center justify-center text-[8px] font-black text-white" style={{ width: `${(attendanceData.present / (attendanceData.total || 1)) * 100}%` }}>
                       {attendanceData.present > 0 && 'حاضر'}
                    </div>
                    <div className="bg-orange-400 h-full flex items-center justify-center text-[8px] font-black text-white" style={{ width: `${(attendanceData.late / (attendanceData.total || 1)) * 100}%` }}>
                       {attendanceData.late > 0 && 'متأخر'}
                    </div>
                    <div className="bg-blue-400 h-full flex items-center justify-center text-[8px] font-black text-white" style={{ width: `${(attendanceData.excused / (attendanceData.total || 1)) * 100}%` }}>
                       {attendanceData.excused > 0 && 'بعذر'}
                    </div>
                    <div className="bg-red-500 h-full flex items-center justify-center text-[8px] font-black text-white" style={{ width: `${(attendanceData.absent / (attendanceData.total || 1)) * 100}%` }}>
                       {attendanceData.absent > 0 && 'غائب'}
                    </div>
                 </div>
                 <div className="grid grid-cols-4 gap-2 mt-6">
                    <div className="text-center">
                       <p className="text-[10px] font-black text-emerald-600">%{Math.round((attendanceData.present / (attendanceData.total || 1)) * 100)}</p>
                       <p className="text-[7px] font-black text-slate-400 uppercase">مثالي</p>
                    </div>
                    <div className="text-center">
                       <p className="text-[10px] font-black text-orange-600">%{Math.round((attendanceData.late / (attendanceData.total || 1)) * 100)}</p>
                       <p className="text-[7px] font-black text-slate-400 uppercase">تأخير</p>
                    </div>
                    <div className="text-center">
                       <p className="text-[10px] font-black text-blue-600">%{Math.round((attendanceData.excused / (attendanceData.total || 1)) * 100)}</p>
                       <p className="text-[7px] font-black text-slate-400 uppercase">مبرر</p>
                    </div>
                    <div className="text-center">
                       <p className="text-[10px] font-black text-red-600">%{Math.round((attendanceData.absent / (attendanceData.total || 1)) * 100)}</p>
                       <p className="text-[7px] font-black text-slate-400 uppercase">تقصير</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {!isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border-4 border-slate-900 shadow-sm">
             <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3 border-r-8 border-orange-600 pr-4 uppercase">
               <Trophy size={28} className="text-orange-600"/> حصاد الموسم والمشاركات التفصيلية
             </h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-900 text-center">
                   <p className="text-4xl font-black text-slate-900">{matchStats.played}</p>
                   <p className="text-[10px] font-black text-slate-500 uppercase mt-1">مباريات</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-600 text-center">
                   <p className="text-4xl font-black text-emerald-600">{matchStats.goals}</p>
                   <p className="text-[10px] font-black text-emerald-400 uppercase mt-1">أهداف</p>
                </div>
                <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-600 text-center">
                   <p className="text-4xl font-black text-blue-600">{matchStats.assists}</p>
                   <p className="text-[10px] font-black text-blue-400 uppercase mt-1">صناعة</p>
                </div>
                <div className="bg-red-50 p-6 rounded-3xl border-2 border-red-600 text-center">
                   <p className="text-4xl font-black text-red-600">{matchStats.yellows + matchStats.reds}</p>
                   <p className="text-[10px] font-black text-red-400 uppercase mt-1">بطاقات</p>
                </div>
             </div>

             <div className="mt-10 overflow-x-auto">
                <table className="w-full text-right text-xs font-black">
                   <thead>
                      <tr className="bg-slate-100 border-y-2 border-slate-900">
                         <th className="p-4">المنافس</th>
                         <th className="p-4 text-center">النوع</th>
                         <th className="p-4 text-center">الدقائق</th>
                         <th className="p-4 text-center">⚽</th>
                         <th className="p-4 text-center">👟</th>
                         <th className="p-4 text-center">البطاقة</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y-2 divide-slate-100">
                      {matchStats.list.map((m, i) => (
                         <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-black text-slate-900">{m.opponent}</td>
                            <td className="p-4 text-center"><span className="bg-slate-200 px-2 py-0.5 rounded-md text-[9px] uppercase">{m.type}</span></td>
                            <td className="p-4 text-center bg-emerald-50 font-black text-emerald-700">{m.mins}'</td>
                            <td className="p-4 text-center">{m.goals || '-'}</td>
                            <td className="p-4 text-center">{m.assists || '-'}</td>
                            <td className="p-4 text-center">
                               <div className="flex justify-center gap-1">
                                  {m.yellow > 0 && <span className="bg-yellow-400 w-3 h-4 inline-block rounded-sm border border-yellow-500 shadow-sm"></span>}
                                  {m.red > 0 && <span className="bg-red-600 w-3 h-4 inline-block rounded-sm border border-red-700 shadow-sm"></span>}
                                  {!(m.yellow || m.red) && '-'}
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
                {matchStats.list.length === 0 && <p className="text-center py-10 text-slate-300 italic font-black">لا توجد مشاركات مسجلة</p>}
             </div>
          </div>

          <div className="space-y-8">
             <div className="bg-[#001F3F] text-white p-8 rounded-[3rem] border-4 border-slate-900 shadow-xl relative overflow-hidden">
                <h3 className="text-lg font-black mb-6 flex items-center gap-3 relative z-10">
                   <Activity size={24} className="text-orange-400"/> الالتزام والانضباط بالتمارين
                </h3>
                <div className="flex items-center justify-between mb-8 relative z-10">
                   <div className="relative w-28 h-28">
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                         <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4"></circle>
                         <circle cx="18" cy="18" r="15.915" fill="none" stroke="#FF6B00" strokeWidth="4" strokeDasharray={`${attendanceData.rate} ${100 - attendanceData.rate}`}></circle>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-2xl font-black">{attendanceData.rate}%</span>
                         <span className="text-[7px] font-black uppercase tracking-widest text-orange-400">معدل الحضور</span>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                         <span className="text-[10px] font-black">حاضر: {attendanceData.present}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                         <span className="text-[10px] font-black">متأخر: {attendanceData.late}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                         <span className="text-[10px] font-black">بعذر: {attendanceData.excused}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-3 h-3 rounded-full bg-red-500"></div>
                         <span className="text-[10px] font-black">غائب: {attendanceData.absent}</span>
                      </div>
                   </div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 relative z-10 text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">إجمالي التمارين: {attendanceData.total}</p>
                </div>
             </div>

             <div className="bg-white p-8 rounded-[3rem] border-4 border-slate-900 shadow-sm flex flex-col h-[500px]">
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3 border-r-4 border-blue-900 pr-4 uppercase">
                   <Briefcase size={22} className="text-blue-900"/> سجل الحضور والأعذار الإدارية
                </h3>
                <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
                   {attendanceData.records.map((r, i) => (
                      <div key={i} className={`p-4 rounded-2xl border-2 transition-all ${r.status === 'حاضر' ? 'bg-slate-50 border-slate-100' : 'bg-orange-50/30 border-orange-100 shadow-sm'}`}>
                         <div className="flex justify-between items-center mb-2">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase border ${
                              r.status === 'حاضر' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 
                              r.status === 'غياب بعذر' ? 'bg-blue-100 text-blue-900 border-blue-200' :
                              r.status === 'متأخر' ? 'bg-orange-100 text-orange-900 border-orange-200' :
                              'bg-red-100 text-red-900 border-red-200'
                            }`}>
                               {r.status}
                            </span>
                            <span className="text-[9px] font-black text-slate-400 flex items-center gap-1"><Calendar size={10}/> {r.date}</span>
                         </div>
                         <p className="text-[10px] font-black text-slate-900 leading-tight mb-2">{r.objective}</p>
                         {r.excuse && (
                           <div className="mt-2 bg-white/60 p-2 rounded-lg border-r-4 border-blue-600">
                             <p className="text-[9px] font-black text-blue-900 italic">العذر: {r.excuse}</p>
                           </div>
                         )}
                      </div>
                   ))}
                   {attendanceData.records.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-300 opacity-50">
                        <ClipboardList size={40} />
                        <p className="font-black italic text-xs mt-2 text-center">لا توجد سجلات حضور مسجلة</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {isStaff && (
        <div className="bg-white p-12 rounded-[4rem] border-4 border-slate-900 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-12">
           <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 border-r-8 border-blue-900 pr-4 uppercase">
                 <GraduationCap size={32} className="text-blue-900"/> المؤهلات العلمية والتدريبية
              </h3>
              <div className="space-y-4">
                 <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-200 shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الشهادة التدريبية</p>
                    <p className="text-lg font-black text-slate-900 uppercase">{player.coachingCertificate || 'غير مسجلة'}</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-200 shadow-inner">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الدرجة العلمية</p>
                    <p className="text-lg font-black text-slate-900 uppercase">{player.academicDegree || 'غير مسجلة'}</p>
                 </div>
              </div>
           </div>
           <div className="space-y-6">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 border-r-8 border-orange-600 pr-4 uppercase">
                 <FileText size={32} className="text-orange-600"/> تقرير المكتب المركزي
              </h3>
              <div className="bg-orange-50/50 p-8 rounded-[3rem] border-4 border-orange-100 h-full min-h-[200px] text-sm font-black text-orange-900 italic leading-relaxed">
                 {player.notes || 'لا يوجد ملاحظات إدارية حالية مسجلة من قبل مكتب كرة القدم.'}
              </div>
           </div>
        </div>
      )}

      <footer className="mt-12 text-center space-y-2 border-t-4 border-slate-100 pt-8 no-print pb-10">
         <ClubLogo size={60} className="mx-auto opacity-20 mb-4 grayscale" />
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إدارة نادي الكرامة الرياضي - مكتب كرة القدم المركزي</p>
         <p className="text-[8px] font-black text-slate-300">التقرير الفني الشامل - جميع الحقوق محفوظة للنادي © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default PlayerReport;
