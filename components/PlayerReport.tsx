
import React from 'react';
import { 
  ChevronRight, Printer, Target, AlertTriangle, Clock, Calendar, 
  TrendingUp, Users, Shield, MapPin, Activity, Globe, Trophy, 
  CheckCircle, Award, GraduationCap, Home, StickyNote, CreditCard, BarChart3, PieChart,
  Hash, ClipboardList, User
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

  const playerMatchesStats = !isStaff ? state.matches.filter(m => m.isCompleted).map(match => {
    const isStarter = match.lineup.starters.some(p => p.name === player.name);
    const isSub = match.lineup.subs.some(p => p.name === player.name);
    const minutesPlayed = isStarter ? 90 : (isSub ? 20 : 0);
    const goals = match.events.filter(g => g.type === 'goal' && g.player === player.name).length;
    const assists = match.events.filter(g => g.type === 'assist' && g.player === player.name).length;
    const cards = match.events.filter(c => (c.type === 'yellow' || c.type === 'red') && c.player === player.name);
    const yellowCards = cards.filter(c => c.type === 'yellow').length;
    const redCards = cards.filter(c => c.type === 'red').length;

    return { match, minutes: minutesPlayed, goals, assists, yellowCards, redCards, played: isStarter || isSub };
  }).filter(s => s.played) : [];

  const totalPlayed = playerMatchesStats.length;
  const totalGoals = playerMatchesStats.reduce((sum, s) => sum + s.goals, 0);
  const totalAssists = playerMatchesStats.reduce((sum, s) => sum + s.assists, 0);
  const totalYellows = playerMatchesStats.reduce((sum, s) => sum + s.yellowCards, 0);
  const totalReds = playerMatchesStats.reduce((sum, s) => sum + s.redCards, 0);

  const playerAttendance = state.attendance.filter(a => a.personId === player.id);
  const totalSessions = state.sessions.filter(s => s.category === player.category).length;
  const presentCount = playerAttendance.filter(a => a.status === 'حاضر').length;
  const lateCount = playerAttendance.filter(a => a.status === 'متأخر').length;
  const absentCount = playerAttendance.filter(a => a.status === 'غائب').length;
  const attendanceRate = totalSessions ? Math.round(((presentCount + lateCount * 0.5) / totalSessions) * 100) : 0;

  const last5Matches = playerMatchesStats.slice(-5);
  const maxGoals = Math.max(...last5Matches.map(m => m.goals), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-16">
      <div className="flex justify-between items-center no-print">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-blue-900 font-black transition-all text-xs">
          <ChevronRight size={16} /> العودة
        </button>
        <div className="flex items-center gap-4">
           <span className="text-[10px] font-black text-slate-400">بإشراف: {state.currentUser.username}</span>
           <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-black shadow-lg">
             <Printer size={16} /> طباعة التقرير
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-[#001F3F] h-24 relative">
          <div className="absolute -bottom-10 right-8 flex items-end gap-4">
            <div className="w-28 h-28 bg-white rounded-2xl shadow-xl border-4 border-white flex items-center justify-center overflow-hidden font-black text-4xl text-blue-900 uppercase">
               {player.name.charAt(0)}
            </div>
            <div className="mb-2 space-y-0.5">
              <h1 className="text-xl font-black text-white drop-shadow-md">{player.name}</h1>
              <span className="bg-orange-500 text-white text-[8px] font-black px-3 py-0.5 rounded-full uppercase block w-fit">{player.role} - {player.category}</span>
            </div>
          </div>
        </div>
        <div className="h-12"></div>
        <div className="px-8 pb-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-50">
           <div className="space-y-0.5">
             <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1"><MapPin size={10}/> المواليد</p>
             <p className="text-xs font-black text-slate-800">{player.birthPlace || '-'} ({calculateAge(player.birthDate)} سنة)</p>
           </div>
           <div className="space-y-0.5">
             <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1"><Users size={10}/> العائلة</p>
             <p className="text-xs font-black text-slate-800">{player.fatherName} / {player.motherName}</p>
           </div>
           <div className="space-y-0.5">
             <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1"><Hash size={10}/> القميص</p>
             <p className="text-xs font-black text-blue-900">#{player.number || '--'}</p>
           </div>
           <div className="space-y-0.5">
             <p className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1"><CreditCard size={10}/> الرقم الوطني</p>
             <p className="text-xs font-black text-slate-800 font-mono">{player.nationalId || '-'}</p>
           </div>
        </div>
      </div>

      {!isStaff && (
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-900 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
             <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
               <ClipboardList size={22} className="text-[#001F3F]" /> إحصائيات المواجهات الرسمية
             </h3>
             <span className="text-[9px] font-black bg-[#001F3F] text-white px-3 py-1 rounded-lg uppercase tracking-widest">Al-Karamah SC Statistics</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-900 text-center hover:bg-[#001F3F] hover:text-white transition-all group">
              <p className="text-3xl font-black mb-1">{totalPlayed}</p>
              <p className="text-[10px] font-black text-slate-500 group-hover:text-blue-200 uppercase tracking-tighter">المباريات</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-600 text-center hover:bg-orange-500 hover:text-white transition-all group">
              <p className="text-3xl font-black text-orange-600 group-hover:text-white mb-1">{totalGoals}</p>
              <p className="text-[10px] font-black text-orange-400 group-hover:text-orange-100 uppercase tracking-tighter">الأهداف</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-600 text-center hover:bg-emerald-600 hover:text-white transition-all group">
              <p className="text-3xl font-black text-emerald-600 group-hover:text-white mb-1">{totalAssists}</p>
              <p className="text-[10px] font-black text-emerald-400 group-hover:text-emerald-100 uppercase tracking-tighter">تمريرات</p>
            </div>
            <div className="bg-yellow-50 p-6 rounded-2xl border-2 border-yellow-600 text-center hover:bg-yellow-500 hover:text-white transition-all group">
              <p className="text-3xl font-black text-yellow-600 group-hover:text-white mb-1">{totalYellows}</p>
              <p className="text-[10px] font-black text-yellow-400 group-hover:text-yellow-100 uppercase tracking-tighter">صفراء</p>
            </div>
            <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-600 text-center hover:bg-red-600 hover:text-white transition-all group">
              <p className="text-3xl font-black text-red-600 group-hover:text-white mb-1">{totalReds}</p>
              <p className="text-[10px] font-black text-red-400 group-hover:text-red-100 uppercase tracking-tighter">حمراء</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {!isStaff && (
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
            <h4 className="text-[10px] font-black text-blue-900 mb-6 flex items-center gap-2 uppercase tracking-widest"><BarChart3 size={14}/> منحنى التهديف (آخر 5 مباريات)</h4>
            <div className="flex-1 flex items-end justify-between gap-2 h-32 px-2">
              {last5Matches.length > 0 ? last5Matches.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                   <div className="relative w-full flex flex-col items-center">
                      <div style={{ height: `${(m.goals / maxGoals) * 100}%`, minHeight: m.goals > 0 ? '10px' : '2px' }} className={`w-full max-w-[24px] rounded-t-lg transition-all duration-500 shadow-lg ${m.goals > 0 ? 'bg-orange-500 group-hover:bg-blue-900' : 'bg-slate-100'}`}></div>
                      {m.goals > 0 && <span className="absolute -top-5 text-[9px] font-black text-orange-600">{m.goals}</span>}
                   </div>
                   <span className="text-[7px] font-black text-slate-400 truncate w-full text-center">{m.match.opponent}</span>
                </div>
              )) : <div className="w-full text-center text-[10px] text-slate-300 italic mb-10">لا يوجد بيانات مسجلة</div>}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
          <h4 className="text-[10px] font-black text-emerald-600 mb-6 flex items-center gap-2 uppercase tracking-widest"><PieChart size={14}/> توزيع الانضباط العام</h4>
          <div className="flex-1 flex items-center justify-around gap-4">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3"></circle>
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray={`${attendanceRate} ${100 - attendanceRate}`} strokeDashoffset="0"></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-emerald-600">{attendanceRate}%</span>
                <span className="text-[7px] font-black text-slate-400">التزام</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[8px] font-black text-slate-600">حضور: {presentCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                <span className="text-[8px] font-black text-slate-600">تأخر: {lateCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-[8px] font-black text-slate-600">غياب: {absentCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col">
          <h4 className="text-[10px] font-black text-red-600 mb-6 flex items-center gap-2 uppercase tracking-widest"><AlertTriangle size={14}/> سجل المخالفات</h4>
          <div className="flex-1 flex items-center justify-center gap-10">
             <div className="text-center group">
                <div className="w-10 h-14 bg-yellow-400 rounded-lg shadow-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                   <span className="text-white font-black text-xl">{totalYellows}</span>
                </div>
                <span className="text-[8px] font-black text-slate-400">صفراء</span>
             </div>
             <div className="text-center group">
                <div className="w-10 h-14 bg-red-600 rounded-lg shadow-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                   <span className="text-white font-black text-xl">{totalReds}</span>
                </div>
                <span className="text-[8px] font-black text-slate-400">حمراء</span>
             </div>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center no-print">
         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">المسؤول عن مراجعة التقرير: {state.currentUser.username}</p>
      </div>
    </div>
  );
};

export default PlayerReport;
