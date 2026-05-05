
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Calendar, Trophy, Clock, MapPin, Zap, 
  Activity, Search, Package, WalletCards
} from 'lucide-react';
import { AppState, Person, Match, TrainingSession } from '../types';

interface DashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onMatchClick: (id: string) => void;
  onSessionClick: (id: string) => void;
  onPlayerClick?: (player: Person) => void;
}

const ActivityCountdown: React.FC<{ date: string; time: string }> = ({ date, time }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(`${date}T${time}`);
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / (1000 * 60)) % 60),
        s: Math.floor((diff / 1000) % 60)
      });
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [date, time]);

  if (!timeLeft) return (
    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
      <Zap size={12} /> النشاط جارٍ
    </div>
  );

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

const Dashboard: React.FC<DashboardProps> = ({ state, setState, onMatchClick, onSessionClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const globalFilter = state.globalCategoryFilter;
  const isManager = state.currentUser?.role === 'مدير';
  const isViewer = state.currentUser?.role === 'مشاهد';
  const restrictedCat = state.currentUser?.restrictedCategory;
  
  const canSwitchCategory = isManager || (isViewer && !restrictedCat);

  const todayStr = new Date().toLocaleDateString('en-CA');

  const upcomingMatches = useMemo(() => {
    return state.matches.filter(m => (globalFilter === 'الكل' || m.category === globalFilter) && !m.isCompleted && m.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [state.matches, globalFilter, todayStr]);

  const upcomingSessions = useMemo(() => {
    return state.sessions.filter(s => (globalFilter === 'الكل' || s.category === globalFilter) && !s.isCompleted && s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [state.sessions, globalFilter, todayStr]);

  const stats = [
    { label: 'الكوادر واللاعبين', value: state.people.filter(p => globalFilter === 'الكل' || p.category === globalFilter).length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'الأنشطة المجدولة', value: upcomingMatches.length + upcomingSessions.length, icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'أصناف المستودع', value: state.warehouse.length, icon: Package, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row gap-4 items-center">
         <div className="flex-1 w-full relative group">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input type="text" placeholder="البحث في EAGLE OS..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-4 pr-14 pl-6 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-orange-500/10 transition-all shadow-sm text-sm" />
         </div>
         {canSwitchCategory && (
           <select value={state.globalCategoryFilter} onChange={e => setState(prev => ({ ...prev, globalCategoryFilter: e.target.value }))}
             className="w-full lg:w-72 bg-white border border-slate-200 rounded-2xl p-4 font-bold text-blue-900 cursor-pointer outline-none hover:bg-slate-50 transition-all shadow-sm text-sm">
              <option value="الكل">جميع فئات النادي</option>
              {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
         )}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                       <ActivityCountdown date={m.date} time={m.time} />
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
                       <ActivityCountdown date={s.date} time={s.time} />
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
    </div>
  );
};

export default Dashboard;
