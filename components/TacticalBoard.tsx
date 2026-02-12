
import React, { useState, useRef } from 'react';
import { AppState, TacticalPlan } from '../types';
import { generateUUID } from '../App';
import { 
  Save, Trash2, Plus, Users, Layout, Map as MapIcon, 
  ChevronRight, Swords, UserPlus, Info, Settings2
} from 'lucide-react';

interface TacticalBoardProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
}

const TacticalBoard: React.FC<TacticalBoardProps> = ({ state, setState }) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [draggedData, setDraggedData] = useState<{ id: string; team: 'home' | 'away' } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const activePlan = state.tacticalPlans.find(p => p.id === selectedPlanId);
  
  // تصفية اللاعبين بناءً على الفئة المختارة في الخطة النشطة
  const players = state.people.filter(p => 
    p.role === 'لاعب' && 
    (activePlan ? p.category === activePlan.category : (state.globalCategoryFilter === 'الكل' || p.category === state.globalCategoryFilter))
  );

  const handleDrop = (e: React.DragEvent) => {
    if (!draggedData || !boardRef.current || !selectedPlanId) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setState(prev => ({
      ...prev,
      tacticalPlans: prev.tacticalPlans.map(plan => {
        if (plan.id === selectedPlanId) {
          const newPositions = [...plan.positions];
          const existingIdx = newPositions.findIndex(pos => pos.playerId === draggedData.id);
          
          if (existingIdx > -1) {
            newPositions[existingIdx] = { ...newPositions[existingIdx], x, y };
          } else {
            const player = players.find(p => p.id === draggedData.id);
            newPositions.push({ 
              playerId: draggedData.id, 
              x, 
              y, 
              team: draggedData.team,
              label: draggedData.team === 'away' ? `خصم ${newPositions.filter(p=>p.team==='away').length + 1}` : player?.name.split(' ')[0]
            });
          }
          return { ...plan, positions: newPositions };
        }
        return plan;
      })
    }));
    setDraggedData(null);
  };

  const createNewPlan = () => {
    const newPlan: TacticalPlan = {
      id: generateUUID(),
      name: `خطة جديدة - ${new Date().toLocaleDateString('ar')}`,
      category: state.globalCategoryFilter === 'الكل' ? state.categories[0] : state.globalCategoryFilter,
      formation: '4-4-2',
      positions: [],
      notes: ''
    };
    setState(prev => ({ ...prev, tacticalPlans: [newPlan, ...prev.tacticalPlans] }));
    setSelectedPlanId(newPlan.id);
  };

  const removePosition = (playerId: string) => {
    if (!selectedPlanId) return;
    setState(prev => ({
      ...prev,
      tacticalPlans: prev.tacticalPlans.map(plan => 
        plan.id === selectedPlanId 
          ? { ...plan, positions: plan.positions.filter(p => p.playerId !== playerId) }
          : plan
      )
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar - Plans List & Controls */}
        <div className="lg:col-span-1 space-y-6">
           <div className="modern-card p-6 border-white/5">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-3 text-white">
                <Layout size={20} className="text-orange-500" /> مسودة الخطط
              </h3>
              <button onClick={createNewPlan} className="w-full bg-orange-500 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-6 shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all">
                <Plus size={18}/> خطة جديدة
              </button>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                 {state.tacticalPlans.map(plan => (
                   <button key={plan.id} onClick={() => setSelectedPlanId(plan.id)}
                     className={`w-full text-right p-4 rounded-xl border transition-all group ${selectedPlanId === plan.id ? 'border-orange-500 bg-orange-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                      <p className="font-bold text-sm text-white group-hover:text-orange-500 transition-colors">{plan.name}</p>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">{plan.category} • {plan.formation}</span>
                   </button>
                 ))}
                 {state.tacticalPlans.length === 0 && <p className="text-center py-10 text-slate-600 text-xs italic">لا توجد خطط محفوظة</p>}
              </div>
           </div>

           {activePlan && (
             <div className="modern-card p-6 border-white/5 bg-slate-900/40">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Settings2 size={14}/> إعدادات الخطة</h4>
                <div className="space-y-4">
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block mr-1">الفئة المستهدفة</label>
                      <select 
                        value={activePlan.category} 
                        onChange={e => setState(p => ({...p, tacticalPlans: p.tacticalPlans.map(tp => tp.id === activePlan.id ? {...tp, category: e.target.value} : tp)}))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-orange-500"
                      >
                         {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block mr-1">نوع التشكيل</label>
                      <input 
                        type="text" 
                        value={activePlan.formation} 
                        onChange={e => setState(p => ({...p, tacticalPlans: p.tacticalPlans.map(tp => tp.id === activePlan.id ? {...tp, formation: e.target.value} : tp)}))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs font-bold text-white outline-none focus:border-orange-500"
                      />
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* Tactical Pitch View */}
        <div className="lg:col-span-3">
          {activePlan ? (
            <div className="modern-card p-8 border-white/5 flex flex-col gap-8">
               <div className="flex justify-between items-center">
                  <div className="flex-1 max-w-md">
                     <input 
                        value={activePlan.name} 
                        onChange={e => setState(p => ({...p, tacticalPlans: p.tacticalPlans.map(tp => tp.id === activePlan.id ? {...tp, name: e.target.value} : tp)}))} 
                        className="bg-transparent text-2xl font-bold text-white outline-none border-b border-white/10 focus:border-orange-500 pb-1 w-full" 
                     />
                  </div>
                  <button onClick={() => { if(confirm('حذف هذه الخطة؟')) setSelectedPlanId(null); setState(p => ({...p, tacticalPlans: p.tacticalPlans.filter(tp => tp.id !== activePlan.id)})); }} 
                    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 size={20}/>
                  </button>
               </div>

               <div className="flex flex-col xl:flex-row gap-8">
                  {/* The Pitch */}
                  <div 
                    ref={boardRef}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    className="flex-1 aspect-[4/3] bg-emerald-900/40 rounded-[2.5rem] border-[8px] border-white/5 relative overflow-hidden shadow-2xl group shadow-emerald-900/10"
                    style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '10% 10%' }}
                  >
                     {/* Lines */}
                     <div className="absolute inset-6 border-2 border-white/10"></div>
                     <div className="absolute top-1/2 left-6 right-6 h-0.5 bg-white/10"></div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-2 border-white/10 rounded-full"></div>
                     <div className="absolute top-6 left-1/2 -translate-x-1/2 w-48 h-20 border-2 border-white/10 border-t-0"></div>
                     <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 h-20 border-2 border-white/10 border-b-0"></div>
                     
                     {/* Players on Board */}
                     {activePlan.positions.map(pos => (
                       <div key={pos.playerId} 
                         draggable
                         onDragStart={() => setDraggedData({ id: pos.playerId, team: pos.team })}
                         onDoubleClick={() => removePosition(pos.playerId)}
                         style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                         className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-move z-20 transition-transform active:scale-125"
                         title="انقر مرتين للحذف"
                       >
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg border-2 border-white/80 shadow-xl ${pos.team === 'home' ? 'bg-orange-500' : 'bg-red-700'}`}>
                             {pos.team === 'home' ? (players.find(p=>p.id===pos.playerId)?.number || '?') : 'X'}
                          </div>
                          <span className="mt-2 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-white border border-white/10">{pos.label}</span>
                       </div>
                     ))}
                  </div>

                  {/* Sidebar Players Picker */}
                  <div className="w-full xl:w-72 space-y-6">
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] flex items-center gap-2"><Users size={14}/> لاعبي الكرامة ({activePlan.category})</h4>
                        <div className="grid grid-cols-2 xl:grid-cols-1 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                           {players.map(p => {
                             const isPlaced = activePlan.positions.some(pos => pos.playerId === p.id);
                             return (
                               <div key={p.id}
                                 draggable
                                 onDragStart={() => setDraggedData({ id: p.id, team: 'home' })}
                                 className={`p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing flex items-center gap-3 ${isPlaced ? 'bg-orange-500/10 border-orange-500/30 opacity-50' : 'bg-white/5 border-white/5 hover:border-orange-500'}`}
                               >
                                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-xs text-white">#{p.number}</div>
                                  <span className="text-[11px] font-bold text-slate-300 truncate">{p.name}</span>
                               </div>
                             );
                           })}
                        </div>
                     </div>

                     <div className="space-y-4 pt-4 border-t border-white/5">
                        <h4 className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] flex items-center gap-2"><Swords size={14}/> لاعبو الفريق الخصم</h4>
                        <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
                           {[1, 2, 3].map(n => (
                             <div key={`opp-${n}`}
                               draggable
                               onDragStart={() => setDraggedData({ id: `away-${generateUUID()}`, team: 'away' })}
                               className="p-3 rounded-xl border border-white/5 bg-red-900/10 hover:border-red-500 transition-all cursor-grab active:cursor-grabbing flex items-center gap-3"
                             >
                                <div className="w-8 h-8 bg-red-900 rounded-lg flex items-center justify-center font-bold text-xs text-white">X</div>
                                <span className="text-[11px] font-bold text-slate-300">إضافة لاعب خصم</span>
                             </div>
                           ))}
                        </div>
                     </div>
                     
                     <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mt-4">
                        <p className="text-[9px] font-bold text-slate-500 leading-relaxed flex items-center gap-2">
                           <Info size={12}/> اسحب اللاعب للملعب لوضعه، انقر مرتين على اللاعب في الملعب لحذفه.
                        </p>
                     </div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-900/20 rounded-[3rem] border-2 border-dashed border-white/5 p-20 opacity-30">
               <MapIcon size={80} className="mb-4 text-slate-600" />
               <p className="font-bold text-xl text-slate-400">اختر خطة من القائمة للبدء بالرسم التكتيكي</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TacticalBoard;
