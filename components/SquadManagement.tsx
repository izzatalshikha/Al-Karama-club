
import React, { useState } from 'react';
import { 
  UserPlus, Trash2, Search, Edit2, MapPin, Calendar, MoreHorizontal, ChevronRight, Hash
} from 'lucide-react';
import { AppState, Person } from '../types';

interface SquadManagementProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  onOpenReport?: (player: Person) => void;
  addLog?: (m: string, d?: string, t?: any) => void;
  getSuspension?: (id: string, cat: string) => { isSuspended: boolean, currentYellows: number, hasActiveRed: boolean };
}

const SquadManagement: React.FC<SquadManagementProps> = ({ state, setState, onOpenReport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localCategoryFilter, setLocalCategoryFilter] = useState('الكل');
  const [activeSubTab, setActiveSubTab] = useState<'players' | 'staff'>('players');

  const members = state.people.filter(p => {
    const matchCat = localCategoryFilter === 'الكل' || p.category === localCategoryFilter;
    const matchSearch = p.name.includes(searchTerm);
    return matchCat && matchSearch && (activeSubTab === 'players' ? p.role === 'لاعب' : p.role !== 'لاعب');
  });

  return (
    <div className="space-y-10">
      {/* Controls Bar */}
      <div className="modern-card p-6 flex flex-col md:flex-row gap-6 items-center border-white/5">
         <div className="flex-1 relative w-full group">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input type="text" placeholder="البحث عن اسم لاعب أو كادر..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pr-14 pl-6 text-white outline-none focus:bg-[#0f172a] transition-all" />
         </div>
         <select value={localCategoryFilter} onChange={e => setLocalCategoryFilter(e.target.value)}
            className="w-full md:w-64 bg-slate-900/50 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none cursor-pointer hover:bg-white/5 transition-all">
            <option value="الكل">جميع الفئات</option>
            {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
         </select>
         <button className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-bold text-sm flex items-center gap-3 shadow-xl shadow-orange-500/10 hover:bg-orange-600 transition-all active:scale-95">
            <UserPlus size={20}/> إضافة عضو
         </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-900/80 backdrop-blur border border-white/5 rounded-2xl w-fit mx-auto md:mx-0">
          <button onClick={() => setActiveSubTab('players')}
            className={`px-10 py-3 rounded-xl font-bold text-xs transition-all ${activeSubTab === 'players' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
            اللاعبين
          </button>
          <button onClick={() => setActiveSubTab('staff')}
            className={`px-10 py-3 rounded-xl font-bold text-xs transition-all ${activeSubTab === 'staff' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>
            الكوادر
          </button>
      </div>

      {/* Grid - Cards Look Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {members.map(person => (
          <div key={person.id} className="modern-card p-8 group hover:border-orange-500/30 transition-all duration-300 flex flex-col">
             <div className="flex justify-between items-start mb-8">
                <div className="relative">
                   <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center font-bold text-3xl text-white border border-white/5 overflow-hidden group-hover:bg-slate-700 transition-all">
                      {person.name.charAt(0)}
                   </div>
                   <div className="absolute -top-3 -left-3 w-8 h-8 bg-orange-500 text-white rounded-lg flex items-center justify-center font-bold text-xs border-2 border-[#0f172a] shadow-xl">
                      {person.number || '0'}
                   </div>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[9px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-1">{person.category}</span>
                   <span className="text-xs font-semibold text-slate-400">{person.role}</span>
                </div>
             </div>
             
             <h3 className="text-xl font-bold text-white mb-4 tracking-tight">{person.name}</h3>
             
             <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                   <MapPin size={12}/> {person.birthPlace}
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                   <Calendar size={12}/> {person.birthDate}
                </div>
             </div>

             <div className="mt-auto pt-6 border-t border-white/5 flex justify-between items-center">
                <button onClick={() => onOpenReport?.(person)} className="text-xs font-bold text-white/50 hover:text-orange-500 transition-all flex items-center gap-2">
                   الملف الفني <ChevronRight size={14}/>
                </button>
                <div className="flex gap-2">
                   <button className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-all"><Edit2 size={16}/></button>
                   <button className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:bg-red-500/20 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                </div>
             </div>
          </div>
        ))}
        {members.length === 0 && (
          <div className="col-span-full py-32 text-center text-slate-600 font-medium italic border-2 border-dashed border-white/5 rounded-[3rem]">
             لا توجد سجلات مطابقة حالياً
          </div>
        )}
      </div>
    </div>
  );
};

export default SquadManagement;
