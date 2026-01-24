
import React, { useState, useMemo } from 'react';
import { BarChart3, Users, Search, Filter, Trophy, Target, AlertTriangle, TrendingUp, ChevronLeft } from 'lucide-react';
import { AppState, Person } from '../types';

interface StatsViewProps {
  state: AppState;
  onOpenReport: (player: Person) => void;
}

const StatsView: React.FC<StatsViewProps> = ({ state, onOpenReport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const globalFilter = state.globalCategoryFilter;
  const restrictedCat = state.currentUser?.restrictedCategory;

  const playerStats = useMemo(() => {
    return state.people
      .filter(p => p.role === 'لاعب' && 
        (restrictedCat ? p.category === restrictedCat : (globalFilter === 'الكل' || p.category === globalFilter)) &&
        (p.name.includes(searchTerm))
      )
      .map(player => {
        // Matches Statistics
        const completedMatches = state.matches.filter(m => m.isCompleted);
        const playerMatches = completedMatches.filter(m => 
          m.lineup.starters.some(s => s.playerId === player.id) || 
          m.lineup.subs.some(s => s.playerId === player.id)
        );

        let goals = 0;
        let assists = 0;
        let yellows = 0;
        let reds = 0;

        playerMatches.forEach(m => {
          goals += m.events.filter(e => e.type === 'goal' && e.player === player.name).length;
          assists += m.events.filter(e => e.type === 'assist' && e.player === player.name).length;
          yellows += m.events.filter(e => e.type === 'yellow' && e.player === player.name).length;
          reds += m.events.filter(e => e.type === 'red' && e.player === player.name).length;
        });

        // Attendance Statistics
        const sessions = state.sessions.filter(s => s.category === player.category);
        const records = state.attendance.filter(a => a.personId === player.id);
        const present = records.filter(r => r.status === 'حاضر').length;
        const late = records.filter(r => r.status === 'متأخر').length;
        const attendanceRate = sessions.length > 0 ? Math.round(((present + late * 0.7) / sessions.length) * 100) : 0;

        return {
          player,
          matchesPlayed: playerMatches.length,
          goals,
          assists,
          yellows,
          reds,
          attendanceRate
        };
      })
      .sort((a, b) => b.goals - a.goals);
  }, [state.people, state.matches, state.attendance, state.sessions, globalFilter, restrictedCat, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-slate-900 p-8 rounded-[3rem] border-4 border-[#001F3F] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
           <div className="bg-orange-600 p-4 rounded-3xl shadow-lg">
             <BarChart3 size={32} />
           </div>
           <div>
             <h2 className="text-2xl font-black uppercase">إحصائيات الأداء التجميعية</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">عرض وتحليل الأرقام الفنية للاعبي النادي</p>
           </div>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
           <div className="bg-white/10 p-4 rounded-2xl border border-white/5 text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase">إجمالي المسجلين</p>
             <p className="text-xl font-black">{playerStats.length}</p>
           </div>
           <div className="bg-white/10 p-4 rounded-2xl border border-white/5 text-center">
             <p className="text-[10px] font-black text-slate-400 uppercase">معدل التهديف</p>
             <p className="text-xl font-black">{playerStats.reduce((a, b) => a + b.goals, 0)} هدفاً</p>
           </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="بحث سريع عن لاعب..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border-2 border-slate-900 rounded-[2rem] py-5 pr-14 pl-6 font-black outline-none focus:border-orange-600 transition-all text-lg"
        />
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border-2 border-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[1000px]">
            <thead className="bg-slate-50 border-b-2 border-slate-900">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-900 uppercase tracking-widest">اللاعب</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">مباريات</th>
                <th className="px-6 py-5 text-[10px] font-black text-emerald-700 uppercase tracking-widest text-center">أهداف</th>
                <th className="px-6 py-5 text-[10px] font-black text-blue-700 uppercase tracking-widest text-center">تمريرات</th>
                <th className="px-6 py-5 text-[10px] font-black text-orange-600 uppercase tracking-widest text-center">إنذارات</th>
                <th className="px-6 py-5 text-[10px] font-black text-red-600 uppercase tracking-widest text-center">طرد</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">الالتزام</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {playerStats.map(({ player, matchesPlayed, goals, assists, yellows, reds, attendanceRate }) => (
                <tr key={player.id} className="hover:bg-slate-50 transition-all group">
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs border-2 border-black">
                        {player.number || '??'}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{player.name}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{player.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-slate-900">{matchesPlayed}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-lg font-black text-xs ${goals > 0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'text-slate-300'}`}>
                      {goals}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-lg font-black text-xs ${assists > 0 ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'text-slate-300'}`}>
                      {assists}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-orange-600">{yellows}</td>
                  <td className="px-6 py-4 text-center font-black text-red-600">{reds}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200">
                         <div 
                          className={`h-full transition-all ${attendanceRate > 80 ? 'bg-emerald-500' : attendanceRate > 50 ? 'bg-orange-500' : 'bg-red-500'}`} 
                          style={{ width: `${attendanceRate}%` }}
                         />
                      </div>
                      <span className="text-[9px] font-black text-slate-500">%{attendanceRate}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-left">
                    <button 
                      onClick={() => onOpenReport(player)}
                      className="text-[10px] font-black text-[#001F3F] hover:text-orange-600 flex items-center gap-1 underline underline-offset-4"
                    >
                      التفاصيل <ChevronLeft size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {playerStats.length === 0 && (
          <div className="py-20 text-center bg-slate-50">
             <TrendingUp className="mx-auto text-slate-200 mb-4" size={48} />
             <p className="text-slate-400 font-black italic">لا يوجد بيانات إحصائية متاحة حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsView;
