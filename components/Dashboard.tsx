
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Calendar, Trophy, Clock, MapPin, AlertCircle, ChevronLeft, 
  ShieldAlert, Filter, Printer, FileText, ClipboardCheck, Zap, 
  Activity, TrendingUp, Search, X, BellRing, AlertTriangle, Timer, Edit, Save, Loader2, Package 
} from 'lucide-react';
import { AppState, Person, Match, TrainingSession } from '../types';

interface DashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onMatchClick: (id: string) => void;
  onSessionClick: (id: string) => void;
  onPlayerClick?: (player: Person) => void;
}

// مكون العداد التنازلي الحي المستقل لكل بطاقة
const ActivityCountdown: React.FC<{ date: string; time: string }> = ({ date, time }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(`${date}T${time}`);
      const now = new Date();
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

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

  if (!timeLeft) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full animate-pulse border border-emerald-200">
        <Zap size={14} />
        <span className="text-[10px] font-black uppercase">النشاط جارٍ</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center text-[#001F3F] bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100 shadow-inner">
      <div className="flex flex-col items-center">
        <span className="text-sm font-black tabular-nums">{timeLeft.d}</span>
        <span className="text-[7px] font-bold opacity-50 uppercase">يوم</span>
      </div>
      <span className="font-bold opacity-20">:</span>
      <div className="flex flex-col items-center">
        <span className="text-sm font-black tabular-nums">{String(timeLeft.h).padStart(2, '0')}</span>
        <span className="text-[7px] font-bold opacity-50 uppercase">سا</span>
      </div>
      <span className="font-bold opacity-20">:</span>
      <div className="flex flex-col items-center">
        <span className="text-sm font-black tabular-nums">{String(timeLeft.m).padStart(2, '0')}</span>
        <span className="text-[7px] font-bold opacity-50 uppercase">د</span>
      </div>
      <span className="font-bold opacity-20">:</span>
      <div className="flex flex-col items-center">
        <span className="text-sm font-black tabular-nums text-orange-600">{String(timeLeft.s).padStart(2, '0')}</span>
        <span className="text-[7px] font-bold opacity-50 uppercase">ث</span>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ state, setState, onMatchClick, onSessionClick, onPlayerClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [quickEditMatch, setQuickEditMatch] = useState<Match | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA');
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString('en-CA');

  const globalFilter = state.globalCategoryFilter;
  const isManager = state.currentUser?.role === 'مدير';

  // جلب المباريات القادمة بناءً على الفلتر المختار
  const upcomingMatches = useMemo(() => {
    return state.matches
      .filter(m => {
        const matchCat = (globalFilter === 'الكل' || m.category === globalFilter);
        if (!matchCat || m.isCompleted) return false;
        if (m.date < todayStr) return false;
        if (m.date === todayStr && m.time < currentTime) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [state.matches, globalFilter, todayStr, currentTime]);

  // جلب التمارين القادمة بناءً على الفلتر المختار
  const upcomingSessions = useMemo(() => {
    return state.sessions
      .filter(s => {
        const sessCat = (globalFilter === 'الكل' || s.category === globalFilter);
        if (!sessCat || s.isCompleted) return false;
        if (s.date < todayStr) return false;
        if (s.date === todayStr && s.time < currentTime) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [state.sessions, globalFilter, todayStr, currentTime]);

  const hasMatchTomorrow = state.matches.some(m => m.date === tomorrowStr && !m.isCompleted && (globalFilter === 'الكل' || m.category === globalFilter));
  const hasSessionTomorrow = state.sessions.some(s => s.date === tomorrowStr && !s.isCompleted && (globalFilter === 'الكل' || s.category === globalFilter));

  const searchResults = searchTerm.length > 1 
    ? state.people.filter(p => p.name.includes(searchTerm) || p.number?.toString() === searchTerm).slice(0, 5)
    : [];

  const handleQuickSaveMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditMatch) return;
    setIsSavingEdit(true);
    
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        matches: prev.matches.map(m => m.id === quickEditMatch.id ? quickEditMatch : m)
      }));
      setQuickEditMatch(null);
      setIsSavingEdit(false);
    }, 500);
  };

  const stats = [
    { label: 'الكوادر المسجلة', value: state.people.filter(p => globalFilter === 'الكل' || p.category === globalFilter).length, icon: Users, color: '#001F3F', textColor: '#FF6B00' },
    { label: 'الأنشطة المجدولة', value: upcomingMatches.length + upcomingSessions.length, icon: Activity, color: '#FF6B00', textColor: '#FFFFFF' },
    { label: 'المخزون العام', value: state.warehouse.length, icon: Package, color: '#FFFFFF', textColor: '#001F3F' },
  ];

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 px-2 md:px-0 pb-20">
      
      {/* 1. البحث السريع والفلتر الذكي للمدير */}
      <div className="relative z-[60] no-print max-w-4xl mx-auto space-y-4">
         <div className="flex flex-col md:flex-row gap-4">
            {/* مربع البحث */}
            <div className="flex-1 solid-panel !rounded-[2.5rem] p-1 flex items-center border-4 border-[#001F3F] overflow-hidden shadow-2xl transition-all focus-within:border-orange-600">
                <div className="p-5"><Search size={28} className="text-[#001F3F]" /></div>
                <input 
                type="text" 
                placeholder="البحث السريع عن ملف لاعب أو إداري..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent py-4 font-black text-lg md:text-xl outline-none text-[#001F3F] placeholder:text-slate-300"
                />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="p-5 text-slate-400 hover:text-red-500"><X size={24}/></button>}
            </div>

            {/* فلتر المدير المخصص */}
            {isManager && (
              <div className="md:w-72 solid-panel !rounded-[2.5rem] p-1 flex items-center border-4 border-orange-600 bg-[#001F3F] overflow-hidden shadow-2xl">
                 <div className="p-5 text-orange-400"><Filter size={24}/></div>
                 <select 
                   value={state.globalCategoryFilter}
                   onChange={e => setState(prev => ({ ...prev, globalCategoryFilter: e.target.value }))}
                   className="flex-1 bg-transparent py-4 font-black text-lg text-white outline-none cursor-pointer appearance-none"
                 >
                    <option value="الكل" className="text-slate-900">كل الفئات</option>
                    {state.categories.map(c => <option key={c} value={c} className="text-slate-900">{c}</option>)}
                 </select>
              </div>
            )}
         </div>

         {searchResults.length > 0 && (
           <div className="absolute top-full left-0 right-0 mt-3 bg-white border-4 border-[#001F3F] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
              {searchResults.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => { onPlayerClick?.(p); setSearchTerm(''); }}
                  className="w-full p-5 flex items-center justify-between border-b-2 border-slate-50 hover:bg-slate-50 text-right transition-colors"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-[#001F3F] text-white rounded-2xl flex items-center justify-center font-black text-xl border-2 border-orange-600 shadow-lg">#{p.number || '0'}</div>
                    <div className="text-right">
                      <p className="font-black text-xl text-[#001F3F]">{p.name}</p>
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{p.role} | {p.category}</p>
                    </div>
                  </div>
                  <ChevronLeft size={24} className="text-slate-200"/>
                </button>
              ))}
           </div>
         )}
      </div>

      {/* 2. شريط التنبيهات الذكي */}
      {(hasMatchTomorrow || hasSessionTomorrow) && (
        <div className="bg-white border-4 border-orange-600 rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-top-6 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden border-b-[16px]">
           <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full -mr-16 -mt-16"></div>
           <div className="flex items-center gap-6 relative z-10">
              <div className="bg-orange-600 p-5 rounded-3xl text-white animate-bounce shadow-lg">
                 <BellRing size={36} />
              </div>
              <div className="text-right">
                 <h3 className="text-2xl md:text-3xl font-black text-[#001F3F] tracking-tighter">تنبيه المهام الميدانية المجدولة لغدٍ</h3>
                 <div className="flex flex-wrap gap-3 mt-3">
                    {hasMatchTomorrow && (
                      <span className="bg-orange-600 text-white px-5 py-2 rounded-2xl font-black text-xs uppercase flex items-center gap-2 border-b-4 border-orange-900 shadow-md">
                        <Trophy size={16}/> مباراة رسمية مبرمجة
                      </span>
                    )}
                    {hasSessionTomorrow && (
                      <span className="bg-[#001F3F] text-white px-5 py-2 rounded-2xl font-black text-xs uppercase flex items-center gap-2 border-b-4 border-black shadow-md">
                        <Calendar size={16}/> تمرين رياضي مبرمج
                      </span>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 3. الإحصائيات المركزية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="group relative" style={{ color: s.textColor }}>
             <div className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] border-4 border-[#001F3F] flex flex-col items-center shadow-xl transition-all hover:-translate-y-2 active:scale-95" style={{ backgroundColor: s.color }}>
                <div className="p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] mb-2 md:mb-6 border-4 border-current">
                   <s.icon size={32} className="md:w-[56px] md:h-[56px]" />
                </div>
                <h3 className="text-[10px] md:text-[14px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">{s.label}</h3>
                <p className="text-3xl md:text-8xl font-black tabular-nums">{s.value}</p>
             </div>
          </div>
        ))}
      </div>

      {/* 4. تغذية الأنشطة القادمة */}
      <div className="space-y-12">
        {/* قسم المباريات القادمة */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-r-8 border-orange-600 pr-6">
             <div>
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase">المباريات القادمة</h2>
             </div>
             <div className="bg-[#001F3F] px-6 py-2 rounded-2xl text-white font-black text-xs border-2 border-orange-600 shadow-lg tabular-nums">إجمالي: {upcomingMatches.length}</div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 max-h-[800px] overflow-y-auto custom-scrollbar pr-3">
            {upcomingMatches.map(m => (
              <div key={m.id} className="bg-white p-8 rounded-[3rem] border-4 border-[#001F3F] shadow-2xl relative overflow-hidden group transition-all hover:border-orange-600 border-b-[16px]">
                 <div className="absolute top-0 right-0 w-2.5 h-full bg-orange-600"></div>
                 <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                       <div className="bg-orange-100 p-3 rounded-2xl text-orange-600 shadow-inner group-hover:bg-orange-600 group-hover:text-white transition-colors">
                          <Trophy size={28}/>
                       </div>
                       <div>
                          <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase border-2 border-slate-900 block w-fit">{m.matchType}</span>
                          <span className="text-[11px] font-black text-slate-400 mt-1 block tracking-tighter tabular-nums">{m.date} | {m.time}</span>
                       </div>
                    </div>
                    <ActivityCountdown date={m.date} time={m.time} />
                 </div>
                 <h4 className="text-2xl md:text-3xl font-black text-[#001F3F] mb-2 line-clamp-1 leading-tight">الكرامة × {m.opponent}</h4>
                 <p className="text-[11px] font-black text-orange-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <MapPin size={14}/> {m.category} | {m.pitch}
                 </p>
                 
                 <div className="flex gap-3 pt-6 border-t-2 border-slate-50">
                    <button 
                      onClick={() => setQuickEditMatch(m)} 
                      className="flex-1 bg-white border-2 border-[#001F3F] text-[#001F3F] py-4 rounded-2xl font-black text-[11px] uppercase flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all shadow-md"
                    >
                       <Edit size={16}/> تعديل سريع
                    </button>
                    <button 
                      onClick={() => onMatchClick(m.id)} 
                      className="flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-all border-b-4 border-black/30 group-hover:scale-[1.02]"
                    >
                       عرض التقرير الفني <ChevronLeft size={16}/>
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </section>

        {/* قسم التمارين القادمة */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-r-8 border-blue-600 pr-6">
             <div>
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase">التمارين والأنشطة</h2>
             </div>
             <div className="bg-[#001F3F] px-6 py-2 rounded-2xl text-white font-black text-xs border-2 border-blue-600 shadow-lg tabular-nums">إجمالي: {upcomingSessions.length}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 max-h-[800px] overflow-y-auto custom-scrollbar pr-3">
            {upcomingSessions.map(s => (
              <div key={s.id} className="bg-white p-8 rounded-[3rem] border-4 border-[#001F3F] shadow-2xl relative overflow-hidden group transition-all hover:border-blue-600 border-b-[16px]">
                 <div className="absolute top-0 right-0 w-2.5 h-full bg-blue-600"></div>
                 <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                       <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Calendar size={28}/>
                       </div>
                       <div>
                          <span className="bg-blue-900 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase border-2 border-blue-900 block w-fit">{s.category}</span>
                          <span className="text-[11px] font-black text-slate-400 mt-1 block tracking-tighter tabular-nums">{s.date} | {s.time}</span>
                       </div>
                    </div>
                    <ActivityCountdown date={s.date} time={s.time} />
                 </div>
                 <h4 className="text-2xl md:text-3xl font-black text-[#001F3F] mb-2 line-clamp-1 leading-tight">{s.objective}</h4>
                 <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <MapPin size={14}/> {s.pitch || 'ملعب النادي المعتمد'}
                 </p>
                 
                 <div className="flex gap-3 pt-6 border-t-2 border-slate-50">
                    <button 
                      onClick={() => onSessionClick(s.id)} 
                      className="w-full bg-[#001F3F] text-white py-4 rounded-2xl font-black text-[11px] uppercase flex items-center justify-center gap-3 shadow-xl hover:bg-black transition-all border-b-4 border-black group-hover:scale-[1.02]"
                    >
                       <ClipboardCheck size={18}/> رصد الحضور الفوري <ChevronLeft size={16}/>
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* نافذة التعديل السريع */}
      {quickEditMatch && (
        <div className="fixed inset-0 bg-[#001F3F]/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-4">
           <div className="bg-white rounded-[4rem] w-full max-w-xl border-[10px] border-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-[#001F3F] p-10 flex justify-between items-center border-b-8 border-orange-600">
                 <div className="flex items-center gap-5 text-white">
                    <Trophy className="text-orange-600" size={48} />
                    <h4 className="font-black text-2xl tracking-tighter uppercase">تعديل مواجهة: {quickEditMatch.opponent}</h4>
                 </div>
                 <button onClick={() => setQuickEditMatch(null)} className="text-white hover:rotate-90 transition-all hover:bg-white/10 p-2 rounded-full"><X size={36}/></button>
              </div>

              <form onSubmit={handleQuickSaveMatch} className="p-10 space-y-8 text-right" dir="rtl">
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">نتيجة الكرامة</label>
                       <input type="number" value={quickEditMatch.ourScore} onChange={e => setQuickEditMatch({...quickEditMatch, ourScore: e.target.value})} className="w-full bg-slate-50 border-4 border-[#001F3F] rounded-[2rem] p-6 text-center text-5xl font-black text-[#001F3F] shadow-inner focus:border-orange-600 transition-all outline-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">نتيجة الخصم</label>
                       <input type="number" value={quickEditMatch.opponentScore} onChange={e => setQuickEditMatch({...quickEditMatch, opponentScore: e.target.value})} className="w-full bg-slate-50 border-4 border-slate-200 rounded-[2rem] p-6 text-center text-5xl font-black text-slate-600 shadow-inner focus:border-[#001F3F] transition-all outline-none" />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">موقع المباراة / الملعب</label>
                    <div className="relative">
                       <MapPin className="absolute right-5 top-1/2 -translate-y-1/2 text-orange-600" size={24} />
                       <input type="text" value={quickEditMatch.pitch} onChange={e => setQuickEditMatch({...quickEditMatch, pitch: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 rounded-[1.5rem] py-5 pr-14 pl-6 font-black text-lg outline-none focus:border-orange-600" />
                    </div>
                 </div>

                 <button 
                  type="submit" 
                  disabled={isSavingEdit}
                  className="w-full bg-[#001F3F] text-white py-6 rounded-[3rem] font-black text-xl flex items-center justify-center gap-4 hover:bg-black transition-all border-b-8 border-black shadow-2xl"
                 >
                    {isSavingEdit ? <Loader2 className="animate-spin" size={32}/> : <Save size={32} className="text-orange-600"/>}
                    تثبيت التعديلات
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
