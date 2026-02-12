
import React, { useState, useMemo } from 'react';
import { 
  FilePieChart, Star, Search, Filter, Plus, User, Trophy, Calendar, CheckCircle, Save, X, 
  Loader2, Sparkles, TrendingUp, Activity, ShieldAlert, Users, Package, FileText, 
  BarChart3, ChevronLeft, Printer, CalendarDays, ClipboardList, Target, Medal
} from 'lucide-react';
import { AppState, TechnicalReport, Category, Match, Person, WarehouseItem } from '../types';
import { generateUUID } from '../App';
import ClubLogo from './ClubLogo';

interface TechnicalReportsProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const TechnicalReports: React.FC<TechnicalReportsProps> = ({ state, setState, addLog }) => {
  const [activeTab, setActiveTab] = useState<'players' | 'technical' | 'matches' | 'warehouse' | 'reviews'>('players');
  const [selectedSeason, setSelectedSeason] = useState<string>('2025-2026');
  const [selectedCategory, setSelectedCategory] = useState<string>(state.currentUser?.restrictedCategory || 'الكل');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<TechnicalReport> | null>(null);

  const currentUser = state.currentUser;
  const isManager = currentUser?.role === 'مدير';
  const restrictedCat = currentUser?.restrictedCategory;

  // دالة تحديد الموسم بناءً على تاريخ النشاط
  const getSeasonFromDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return (month >= 8) ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  // تصفية البيانات بناءً على الموسم والفئة
  const filteredMatches = useMemo(() => {
    return state.matches.filter(m => {
      const seasonMatch = selectedSeason === 'الكل' || getSeasonFromDate(m.date) === selectedSeason;
      const catMatch = selectedCategory === 'الكل' || m.category === selectedCategory;
      const searchMatch = m.opponent.includes(searchTerm);
      return seasonMatch && catMatch && searchMatch;
    });
  }, [state.matches, selectedSeason, selectedCategory, searchTerm]);

  // 1. تقرير بيانات اللاعبين
  const playersData = useMemo(() => {
    return state.people.filter(p => {
      const catMatch = selectedCategory === 'الكل' || p.category === selectedCategory;
      const roleMatch = p.role === 'لاعب';
      const searchMatch = p.name.includes(searchTerm);
      return catMatch && roleMatch && searchMatch;
    });
  }, [state.people, selectedCategory, searchTerm]);

  // 2. تقرير الإحصائيات الفنية (دقائق، أهداف، مساهمات)
  const technicalStats = useMemo(() => {
    return playersData.map(player => {
      let leagueMins = 0, cupMins = 0, friendlyMins = 0;
      let goals = 0, assists = 0, yellows = 0, reds = 0;

      filteredMatches.filter(m => m.isCompleted).forEach(m => {
        const starter = m.lineup.starters.find(s => s.playerId === player.id);
        const sub = m.lineup.subs.find(s => s.playerId === player.id);
        const mins = parseInt(starter?.minutesPlayed || sub?.minutesPlayed || '0');

        if (starter || sub) {
          if (m.matchType === 'دوري') leagueMins += mins;
          else if (m.matchType === 'كأس') cupMins += mins;
          else friendlyMins += mins;

          goals += m.events.filter(e => e.type === 'goal' && (e.player === player.id || e.player === player.name)).length;
          assists += m.events.filter(e => e.type === 'assist' && (e.player === player.id || e.player === player.name)).length;
          yellows += m.events.filter(e => e.type === 'yellow' && (e.player === player.id || e.player === player.name)).length;
          reds += m.events.filter(e => e.type === 'red' && (e.player === player.id || e.player === player.name)).length;
        }
      });

      return { player, leagueMins, cupMins, friendlyMins, goals, assists, yellows, reds };
    });
  }, [playersData, filteredMatches]);

  // 3. تقرير المستودع
  const warehouseData = useMemo(() => {
    return state.warehouse.filter(item => {
      const catMatch = selectedCategory === 'الكل' || item.category === selectedCategory || item.category === 'المخزن العام';
      const searchMatch = item.name.includes(searchTerm);
      return catMatch && searchMatch;
    });
  }, [state.warehouse, selectedCategory, searchTerm]);

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} className={s <= rating ? "fill-orange-500 text-orange-500" : "text-slate-200"} />)}
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-24">
      
      {/* هيدر مركز التقارير */}
      <div className="bg-[#001F3F] p-8 rounded-[3rem] border-4 border-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
           <div className="flex items-center gap-5">
              <div className="bg-orange-600 p-4 rounded-3xl shadow-lg border-2 border-orange-400/30 animate-pulse">
                <FilePieChart size={32} />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">مركز التقارير الرقمي الشامل</h2>
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">البيانات الفنية والإدارية لنادي الكرامة الرياضي</p>
              </div>
           </div>
           
           <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 p-1.5 rounded-2xl border border-white/10 flex items-center gap-3">
                 <CalendarDays size={18} className="text-orange-400 mr-2"/>
                 <select 
                  value={selectedSeason} 
                  onChange={e => setSelectedSeason(e.target.value)}
                  className="bg-transparent font-black text-xs outline-none cursor-pointer text-white"
                 >
                    <option value="2025-2026" className="text-slate-900">موسم 2025-2026</option>
                    <option value="2024-2025" className="text-slate-900">موسم 2024-2025</option>
                    <option value="الكل" className="text-slate-900">كل المواسم</option>
                 </select>
              </div>
              <button onClick={() => window.print()} className="bg-white text-[#001F3F] px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-orange-600 hover:text-white transition-all">
                <Printer size={18}/> تصدير التقرير الحالي PDF
              </button>
           </div>
        </div>
      </div>

      {/* نافيجشن الأقسام */}
      <div className="bg-white p-2 rounded-[2.5rem] border-2 border-slate-900 shadow-sm flex flex-wrap gap-2 no-print justify-center">
         {[
           { id: 'players', label: 'بيانات اللاعبين', icon: Users, color: 'text-blue-600' },
           { id: 'technical', label: 'إحصائيات فنية', icon: BarChart3, color: 'text-emerald-600' },
           { id: 'matches', label: 'تقارير المباريات', icon: Trophy, color: 'text-orange-600' },
           { id: 'warehouse', label: 'تقارير المستودع', icon: Package, color: 'text-purple-600' },
           { id: 'reviews', label: 'مراجعات الكوادر', icon: Star, color: 'text-yellow-600' }
         ].map(tab => (
           <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-[#001F3F] text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-50'}`}
           >
             <tab.icon size={18} className={activeTab === tab.id ? 'text-orange-400' : tab.color} />
             {tab.label}
           </button>
         ))}
      </div>

      {/* شريط الأدوات (البحث والفلترة) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
         <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ابحث بالاسم أو التفاصيل..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-slate-900 rounded-2xl py-4 pr-12 pl-4 font-black outline-none focus:border-orange-600"
            />
         </div>
         {!restrictedCat && (
            <div className="flex items-center gap-3 bg-white p-1 rounded-2xl border-2 border-slate-900 px-4">
               <Filter size={18} className="text-slate-400" />
               <select 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)}
                className="flex-1 bg-transparent py-3 font-black text-xs outline-none cursor-pointer"
               >
                  <option value="الكل">كل الفئات</option>
                  {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
            </div>
         )}
      </div>

      {/* محتوى التقارير المتغير */}
      <div className="bg-white rounded-[3rem] border-2 border-slate-900 overflow-hidden shadow-sm">
        
        {/* 1. تقرير بيانات اللاعبين */}
        {activeTab === 'players' && (
          <div className="overflow-x-auto">
             <table className="w-full text-right">
                <thead className="bg-[#001F3F] text-white border-b-4 border-slate-900">
                   <tr>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest border-l border-white/5">اللاعب</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest border-l border-white/5">تاريخ الميلاد</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest border-l border-white/5">الرقم الوطني</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest border-l border-white/5">القيد (الخانة)</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest border-l border-white/5">الطول/الوزن</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest">الاتصال</th>
                   </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100 font-black text-xs">
                   {playersData.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                         <td className="p-5 flex items-center gap-3">
                            <span className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px]">#{p.number}</span>
                            <div>
                               <p>{p.name}</p>
                               <p className="text-[9px] text-slate-400">{p.category}</p>
                            </div>
                         </td>
                         <td className="p-5 tabular-nums text-slate-500">{p.birthDate}</td>
                         <td className="p-5 tabular-nums">{p.nationalId || '---'}</td>
                         <td className="p-5">{p.khana || '---'}</td>
                         <td className="p-5 tabular-nums text-slate-500">{p.height}/{p.weight}</td>
                         <td className="p-5 tabular-nums text-blue-600">{p.phone || '---'}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}

        {/* 2. الإحصائيات الفنية */}
        {activeTab === 'technical' && (
          <div className="overflow-x-auto">
             <table className="w-full text-right">
                <thead className="bg-[#001F3F] text-white border-b-4 border-slate-900">
                   <tr>
                      <th className="p-5 text-[10px] font-black uppercase border-l border-white/5">اللاعب</th>
                      <th className="p-5 text-[10px] font-black uppercase border-l border-white/5 text-center">دقائق دوري</th>
                      <th className="p-5 text-[10px] font-black uppercase border-l border-white/5 text-center">دقائق كأس</th>
                      <th className="p-5 text-[10px] font-black uppercase border-l border-white/5 text-center">دقائق ودي</th>
                      <th className="p-5 text-[10px] font-black text-emerald-400 border-l border-white/5 text-center">أهداف</th>
                      <th className="p-5 text-[10px] font-black text-blue-400 border-l border-white/5 text-center">أسيست</th>
                      <th className="p-5 text-[10px] font-black text-yellow-400 text-center">🟨 / 🟥</th>
                   </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100 font-black text-xs tabular-nums">
                   {technicalStats.map(s => (
                      <tr key={s.player.id} className="hover:bg-slate-50 transition-colors">
                         <td className="p-5 flex items-center gap-3">
                            <span className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-[10px]">#{s.player.number}</span>
                            {s.player.name}
                         </td>
                         <td className="p-5 text-center text-slate-900">{s.leagueMins} د</td>
                         <td className="p-5 text-center text-slate-900">{s.cupMins} د</td>
                         <td className="p-5 text-center text-slate-900">{s.friendlyMins} د</td>
                         <td className="p-5 text-center text-emerald-700 font-black">{s.goals}</td>
                         <td className="p-5 text-center text-blue-700 font-black">{s.assists}</td>
                         <td className="p-5 text-center">
                            <span className="text-yellow-600">{s.yellows}</span> / <span className="text-red-600">{s.reds}</span>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}

        {/* 3. تقارير المباريات */}
        {activeTab === 'matches' && (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-slate-50">
              {filteredMatches.filter(m => m.isCompleted).map(m => (
                <div key={m.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 shadow-sm relative group overflow-hidden border-b-8 hover:border-orange-600 transition-all">
                   <div className="flex justify-between items-start mb-4">
                      <span className="bg-[#001F3F] text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase">{m.matchType}</span>
                      <span className="text-[10px] font-black text-slate-400">{m.date}</span>
                   </div>
                   <h4 className="text-xl font-black text-slate-900 mb-4">الكرامة {m.ourScore} - {m.opponentScore} {m.opponent}</h4>
                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                      <p className="text-[11px] font-black text-slate-600 leading-relaxed italic line-clamp-3">
                        {m.notes || 'لا يوجد تقرير فني مسجل لهذه المباراة.'}
                      </p>
                   </div>
                   <div className="flex justify-between items-center">
                      <div className="flex gap-4">
                        <div className="text-center">
                           <p className="text-[8px] font-black text-slate-400 uppercase">الأهداف</p>
                           <p className="text-sm font-black text-emerald-600">{m.events.filter(e => e.type === 'goal').length}</p>
                        </div>
                        <div className="text-center">
                           <p className="text-[8px] font-black text-slate-400 uppercase">البطاقات</p>
                           <p className="text-sm font-black text-orange-600">{m.events.filter(e => e.type === 'yellow' || e.type === 'red').length}</p>
                        </div>
                      </div>
                      <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-orange-600 transition-all">
                        تصدير التقرير الفني <ChevronLeft size={14}/>
                      </button>
                   </div>
                </div>
              ))}
           </div>
        )}

        {/* 4. تقارير المستودع */}
        {activeTab === 'warehouse' && (
          <div className="overflow-x-auto">
             <table className="w-full text-right">
                <thead className="bg-[#001F3F] text-white border-b-4 border-slate-900">
                   <tr>
                      <th className="p-5 text-[10px] font-black uppercase border-l border-white/5">الصنف / المعدات</th>
                      <th className="p-5 text-[10px] font-black uppercase border-l border-white/5">القسم</th>
                      <th className="p-5 text-[10px] font-black uppercase border-l border-white/5 text-center">الحالة</th>
                      <th className="p-5 text-[10px] font-black uppercase border-l border-white/5 text-center">الكمية</th>
                      <th className="p-5 text-[10px] font-black uppercase text-center">آخر تحديث</th>
                   </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100 font-black text-xs">
                   {warehouseData.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                         <td className="p-5 text-slate-900">{item.name}</td>
                         <td className="p-5 text-slate-400">{item.category}</td>
                         <td className="p-5 text-center">
                            <span className={`px-3 py-1 rounded-lg text-[9px] ${item.condition === 'جديد' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                               {item.condition}
                            </span>
                         </td>
                         <td className="p-5 text-center tabular-nums text-blue-600">{item.quantity} {item.unit}</td>
                         <td className="p-5 text-center text-slate-400 text-[10px] tabular-nums">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}

        {/* 5. مراجعات الكوادر */}
        {activeTab === 'reviews' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-slate-50">
              {state.technicalReports.filter(r => r.type === 'staff_review').map(report => {
                const target = state.people.find(p => p.id === report.targetId);
                return (
                  <div key={report.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 shadow-sm border-b-[10px] hover:border-yellow-600 transition-all">
                     <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase">{report.date}</span>
                        {renderStars(report.rating)}
                     </div>
                     <h4 className="font-black text-[#001F3F] mb-1">{target?.name}</h4>
                     <p className="text-[9px] font-black text-orange-600 uppercase mb-4 tracking-widest">{target?.role}</p>
                     <p className="text-xs font-bold text-slate-600 leading-relaxed italic line-clamp-4">
                        "{report.content}"
                     </p>
                     <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                        <div className="w-6 h-6 bg-slate-900 text-white rounded flex items-center justify-center text-[8px]">{report.author.charAt(0)}</div>
                        <span className="text-[10px] text-slate-400 font-black">المقيم: {report.author}</span>
                     </div>
                  </div>
                );
              })}
           </div>
        )}

      </div>
    </div>
  );
};

export default TechnicalReports;
