
import React from 'react';
import { Users, Calendar, Trophy, Clock, MapPin, AlertCircle, ChevronLeft, ShieldAlert, Filter } from 'lucide-react';
import { AppState, Person } from '../types';

interface DashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onMatchClick: (id: string) => void;
  onSessionClick: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, setState, onMatchClick, onSessionClick }) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const globalFilter = state.globalCategoryFilter;

  const upcomingMatches = state.matches
    .filter(m => (globalFilter === 'الكل' || m.category === globalFilter) && m.date >= todayStr && !m.isCompleted)
    .sort((a, b) => a.date.localeCompare(b.date));

  const upcomingSessions = state.sessions
    .filter(s => (globalFilter === 'الكل' || s.category === globalFilter) && s.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  // نظام فحص العقود (أقل من 3 أشهر = 90 يوماً)
  const expiringContracts = state.people.filter(p => {
    if (!p.contractEnd) return false;
    const end = new Date(p.contractEnd);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 90;
  });

  const stats = [
    { label: 'الكوادر المسجلة', value: state.people.filter(p => globalFilter === 'الكل' || p.category === globalFilter).length, icon: Users, color: 'blue' },
    { label: 'المواجهات القادمة', value: upcomingMatches.length, icon: Trophy, color: 'emerald' },
    { label: 'التمارين المجدولة', value: upcomingSessions.length, icon: Calendar, color: 'orange' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Category Filter Dropdown */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center no-print">
        <h3 className="text-md font-black text-slate-900 flex items-center gap-3">
          <Filter size={20} className="text-[#001F3F]" /> تصفية البيانات في لوحة التحكم
        </h3>
        <div className="flex items-center gap-3 mt-3 md:mt-0">
          <label className="text-[10px] font-black text-slate-500 uppercase">عرض بيانات فئة:</label>
          <select 
            value={globalFilter}
            onChange={e => setState(p => ({ ...p, globalCategoryFilter: e.target.value as any }))}
            className="bg-slate-100 border-2 border-slate-900 rounded-xl py-2 px-4 font-black text-[12px] text-slate-900 outline-none h-11 appearance-none cursor-pointer hover:bg-white transition-colors min-w-[150px]"
          >
            <option value="الكل">جميع الفئات</option>
            {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Contract Expiry Alert Section */}
      {expiringContracts.length > 0 && (
        <div className="bg-red-50 border-4 border-red-900 rounded-[2.5rem] p-6 shadow-xl animate-pulse">
           <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-900 text-white rounded-2xl shadow-lg"><ShieldAlert size={28} /></div>
              <h3 className="text-xl font-black text-red-900 uppercase">تنبيهات إدارية: عقود توشك على الانتهاء</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {expiringContracts.map(p => {
                const end = new Date(p.contractEnd!);
                const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={p.id} className="bg-white border-2 border-red-900 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{p.name}</p>
                      <p className="text-[10px] font-black text-red-600 uppercase">متبقي: {diffDays} يوم</p>
                    </div>
                    <span className="bg-red-900 text-white text-[9px] font-black px-3 py-1 rounded-lg">{p.category}</span>
                  </div>
                );
              })}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-900 flex flex-col items-center hover:bg-slate-50 transition-all group">
             <div className={`p-4 rounded-2xl mb-4 transition-transform group-hover:scale-110 ${s.color === 'blue' ? 'bg-blue-100 text-blue-900 border border-blue-900' : s.color === 'emerald' ? 'bg-emerald-100 text-emerald-900 border border-emerald-900' : 'bg-orange-100 text-orange-900 border border-orange-900'}`}>
               <s.icon size={30} />
             </div>
             <h3 className="text-slate-900 text-[10px] font-black uppercase tracking-widest">{s.label}</h3>
             <p className="text-4xl font-black text-slate-900 mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border-2 border-slate-900">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
              <Trophy size={20} className="text-blue-900" /> الأجندة التنافسية
            </h3>
            <span className="text-[9px] bg-blue-100 text-blue-900 px-3 py-1 rounded-full font-black uppercase border-2 border-blue-900">القادمة</span>
          </div>
          <div className="space-y-4">
            {upcomingMatches.length > 0 ? upcomingMatches.map(m => (
              <button key={m.id} onClick={() => onMatchClick(m.id)} className="w-full text-right p-5 rounded-2xl bg-slate-100 border-2 border-slate-900 hover:bg-white transition-all group flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="font-black text-sm text-slate-900">الكرامة × {m.opponent}</h4>
                  <p className="text-[10px] font-black text-slate-900 mt-1 uppercase tracking-wider">{m.date} | {m.time} - {m.category}</p>
                </div>
                <ChevronLeft size={20} className="text-slate-900 group-hover:-translate-x-1 transition-transform" />
              </button>
            )) : (
              <p className="py-10 text-center text-slate-900 font-black italic text-xs uppercase opacity-30 tracking-widest">لا توجد مباريات قادمة</p>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border-2 border-slate-900">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
              <Calendar size={20} className="text-orange-600" /> برنامج التمارين
            </h3>
            <span className="text-[9px] bg-orange-100 text-orange-900 px-3 py-1 rounded-full font-black uppercase border-2 border-orange-900">المجدولة</span>
          </div>
          <div className="space-y-4">
            {upcomingSessions.length > 0 ? upcomingSessions.map(s => (
              <button key={s.id} onClick={() => onSessionClick(s.id)} className="w-full text-right p-5 rounded-2xl bg-slate-100 border-2 border-slate-900 hover:bg-white transition-all group flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="font-black text-sm text-slate-900">{s.objective}</h4>
                  <p className="text-[10px] font-black text-slate-900 mt-1 uppercase tracking-wider">{s.date} | {s.time} - {s.category}</p>
                </div>
                <ChevronLeft size={20} className="text-slate-900 group-hover:-translate-x-1 transition-transform" />
              </button>
            )) : (
              <p className="py-10 text-center text-slate-900 font-black italic text-xs uppercase opacity-30 tracking-widest">لا توجد تمارين قادمة</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
