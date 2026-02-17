
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, MapPin, Clock, Plus, X, Shield, Award, Calendar, 
  ChevronLeft, Trash2, Target, AlertTriangle, UserPlus, 
  Printer, FileText, Users, Save, ShieldAlert, BookOpen, Info, Timer, LogOut, LogIn, Crown, Map, ChevronRight, CheckCircle, Zap, TrendingUp, Activity, UserCircle, Sparkles, Loader2, BrainCircuit, Lock, Unlock,
  Gamepad2, UserCheck, TimerOff, ArrowRightLeft, Medal, ClipboardList, RefreshCw
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
}

interface PlayerMatchStats {
  id: string;
  name: string;
  number: string;
  role: 'أساسي' | 'بديل';
  mins: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
}

const MatchPlanner: React.FC<MatchPlannerProps> = ({ state, setState, defaultSelectedId, addLog, getSuspension }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  const isManager = currentUser?.role === 'مدير';
  const isViewer = currentUser?.role === 'مشاهد';

  const [formData, setFormData] = useState<Partial<Match>>({ 
    matchType: 'دوري', 
    category: restrictedCat || (state.globalCategoryFilter === 'الكل' ? state.categories[0] : state.globalCategoryFilter),
    pitch: 'ملعب الكرامة',
    date: new Date().toISOString().split('T')[0],
    time: '16:00',
    opponent: '',
    ourScore: '0',
    opponentScore: '0',
    stoppageTime1: '0',
    stoppageTime2: '0'
  });

  const recalculateAllMinutes = (currentMatch: Match) => {
    const stoppage2 = parseInt(currentMatch.stoppageTime2 || '0');
    const fullTime = 90 + stoppage2;
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
      if (!sub.playerId || !sub.substitutionMinute) return sub;
      const subMin = parseInt(sub.substitutionMinute) || 0;
      return { ...sub, minutesPlayed: (fullTime - subMin).toString() };
    });

    return { ...currentMatch, lineup: newLineup };
  };

  const filteredMatches = useMemo(() => {
    return state.matches.filter(m => {
      if (restrictedCat) return m.category === restrictedCat;
      return (state.globalCategoryFilter === 'الكل' || m.category === state.globalCategoryFilter);
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [state.matches, state.globalCategoryFilter, restrictedCat]);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.opponent || !formData.date) return;
    const newMatch: Match = {
      id: generateUUID(),
      category: formData.category || state.categories[0],
      matchType: (formData.matchType as MatchType) || 'دوري',
      opponent: formData.opponent,
      pitch: formData.pitch || 'ملعب الكرامة',
      date: formData.date,
      time: formData.time || '16:00',
      advancePayment: '0',
      isCompleted: false,
      ourScore: '0',
      opponentScore: '0',
      stoppageTime1: '0',
      stoppageTime2: '0',
      events: [],
      lineup: {
        starters: Array(11).fill(null).map(() => ({ playerId: '', name: '', number: '', minutesPlayed: '0' })),
        subs: [],
        staff: [],
        captain: ''
      },
      notes: ''
    };
    
    const { error } = await supabase.from('matches').insert(newMatch);
    if (error) { alert('خطأ في المزامنة: ' + error.message); return; }

    setState(prev => ({ ...prev, matches: [newMatch, ...prev.matches] }));
    addLog?.('جدولة مباراة', `تمت جدولة مواجهة ضد ${newMatch.opponent}`, 'success');
    setIsAddOpen(false);
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

  const updateStarter = (index: number, playerId: string) => {
    if (!activeMatch) return;
    const player = state.people.find(p => p.id === playerId);
    const newLineup = { ...activeMatch.lineup };
    
    if (player) {
      const suspension = getSuspension(playerId, activeMatch.category);
      if (suspension.isSuspended) {
        alert(`⛔ تنبيه صارم: اللاعب ${player.name} موقوف انضباطياً (تراكم بطاقات أو طرد). لا يمكن إشراكه في هذه المباراة بتاتاً وسيتم إشراكه في المباراة القادمة بعد انقضاء العقوبة.`);
        return;
      }
      newLineup.starters[index] = { playerId: player.id, name: player.name, number: player.number?.toString() || '', minutesPlayed: '0' };
    } else {
      newLineup.starters[index] = { playerId: '', name: '', number: '', minutesPlayed: '0' };
    }
    setActiveMatch(recalculateAllMinutes({ ...activeMatch, lineup: newLineup }));
  };

  const updateSub = (index: number, field: string, value: string) => {
    if (!activeMatch) return;
    const newLineup = { ...activeMatch.lineup };
    const sub = newLineup.subs[index];
    
    if (field === 'playerId') {
      const player = state.people.find(p => p.id === value);
      if (player) {
        const suspension = getSuspension(value, activeMatch.category);
        if (suspension.isSuspended) {
          alert(`⛔ إيقاف انضباطي: ${player.name} لا يمكن أن يتواجد حتى على دكة البدلاء بسبب العقوبة.`);
          return;
        }
        sub.playerId = player.id;
        sub.name = player.name;
        sub.number = player.number?.toString() || '';
      } else {
        sub.playerId = ''; sub.name = ''; sub.number = '';
      }
    } else {
      // @ts-ignore
      sub[field] = value;
    }

    setActiveMatch(recalculateAllMinutes({ ...activeMatch, lineup: newLineup }));
  };

  const saveMatch = async (complete: boolean = false) => {
    if (!activeMatch || isViewer) return;
    const { error } = await supabase.from('matches').upsert({ ...activeMatch, isCompleted: complete });
    if (error) { alert('خطأ في الحفظ السحابي: ' + error.message); return; }

    setState(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === activeMatch.id ? { ...activeMatch, isCompleted: complete } : m)
    }));
    setActiveMatch(null);
    addLog?.('تحديث مباراة', `تم حفظ بيانات ${activeMatch.opponent}`, 'success');
  };

  const addEvent = (type: MatchEvent['type']) => {
    if (!activeMatch) return;
    const newEvent: MatchEvent = { id: generateUUID(), type, player: '', minute: '', note: '' };
    setActiveMatch({ ...activeMatch, events: [...activeMatch.events, newEvent] });
  };

  const updateEvent = (eventId: string, field: keyof MatchEvent, value: string) => {
    if (!activeMatch) return;
    const newEvents = activeMatch.events.map(e => e.id === eventId ? { ...e, [field]: value } : e);
    setActiveMatch({ ...activeMatch, events: newEvents });
  };

  const inputStyle = "w-full bg-slate-100 border-4 border-slate-900 rounded-2xl py-4 px-6 font-black text-slate-900 shadow-inner focus:border-orange-600 outline-none";
  const labelStyle = "text-xs font-black text-slate-900 mr-2 uppercase block mb-2 tracking-tighter";

  const getPlayerStats = (): PlayerMatchStats[] => {
    if (!activeMatch) return [];
    const statsObj: { [key: string]: PlayerMatchStats } = {};

    activeMatch.lineup.starters.filter(s => s.playerId).forEach(s => {
      statsObj[s.playerId] = { id: s.playerId, name: s.name, number: s.number, role: 'أساسي', mins: parseInt(s.minutesPlayed || '0'), goals: 0, assists: 0, yellows: 0, reds: 0 };
    });

    activeMatch.lineup.subs.filter(s => s.playerId).forEach(s => {
      statsObj[s.playerId] = { id: s.playerId, name: s.name, number: s.number, role: 'بديل', mins: parseInt(s.minutesPlayed || '0'), goals: 0, assists: 0, yellows: 0, reds: 0 };
    });

    activeMatch.events.forEach(ev => {
      const p = statsObj[ev.player];
      if (p) {
        if (ev.type === 'goal') p.goals++;
        if (ev.type === 'assist') p.assists++;
        if (ev.type === 'yellow') p.yellows++;
        if (ev.type === 'red') p.reds++;
      }
    });

    return Object.values(statsObj).sort((a, b) => b.mins - a.mins);
  };

  return (
    <div className="space-y-6 md:space-y-10 pb-24 px-2 font-['Tajawal'] text-right" dir="rtl">
      <div className="bg-white p-8 rounded-[3rem] border-4 border-slate-900 flex flex-col md:flex-row justify-between items-center no-print shadow-[10px_10px_0px_0px_rgba(0,31,63,1)] gap-6">
        <div>
          <h2 className="text-xl md:text-3xl font-black text-[#001F3F] flex items-center gap-4 uppercase tracking-tighter drop-shadow-md">
            <Trophy size={36} className="text-orange-600" /> إدارة مباريات وأنشطة النادي
          </h2>
          <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.3em]">مركز المتابعة اللحظية والتحليل الفني</p>
        </div>
        {!isViewer && (
          <button onClick={() => setIsAddOpen(true)} className="bg-[#001F3F] text-white px-12 py-4 rounded-[2rem] font-black text-lg shadow-[6px_6px_0px_0px_rgba(255,107,0,1)] hover:bg-black transition-all border-b-4 border-black flex items-center gap-3">
            <Plus size={24}/> جدولة مباراة جديدة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 no-print">
        {filteredMatches.map(m => (
          <div key={m.id} className={`bg-white p-8 rounded-[3rem] border-4 border-slate-900 relative shadow-xl transition-all ${m.isCompleted ? 'border-emerald-600' : 'hover:border-orange-600 border-b-[16px]'}`}>
             <div className="flex justify-between items-start mb-8">
                <span className="bg-orange-600 text-white text-[11px] font-black px-5 py-2 rounded-2xl border-2 border-white shadow-lg uppercase">{m.matchType}</span>
                <span className="text-sm font-black text-slate-900 tabular-nums">{m.date}</span>
             </div>
             <div className="text-center mb-10">
                <p className="text-6xl font-black text-slate-900 tabular-nums">{m.ourScore} - {m.opponentScore}</p>
                <p className="font-black text-2xl text-slate-900 mt-6 uppercase">الكرامة × {m.opponent}</p>
                <p className="text-xs font-black text-orange-600 mt-2 uppercase tracking-widest">{m.category} | {m.pitch}</p>
             </div>
             <div className="flex gap-4">
                <button onClick={() => setActiveMatch(m)} className="flex-1 bg-[#001F3F] text-white py-5 rounded-[2rem] font-black text-sm uppercase shadow-2xl hover:bg-black transition-all border-b-4 border-black">
                  {m.isCompleted ? 'تقرير المباراة' : 'إدارة الأحداث'}
                </button>
                {isManager && (
                  <button onClick={() => deleteMatch(m.id)} className="p-4 bg-red-50 text-red-600 rounded-[1.5rem] border-2 border-red-900 hover:bg-red-600 hover:text-white transition-all">
                    <Trash2 size={24}/>
                  </button>
                )}
             </div>
          </div>
        ))}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[600] flex items-center justify-center p-4">
           <div className="bg-white rounded-[4rem] w-full max-w-xl border-[10px] border-slate-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 bg-slate-100 border-b-8 border-slate-900 flex justify-between items-center">
                 <h3 className="font-black text-slate-900 text-2xl uppercase tracking-tighter">جدولة مواجهة جديدة</h3>
                 <button onClick={() => setIsAddOpen(false)} className="bg-white p-4 rounded-3xl border-4 border-slate-900 hover:rotate-90 transition-all"><X size={28}/></button>
              </div>
              <form onSubmit={handleCreateMatch} className="p-12 space-y-8">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className={labelStyle}>الفئة المستهدفة</label>
                       <select required className={inputStyle} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          {state.categories.filter(c => !restrictedCat || c === restrictedCat).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className={labelStyle}>نوع المنافسة</label>
                       <select className={inputStyle} value={formData.matchType} onChange={e => setFormData({...formData, matchType: e.target.value as any})}>
                          <option value="دوري">دوري</option>
                          <option value="كأس">كأس</option>
                          <option value="ودية">ودية</option>
                       </select>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className={labelStyle}>اسم النادي الخصم</label>
                    <input required type="text" className={inputStyle} value={formData.opponent} onChange={e => setFormData({...formData, opponent: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className={labelStyle}>تاريخ المباراة</label>
                       <input required type="date" className={inputStyle} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className={labelStyle}>ساعة الركلة</label>
                       <input type="time" className={inputStyle} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-[#001F3F] text-white py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-black border-b-8 border-black transition-all uppercase">تثبيت المباراة سحابياً</button>
              </form>
           </div>
        </div>
      )}

      {activeMatch && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[700] overflow-y-auto no-print text-right" dir="rtl">
           <div className="max-w-7xl mx-auto p-4 md:p-12 min-h-screen">
              <div className="bg-white rounded-[4rem] border-[12px] border-slate-900 p-8 md:p-16 shadow-2xl relative">
                <header className="flex flex-col md:flex-row justify-between items-center mb-16 border-b-[10px] border-slate-900 pb-12 gap-10">
                   <div className="text-center md:text-right">
                      <h2 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase">الكرامة × {activeMatch.opponent}</h2>
                      <div className="flex gap-4 mt-6 justify-center md:justify-start">
                         <span className="bg-slate-900 text-white text-sm font-black px-6 py-3 rounded-2xl border-4 border-slate-900 shadow-xl">{activeMatch.date}</span>
                         <span className="bg-orange-600 text-white text-sm font-black px-6 py-3 rounded-2xl border-4 border-orange-900 shadow-xl uppercase">{activeMatch.category}</span>
                         {activeMatch.isCompleted && <span className="bg-emerald-600 text-white text-sm font-black px-6 py-3 rounded-2xl border-4 border-emerald-900 flex items-center gap-2 shadow-xl"><CheckCircle size={20}/> معتمدة</span>}
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-5 justify-center">
                      {!isViewer && (
                        <>
                          <button onClick={() => saveMatch(true)} className="bg-emerald-600 text-white px-10 py-5 rounded-[2.5rem] font-black text-lg shadow-2xl flex items-center gap-3 border-b-8 border-black hover:bg-emerald-700 transition-all">
                            <CheckCircle size={24}/> اعتماد التقرير النهائي
                          </button>
                          <button onClick={() => saveMatch(false)} className="bg-blue-600 text-white px-10 py-5 rounded-[2.5rem] font-black text-lg shadow-2xl flex items-center gap-3 border-b-8 border-black hover:bg-blue-700 transition-all">
                            <Save size={24}/> حفظ المسودة
                          </button>
                        </>
                      )}
                      <button onClick={() => setActiveMatch(null)} className="bg-slate-100 p-6 rounded-[2rem] border-4 border-slate-900 hover:bg-red-50 hover:text-red-600 transition-all"><X size={40}/></button>
                   </div>
                </header>

                <div className={`grid grid-cols-1 lg:grid-cols-12 gap-16 ${activeMatch.isCompleted ? 'opacity-80 pointer-events-none' : ''}`}>
                   <div className="lg:col-span-8 space-y-16">
                      <section className="bg-slate-900 text-white p-12 rounded-[4rem] border-8 border-orange-600 shadow-2xl">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                               <h3 className="text-center text-xs font-black text-orange-400 mb-8 uppercase tracking-[0.3em]">النتيجة النهائية</h3>
                               <div className="flex justify-center items-center gap-8">
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black opacity-50 uppercase text-center">الكرامة</p>
                                     <input type="number" className="w-24 h-24 bg-white/10 border-4 border-white/20 text-white rounded-[2rem] text-center font-black text-5xl outline-none" value={activeMatch.ourScore} onChange={e => setActiveMatch({...activeMatch, ourScore: e.target.value})} />
                                  </div>
                                  <span className="text-6xl font-black text-orange-600">:</span>
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black opacity-50 uppercase text-center">{activeMatch.opponent}</p>
                                     <input type="number" className="w-24 h-24 bg-white/10 border-4 border-white/20 text-white rounded-[2rem] text-center font-black text-5xl outline-none" value={activeMatch.opponentScore} onChange={e => setActiveMatch({...activeMatch, opponentScore: e.target.value})} />
                                  </div>
                               </div>
                            </div>
                            <div>
                               <h3 className="text-center text-xs font-black text-blue-400 mb-8 uppercase tracking-[0.3em]">الوقت المضاف</h3>
                               <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black opacity-50 uppercase text-center">د شوط 1</p>
                                     <input type="number" className="w-full bg-white/10 border-4 border-white/20 text-white rounded-2xl py-4 text-center font-black text-2xl outline-none" value={activeMatch.stoppageTime1} onChange={e => setActiveMatch({...activeMatch, stoppageTime1: e.target.value})} />
                                  </div>
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black opacity-50 uppercase text-center">د شوط 2</p>
                                     <input type="number" className="w-full bg-white/10 border-4 border-white/20 text-white rounded-2xl py-4 text-center font-black text-2xl outline-none" value={activeMatch.stoppageTime2} onChange={e => setActiveMatch(recalculateAllMinutes({...activeMatch, stoppageTime2: e.target.value}))} />
                                  </div>
                               </div>
                            </div>
                         </div>
                      </section>

                      <section>
                         <h3 className="text-2xl font-black text-slate-900 mb-10 border-r-8 border-orange-600 pr-5 uppercase flex items-center gap-4"><Users size={32}/> التشكيلة الأساسية</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeMatch.lineup.starters.map((s, idx) => (
                               <div key={idx} className="bg-slate-50 p-6 rounded-[2.5rem] border-4 border-slate-200 shadow-sm flex flex-col gap-4 group hover:border-orange-600 transition-all">
                                  <div className="flex justify-between items-center">
                                     <span className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-2 border-white">#{s.number || (idx+1)}</span>
                                     <div className="flex items-center gap-3 bg-emerald-100 text-emerald-800 px-5 py-2 rounded-2xl border-2 border-emerald-200 font-black text-sm">
                                        <Timer size={20}/> {s.minutesPlayed || '0'} د
                                     </div>
                                  </div>
                                  <select className={inputStyle} value={s.playerId} onChange={e => updateStarter(idx, e.target.value)}>
                                     <option value="">-- اختر لاعب --</option>
                                     {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category).map(p => {
                                       const susp = getSuspension(p.id, activeMatch.category);
                                       return (
                                         <option key={p.id} value={p.id} disabled={susp.isSuspended} className={susp.isSuspended ? "text-red-500 line-through" : ""}>
                                           {p.name} (#{p.number}) {susp.isSuspended ? "[موقوف انضباطياً]" : ""}
                                         </option>
                                       );
                                     })}
                                  </select>
                               </div>
                            ))}
                         </div>
                      </section>

                      <section className="bg-blue-50/50 p-10 rounded-[4rem] border-4 border-blue-900 shadow-xl">
                         <div className="flex justify-between items-center mb-10">
                            <h3 className="text-2xl font-black text-blue-900 uppercase flex items-center gap-4"><ArrowRightLeft size={32}/> دكة البدلاء والتبديلات</h3>
                            <button onClick={() => {
                                const newLineup = { ...activeMatch.lineup };
                                newLineup.subs.push({ playerId: '', name: '', number: '', minutesPlayed: '0', substitutionMinute: '', replacedPlayerId: '' });
                                setActiveMatch({ ...activeMatch, lineup: newLineup });
                            }} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-sm border-b-4 border-black shadow-lg">
                               + إضافة تبديل
                            </button>
                         </div>
                         
                         <div className="space-y-6">
                            {activeMatch.lineup.subs.map((sub, idx) => (
                               <div key={idx} className="bg-white p-8 rounded-[3rem] border-4 border-blue-200 shadow-sm flex flex-col gap-6 relative">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                     <div className="space-y-2">
                                        <label className={labelStyle}>البديل الداخل</label>
                                        <select className={inputStyle} value={sub.playerId} onChange={e => updateSub(idx, 'playerId', e.target.value)}>
                                           <option value="">-- اختر لاعب --</option>
                                           {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category).map(p => {
                                             const susp = getSuspension(p.id, activeMatch.category);
                                             return (
                                               <option key={p.id} value={p.id} disabled={susp.isSuspended}>
                                                 {p.name} {susp.isSuspended ? "[موقوف]" : ""}
                                               </option>
                                             );
                                           })}
                                        </select>
                                     </div>
                                     <div className="space-y-2">
                                        <label className={labelStyle}>اللاعب الخارج</label>
                                        <select className={inputStyle} value={sub.replacedPlayerId} onChange={e => updateSub(idx, 'replacedPlayerId', e.target.value)}>
                                           <option value="">-- اختر الخارج --</option>
                                           {activeMatch.lineup.starters.filter(s => s.playerId).map(s => (
                                             <option key={s.playerId} value={s.playerId}>{s.name} (#{s.number})</option>
                                           ))}
                                        </select>
                                     </div>
                                     <div className="space-y-2">
                                        <label className={labelStyle}>دقيقة التبديل</label>
                                        <input type="number" className={inputStyle} value={sub.substitutionMinute} onChange={e => updateSub(idx, 'substitutionMinute', e.target.value)} />
                                     </div>
                                  </div>
                                  <button onClick={() => {
                                      const newLineup = { ...activeMatch.lineup };
                                      newLineup.subs.splice(idx, 1);
                                      setActiveMatch(recalculateAllMinutes({ ...activeMatch, lineup: newLineup }));
                                  }} className="absolute -top-4 -left-4 p-3 bg-red-600 text-white rounded-full border-4 border-white shadow-lg"><Trash2 size={18}/></button>
                               </div>
                            ))}
                         </div>
                      </section>
                   </div>

                   <div className="lg:col-span-4 space-y-16">
                      <section className="bg-slate-50 p-10 rounded-[4rem] border-4 border-slate-900 shadow-xl">
                         <h3 className="text-xl font-black text-slate-900 mb-8 border-r-8 border-emerald-600 pr-4 uppercase flex items-center gap-3"><Activity size={28}/> أحداث المباراة</h3>
                         <div className="grid grid-cols-2 gap-3 mb-8">
                            <button onClick={() => addEvent('goal')} className="bg-emerald-600 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2">⚽ هدف</button>
                            <button onClick={() => addEvent('assist')} className="bg-blue-600 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2">👟 أسيست</button>
                            <button onClick={() => addEvent('yellow')} className="bg-yellow-400 text-slate-900 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2">🟨 إنذار</button>
                            <button onClick={() => addEvent('red')} className="bg-red-600 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2">🟥 طرد</button>
                         </div>
                         <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                            {activeMatch.events.map(ev => (
                               <div key={ev.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 relative group">
                                  <div className="flex justify-between items-center mb-4">
                                     <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase border-2 ${
                                       ev.type === 'goal' ? 'bg-emerald-600 text-white border-emerald-700' : 
                                       ev.type === 'yellow' ? 'bg-yellow-400 text-slate-900 border-yellow-500' : 
                                       ev.type === 'red' ? 'bg-red-600 text-white border-red-700' : 'bg-blue-600 text-white'
                                     }`}>{ev.type}</span>
                                     <button onClick={() => setActiveMatch({...activeMatch, events: activeMatch.events.filter(x => x.id !== ev.id)})} className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                  </div>
                                  <select className={inputStyle} value={ev.player} onChange={e => updateEvent(ev.id, 'player', e.target.value)}>
                                     <option value="">-- اختر اللاعب --</option>
                                     {[...activeMatch.lineup.starters, ...activeMatch.lineup.subs].filter(x => x.playerId).map(x => (
                                       <option key={x.playerId} value={x.playerId}>{x.name} (#{x.number})</option>
                                     ))}
                                  </select>
                                  <input type="number" className={inputStyle + " mt-3"} placeholder="الدقيقة" value={ev.minute} onChange={e => updateEvent(ev.id, 'minute', e.target.value)} />
                               </div>
                            ))}
                         </div>
                      </section>

                      <section className="bg-white p-10 rounded-[4rem] border-4 border-[#001F3F] shadow-xl">
                         <h3 className="text-xl font-black text-[#001F3F] mb-8 border-r-8 border-[#FF6B00] pr-4 uppercase flex items-center gap-3"><FileText size={28}/> تقرير المدير الفني</h3>
                         <textarea 
                            className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] p-8 text-sm font-black text-slate-900 h-80 resize-none outline-none focus:border-orange-600 shadow-inner"
                            placeholder="اكتب التقرير الفني الشامل للمباراة..."
                            value={activeMatch.notes}
                            onChange={e => setActiveMatch({...activeMatch, notes: e.target.value})}
                         ></textarea>
                      </section>
                   </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MatchPlanner;
