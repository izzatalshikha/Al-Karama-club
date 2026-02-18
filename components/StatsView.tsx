
import React, { useState, useMemo } from 'react';
import { BarChart3, Users, Search, Filter, Trophy, Target, AlertTriangle, TrendingUp, ChevronLeft, CalendarDays, Award } from 'lucide-react';
import { AppState, Person, MatchType } from '../types';

interface StatsViewProps {
  state: AppState;
  onOpenReport: (player: Person) => void;
}

const StatsView: React.FC<StatsViewProps> = ({ state, onOpenReport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatchType, setSelectedMatchType] = useState<string>('الكل');
  const [selectedSeason, setSelectedSeason] = useState<string>('الكل');

  const globalFilter = state.globalCategoryFilter;
  const restrictedCat = state.currentUser?.restrictedCategory;

  // دالة لتحديد الموسم بناءً على تاريخ المباراة (الموسم الرياضي يبدأ عادة في شهر 8 وينتهي في شهر 7)
  const getSeasonFromDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    if (month >= 8) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  };

  // استخراج قائمة المواسم المتاحة من المباريات المسجلة
  const availableSeasons = useMemo(() => {
    const seasons = new Set<string>();
    state.matches.forEach(m => {
      seasons.add(getSeasonFromDate(m.date));
    });
    return Array.from(seasons).sort((a, b) => b.localeCompare(a));
  }, [state.matches]);

  const playerStats = useMemo(() => {
    return state.people
      .filter(p => p.role === 'لاعب' && 
        (restrictedCat ? p.category === restrictedCat : (globalFilter === 'الكل' || p.category === globalFilter)) &&
        (p.name.includes(searchTerm))
      )
      .map(player => {
        // تصفية المباريات المكتملة بناءً على نوع المباراة والموسم المختارين
        const filteredMatches = state.matches.filter(m => {
          if (!m.isCompleted) return false;
          
          const matchSeason = getSeasonFromDate(m.date);
          const matchTypeMatch = selectedMatchType === 'الكل' || m.matchType === selectedMatchType;
          const seasonMatch = selectedSeason === 'الكل' || matchSeason === selectedSeason;
          
          return matchTypeMatch && seasonMatch;
        });

        // حصر المباريات التي شارك فيها اللاعب (أساسي أو بديل) من القائمة المفلترة أعلاه
        const playedMatchesInFilter = filteredMatches.filter(m => 
          m.lineup.starters.some(s => s.playerId === player.id) || 
          m.lineup.subs.some(s => s.playerId === player.id)
        );

        let goals = 0;
        let assists = 0;
        let yellows = 0;
        let reds = 0;

        playedMatchesInFilter.forEach(m => {
          goals += m.events.filter(e => e.type === 'goal' && (e.player === player.id || e.player === player.name)).length;
          assists += m.events.filter(e => e.type === 'assist' && (e.player === player.id || e.player === player.name)).length;
          yellows += m.events.filter(e => e.type === 'yellow' && (e.player === player.id || e.player === player.name)).length;
          reds += m.events.filter(e => e.type === 'red' && (e.player === player.id || e.player === player.name)).length;
        });

        // إحصائيات الحضور (تعتمد على الفئة والموسم فقط)
        const sessionsInSeason = state.sessions.filter(s => {
          const sessSeason = getSeasonFromDate(s.date);
          return s.category === player.category && s.isCompleted && (selectedSeason === 'الكل' || sessSeason === selectedSeason);
        });

        const recordsInSeason = state.attendance.filter(a => {
          const attSeason = getSeasonFromDate(a.date);
          return a.personId === player.id && (selectedSeason === 'الكل' || attSeason === selectedSeason);
        });

        const present = recordsInSeason.filter(r => r.status === 'حاضر').length;
        const late = recordsInSeason.filter(r => r.status === 'متأخر').length;
        const excused = recordsInSeason.filter(r => r.status === 'غياب بعذر').length;
        
        const effectiveTotal = Math.max(0, sessionsInSeason.length - excused);
        const attendanceRate = effectiveTotal > 0 ? Math.round(((present + late * 0.5) / effectiveTotal) * 100) : 0;

        return {
          player,
          matchesPlayed: playedMatchesInFilter.length,
          goals,
          assists,
          yellows,
          reds,
          attendanceRate
        };
      })
      .sort((a, b) => b.goals - a.goals || b.attendanceRate - a.attendanceRate);
  }, [state.people, state.matches, state.attendance, state.sessions, globalFilter, restrictedCat, searchTerm, selectedMatchType, selectedSeason]);

  const matchTypes: MatchType[] = ['دوري', 'كأس', 'ودية', 'بطولة ودية', 'مباراة دولية'];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20">
      {/* هيدر الإحصائيات مع ملخص سريع */}
      <div className="bg-[#001F3F] p-8 rounded-[3rem] border-4 border-slate-900 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="flex items-center gap-5 relative z-10">
           <div className="bg-orange-600 p-4 rounded-3xl shadow-lg border-2 border-orange-400/30">
             <BarChart3 size={32} />
           </div>
           <div>
             <h2 className="text-2xl font-black uppercase tracking-tighter">إحصائيات الأداء التجميعية</h2>
             <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-1">
               {selectedSeason === 'الكل' ? 'كافة المواسم' : `موسم ${selectedSeason}`} | {selectedMatchType}
             </p>
           </div>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto relative z-10">
           <div className="bg-white/10 p-4 rounded-2xl border border-white/5 text-center min-w-[120px]">
             <p className="text-[9px] font-black text-slate-400 uppercase mb-1">اللاعبين</p>
             <p className="text-2xl font-black tabular-nums">{playerStats.length}</p>
           </div>
           <div className="bg-white/10 p-4 rounded-2xl border border-white/5 text-center min-w-[120px]">
             <p className="text-[9px] font-black text-slate-400 uppercase mb-1">إجمالي الأهداف</p>
             <p className="text-2xl font-black tabular-nums text-emerald-400">{playerStats.reduce((a, b) => a + b.goals, 0)}</p>
           </div>
        </div>
      </div>

      {/* شريط الفلاتر المتقدم */}
      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* فلتر البحث */}
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ابحث عن لاعب..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 pr-12 pl-4 font-black outline-none focus:border-orange-600 transition-all text-sm"
            />
          </div>

          {/* فلتر نوع المسابقة */}
          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border-2 border-slate-200">
             <div className="p-2 bg-[#001F3F] text-white rounded-lg"><Trophy size={16}/></div>
             <select 
              value={selectedMatchType}
              onChange={e => setSelectedMatchType(e.target.value)}
              className="flex-1 bg-transparent font-black text-xs outline-none cursor-pointer text-[#001F3F]"
             >
               <option value="الكل">جميع المسابقات</option>
               {matchTypes.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
          </div>

          {/* فلتر الموسم */}
          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border-2 border-slate-200">
             <div className="p-2 bg-orange-600 text-white rounded-lg"><CalendarDays size={16}/></div>
             <select 
              value={selectedSeason}
              onChange={e => setSelectedSeason(e.target.value)}
              className="flex-1 bg-transparent font-black text-xs outline-none cursor-pointer text-[#001F3F]"
             >
               <option value="الكل">كل المواسم التاريخية</option>
               {availableSeasons.map(s => <option key={s} value={s}>موسم {s}</option>)}
             </select>
          </div>
        </div>

        {/* أزرار اختيار سريعة لنوع المباراة (اختياري لتحسين التجربة) */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
           <button 
            onClick={() => setSelectedMatchType('الكل')}
            className={`px-4 py-1.5 rounded-full font-black text-[10px] transition-all border-2 ${selectedMatchType === 'الكل' ? 'bg-[#001F3F] text-white border-[#001F3F]' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
           >
             الكل
           </button>
           {['دوري', 'كأس', 'ودية'].map(t => (
             <button 
              key={t}
              onClick={() => setSelectedMatchType(t)}
              className={`px-4 py-1.5 rounded-full font-black text-[10px] transition-all border-2 ${selectedMatchType === t ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
             >
               {t}
             </button>
           ))}
        </div>
      </div>

      {/* الجدول الرئيسي */}
      <div className="bg-white rounded-[3rem] shadow-sm border-2 border-slate-900 overflow-hidden border-b-[12px]">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[1000px]">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest border-l border-white/5">اللاعب</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center border-l border-white/5">مباريات</th>
                <th className="px-6 py-5 text-[10px] font-black text-emerald-400 uppercase tracking-widest text-center border-l border-white/5">أهداف</th>
                <th className="px-6 py-5 text-[10px] font-black text-blue-400 uppercase tracking-widest text-center border-l border-white/5">تمريرات</th>
                <th className="px-6 py-5 text-[10px] font-black text-yellow-400 uppercase tracking-widest text-center border-l border-white/5">إنذارات</th>
                <th className="px-6 py-5 text-[10px] font-black text-red-500 uppercase tracking-widest text-center border-l border-white/5">طرد</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center border-l border-white/5">نسبة الالتزام</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {playerStats.map(({ player, matchesPlayed, goals, assists, yellows, reds, attendanceRate }) => (
                <tr key={player.id} className="hover:bg-slate-50 transition-all group">
                  <td className="px-8 py-4 border-l-2 border-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#001F3F] text-white flex items-center justify-center font-black text-xs border-2 border-black shadow-md group-hover:bg-orange-600 transition-colors">
                        #{player.number || '??'}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{player.name}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{player.category} | {player.position || 'غير محدد'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-slate-900 tabular-nums border-l-2 border-slate-50">{matchesPlayed}</td>
                  <td className="px-6 py-4 text-center border-l-2 border-slate-50">
                    <span className={`px-4 py-1.5 rounded-lg font-black text-xs tabular-nums border-2 ${goals > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                      {goals}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center border-l-2 border-slate-50">
                    <span className={`px-4 py-1.5 rounded-lg font-black text-xs tabular-nums border-2 ${assists > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                      {assists}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-orange-600 tabular-nums border-l-2 border-slate-50">{yellows}</td>
                  <td className="px-6 py-4 text-center font-black text-red-600 tabular-nums border-l-2 border-slate-50">{reds}</td>
                  <td className="px-6 py-4 border-l-2 border-slate-50">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 p-0.5">
                         <div 
                          className={`h-full rounded-full transition-all duration-1000 ${attendanceRate > 85 ? 'bg-emerald-500' : attendanceRate > 65 ? 'bg-orange-500' : 'bg-red-500'}`} 
                          style={{ width: `${attendanceRate}%` }}
                         />
                      </div>
                      <span className="text-[10px] font-black text-slate-900 tabular-nums">%{attendanceRate}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-left">
                    <button 
                      onClick={() => onOpenReport(player)}
                      className="bg-slate-100 text-[#001F3F] p-2 rounded-xl border-2 border-slate-200 hover:bg-[#001F3F] hover:text-white transition-all flex items-center justify-center shadow-sm"
                    >
                      <ChevronLeft size={18}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {playerStats.length === 0 && (
          <div className="py-24 text-center bg-slate-50">
             <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-slate-100">
               <TrendingUp className="text-slate-200" size={40} />
             </div>
             <p className="text-slate-400 font-black text-lg">لا توجد سجلات مطابقة للفلاتر المختارة حالياً</p>
             <p className="text-[10px] font-bold text-slate-300 mt-2 uppercase tracking-widest">تأكد من وجود مباريات مكتملة في هذا الموسم ونوع المسابقة</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsView;
