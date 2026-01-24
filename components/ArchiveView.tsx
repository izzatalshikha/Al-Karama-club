
import React, { useState, useMemo } from 'react';
import { Archive, Trophy, Calendar, ChevronLeft, Search, Filter, History, Trash2 } from 'lucide-react';
import { AppState, Match, TrainingSession } from '../types';

interface ArchiveViewProps {
  state: AppState;
  onMatchClick: (id: string) => void;
  onSessionClick: (id: string) => void;
}

const ArchiveView: React.FC<ArchiveViewProps> = ({ state, onMatchClick, onSessionClick }) => {
  const [activeSubTab, setActiveSubTab] = useState<'matches' | 'sessions'>('matches');
  const [searchTerm, setSearchTerm] = useState('');
  
  const globalFilter = state.globalCategoryFilter;
  const restrictedCat = state.currentUser?.restrictedCategory;

  const completedMatches = useMemo(() => {
    return state.matches
      .filter(m => m.isCompleted && 
        (restrictedCat ? m.category === restrictedCat : (globalFilter === 'الكل' || m.category === globalFilter)) &&
        (m.opponent.includes(searchTerm) || m.matchType.includes(searchTerm))
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.matches, globalFilter, restrictedCat, searchTerm]);

  const completedSessions = useMemo(() => {
    return state.sessions
      .filter(s => s.isCompleted && 
        (restrictedCat ? s.category === restrictedCat : (globalFilter === 'الكل' || s.category === globalFilter)) &&
        (s.objective.includes(searchTerm))
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.sessions, globalFilter, restrictedCat, searchTerm]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-white">
            <Archive size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">الأرشيف المركزي للأنشطة</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مراجعة كافة المباريات والتدريبات المكتملة سابقاً</p>
          </div>
        </div>
        
        <div className="flex p-1 bg-slate-100 rounded-2xl border-2 border-slate-900">
           <button 
            onClick={() => setActiveSubTab('matches')} 
            className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${activeSubTab === 'matches' ? 'bg-[#001F3F] text-white shadow-lg' : 'text-slate-500'}`}
           >
             المباريات ({completedMatches.length})
           </button>
           <button 
            onClick={() => setActiveSubTab('sessions')} 
            className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${activeSubTab === 'sessions' ? 'bg-[#001F3F] text-white shadow-lg' : 'text-slate-500'}`}
           >
             التدريبات ({completedSessions.length})
           </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="بحث في الأرشيف..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-white border-2 border-slate-900 rounded-2xl py-4 pr-12 pl-4 font-black outline-none focus:border-orange-600 transition-all"
        />
      </div>

      {activeSubTab === 'matches' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedMatches.map(m => (
            <button 
              key={m.id} 
              onClick={() => onMatchClick(m.id)}
              className="w-full text-right bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 hover:border-orange-600 transition-all group flex flex-col shadow-sm"
            >
              <div className="flex justify-between items-start mb-4 w-full">
                 <span className="bg-slate-900 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase">{m.matchType}</span>
                 <span className="text-[10px] font-black text-slate-400">{m.date}</span>
              </div>
              <div className="flex-1 text-center py-4 w-full">
                <p className="text-3xl font-black text-slate-900">{m.ourScore} - {m.opponentScore}</p>
                <p className="font-black text-sm text-slate-700 mt-2">الكرامة × {m.opponent}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center w-full">
                 <span className="text-[10px] font-black text-orange-600 uppercase tracking-tighter">{m.category}</span>
                 <ChevronLeft className="text-slate-300 group-hover:text-orange-600 transition-colors" size={20} />
              </div>
            </button>
          ))}
          {completedMatches.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
               <History className="mx-auto text-slate-200 mb-4" size={48} />
               <p className="text-slate-400 font-black italic">لا يوجد مباريات مؤرشفة مطابقة للبحث</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedSessions.map(s => (
            <button 
              key={s.id} 
              onClick={() => onSessionClick(s.id)}
              className="w-full text-right bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 hover:border-blue-900 transition-all group flex flex-col shadow-sm"
            >
              <div className="flex justify-between items-start mb-4 w-full">
                 <span className="bg-orange-600 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">{s.category}</span>
                 <span className="text-[10px] font-black text-slate-400">{s.date}</span>
              </div>
              <h4 className="font-black text-lg text-slate-900 mb-2 leading-tight">{s.objective}</h4>
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center w-full">
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                    <Calendar size={12}/> {s.time}
                 </div>
                 <ChevronLeft className="text-slate-300 group-hover:text-blue-900 transition-colors" size={20} />
              </div>
            </button>
          ))}
          {completedSessions.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
               <History className="mx-auto text-slate-200 mb-4" size={48} />
               <p className="text-slate-400 font-black italic">لا يوجد تمارين مؤرشفة مطابقة للبحث</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArchiveView;
