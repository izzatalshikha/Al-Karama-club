
import React, { useState, useMemo } from 'react';
import { Users, Calendar, Trophy, Clock, MapPin, AlertCircle, ChevronLeft, ShieldAlert, Filter, Printer, FileText, ClipboardCheck, Zap, Activity, TrendingUp, Search, X, BellRing, AlertTriangle } from 'lucide-react';
import { AppState, Person } from '../types';

interface DashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onMatchClick: (id: string) => void;
  onSessionClick: (id: string) => void;
  onPlayerClick?: (player: Person) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, setState, onMatchClick, onSessionClick, onPlayerClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // حساب الوقت الحالي والتاريخ بدقة
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  
  // حساب تاريخ الغد
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const globalFilter = state.globalCategoryFilter;
  const restrictedCat = state.currentUser?.restrictedCategory;

  // منطق تصفية المباريات القادمة (مع الإخفاء التلقائي بعد مرور الوقت)
  const upcomingMatches = state.matches
    .filter(m => {
      const matchCat = (globalFilter === 'الكل' || m.category === globalFilter);
      if (!matchCat || m.isCompleted) return false;
      
      // إخفاء إذا كان التاريخ قديماً
      if (m.date < todayStr) return false;
      // إخفاء إذا كان اليوم ولكن الوقت قد مضى
      if (m.date === todayStr && m.time < currentTime) return false;
      
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  // منطق تصفية التمارين القادمة (مع الإخفاء التلقائي بعد مرور الوقت)
  const upcomingSessions = state.sessions
    .filter(s => {
      const sessCat = (globalFilter === 'الكل' || s.category === globalFilter);
      if (!sessCat || s.isCompleted) return false;
      
      if (s.date < todayStr) return false;
      if (s.date === todayStr && s.time < currentTime) return false;
      
      return true;
    })
    .sort((a, b) => a.date.localeCompare(a.date) || a.time.localeCompare(b.time));

  // التحقق من وجود أنشطة غداً للتنبيه
  const hasMatchTomorrow = state.matches.some(m => m.date === tomorrowStr && !m.isCompleted && (globalFilter === 'الكل' || m.category === globalFilter));
  const hasSessionTomorrow = state.sessions.some(s => s.date === tomorrowStr && !s.isCompleted && (globalFilter === 'الكل' || s.category === globalFilter));

  const searchResults = searchTerm.length > 1 
    ? state.people.filter(p => p.name.includes(searchTerm) || p.number?.toString() === searchTerm).slice(0, 5)
    : [];

  const stats = [
    { label: 'الكوادر', value: state.people.filter(p => globalFilter === 'الكل' || p.category === globalFilter).length, icon: Users, color: '#001F3F', textColor: '#FF6B00' },
    { label: 'المواجهات', value: upcomingMatches.length, icon: Trophy, color: '#FF6B00', textColor: '#FFFFFF' },
    { label: 'التمارين', value: upcomingSessions.length, icon: Calendar, color: '#FFFFFF', textColor: '#001F3F' },
  ];

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-700 px-2 md:px-0">
      {/* 1. Global Search - New Feature */}
      <div className="relative z-[60] no-print">
         <div className="solid-panel !rounded-3xl p-1 flex items-center border-4 border-[#001F3F] overflow-hidden">
            <div className="p-4"><Search size={24} className="text-[#001F3F]" /></div>
            <input 
              type="text" 
              placeholder="بحث عالمي سريع عن لاعب أو موظف..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent py-4 font-black text-lg outline-none text-[#001F3F]"
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="p-4"><X size={20}/></button>}
         </div>
         {searchResults.length > 0 && (
           <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-[#001F3F] rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2">
              {searchResults.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => { onPlayerClick?.(p); setSearchTerm(''); }}
                  className="w-full p-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 text-right"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#001F3F] text-white rounded-xl flex items-center justify-center font-black">#{p.number || '0'}</div>
                    <div className="text-right">
                      <p className="font-black text-[#001F3F]">{p.name}</p>
                      <p className="text-[10px] font-black text-orange-600 uppercase">{p.role} | {p.category}</p>
                    </div>
                  </div>
                  <ChevronLeft size={18} className="text-slate-300"/>
                </button>
              ))}
           </div>
         )}
      </div>

      {/* شريط تنبيهات الأنشطة غداً - ميزة جديدة مطلوبة */}
      {(hasMatchTomorrow || hasSessionTomorrow) && (
        <div className="bg-white border-4 border-orange-600 rounded-[2rem] p-6 shadow-xl animate-in slide-in-from-top-4 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-24 h-24 bg-orange-600/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
           <div className="flex items-center gap-4 relative z-10">
              <div className="bg-orange-600 p-4 rounded-2xl text-white animate-bounce shadow-lg">
                 <BellRing size={28} />
              </div>
              <div className="text-right">
                 <h3 className="text-xl md:text-2xl font-black text-[#001F3F]">تنبيه الأنشطة المجدولة لغدٍ</h3>
                 <div className="flex flex-wrap gap-2 mt-2">
                    {hasMatchTomorrow && (
                      <span className="bg-orange-600 text-white px-4 py-1.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 border-b-4 border-orange-900 shadow-md">
                        <Trophy size={14}/> يوجد مباراة غداً
                      </span>
                    )}
                    {hasSessionTomorrow && (
                      <span className="bg-[#001F3F] text-white px-4 py-1.5 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 border-b-4 border-black shadow-md">
                        <Calendar size={14}/> يوجد تمرين غداً
                      </span>
                    )}
                 </div>
              </div>
           </div>
           <p className="text-[11px] font-black text-slate-500 max-w-xs leading-relaxed hidden md:block italic">
              "يرجى مراجعة قائمة الأجندة أدناه لمعرفة تفاصيل التوقيت والخصم أو أهداف الجلسة التدريبية."
           </p>
        </div>
      )}

      {/* 2. Top Header & Category Filter - Responsive */}
      <div className="dark-solid-panel p-4 md:p-8 flex flex-col md:flex-row justify-between items-center no-print gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <div className="bg-white p-3 rounded-2xl shadow-xl">
              <Zap size={24} className="text-[#001F3F] animate-pulse" />
           </div>
           <div>
              <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">لوحة التحكم</h2>
              <p className="text-[8px] md:text-[10px] font-black text-orange-400 uppercase mt-0.5">Football Intelligence System</p>
           </div>
        </div>

        {!restrictedCat && (
          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10 w-full md:w-auto">
            <span className="text-[9px] font-black text-white/60 mr-2 uppercase shrink-0">التصفية:</span>
            <select 
              value={globalFilter}
              onChange={e => setState(p => ({ ...p, globalCategoryFilter: e.target.value as any }))}
              className="flex-1 bg-[#FF6B00] border-2 border-white rounded-lg py-1.5 px-4 font-black text-[10px] text-white outline-none cursor-pointer"
            >
              <option value="الكل">جميع الفئات</option>
              {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* 3. KPIs - Grid Layout Optimized for Mobile */}
      <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-6">
        {stats.map((s, i) => (
          <div key={i} className="group relative" style={{ color: s.textColor }}>
             <div className="p-4 md:p-10 rounded-2xl md:rounded-[2.5rem] border-2 border-[#001F3F] flex flex-col items-center shadow-md transition-transform active:scale-95" style={{ backgroundColor: s.color }}>
                <div className="p-2 md:p-5 rounded-xl md:rounded-3xl mb-1 md:mb-4 border-2 border-current">
                   <s.icon size={18} className="md:w-[32px] md:h-[32px]" />
                </div>
                <h3 className="text-[7px] md:text-[11px] font-black uppercase tracking-widest opacity-80">{s.label}</h3>
                <p className="text-xl md:text-5xl font-black mt-0.5 md:mt-2">{s.value}</p>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Alerts & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-[#FF6B00] p-6 rounded-3xl border-4 border-[#001F3F] text-white">
              <h3 className="text-md font-black mb-4 flex items-center gap-2">
                 <Activity size={20}/> العمليات السريعة
              </h3>
              <div className="grid grid-cols-1 gap-2">
                 <button className="w-full bg-[#001F3F] p-4 rounded-xl flex items-center justify-between font-black text-xs active:bg-black transition-all">
                    <span>كشف الحضور (A4)</span>
                    <FileText size={18} className="text-orange-400" />
                 </button>
                 <button className="w-full bg-[#001F3F] p-4 rounded-xl flex items-center justify-between font-black text-xs active:bg-black transition-all">
                    <span>أجندة المباريات</span>
                    <Trophy size={18} className="text-orange-400" />
                 </button>
              </div>
           </div>

           <div className="solid-panel p-6 border-4 border-slate-900 bg-white text-[#001F3F]">
              <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-600"/> مراقبة الأحمال (Alerts)
              </h3>
              <div className="space-y-3">
                 <div className="text-[9px] font-bold p-3 bg-red-50 border-r-4 border-red-600 rounded-lg">
                    تنبيه: 3 لاعبين من فئة {globalFilter === 'الكل' ? 'الشباب' : globalFilter} تجاوزوا 180 دقيقة لعب هذا الأسبوع.
                 </div>
              </div>
           </div>
        </div>

        {/* Agendas */}
        <div className="lg:col-span-8 space-y-6">
          <div className="solid-panel p-6 md:p-10 !shadow-none md:!shadow-[8px_8px_0px_0px_#001F3F]">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg md:text-2xl font-black text-[#001F3F] flex items-center gap-2">
                 <Trophy size={20} className="text-orange-600" /> المباريات القادمة (أجندة حية)
               </h3>
               <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-3 py-1 rounded-full border border-emerald-700">مجدولة</span>
             </div>
             <div className="grid grid-cols-1 gap-3">
               {upcomingMatches.slice(0, 4).map(m => (
                 <button key={m.id} onClick={() => onMatchClick(m.id)} className={`text-right p-4 rounded-xl bg-slate-50 border-2 border-slate-900 active:border-orange-600 flex flex-col gap-1 relative overflow-hidden transition-all active:scale-[0.98] ${m.date === tomorrowStr ? 'ring-2 ring-orange-500' : ''}`}>
                    <div className={`absolute top-0 right-0 w-1.5 h-full ${m.date === tomorrowStr ? 'bg-orange-600' : 'bg-slate-400'}`}></div>
                    <div className="flex justify-between items-center w-full">
                       <p className={`text-[8px] font-black uppercase tracking-widest ${m.date === tomorrowStr ? 'text-orange-600' : 'text-slate-400'}`}>
                          {m.date === tomorrowStr ? 'مواجهة الغد' : m.matchType}
                       </p>
                       <span className="text-[8px] font-black text-slate-500">{m.date} - {m.time}</span>
                    </div>
                    <h4 className="font-black text-sm text-slate-900">الكرامة × {m.opponent}</h4>
                 </button>
               ))}
               {upcomingMatches.length === 0 && <div className="py-8 text-center text-[10px] font-black opacity-30 italic border-2 border-dashed border-slate-200 rounded-xl">لا توجد مباريات قادمة حالياً</div>}
             </div>
          </div>

          <div className="solid-panel p-6 md:p-10 !shadow-none md:!shadow-[8px_8px_0px_0px_#001F3F]">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg md:text-2xl font-black text-[#001F3F] flex items-center gap-2">
                 <Calendar size={20} className="text-[#001F3F]" /> التمارين المجدولة (أجندة حية)
               </h3>
               <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-3 py-1 rounded-full border border-blue-700">أجندة</span>
             </div>
             <div className="grid grid-cols-1 gap-3">
               {upcomingSessions.slice(0, 4).map(s => (
                 <button key={s.id} onClick={() => onSessionClick(s.id)} className={`text-right p-4 rounded-xl bg-slate-50 border-2 border-slate-900 active:border-blue-900 flex flex-col gap-1 relative overflow-hidden transition-all active:scale-[0.98] ${s.date === tomorrowStr ? 'ring-2 ring-blue-900' : ''}`}>
                    <div className={`absolute top-0 right-0 w-1.5 h-full ${s.date === tomorrowStr ? 'bg-blue-900' : 'bg-slate-400'}`}></div>
                    <div className="flex justify-between items-center w-full">
                       <p className={`text-[8px] font-black uppercase tracking-widest ${s.date === tomorrowStr ? 'text-blue-900' : 'text-slate-400'}`}>
                          {s.date === tomorrowStr ? 'تمرين الغد' : s.category}
                       </p>
                       <span className="text-[8px] font-black text-slate-500">{s.time}</span>
                    </div>
                    <h4 className="font-black text-sm text-slate-900">{s.objective}</h4>
                 </button>
               ))}
               {upcomingSessions.length === 0 && <div className="py-8 text-center text-[10px] font-black opacity-30 italic border-2 border-dashed border-slate-200 rounded-xl">لا توجد تمارين مجدولة حالياً</div>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
