
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Calendar, Trophy, Clock, MapPin, Zap, 
  Activity, Search, Package, WalletCards, Bot, Loader2, BarChart2, MessageCircle
} from 'lucide-react';
import { AppState, Person, Match, TrainingSession } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { SeasonCalendar } from './SeasonCalendar';

interface DashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onMatchClick: (id: string) => void;
  onSessionClick: (id: string) => void;
  onPlayerClick?: (player: Person) => void;
}

const ActivityCountdown: React.FC<{ date: string; time: string; durationMins?: number }> = ({ date, time, durationMins = 90 }) => {
  const [status, setStatus] = useState<'upcoming' | 'active' | 'ended'>('upcoming');
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(`${date}T${time || '00:00'}`);
      const end = new Date(start.getTime() + durationMins * 60000);
      const now = new Date();
      
      const diffStart = start.getTime() - now.getTime();
      const diffEnd = end.getTime() - now.getTime();

      if (diffStart > 0) {
        setStatus('upcoming');
        setTimeLeft({
          d: Math.floor(diffStart / (1000 * 60 * 60 * 24)),
          h: Math.floor((diffStart / (1000 * 60 * 60)) % 24),
          m: Math.floor((diffStart / (1000 * 60)) % 60),
          s: Math.floor((diffStart / 1000) % 60)
        });
      } else if (diffEnd >= 0) {
        setStatus('active');
        setTimeLeft(null);
      } else {
        setStatus('ended');
        setTimeLeft(null);
      }
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [date, time, durationMins]);

  if (status === 'ended') return null;

  if (status === 'active') return (
    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
      <Zap size={12} className="animate-pulse" /> النشاط جارٍ
    </div>
  );

  if (!timeLeft) return null;

  return (
    <div className="flex gap-2 items-center text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-col items-center"><span className="text-lg font-bold text-blue-900 tabular-nums leading-none">{timeLeft.d}</span><span className="text-[8px] uppercase tracking-tighter opacity-70 mt-1">يوم</span></div>
      <span className="opacity-20">:</span>
      <div className="flex flex-col items-center"><span className="text-lg font-bold text-blue-900 tabular-nums leading-none">{String(timeLeft.h).padStart(2, '0')}</span><span className="text-[8px] uppercase tracking-tighter opacity-50 mt-1">سا</span></div>
      <span className="opacity-20">:</span>
      <div className="flex flex-col items-center"><span className="text-lg font-bold text-blue-900 tabular-nums leading-none">{String(timeLeft.m).padStart(2, '0')}</span><span className="text-[8px] uppercase tracking-tighter opacity-50 mt-1">د</span></div>
      <span className="opacity-20">:</span>
      <div className="flex flex-col items-center"><span className="text-lg font-bold text-orange-600 tabular-nums leading-none">{String(timeLeft.s).padStart(2, '0')}</span><span className="text-[8px] uppercase tracking-tighter opacity-50 mt-1">ث</span></div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ state, setState, onMatchClick, onSessionClick, onPlayerClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [finYear, setFinYear] = useState(new Date().getFullYear().toString());
  const [finMonth, setFinMonth] = useState('الكل');

  const globalFilter = state.globalCategoryFilter;
  const isManager = state.currentUser?.role === 'مدير';
  const isViewer = state.currentUser?.role === 'مشاهد' || state.currentUser?.role === 'معالج';
  const restrictedCat = state.currentUser?.restrictedCategory;
  const allowedCategories = restrictedCat ? String(restrictedCat).split(',').filter(Boolean) : [];
  
  const canSwitchCategory = isManager || !restrictedCat || allowedCategories.length > 1;

  const searchResults = useMemo(() => {
     if (!searchTerm.trim()) return { people: [], matches: [] };
     const term = searchTerm.toLowerCase().trim();
     return {
        people: state.people.filter(p => (!restrictedCat || allowedCategories.includes(p.category)) && (p.name.includes(term) || (p.role && p.role.includes(term)) || (p.number && p.number.toString() === term))),
        matches: state.matches.filter(m => (!restrictedCat || allowedCategories.includes(m.category)) && (m.opponent.includes(term) || m.matchType.includes(term))),
     };
  }, [searchTerm, state.people, state.matches, restrictedCat, allowedCategories]);

  const handleAskAI = async () => {
      if (!searchTerm.trim()) return;
      setAiLoading(true);
      setAiResponse('');
      try {
          const filteredPeople = state.people.filter(p => !restrictedCat || allowedCategories.includes(p.category));
          const filteredPeopleIds = new Set(filteredPeople.map(p => p.id));
          
          const exportedData = {
              people: filteredPeople,
              matches: state.matches.filter(m => !restrictedCat || allowedCategories.includes(m.category)),
              sessions: state.sessions.filter(s => !restrictedCat || allowedCategories.includes(s.category)),
              attendance: state.attendance.filter(a => filteredPeopleIds.has(a.personId)),
              injuries: state.injuries.filter(i => filteredPeopleIds.has(i.personId)),
              warehouse: state.warehouse.filter(w => !restrictedCat || w.category === 'المخزن العام' || allowedCategories.includes(w.category)),
              tournaments: state.tournaments.filter(t => !restrictedCat || allowedCategories.includes(t.category)),
              tournamentTeams: state.tournamentTeams,
              tournamentStages: state.tournamentStages,
              tournamentMatches: state.tournamentMatches
          };
          
          // Use JSON for accurate querying of all relationships
          const summary = JSON.stringify(exportedData);
          
          const res = await fetch('/api/omnisearch', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ query: searchTerm, summary })
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          setAiResponse(data.text);
      } catch(e: any) {
          setAiResponse('عذراً، حدث خطأ أثناء الاتصال بمُحلل النظام (تأكد من إعداد GEMINI_API_KEY): ' + e.message);
      } finally {
          setAiLoading(false);
      }
  };

  const threshold = new Date(new Date().getTime() - 60 * 60 * 1000); // 1 hour ago
  
  // Format today's date as YYYY-MM-DD in local time
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const todayDate = new Date(today.getTime() - offset).toISOString().split('T')[0];

  const parseDateTime = (date: string, time?: string) => {
    return new Date(`${date}T${time || '00:00'}`);
  };

  const upcomingMatches = useMemo(() => {
    const now = new Date();
    return state.matches.filter(m => {
      const matchStart = parseDateTime(m.date, m.time);
      const matchDurationMins = parseInt(m.matchDuration || '90') + parseInt(m.stoppageTime1 || '0') + parseInt(m.stoppageTime2 || '0') + 15; // ~15m half time break
      const matchEnd = new Date(matchStart.getTime() + matchDurationMins * 60000);
      return (!m.season || m.season === state.activeSeason) && (!restrictedCat || allowedCategories.includes(m.category)) && (globalFilter === 'الكل' || m.category === globalFilter) && !m.isCompleted && matchEnd >= now;
    }).sort((a, b) => parseDateTime(a.date, a.time).getTime() - parseDateTime(b.date, b.time).getTime());
  }, [state.matches, globalFilter, restrictedCat, allowedCategories, state.activeSeason]);

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return state.sessions.filter(s => {
      const sessionStart = parseDateTime(s.date, s.time);
      const sessionDurationMins = parseInt((s as any).duration || '90');
      const sessionEnd = new Date(sessionStart.getTime() + sessionDurationMins * 60000);
      return (!s.season || s.season === state.activeSeason) && (!restrictedCat || allowedCategories.includes(s.category)) && (globalFilter === 'الكل' || s.category === globalFilter) && !s.isCompleted && sessionEnd >= now;
    }).sort((a, b) => parseDateTime(a.date, a.time).getTime() - parseDateTime(b.date, b.time).getTime());
  }, [state.sessions, globalFilter, restrictedCat, allowedCategories, state.activeSeason]);

  const expiringContracts = useMemo(() => {
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);

    return state.people.filter(p => {
      if (!p.contractEnd) return false;
      const end = new Date(p.contractEnd);
      return (!restrictedCat || allowedCategories.includes(p.category)) && (globalFilter === 'الكل' || p.category === globalFilter) && end > now && end <= threeMonthsFromNow;
    }).sort((a, b) => new Date(a.contractEnd!).getTime() - new Date(b.contractEnd!).getTime());
  }, [state.people, globalFilter, restrictedCat, allowedCategories]);

  const subscriptionAlerts = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getFullYear() * 12 + now.getMonth();
    const currentDay = now.getDate();

    return state.people.filter(p => {
      if (p.role !== 'لاعب' || !p.isAcademyPlayer || !p.subscriptionMonth) return false;
      const [year, month] = p.subscriptionMonth.split('-').map(Number);
      const subMonth = year * 12 + (month - 1);
      
      const isExpired = subMonth < currentMonth;
      const isExpiringSoon = subMonth === currentMonth && currentDay >= 22;

      return (!restrictedCat || allowedCategories.includes(p.category)) && 
             (globalFilter === 'الكل' || p.category === globalFilter) && 
             (isExpired || isExpiringSoon);
    }).map(p => {
      const [year, month] = p.subscriptionMonth!.split('-').map(Number);
      const subMonth = year * 12 + (month - 1);
      return {
        ...p,
        isExpired: subMonth < currentMonth
      };
    });
  }, [state.people, globalFilter, restrictedCat, allowedCategories]);

  const financialStats = useMemo(() => {
    const players = state.people.filter(p => p.role === 'لاعب' && p.isAcademyPlayer && (!restrictedCat || allowedCategories.includes(p.category)) && (globalFilter === 'الكل' || p.category === globalFilter));
    let totalSubs = 0;
    let totalKits = 0;
    let kitsCount = 0;

    players.forEach(p => {
      if (p.subscriptionAmount) totalSubs += parseFloat(p.subscriptionAmount) || 0;
      if (p.receivedKit) {
        kitsCount++;
        if (p.kitAmount) totalKits += parseFloat(p.kitAmount) || 0;
      }
    });

    return { totalPlayers: players.length, totalSubs, totalKits, kitsCount };
  }, [state.people, restrictedCat, allowedCategories, globalFilter]);

  const monthlyFinancialData = useMemo(() => {
    const players = state.people.filter(p => p.role === 'لاعب' && p.isAcademyPlayer && (!restrictedCat || allowedCategories.includes(p.category)) && (globalFilter === 'الكل' || p.category === globalFilter));
    
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    return months.map((m, index) => {
      const monthStr = `${finYear}-${m}`;
      let subs = 0;
      let kits = 0;
      
      players.forEach(p => {
        if (p.subscriptionMonth === monthStr) {
          if (p.subscriptionAmount) subs += parseFloat(p.subscriptionAmount) || 0;
        }
        if (p.receivedKit && p.registrationDate && p.registrationDate.startsWith(monthStr)) {
          if (p.kitAmount) kits += parseFloat(p.kitAmount) || 0;
        }
      });
      
      return {
        name: monthNames[index],
        monthValue: m,
        'الاشتراكات': subs,
        'اللباس': kits,
      };
    }).filter(d => finMonth === 'الكل' || d.monthValue === finMonth);
  }, [state.people, restrictedCat, allowedCategories, globalFilter, finYear, finMonth]);

  const seasonalPerformance = useMemo(() => {
    const catsToEvaluate = state.categories.filter(c => 
      (!restrictedCat || allowedCategories.includes(c)) && 
      (globalFilter === 'الكل' || c === globalFilter)
    );

    const now = new Date();
    
    return catsToEvaluate.map(cat => {
      const players = state.people.filter(p => p.category === cat && p.role === 'لاعب');
      let avgAge = 0;
      if (players.length > 0) {
        let totalAge = 0;
        let validPlayers = 0;
        players.forEach(p => {
          if (p.birthDate) {
            const bYear = parseInt(p.birthDate.split('-')[0]);
            if (!isNaN(bYear)) {
               totalAge += (now.getFullYear() - bYear);
               validPlayers++;
            }
          }
        });
        if (validPlayers > 0) avgAge = totalAge / validPlayers;
      }

      const categoryMatches = state.matches.filter(m => m.category === cat && m.isCompleted && (!m.season || m.season === state.activeSeason));
      const playedMatches = categoryMatches.length;
      let wins = 0;
      categoryMatches.forEach(m => {
        const ourScore = parseInt(m.ourScore || '0');
        const opponentScore = parseInt(m.opponentScore || '0');
        if (!isNaN(ourScore) && !isNaN(opponentScore) && ourScore > opponentScore) wins++;
      });
      const winRate = playedMatches > 0 ? (wins / playedMatches) * 100 : 0;

      return {
        category: cat,
        'متوسط العمر (سنة)': parseFloat(avgAge.toFixed(1)),
        'مباريات ملعوبة': playedMatches,
        'نسبة الفوز (%)': parseFloat(winRate.toFixed(1))
      };
    });
  }, [state.categories, state.people, state.matches, restrictedCat, allowedCategories, globalFilter, state.activeSeason]);

  const attendanceStats = useMemo(() => {
    const catsToEvaluate = state.categories.filter(c => 
      (!restrictedCat || allowedCategories.includes(c)) && 
      (globalFilter === 'الكل' || c === globalFilter)
    );

    return catsToEvaluate.map(cat => {
      const sessions = state.sessions.filter(s => s.category === cat && (!s.season || s.season === state.activeSeason));
      const sessionIds = sessions.map(s => s.id);
      
      const records = state.attendance.filter(a => sessionIds.includes(a.sessionId));
      
      const total = records.length;
      const present = records.filter(r => r.status === 'حاضر').length;
      const late = records.filter(r => r.status === 'متأخر').length;
      const absent = records.filter(r => r.status === 'غائب').length;
      const excused = records.filter(r => r.status === 'غياب بعذر').length;

      const attendanceRate = total > 0 ? ((present + late) / total) * 100 : 0;

      return {
        category: cat,
        'نسبة الحضور (%)': parseFloat(attendanceRate.toFixed(1)),
        'حاضر': present,
        'متأخر': late,
        'غائب': absent,
        'غياب بعذر': excused
      };
    }).filter(s => s['حاضر'] > 0 || s['غائب'] > 0 || s['متأخر'] > 0 || s['غياب بعذر'] > 0);
  }, [state.categories, state.sessions, state.attendance, restrictedCat, allowedCategories, globalFilter, state.activeSeason]);

  const playerRoleStats = useMemo(() => {
    const people = state.people.filter(p => (!restrictedCat || allowedCategories.includes(p.category)) && (globalFilter === 'الكل' || p.category === globalFilter));
    const roles = ['لاعب', 'مدرب', 'إداري', 'معالج', 'مسؤول تجهيزات', 'مشاهد'];
    const data = roles.map(role => ({
      name: role,
      value: people.filter(p => p.role === role).length
    })).filter(r => r.value > 0);
    return data;
  }, [state.people, restrictedCat, allowedCategories, globalFilter]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

  const isAcademyMode = state.appMode === 'academy';

  const stats = [
    { label: 'الكوادر واللاعبين', value: state.people.filter(p => (!restrictedCat || allowedCategories.includes(p.category)) && (globalFilter === 'الكل' || p.category === globalFilter)).length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    ...(isAcademyMode ? [
      { label: 'طلاب الأكاديمية (اللاعبين)', value: financialStats.totalPlayers, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
      { label: 'إجمالي الاشتراكات', value: financialStats.totalSubs.toLocaleString() + ' $', icon: WalletCards, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
      { label: 'إجمالي مبلغ اللباس', value: financialStats.totalKits.toLocaleString() + ' $', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10' },
      { label: 'اللاعبين المستلمين لباس', value: financialStats.kitsCount, icon: Package, color: 'text-rose-500', bg: 'bg-rose-500/10' }
    ] : [
      { label: 'الأنشطة المجدولة', value: upcomingMatches.length + upcomingSessions.length, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
      { label: 'أصناف المستودع', value: state.warehouse.filter(w => (!restrictedCat || allowedCategories.includes(w.category)) && (globalFilter === 'الكل' || w.category === globalFilter)).length, icon: Package, color: 'text-purple-500', bg: 'bg-purple-500/10' }
    ])
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
         <div className="flex-1 w-full relative group">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input type="text" placeholder="البحث في EAGLE OS (Omni-Search)..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); if(!e.target.value) setAiResponse(''); }} onKeyDown={e => e.key === 'Enter' && handleAskAI()}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pr-14 pl-6 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-orange-500/10 transition-all shadow-sm text-sm" />
         </div>
         {canSwitchCategory && (
           <select value={state.globalCategoryFilter} onChange={e => setState(prev => ({ ...prev, globalCategoryFilter: e.target.value }))}
             className="w-full lg:w-72 bg-white border border-slate-200 rounded-2xl p-4 font-bold text-blue-900 cursor-pointer outline-none hover:bg-slate-50 transition-all shadow-sm text-sm">
              <option value="الكل">{restrictedCat ? 'الفئات المسموحة' : 'جميع فئات النادي'}</option>
              {(restrictedCat ? allowedCategories : state.categories).map(c => <option key={c} value={c}>{c}</option>)}
           </select>
         )}
      </div>

      {searchTerm.trim() ? (
        <div className="bg-white rounded-[2rem] border-2 border-slate-900 shadow-sm p-6 md:p-8 space-y-8 min-h-[400px]">
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b-2 border-slate-100 pb-6">
              <div>
                 <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Search size={20} className="text-orange-600"/> نتائج Omni-Search "{searchTerm}"</h2>
                 <p className="text-xs font-bold text-slate-500 mt-1">يتم البحث في جميع السجلات وقواعد البيانات السحابية...</p>
              </div>
              <button onClick={handleAskAI} disabled={aiLoading} className="bg-[#001F3F] text-white px-5 py-3 rounded-xl text-sm font-black hover:bg-black transition-all flex items-center justify-center gap-2 w-full md:w-auto shadow-md hover:shadow-lg disabled:opacity-50">
                 {aiLoading ? <Loader2 size={18} className="animate-spin text-orange-400"/> : <Bot size={18} className="text-orange-400"/>}
                 سؤال محلل Eagle OS الذكي
              </button>
           </div>

           {(aiResponse || aiLoading) && (
              <div className="bg-slate-50 border-2 border-[#001F3F] rounded-2xl p-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-2 h-full bg-orange-500"></div>
                 <div className="flex items-center gap-3 mb-4">
                    <div className="bg-[#001F3F] p-2 rounded-lg"><Bot size={20} className="text-orange-400"/></div>
                    <span className="font-black text-[#001F3F] tracking-tight text-lg">Eagle OS AI Analysis</span>
                 </div>
                 {aiLoading ? (
                    <div className="flex items-center gap-3 text-slate-500 font-bold text-sm animate-pulse">
                       <Loader2 size={16} className="animate-spin"/> جاري تمرير الاستعلام ومعالجة قواعد البيانات...
                    </div>
                 ) : (
                    <div className="text-slate-800 text-sm leading-relaxed font-medium whitespace-pre-wrap">
                       {aiResponse}
                    </div>
                 )}
              </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <h3 className="font-black text-slate-700 text-sm flex items-center gap-2 border-b border-slate-100 pb-2"><Users size={16}/> الكوادر واللاعبين المطابقين ({searchResults.people.length})</h3>
                 {searchResults.people.length === 0 ? <p className="text-xs text-slate-400 italic">لا توجد سجلات مطابقة</p> : (
                    <div className="space-y-2">
                       {searchResults.people.slice(0, 10).map(p => (
                          <div key={p.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center hover:border-orange-300 transition-colors cursor-pointer group" onClick={() => {} /* Ideally open profile */}>
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs">{p.name.charAt(0)}</div>
                                <div>
                                   <p className="font-bold text-slate-900 text-sm group-hover:text-orange-600 transition-colors">{p.name} {p.number && <span className="text-orange-500 text-xs">#{p.number}</span>}</p>
                                   <p className="text-[10px] text-slate-500 font-bold">{p.category} • {p.role}</p>
                                </div>
                             </div>
                          </div>
                       ))}
                       {searchResults.people.length > 10 && <p className="text-xs text-blue-600 font-bold text-center mt-2">.. والمزيد من النتائج</p>}
                    </div>
                 )}
              </div>

              <div className="space-y-4">
                 <h3 className="font-black text-slate-700 text-sm flex items-center gap-2 border-b border-slate-100 pb-2"><Trophy size={16}/> المباريات المطابقة ({searchResults.matches.length})</h3>
                 {searchResults.matches.length === 0 ? <p className="text-xs text-slate-400 italic">لا توجد سجلات مطابقة</p> : (
                    <div className="space-y-2">
                       {searchResults.matches.slice(0, 10).map(m => (
                          <div key={m.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center hover:border-orange-300 transition-colors cursor-pointer group" onClick={() => onMatchClick(m.id)}>
                             <div>
                                <p className="font-bold text-slate-900 text-sm group-hover:text-orange-600 transition-colors">ضد {m.opponent}</p>
                                <p className="text-[10px] text-slate-500 font-bold">{m.category} • {m.date} • {m.matchType}</p>
                             </div>
                             <span className={`px-2 py-1 rounded text-[10px] font-black ${m.isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                                {m.isCompleted ? 'ملعوبة' : 'قادمة'}
                             </span>
                          </div>
                       ))}
                       {searchResults.matches.length > 10 && <p className="text-xs text-blue-600 font-bold text-center mt-2">.. والمزيد من النتائج</p>}
                    </div>
                 )}
              </div>
           </div>
        </div>
      ) : (
      <>
      {expiringContracts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-700 font-bold">تنبيه انتهاء عقود لاعبين:</span>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {expiringContracts.map(p => (
              <li key={p.id} className="text-sm text-red-800 font-semibold cursor-pointer hover:underline" onClick={() => onPlayerClick?.(p)}>
                اللاعب {p.name} سينتهي عقده بتاريخ {p.contractEnd}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAcademyMode && subscriptionAlerts.length > 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-orange-700 font-bold">تنبيه اشتراكات اللاعبين:</span>
          </div>
          <ul className="space-y-2">
            {subscriptionAlerts.map(p => {
              const statusText = p.isExpired ? "انتهى اشتراكه عن شهر" : "اقترب موعد تجديد اشتراكه لشهر";
              const waText = p.isExpired
                ? `نذكركم بانتهاء اشتراك اللاعب ${p.name} للأكاديمية، يرجى تجديد الاشتراك وشكراً.`
                : `نذكركم باقتراب موعد تجديد اشتراك اللاعب ${p.name} للأكاديمية، يرجى تجديد الاشتراك وشكراً.`;
              const waLink = p.phone ? `https://wa.me/${p.phone}?text=${encodeURIComponent(waText)}` : null;
              
              return (
                <li key={p.id} className="text-sm text-orange-800 font-semibold flex flex-col sm:flex-row sm:items-center justify-between bg-orange-100/50 p-3 rounded-lg gap-3">
                  <span className="cursor-pointer hover:underline" onClick={() => onPlayerClick?.(p as any)}>
                    اللاعب {p.name} ({statusText} {p.subscriptionMonth})
                  </span>
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-600 transition-colors shrink-0">
                      <MessageCircle size={14} /> مراسلة الأهل عبر واتساب
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
         <div className="space-y-6">
            <div className="flex items-center gap-3 border-r-4 border-orange-500 pr-4">
               <h2 className="text-xl font-bold text-blue-900 tracking-tight uppercase">مباريات EAGLE OS المرتقبة</h2>
               <div className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded shadow-sm">{upcomingMatches.length}</div>
            </div>
            <div className="space-y-4">
               {upcomingMatches.map(m => (
                 <div key={m.id} className="modern-card p-6 hover:border-orange-500 transition-all cursor-pointer group" onClick={() => onMatchClick(m.id)}>
                    <div className="flex justify-between items-center mb-6">
                       <div className="flex items-center gap-3">
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-200">{m.matchType}</span>
                          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">{m.category}</span>
                          <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-100">{m.isHome ? 'أرضنا' : 'خارج أرضنا'}</span>
                       </div>
                       <ActivityCountdown date={m.date} time={m.time} durationMins={parseInt(m.matchDuration || '90') + parseInt(m.stoppageTime1 || '0') + parseInt(m.stoppageTime2 || '0') + 15} />
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="flex-1 space-y-2">
                          <h3 className="text-lg font-bold text-blue-900 group-hover:text-orange-600 transition-colors">ضد {m.opponent}</h3>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2">
                            <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400"/> الملعب: {m.pitch || 'غير محدد'}</span>
                            <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-400"/> التاريخ: {m.date}</span>
                            <span className="flex items-center gap-1"><Clock size={12} className="text-slate-400"/> الوقت: {m.time}</span>
                          </div>
                          {m.advancePayment ? <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1"><WalletCards size={12}/> سلفة: {m.advancePayment} ل.س</p> : null}
                          {m.notes ? <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">ملاحظات: {m.notes}</p> : null}
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="space-y-6">
            <div className="flex items-center gap-3 border-r-4 border-blue-500 pr-4">
               <h2 className="text-xl font-bold text-blue-900 tracking-tight uppercase">أجندة التدريبات</h2>
               <div className="px-2 py-0.5 bg-blue-900 text-white text-[10px] font-bold rounded shadow-sm">{upcomingSessions.length}</div>
            </div>
            <div className="space-y-4">
               {upcomingSessions.map(s => (
                 <div key={s.id} className="modern-card p-6 hover:border-blue-500 transition-all cursor-pointer group" onClick={() => onSessionClick(s.id)}>
                    <div className="flex justify-between items-center mb-6">
                       <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-100">{s.category}</span>
                       <ActivityCountdown date={s.date} time={s.time} durationMins={parseInt((s as any).duration || '90')} />
                    </div>
                    <h3 className="text-lg font-bold text-blue-900 group-hover:text-blue-600 transition-colors mb-2">{s.objective}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-500 uppercase">
                        <span className="flex items-center gap-2"><Calendar size={14} className="text-slate-400"/> {s.date}</span>
                        <span className="flex items-center gap-2"><Clock size={14} className="text-slate-400"/> {s.time} ({s.duration} دقيقة)</span>
                        <span className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> {s.pitch || 'غير محدد'}</span>
                     </div>
                     <div className="mt-4 space-y-2">
                        {s.equipment && <p className="text-xs text-slate-600 flex items-center gap-2"><Package size={12}/> المعدات: {s.equipment}</p>}
                        {s.notes && <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">ملاحظات: {s.notes}</p>}
                     </div>
                  </div>
                ))}
             </div>
          </div>
       </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {stats.map((s, i) => (
          <div key={i} className="modern-card p-6 md:p-8 group hover:scale-[1.02] transition-all duration-300">
             <div className="flex items-center gap-4 md:gap-6">
                <div className={`p-4 rounded-2xl ${s.bg} ${s.color.replace('500', '600')} transition-colors group-hover:bg-blue-900 group-hover:text-white`}>
                   <s.icon size={28} className="md:w-8 md:h-8" />
                </div>
                <div>
                   <p className="text-[10px] md:text-xs font-bold text-slate-600 uppercase tracking-widest">{s.label}</p>
                   <p className="text-2xl md:text-4xl font-bold text-blue-950 tabular-nums mt-1">{s.value}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      {isAcademyMode && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-8 mb-10">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
             <h3 className="text-lg font-black text-blue-900 flex items-center gap-2">
                <WalletCards className="text-emerald-500" size={20} />
                الدخل الشهري والمصاريف
             </h3>
             <div className="flex items-center gap-2">
               <select 
                 className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                 value={finYear}
                 onChange={(e) => setFinYear(e.target.value)}
               >
                 {[0, 1, 2, 3].map(offset => {
                   const y = new Date().getFullYear() - offset;
                   return <option key={y} value={y.toString()}>{y}</option>;
                 })}
               </select>
               <select 
                 className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                 value={finMonth}
                 onChange={(e) => setFinMonth(e.target.value)}
               >
                 <option value="الكل">كل الأشهر</option>
                 {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m, i) => (
                   <option key={m} value={m}>{['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'][i]}</option>
                 ))}
               </select>
             </div>
           </div>
           <div className="h-80 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={monthlyFinancialData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="الاشتراكات" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="اللباس" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={24} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      )}

      {!isAcademyMode && seasonalPerformance.length > 0 && (
         <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-8 mb-10">
            <h3 className="text-lg font-black text-blue-900 flex items-center gap-2 mb-6">
               <BarChart2 className="text-blue-500" size={20} />
               تحليل الأداء الموسمي
            </h3>
            <div className="h-80 w-full" dir="ltr">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seasonalPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                     <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                     <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                     <YAxis yAxisId="right" orientation="right" stroke="#F97316" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                     <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                     <Legend wrapperStyle={{ paddingTop: '20px' }} />
                     <Bar yAxisId="left" dataKey="مباريات ملعوبة" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
                     <Bar yAxisId="right" dataKey="نسبة الفوز (%)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                     <Bar yAxisId="left" dataKey="متوسط العمر (سنة)" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      )}

      {attendanceStats.length > 0 && (
         <div className="grid grid-cols-1 gap-8 mb-10">
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-blue-900 flex items-center gap-2 mb-6">
                 <Activity className="text-orange-500" size={20} />
                 نسب ومعدلات الحضور
              </h3>
              <div className="h-80 w-full" dir="ltr">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                       <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                       <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 100]} />
                       <RechartsTooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                       <Legend wrapperStyle={{ paddingTop: '20px' }} />
                       <Bar dataKey="نسبة الحضور (%)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
         </div>
      )}
      
      <div className="mb-10">
        <SeasonCalendar state={state} onMatchClick={onMatchClick} onSessionClick={onSessionClick} />
      </div>
      
      </>
       )}
    </div>
  );
};

export default Dashboard;
