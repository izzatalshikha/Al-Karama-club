
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, MapPin, Clock, Plus, X, Shield, Award, Calendar, 
  ChevronLeft, Trash2, Target, AlertTriangle, UserPlus, 
  Printer, FileText, Users, Save, ShieldAlert, BookOpen, Info, Timer, LogOut, LogIn, Crown, Map, ChevronRight, CheckCircle, Zap, TrendingUp, Activity, UserCircle, Sparkles, Loader2, BrainCircuit, Lock, Unlock,
  Gamepad2, UserCheck, TimerOff, ArrowRightLeft, Medal, ClipboardList, RefreshCw, Undo2, WalletCards, Gavel, Briefcase
} from 'lucide-react';
import { AppState, Match, MatchType, MatchEvent, Person } from '../types';
import { generateUUID, supabase } from '../App';
import ClubLogo from './ClubLogo';

interface MatchPlannerProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  defaultSelectedId?: string | null;
  addLog?: (m: string, d?: string, t?: any) => void;
  getSuspension: (id: string, cat: string) => { isSuspended: boolean, currentYellows: number, hasActiveRed: boolean };
  viewMode?: 'regular' | 'baraaem';
}

const MatchPlanner: React.FC<MatchPlannerProps> = ({ state, setState, defaultSelectedId, addLog, getSuspension, viewMode = 'regular' }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (defaultSelectedId) {
      const targetMatch = state.matches.find(m => m.id === defaultSelectedId);
      if (targetMatch) {
         handleOpenMatch(targetMatch);
      }
    }
  }, [defaultSelectedId, state.matches]);
  
  const currentUser = state.currentUser;
  const isManager = currentUser?.role === 'مدير';
  const isViewer = currentUser?.role === 'مشاهد';
  const restrictedCat = currentUser?.restrictedCategory;
  const allowedCategories = restrictedCat ? String(restrictedCat).split(',').filter(Boolean) : null;
  const hasRestriction = allowedCategories !== null && allowedCategories.length > 0;
  const defaultCategory = hasRestriction ? allowedCategories[0] : (categoriesToUse[0] || 'الرجال');

  const [formData, setFormData] = useState<Partial<Match>>({ 
    matchType: 'دوري', 
    category: defaultCategory,
    pitch: 'ملعب الكرامة',
    date: new Date().toISOString().split('T')[0],
    time: '16:00',
    opponent: '',
    advancePayment: '0',
    referee: '',
    homeCoach: '',
    awayCoach: ''
  });

  const recalculateAllMinutes = (currentMatch: Match) => {
    if (currentMatch.lineup?.halvesCount === '3' || currentMatch.category === 'البراعم') {
       return currentMatch; 
    }
    const stoppage2 = parseInt(currentMatch.stoppageTime2 || '0');
    const baseDuration = parseInt(currentMatch.matchDuration || '90');
    const fullTime = baseDuration + stoppage2;
    const newLineup = { ...currentMatch.lineup };

    newLineup.starters = newLineup.starters.map(s => {
      if (!s.playerId) return s;
      const isReplaced = newLineup.subs.find(sub => sub.replacedPlayerId === s.playerId && sub.substitutionMinute);
      if (isReplaced) {
        return { ...s, minutesPlayed: isReplaced.substitutionMinute };
      }
      return { ...s, minutesPlayed: fullTime.toString() };
    });

    newLineup.subs = newLineup.subs.map(sub => {
      if (!sub.playerId || !sub.substitutionMinute) return { ...sub, minutesPlayed: '0' };
      const subMin = parseInt(sub.substitutionMinute) || 0;
      return { ...sub, minutesPlayed: Math.max(0, fullTime - subMin).toString() };
    });

    return { ...currentMatch, lineup: newLineup };
  };

  const handleOpenMatch = (matchToOpen: Match) => {
    let repairedMatch = { ...matchToOpen };
    // Fix buggy Baraaem matches that were created with 11 starters
    if (repairedMatch.lineup?.halvesCount === '3' || repairedMatch.category === 'البراعم') {
      if (!repairedMatch.lineup) {
         repairedMatch.lineup = { starters: [], half2Starters: [], half3Starters: [], halvesCount: '3', durationHalf1: '20', durationHalf2: '20', durationHalf3: '20', subs: [], staff: [], captain: '' };
      }
      if (repairedMatch.lineup.starters?.length === 11 && repairedMatch.lineup.starters.every(s => !s.playerId)) {
         repairedMatch.lineup.starters = [];
      }
      if (!repairedMatch.lineup.halvesCount) repairedMatch.lineup.halvesCount = '3';
    } else {
      if (!repairedMatch.lineup) repairedMatch.lineup = { starters: [], subs: [], staff: [], captain: '' };
      if (!repairedMatch.lineup.starters || repairedMatch.lineup.starters.length < 11) {
         repairedMatch.lineup.starters = Array(11).fill(null).map((_, i) => repairedMatch.lineup.starters[i] || { playerId: '', name: '', number: '', minutesPlayed: '90' });
      }
    }
    setActiveMatch(repairedMatch);
  };

  const filteredMatches = useMemo(() => {
    return state.matches.filter(m => {
      const isBaraaemMatch = m.lineup?.halvesCount === '3' || m.category === 'البراعم';
      
      // If we are in baraaem mode, only show baraaem matches
      if (viewMode === 'baraaem') {
        if (!isBaraaemMatch) return false;
      } else {
        if (isBaraaemMatch) return false;
      }

      if (restrictedCat) return String(restrictedCat).split(',').includes(m.category);
      return (state.globalCategoryFilter === 'الكل' || m.category === state.globalCategoryFilter);
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [state.matches, state.globalCategoryFilter, restrictedCat, viewMode]);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    if (!formData.opponent) {
      alert('يرجى إدخال اسم الفريق الخصم');
      return;
    }
    if (!formData.date) {
      alert('يرجى تحديد تاريخ المباراة');
      return;
    }
    
    // Always use Baraaem formatting if we are inside the Baraaem view, or if the selected category is Baraaem.
    const isBaraaemFormat = viewMode === 'baraaem' || formData.category === 'البراعم';
    const finalCategory = formData.category || defaultCategory;
    
    const newMatch: Match = {
      id: generateUUID(),
      category: finalCategory,
      matchType: (formData.matchType as MatchType) || 'دوري',
      opponent: formData.opponent,
      pitch: formData.pitch || 'ملعب الكرامة',
      date: formData.date,
      time: formData.time || '16:00',
      advancePayment: formData.advancePayment || '0',
      referee: formData.referee || '',
      homeCoach: formData.homeCoach || '',
      awayCoach: formData.awayCoach || '',
      isCompleted: false,
      ourScore: '0',
      opponentScore: '0',
      stoppageTime1: '0',
      stoppageTime2: '0',
      squadSize: formData.squadSize || (isBaraaemFormat ? undefined : '18'),
      matchDuration: formData.matchDuration || (isBaraaemFormat ? '60' : '90'),
      isFinal: formData.isFinal || false,
      events: [],
      lineup: {
        starters: isBaraaemFormat ? [] : Array(11).fill(null).map(() => ({ playerId: '', name: '', number: '', minutesPlayed: '90' })),
        half2Starters: isBaraaemFormat ? [] : undefined,
        half3Starters: isBaraaemFormat ? [] : undefined,
        halvesCount: isBaraaemFormat ? '3' : formData.lineup?.halvesCount,
        durationHalf1: isBaraaemFormat ? '20' : undefined,
        durationHalf2: isBaraaemFormat ? '20' : undefined,
        durationHalf3: isBaraaemFormat ? '20' : undefined,
        subs: [],
        staff: [],
        captain: ''
      },
      notes: ''
    };
    
    const { error } = await supabase.from('matches').upsert(newMatch);
    if (error) { alert('خطأ في المزامنة: ' + error.message); return; }

    setState(prev => ({ ...prev, matches: [newMatch, ...prev.matches] }));
    addLog?.('جدولة مباراة', `تمت جدولة مواجهة ضد ${newMatch.opponent}`, 'success');
    setIsAddOpen(false);
    setActiveMatch(newMatch);
  };

  const deleteMatch = async (id: string) => {
    if (!isManager) return;
    if (confirm('🚨 هل أنت متأكد من حذف هذه المباراة نهائياً من السجلات المركزية؟')) {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) { alert('خطأ في الحذف: ' + error.message); return; }
      setState(prev => ({ ...prev, matches: prev.matches.filter(m => m.id !== id) }));
      addLog?.('حذف مباراة', 'تم مسح سجل المباراة من السحابة', 'error');
    }
  };

  const saveMatch = async (complete: boolean = false) => {
    if (!activeMatch || isViewer) return;
    const finalMatch = recalculateAllMinutes({ ...activeMatch, isCompleted: complete });
    // Remove isBaraaem if it exists from older data
    if ('isBaraaem' in finalMatch) {
      delete (finalMatch as any).isBaraaem;
    }
    const { error } = await supabase.from('matches').upsert(finalMatch);
    if (error) { alert('خطأ في الحفظ السحابي: ' + error.message); return; }

    setState(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === finalMatch.id ? finalMatch : m)
    }));
    setActiveMatch(null);
    addLog?.('تحديث مباراة', `تم حفظ بيانات ${finalMatch.opponent}`, 'success');
  };

  const addEvent = (type: MatchEvent['type']) => {
    if (!activeMatch) return;
    const newEvent: MatchEvent = { id: generateUUID(), type, player: '', minute: '', note: '' };
    setActiveMatch({ ...activeMatch, events: [...activeMatch.events, newEvent] });
  };

  const removeEvent = (id: string) => {
    if (!activeMatch) return;
    setActiveMatch({ ...activeMatch, events: activeMatch.events.filter(e => e.id !== id) });
  };

  const updateHalfStarter = (half: 1 | 2 | 3, idx: number, playerId: string) => {
    if (!activeMatch) return;
    const player = state.people.find(p => p.id === playerId);
    const newLineup = { ...activeMatch.lineup };
    
    let targetArrayName: 'starters' | 'half2Starters' | 'half3Starters' = 'starters';
    if (half === 2) targetArrayName = 'half2Starters';
    if (half === 3) targetArrayName = 'half3Starters';

    if (!newLineup[targetArrayName]) {
       newLineup[targetArrayName] = [];
    }

    if (player) {
      newLineup[targetArrayName][idx] = { playerId: player.id, name: player.name, number: player.number?.toString() || '', minutesPlayed: '0' };
    } else {
      newLineup[targetArrayName] = newLineup[targetArrayName].filter((_, i) => i !== idx);
    }
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const addPlayerToHalf = (half: 1 | 2 | 3, playerId: string) => {
    if (!activeMatch || !playerId) return;
    const player = state.people.find(p => p.id === playerId);
    if (!player) return;
    const newLineup = { ...activeMatch.lineup };
    
    let targetArrayName: 'starters' | 'half2Starters' | 'half3Starters' = 'starters';
    if (half === 2) targetArrayName = 'half2Starters';
    if (half === 3) targetArrayName = 'half3Starters';

    if (!newLineup[targetArrayName]) {
       newLineup[targetArrayName] = [];
    }
    newLineup[targetArrayName].push({
      playerId: player.id,
      name: player.name,
      number: player.number?.toString() || '',
      minutesPlayed: '0'
    });
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const updateStarter = (idx: number, playerId: string) => {
    if (!activeMatch) return;
    const player = state.people.find(p => p.id === playerId);
    const newLineup = { ...activeMatch.lineup };
    if (player) {
      newLineup.starters[idx] = { playerId: player.id, name: player.name, number: player.number?.toString() || '', minutesPlayed: '90' };
    } else {
      newLineup.starters[idx] = { playerId: '', name: '', number: '', minutesPlayed: '0' };
    }
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const addSubstitute = () => {
    if (!activeMatch) return;
    const newLineup = { ...activeMatch.lineup };
    newLineup.subs.push({ playerId: '', name: '', number: '', minutesPlayed: '0', substitutionMinute: '', replacedPlayerId: '' });
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const removeSubstitute = (idx: number) => {
    if (!activeMatch) return;
    const newLineup = { ...activeMatch.lineup };
    newLineup.subs.splice(idx, 1);
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const inputStyle = "w-full bg-white border border-slate-300 rounded-xl py-3 px-4 font-bold text-slate-900 focus:border-orange-500 outline-none transition-all text-sm disabled:opacity-50 shadow-sm placeholder:text-slate-500";
  const labelStyle = "text-[11px] font-black text-slate-700 uppercase mb-1.5 block tracking-widest";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-['IBM_Plex_Sans_Arabic']" dir="rtl">
      {/* Header Section */}
      <div className="modern-card p-6 md:p-8 flex items-center justify-between gap-4 border-b-4 border-orange-500/20">
        <div>
          <h2 className="text-2xl font-black text-blue-900 flex items-center gap-3">
            <Trophy className="text-orange-600" size={32} /> {viewMode === 'baraaem' ? 'مباريات البراعم' : 'إدارة مباريات النادي'}
          </h2>
        </div>
        {!isViewer && (
          <button onClick={() => setIsAddOpen(true)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg hover:bg-orange-600 active:scale-95 transition-all">
            <Plus size={20}/> مباراة جديدة
          </button>
        )}
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {filteredMatches.map(m => {
          const canEdit = isManager || (!m.isCompleted && !isViewer);
          return (
            <div 
              key={m.id} 
              onClick={() => canEdit && handleOpenMatch(m)}
              className={`modern-card p-6 md:p-8 flex flex-col border-b-4 border-slate-200 transition-all group cursor-pointer ${canEdit ? 'hover:border-orange-500' : ''}`}
            >
               <div className="flex justify-between items-start mb-4 md:mb-6">
                  <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full border border-orange-100 uppercase">{m.matchType}</span>
                  <span className="text-[10px] text-slate-500 font-bold tabular-nums">{m.date}</span>
               </div>
               <div className="text-center py-4 md:py-6">
                  <div className="flex justify-center items-center gap-4 md:gap-6 pointer-events-none">
                    <div className="text-3xl md:text-4xl font-black text-blue-900 tabular-nums">{m.ourScore}</div>
                    <div className="text-slate-300 font-black text-2xl">:</div>
                    <div className="text-3xl md:text-4xl font-black text-blue-900 tabular-nums">{m.opponentScore}</div>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-blue-900 mt-4 truncate px-2">الكرامة × {m.opponent}</h3>
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">{m.category} | {m.pitch}</p>
                  
                  {/* Detailed Match Info Brief */}
                  <div className="mt-4 space-y-1">
                    {m.referee && <p className="text-[9px] text-slate-600 font-bold flex items-center justify-center gap-1"><Gavel size={10}/> ملعب: {m.referee}</p>}
                    {m.homeCoach && <p className="text-[9px] text-slate-600 font-bold flex items-center justify-center gap-1"><Briefcase size={10}/> مدربنا: {m.homeCoach}</p>}
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black text-emerald-700 bg-emerald-50 py-2 rounded-xl border border-emerald-100 italic">
                     <WalletCards size={12}/> سلفة المباراة: {m.advancePayment || '0'} ل.س
                  </div>
               </div>
               <div className="mt-auto pt-6 border-t border-slate-100 flex gap-2 md:gap-3">
                  <button onClick={(e) => { e.stopPropagation(); handleOpenMatch(m); }} className="flex-1 bg-slate-100 hover:bg-orange-500 text-blue-900 hover:text-white py-3 rounded-xl font-black text-[10px] md:text-xs transition-all flex items-center justify-center gap-2 shadow-sm">
                    {canEdit ? <Activity size={16}/> : <FileText size={16}/>}
                    {canEdit ? 'إدارة المباراة' : 'تقرير فني'}
                  </button>
                  {isManager && (
                    <button onClick={(e) => { e.stopPropagation(); deleteMatch(m.id); }} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm">
                      <Trash2 size={16}/>
                    </button>
                  )}
               </div>
            </div>
          );
        })}
      </div>
      {filteredMatches.length === 0 && (
         <div className="text-center py-12 md:py-16">
            <Trophy className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-orange-600 text-sm font-bold">لا يوجد مباريات. يرجى إضافة مباراة جديدة.</p>
         </div>
      )}

      {/* Modal: Add Match */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-4">
           <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md" onClick={() => setIsAddOpen(false)}></div>
           <div className="relative bg-white border-4 border-white w-full max-w-2xl rounded-[2rem] md:rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                 <h3 className="text-lg md:text-xl font-black text-blue-900 uppercase tracking-tighter">جدولة مواجهة جديدة</h3>
                 <button onClick={() => setIsAddOpen(false)} className="p-2.5 bg-slate-100 hover:bg-red-500 rounded-xl transition-all text-slate-500 hover:text-white shadow-sm"><X size={20}/></button>
              </div>
              <form onSubmit={handleCreateMatch} className="p-6 md:p-10 space-y-4 md:space-y-6 text-right overflow-y-auto max-h-[80vh] custom-scrollbar bg-slate-50" dir="rtl">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div>
                       <label className={labelStyle}>الفئة</label>
                       <select className={inputStyle} value={formData.category || defaultCategory || ''} onChange={e => setFormData({...formData, category: e.target.value})}>
                          {(hasRestriction ? allowedCategories : categoriesToUse).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className={labelStyle}>نوع المنافسة</label>
                       <select className={inputStyle} value={formData.matchType || ''} onChange={e => setFormData({...formData, matchType: e.target.value as any})}>
                          <option value="دوري">دوري</option>
                          <option value="كأس">كأس</option>
                          <option value="ودية">ودية</option>
                       </select>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div>
                       <label className={labelStyle}>اسم الخصم</label>
                       <input type="text" className={inputStyle} value={formData.opponent || ''} onChange={e => setFormData({...formData, opponent: e.target.value})} placeholder="أدخل اسم النادي..." />
                    </div>
                    <div>
                       <label className={labelStyle}>السلفة (ل.س)</label>
                       <input type="text" className={inputStyle} value={formData.advancePayment || ''} onChange={e => setFormData({...formData, advancePayment: e.target.value})} placeholder="0" />
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4 md:gap-6">
                    <div>
                       <label className={labelStyle}>  الملعب </label>
                       <input type="text" className={inputStyle} value={formData.referee || ''} onChange={e => setFormData({...formData, referee: e.target.value})} placeholder="ملعب خالد بن الوليد" />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div>
                       <label className={labelStyle}>مدرب الكرامة</label>
                       <input type="text" className={inputStyle} value={formData.homeCoach || ''} onChange={e => setFormData({...formData, homeCoach: e.target.value})} placeholder="اسم المدرب..." />
                    </div>
                    <div>
                       <label className={labelStyle}>مدرب الفريق الخصم</label>
                       <input type="text" className={inputStyle} value={formData.awayCoach || ''} onChange={e => setFormData({...formData, awayCoach: e.target.value})} placeholder="اسم المدرب..." />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div>
                       <label className={labelStyle}>التاريخ</label>
                       <input type="date" className={inputStyle} value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div>
                       <label className={labelStyle}>التوقيت</label>
                       <input type="time" className={inputStyle} value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                          <div>
                             <label className={labelStyle}>مدة المباراة (دقائق)</label>
                             <input type="number" className={inputStyle} value={formData.matchDuration || ''} onChange={e => setFormData({...formData, matchDuration: e.target.value})} placeholder={viewMode === 'baraaem' ? "60" : "90"} />
                          </div>
                          <div>
                             <label className={labelStyle}>عدد لاعبي قائمة المباراة</label>
                             <input type="number" className={inputStyle} value={formData.squadSize || ''} onChange={e => setFormData({...formData, squadSize: e.target.value})} placeholder={viewMode === 'baraaem' ? "مفتوح" : "18"} />
                          </div>
                 </div>

                 <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl cursor-pointer hover:border-orange-500 transition-all">
                    <input type="checkbox" className="w-5 h-5 rounded text-orange-500 focus:ring-orange-500" checked={formData.isFinal || false} onChange={e => setFormData({...formData, isFinal: e.target.checked})} />
                    <span className="text-sm font-black text-blue-900">مباراة نهائية (تتضمن أشواط إضافية وركلات ترجيح)</span>
                 </label>

                 <button type="submit" className="w-full bg-blue-900 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-base md:text-lg shadow-xl shadow-blue-900/10 hover:bg-blue-800 transition-all">تثبيت المباراة سحابياً</button>
              </form>
           </div>
        </div>
      )}

      {/* Deep Management Overlay (Full Interface) */}
      {activeMatch && (
        <div className="fixed inset-0 z-[110] bg-white overflow-y-auto custom-scrollbar no-print" dir="rtl">
           <div className="min-h-screen bg-slate-50 p-4 lg:p-10 pb-20">
              <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
                 
                 {/* Header Actions */}
                 <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                       <button onClick={() => setActiveMatch(null)} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-orange-500 text-blue-900 hover:text-white transition-all shadow-sm"><Undo2 size={24}/></button>
                       <div>
                          <h2 className="text-xl md:text-3xl font-black text-blue-900 leading-tight">الكرامة × {activeMatch.opponent}</h2>
                          <div className="flex gap-2 md:gap-3 mt-1 overflow-x-auto whitespace-nowrap pb-1">
                             <span className="text-orange-500 font-bold text-[9px] md:text-xs uppercase tracking-widest">{activeMatch.category}</span>
                             <span className="text-slate-500 font-bold text-[9px] md:text-xs uppercase">| {activeMatch.date}</span>
                             {activeMatch.isCompleted && <span className="bg-emerald-50 text-emerald-600 text-[8px] md:text-[10px] font-black px-2 py-0.5 rounded border border-emerald-100">معتمدة</span>}
                          </div>
                       </div>
                    </div>
                    {!isViewer && (isManager || !activeMatch.isCompleted) && (
                      <div className="flex gap-2 md:gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                         <button onClick={() => saveMatch(true)} className="flex-1 bg-emerald-600 text-white px-4 md:px-8 py-3.5 rounded-2xl font-black text-[10px] md:text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 whitespace-nowrap">
                            <CheckCircle size={18}/> <span className="hidden xs:inline">اعتماد التقرير</span><span className="xs:hidden">اعتماد</span>
                         </button>
                         <button onClick={() => saveMatch(false)} className="flex-1 bg-blue-900 text-white px-4 md:px-8 py-3.5 rounded-2xl font-black text-[10px] md:text-sm flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/10 whitespace-nowrap">
                            <Save size={18}/> <span className="hidden xs:inline">حفظ المسودة</span><span className="xs:hidden">حفظ</span>
                         </button>
                      </div>
                    )}
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                    
                    {/* Column 1: Score & Lineup */}
                    <div className="lg:col-span-8 space-y-6 md:space-y-8">
                       
                       {/* Scoreboard Card */}
                       <div className="modern-card p-6 md:p-10 bg-white border border-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                             <div className="space-y-6">
                                <h4 className="text-center text-[10px] font-black text-orange-700 uppercase tracking-[0.3em]">النتيجة النهائية</h4>
                                <div className="flex justify-center items-center gap-4 md:gap-6">
                                   <div className="text-center">
                                      <p className="text-[9px] font-black text-slate-600 mb-2 uppercase">الكرامة</p>
                                      <input type="number" className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 border border-slate-200 rounded-3xl text-center text-3xl md:text-5xl font-black text-blue-950 outline-none focus:border-orange-500 transition-all shadow-inner" value={activeMatch.ourScore || ''} onChange={e => setActiveMatch({...activeMatch, ourScore: e.target.value})} />
                                   </div>
                                   <div className="text-3xl font-black text-slate-400 mt-6 md:mt-8">:</div>
                                   <div className="text-center">
                                      <p className="text-[9px] font-black text-slate-600 mb-2 uppercase">{activeMatch.opponent}</p>
                                      <input type="number" className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 border border-slate-200 rounded-3xl text-center text-3xl md:text-5xl font-black text-blue-950 outline-none focus:border-orange-500 transition-all shadow-inner" value={activeMatch.opponentScore || ''} onChange={e => setActiveMatch({...activeMatch, opponentScore: e.target.value})} />
                                   </div>
                                </div>
                             </div>
                             <div className="space-y-6">
                                <h4 className="text-center text-[10px] font-black text-blue-900 uppercase tracking-[0.3em]">البيانات الإضافية</h4>
                                <div className="grid grid-cols-1 gap-4">
                                   <div className="flex gap-4">
                                      <div className="flex-1">
                                         <p className="text-[9px] font-black text-slate-500 mb-2 uppercase text-center">شوط 1 (د)</p>
                                         <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 text-center text-lg font-black text-blue-900 outline-none focus:border-orange-500 transition-all" value={activeMatch.stoppageTime1 || ''} onChange={e => setActiveMatch({...activeMatch, stoppageTime1: e.target.value})} />
                                      </div>
                                      <div className="flex-1">
                                         <p className="text-[9px] font-black text-slate-500 mb-2 uppercase text-center">شوط 2 (د)</p>
                                         <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 text-center text-lg font-black text-blue-900 outline-none focus:border-orange-500 transition-all" value={activeMatch.stoppageTime2 || ''} onChange={e => setActiveMatch({...activeMatch, stoppageTime2: e.target.value})} />
                                      </div>
                                   </div>
                                   <div>
                                      <p className="text-[9px] font-black text-slate-500 mb-2 uppercase text-center">سلفة المباراة (ل.س)</p>
                                      <input type="text" className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl py-4 text-center text-xl font-black text-emerald-700 outline-none focus:border-emerald-500 transition-all" value={activeMatch.advancePayment || ''} onChange={e => setActiveMatch({...activeMatch, advancePayment: e.target.value})} />
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>

                       {activeMatch.isFinal && (
                          <div className="modern-card p-6 md:p-8 bg-orange-50 border border-orange-200 mb-6 w-full">
                             <h4 className="text-center text-[10px] font-black text-orange-800 uppercase tracking-[0.3em] mb-6">ركلات الترجيح (للمباريات النهائية)</h4>
                             <div className="flex justify-center items-center gap-12">
                                <div className="text-center">
                                   <p className="text-[9px] font-black text-orange-700 mb-2 uppercase">الكرامة</p>
                                   <input type="number" className="w-16 h-16 bg-white border border-orange-300 rounded-2xl text-center text-2xl font-black text-blue-950 outline-none focus:border-orange-500 transition-all shadow-inner" value={activeMatch.ourPenaltiesScore || ''} onChange={e => setActiveMatch({...activeMatch, ourPenaltiesScore: e.target.value})} />
                                </div>
                                <div className="text-2xl font-black text-orange-300">Vs</div>
                                <div className="text-center">
                                   <p className="text-[9px] font-black text-orange-700 mb-2 uppercase">{activeMatch.opponent}</p>
                                   <input type="number" className="w-16 h-16 bg-white border border-orange-300 rounded-2xl text-center text-2xl font-black text-blue-950 outline-none focus:border-orange-500 transition-all shadow-inner" value={activeMatch.opponentPenaltiesScore || ''} onChange={e => setActiveMatch({...activeMatch, opponentPenaltiesScore: e.target.value})} />
                                </div>
                             </div>
                          </div>
                       )}

                       {/* Match Officials */}
                       <div className="modern-card p-6 md:p-8 border-slate-200 bg-white">
                          <h4 className="text-base md:text-lg font-black text-blue-900 mb-6 md:mb-8 border-r-4 border-orange-500 pr-4 flex items-center gap-3 uppercase"><Gavel size={20}/> تفاصيل المباراة</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 text-right">
                            <div>
                               <label className={labelStyle}>ملعب المباراة</label>
                               <input type="text" className={inputStyle} value={activeMatch.referee || ''} onChange={e => setActiveMatch({...activeMatch, referee: e.target.value})} placeholder="الملعب ..." />
                            </div>
                            <div>
                               <label className={labelStyle}>مدرب الكرامة</label>
                               <input type="text" className={inputStyle} value={activeMatch.homeCoach || ''} onChange={e => setActiveMatch({...activeMatch, homeCoach: e.target.value})} placeholder="اسم المدرب..." />
                            </div>
                            <div>
                               <label className={labelStyle}>مدرب الخصم</label>
                               <input type="text" className={inputStyle} value={activeMatch.awayCoach || ''} onChange={e => setActiveMatch({...activeMatch, awayCoach: e.target.value})} placeholder="اسم المدرب..." />
                            </div>
                          </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6 text-right mt-6">
                                <div>
                                   <label className={labelStyle}>مدة المباراة (دقائق)</label>
                                   <input type="number" className={inputStyle} value={activeMatch.matchDuration || ''} onChange={e => setActiveMatch({...activeMatch, matchDuration: e.target.value})} placeholder={activeMatch.lineup?.halvesCount === '3' ? "60" : "90"} />
                                </div>
                                <div>
                                   <label className={labelStyle}>حجم القائمة المسموح</label>
                                   <input type="number" className={inputStyle} value={activeMatch.squadSize || ''} onChange={e => setActiveMatch({...activeMatch, squadSize: e.target.value})} placeholder={activeMatch.lineup?.halvesCount === '3' ? "مفتوح" : "18"} />
                                </div>
                             </div>
                       </div>

                       {/* Match Squad (Roster) */}
                       <div className="modern-card p-6 md:p-8 border-slate-200">
                          <div className="flex justify-between items-center mb-6 md:mb-8">
                             <h4 className="text-base md:text-lg font-black text-blue-900 border-r-4 border-blue-900 pr-4 flex items-center gap-3 uppercase"><ClipboardList size={20}/> قائمة المباراة (المستدعيين)</h4>
                             {(activeMatch.lineup?.halvesCount === '3') ? (
                                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-black">العدد: {activeMatch.squad?.length || 0}</span>
                             ) : (
                                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-black">{activeMatch.squad?.length || 0} / {activeMatch.squadSize || 18}</span>
                             )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                             {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category).map(player => {
                                const suspension = getSuspension(player.id, player.category);
                                const isSelected = activeMatch.squad?.includes(player.id) || false;
                                const isSuspended = suspension.isSuspended;
                                
                                return (
                                  <div 
                                    key={player.id}
                                    onClick={() => {
                                      const currentSquad = activeMatch.squad || [];
                                      const limit = (activeMatch.lineup?.halvesCount === '3') ? 999 : parseInt(activeMatch.squadSize || '18');
                                      if (isSelected) {
                                        setActiveMatch({...activeMatch, squad: currentSquad.filter(id => id !== player.id)});
                                      } else if (currentSquad.length < limit) {
                                        setActiveMatch({...activeMatch, squad: [...currentSquad, player.id]});
                                      }
                                    }}
                                    className={`relative p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-slate-100 bg-white hover:border-slate-300'} ${isSuspended ? 'opacity-75' : ''}`}
                                  >
                                     <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {player.number || '-'}
                                     </div>
                                     <div className="flex-1 min-w-0">
                                        <p className="font-black text-sm text-blue-900 truncate flex items-center gap-1.5">
                                           {player.name}
                                           {isSuspended && <AlertTriangle size={14} className="text-red-500 fill-red-100" />}
                                        </p>
                                        {(suspension.currentYellows > 0 || suspension.hasActiveRed) && (
                                           <div className="flex gap-1 mt-1">
                                             {Array.from({length: suspension.currentYellows}).map((_, i) => (
                                                <div key={i} className="w-2.5 h-3.5 bg-yellow-400 rounded-sm shadow-sm" title="بطاقة صفراء"></div>
                                             ))}
                                             {suspension.hasActiveRed && (
                                                <div className="w-2.5 h-3.5 bg-red-500 rounded-sm shadow-sm" title="بطاقة حمراء"></div>
                                             )}
                                             {suspension.currentYellows >= 3 && (
                                                <span className="text-[9px] text-red-600 font-bold ml-1">إنذار إيقاف!</span>
                                             )}
                                           </div>
                                        )}
                                     </div>
                                     <div className="shrink-0 text-slate-300">
                                        <CheckCircle size={20} className={isSelected ? "text-orange-500" : ""} />
                                     </div>
                                  </div>
                                )
                             })}
                          </div>
                          {(!activeMatch.squad || activeMatch.squad.length === 0) && (
                            <p className="text-xs text-slate-500 text-center py-4 italic">يرجى تحديد اللاعبين المستدعين للمباراة</p>
                          )}
                       </div>

                       {/* Starting XI */}
                       <div className="modern-card p-6 md:p-8 border-slate-200">
                          {(activeMatch.lineup?.halvesCount === '3') ? (
                             Array.from({ length: parseInt(activeMatch.lineup?.halvesCount || '3') }).map((_, halfIdx) => {
                                const halfLabel = halfIdx === 0 ? 'الشوط الأول' : halfIdx === 1 ? 'الشوط الثاني' : 'الشوط الثالث';
                                const halfNum = (halfIdx + 1) as 1 | 2 | 3;
                                const targetArrayName = halfNum === 1 ? 'starters' : (halfNum === 2 ? 'half2Starters' : 'half3Starters');
                                const currentLineupArray = (activeMatch.lineup[targetArrayName] || []).filter(s => s.playerId);
                                
                                return (
                                   <div key={halfNum} className="mb-8 last:mb-0">
                                      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                        <h4 className="text-base md:text-lg font-black text-blue-900 border-r-4 border-blue-900 pr-4 flex items-center gap-3 uppercase"><Users size={20}/> تشكيلة {halfLabel}</h4>
                                        <div className="flex items-center gap-2">
                                           <label className="text-xs font-bold text-slate-500">المدة:</label>
                                           <input type="number" className="w-16 h-10 bg-slate-50 border border-slate-200 rounded-lg text-center font-black" value={halfNum === 1 ? (activeMatch.lineup?.durationHalf1 || '') : halfNum === 2 ? (activeMatch.lineup?.durationHalf2 || '') : (activeMatch.lineup?.durationHalf3 || '')} onChange={e => {
                                              const newLineup = { ...activeMatch.lineup };
                                              if (halfNum === 1) newLineup.durationHalf1 = e.target.value;
                                              if (halfNum === 2) newLineup.durationHalf2 = e.target.value;
                                              if (halfNum === 3) newLineup.durationHalf3 = e.target.value;
                                              setActiveMatch({...activeMatch, lineup: newLineup});
                                           }} placeholder="دقيقة" />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4">
                                         {currentLineupArray.map((s, i) => (
                                           <div key={i} className="flex justify-between items-center bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm">
                                              <div className="flex items-center gap-3">
                                                 <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg md:rounded-xl flex items-center justify-center font-black text-blue-900 border border-slate-200 text-sm">{s.number || i+1}</div>
                                                 <span className="font-bold text-sm text-slate-800">{s.name}</span>
                                              </div>
                                              <button onClick={() => updateHalfStarter(halfNum, i, '')} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16}/></button>
                                           </div>
                                         ))}
                                      </div>
                                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                         <select className={inputStyle} value="" onChange={e => addPlayerToHalf(halfNum, e.target.value)}>
                                            <option value="">+ إضافة لاعب إلى تشكيلة {halfLabel}</option>
                                            {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category && (!activeMatch.squad?.length || activeMatch.squad.includes(p.id)) && (!currentLineupArray.some(starter => starter.playerId === p.id))).map(p => (
                                              <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                            ))}
                                         </select>
                                      </div>
                                   </div>
                                )
                             })
                          ) : (
                             <>
                                <h4 className="text-base md:text-lg font-black text-blue-900 mb-6 md:mb-8 border-r-4 border-blue-900 pr-4 flex items-center gap-3 uppercase"><Users size={20}/> التشكيلة الأساسية (11 لاعب)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                   {activeMatch.lineup.starters.map((s, i) => (
                                     <div key={i} className="flex gap-2 md:gap-3 bg-slate-50 p-3 md:p-4 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg md:rounded-xl flex items-center justify-center font-black text-blue-900 border border-slate-200 text-sm">{i+1}</div>
                                        <select className={inputStyle} value={s.playerId} onChange={e => updateStarter(i, e.target.value)}>
                                           <option value="">-- اختر لاعب --</option>
                                           {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category && (!activeMatch.squad?.length || activeMatch.squad.includes(p.id)) && (!activeMatch.lineup.starters.some(starter => starter.playerId === p.id && starter.playerId !== s.playerId))).map(p => (
                                             <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                           ))}
                                        </select>
                                     </div>
                                   ))}
                                </div>
                             </>
                          )}
                       </div>

                       {/* Substitutes Section */}
                       <div className="modern-card p-6 md:p-8 border-slate-200">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                             <h4 className="text-base md:text-lg font-black text-blue-900 border-r-4 border-blue-500 pr-4 flex items-center gap-3 uppercase"><ArrowRightLeft size={20}/> التبديلات</h4>
                             <button onClick={addSubstitute} className="w-full sm:w-auto bg-blue-50 text-blue-700 px-6 py-2.5 rounded-xl text-[10px] font-black hover:bg-blue-900 hover:text-white transition-all shadow-sm border border-blue-100">+ إضافة بديل</button>
                          </div>
                          <div className="space-y-4">
                             {activeMatch.lineup.subs.map((sub, idx) => (
                               <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 relative group">
                                  <button onClick={() => removeSubstitute(idx)} className="absolute -left-2 -top-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"><X size={14}/></button>
                                  <div className="sm:col-span-1">
                                     <label className={labelStyle}>اللاعب البديل</label>
                                     <select className={inputStyle} value={sub.playerId} onChange={e => {
                                       const p = state.people.find(x => x.id === e.target.value);
                                       const newSubs = [...activeMatch.lineup.subs];
                                       newSubs[idx] = { ...newSubs[idx], playerId: p?.id || '', name: p?.name || '', number: p?.number?.toString() || '' };
                                       setActiveMatch({...activeMatch, lineup: {...activeMatch.lineup, subs: newSubs}});
                                     }}>
                                        <option value="">-- اختر لاعب --</option>
                                        {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category && (!activeMatch.squad?.length || activeMatch.squad.includes(p.id)) && !activeMatch.lineup.starters.some(s => s.playerId === p.id)).map(p => (
                                          <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                        ))}
                                     </select>
                                  </div>
                                  <div>
                                     <label className={labelStyle}>المستبدل</label>
                                     <select className={inputStyle} value={sub.replacedPlayerId} onChange={e => {
                                       const newSubs = [...activeMatch.lineup.subs];
                                       newSubs[idx].replacedPlayerId = e.target.value;
                                       setActiveMatch({...activeMatch, lineup: {...activeMatch.lineup, subs: newSubs}});
                                     }}>
                                        <option value="">-- لم يستبدل --</option>
                                        {activeMatch.lineup.starters.filter(s => s.playerId).map(s => (
                                          <option key={s.playerId} value={s.playerId}>{s.name}</option>
                                        ))}
                                     </select>
                                  </div>
                                  <div>
                                     <label className={labelStyle}>دقيقة التبديل</label>
                                     <input type="number" className={inputStyle} value={sub.substitutionMinute} onChange={e => {
                                       const newSubs = [...activeMatch.lineup.subs];
                                       newSubs[idx].substitutionMinute = e.target.value;
                                       setActiveMatch({...activeMatch, lineup: {...activeMatch.lineup, subs: newSubs}});
                                     }} />
                                  </div>
                                  <div className="flex flex-col justify-center text-center bg-white rounded-2xl shadow-sm border border-slate-200 p-2">
                                     <p className="text-[8px] font-black text-slate-500 uppercase">دقائق اللعب</p>
                                     <p className="text-xl font-black text-orange-600 tabular-nums">
                                        {(() => {
                                           const f = 90 + parseInt(activeMatch.stoppageTime2 || '0');
                                           const m = parseInt(sub.substitutionMinute) || 0;
                                           return sub.substitutionMinute ? Math.max(0, f - m) : 0;
                                        })()} د
                                     </p>
                                  </div>
                               </div>
                             ))}
                             {activeMatch.lineup.subs.length === 0 && <p className="text-center py-10 text-slate-500 text-xs italic">لا يوجد بدلاء مسجلين</p>}
                          </div>
                       </div>
                    </div>

                    {/* Column 2: Events & Notes */}
                    <div className="lg:col-span-4 space-y-6 md:space-y-8">
                       
                       {/* Match Events */}
                       <div className="modern-card p-6 md:p-8 border border-slate-200 bg-white">
                          <h4 className="text-base md:text-lg font-black text-blue-900 mb-6 md:mb-8 border-r-4 border-emerald-600 pr-4 flex items-center gap-3 uppercase"><Activity size={20}/> الأحداث التفاعلية</h4>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
                             {[
                               { t: 'goal' as const, l: '⚽ هدف', c: 'hover:bg-emerald-600' },
                               { t: 'assist' as const, l: '👟 أسيست', c: 'hover:bg-blue-900' },
                               { t: 'yellow' as const, l: '🟨 إنذار', c: 'hover:bg-yellow-500' },
                               { t: 'red' as const, l: '🟥 طرد', c: 'hover:bg-red-600' },
                               { t: 'injury' as const, l: '🏥 إصابة', c: 'hover:bg-purple-600' }
                             ].map(btn => (
                               <button key={btn.t} onClick={() => addEvent(btn.t)} className={`bg-slate-100 border border-slate-200 py-3 rounded-xl text-[10px] font-black text-slate-700 transition-all ${btn.c} hover:text-white active:scale-95 shadow-sm`}>
                                  {btn.l}
                                </button>
                             ))}
                          </div>

                          <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                             {activeMatch.events.map(ev => (
                               <div key={ev.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group shadow-sm">
                                  <button onClick={() => removeEvent(ev.id)} className="absolute left-3 top-3 text-red-600 opacity-0 group-hover:opacity-100 transition-all font-black"><X size={16}/></button>
                                  <div className="flex items-center gap-3 mb-3">
                                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${ev.type==='goal'?'bg-emerald-600':ev.type==='yellow'?'bg-yellow-500':ev.type==='red'?'bg-red-600':'bg-blue-900'} text-white`}>{ev.type}</span>
                                     <input type="number" placeholder="الدقيقة" className="w-16 bg-transparent border-none text-xs text-orange-600 font-black focus:ring-0" value={ev.minute || ''} onChange={e => {
                                        const newEvents = activeMatch.events.map(x => x.id === ev.id ? {...x, minute: e.target.value} : x);
                                        setActiveMatch({...activeMatch, events: newEvents});
                                     }} />
                                  </div>
                                  <select className={`${inputStyle} text-[11px] py-2`} value={ev.player || ''} onChange={e => {
                                     const newEvents = activeMatch.events.map(x => x.id === ev.id ? {...x, player: e.target.value} : x);
                                     setActiveMatch({...activeMatch, events: newEvents});
                                  }}>
                                     <option value="">-- اللاعب المعني --</option>
                                     {[...activeMatch.lineup.starters, ...activeMatch.lineup.subs].filter(x => x.playerId).map(p => (
                                       <option key={p.playerId} value={p.playerId}>{p.name} (#{p.number})</option>
                                     ))}
                                  </select>
                               </div>
                             ))}
                             {activeMatch.events.length === 0 && <p className="text-center py-10 text-slate-500 text-[10px] italic">لم يتم رصد أي أحداث</p>}
                          </div>
                       </div>

                       {/* Technical Notes */}
                       <div className="modern-card p-6 md:p-8 border border-slate-200 bg-white">
                          <h4 className="text-[10px] font-black text-slate-600 uppercase mb-4 tracking-widest flex items-center gap-2 font-black italic"><StickyNote size={16}/> الملاحظات الفنية</h4>
                          <textarea 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs md:text-sm text-blue-900 h-40 md:h-48 resize-none outline-none focus:border-orange-500 font-medium leading-relaxed shadow-inner"
                            placeholder="اكتب التقرير الفني المختصر للمباراة..."
                            value={activeMatch.notes || ''}
                            onChange={e => setActiveMatch({...activeMatch, notes: e.target.value})}
                          />
                       </div>

                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const StickyNote = ({size}: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/></svg>;

export default MatchPlanner;
