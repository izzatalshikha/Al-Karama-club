
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, MapPin, Clock, Plus, X, Shield, Award, Calendar, 
  ChevronLeft, Trash2, Target, AlertTriangle, UserPlus, 
  Printer, FileText, Users, Save, ShieldAlert, BookOpen, Info, Timer, LogOut, LogIn, Crown, Map, ChevronRight, CheckCircle, Zap, TrendingUp, Activity, UserCircle, Sparkles, Loader2, BrainCircuit, Lock, Unlock,
  Gamepad2, UserCheck, TimerOff, ArrowRightLeft, Medal, ClipboardList
} from 'lucide-react';
import { AppState, Match, MatchType, MatchEvent, Person } from '../types';
import { generateUUID, supabase } from '../App';
import ClubLogo from './ClubLogo';

interface MatchPlannerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
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

  const filteredMatches = useMemo(() => {
    return state.matches.filter(m => {
      if (restrictedCat) return m.category === restrictedCat;
      return (state.globalCategoryFilter === 'الكل' || m.category === state.globalCategoryFilter);
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [state.matches, state.globalCategoryFilter, restrictedCat]);

  const handleCreateMatch = (e: React.FormEvent) => {
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
    setState(prev => ({ ...prev, matches: [newMatch, ...prev.matches] }));
    addLog?.('جدولة مباراة', `تمت جدولة مواجهة ضد ${newMatch.opponent}`, 'success');
    setIsAddOpen(false);
    setFormData({ ...formData, opponent: '' });
  };

  const deleteMatch = async (id: string) => {
    if (!isManager) return;
    if (confirm('🚨 هل أنت متأكد من حذف هذه المباراة نهائياً؟')) {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) {
        alert('حدث خطأ أثناء الحذف: ' + error.message);
        return;
      }
      setState(prev => ({ ...prev, matches: prev.matches.filter(m => m.id !== id) }));
      addLog?.('حذف مباراة', 'تمت إزالة سجل المباراة بالكامل من النظام السحابي', 'error');
    }
  };

  const addSubSlot = () => {
    if (!activeMatch) return;
    const newLineup = { ...activeMatch.lineup };
    newLineup.subs.push({ playerId: '', name: '', number: '', minutesPlayed: '0', substitutionMinute: '', replacedPlayerId: '' });
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const removeSubSlot = (index: number) => {
    if (!activeMatch) return;
    const newLineup = { ...activeMatch.lineup };
    newLineup.subs.splice(index, 1);
    setActiveMatch({ ...activeMatch, lineup: newLineup });
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

  const updateStarter = (index: number, playerId: string) => {
    if (!activeMatch) return;
    const player = state.people.find(p => p.id === playerId);
    const newLineup = { ...activeMatch.lineup };
    if (!player) {
      newLineup.starters[index] = { playerId: '', name: '', number: '', minutesPlayed: '0' };
    } else {
      const susp = getSuspension(playerId, activeMatch.category);
      if (susp.isSuspended) {
        alert(`🚨 اللاعب ${player.name} موقوف!`);
        return;
      }
      const stopTime2 = (parseInt(activeMatch.stoppageTime2 || '0'));
      newLineup.starters[index] = { playerId: player.id, name: player.name, number: player.number?.toString() || '', minutesPlayed: (90 + stopTime2).toString() };
    }
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const updateSub = (index: number, field: string, value: string) => {
    if (!activeMatch) return;
    const newLineup = { ...activeMatch.lineup };
    const sub = newLineup.subs[index];
    
    if (field === 'playerId') {
      const player = state.people.find(p => p.id === value);
      if (player) {
        sub.playerId = player.id;
        sub.name = player.name;
        sub.number = player.number?.toString() || '';
      } else {
        sub.playerId = ''; sub.name = ''; sub.number = '';
      }
    } else if (field === 'substitutionMinute' || field === 'replacedPlayerId') {
      // @ts-ignore
      sub[field] = value;
    }

    // منطق حساب الوقت التلقائي للتبديلات
    if (sub.substitutionMinute && sub.replacedPlayerId) {
      const stoppage2 = parseInt(activeMatch.stoppageTime2 || '0');
      const fullTime = 90 + stoppage2;
      const subMin = parseInt(sub.substitutionMinute) || 0;
      
      // دقائق البديل (الداخل) = الوقت الكلي - دقيقة الدخول
      sub.minutesPlayed = (fullTime - subMin).toString();
      
      // دقائق الأساسي (الخارج) = دقيقة الخروج
      const starterIdx = newLineup.starters.findIndex(s => s.playerId === sub.replacedPlayerId);
      if (starterIdx !== -1) {
        newLineup.starters[starterIdx].minutesPlayed = subMin.toString();
      }
    }
    
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const saveMatch = (complete: boolean = false) => {
    if (!activeMatch) return;
    setState(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === activeMatch.id ? { ...activeMatch, isCompleted: complete } : m)
    }));
    setActiveMatch(null);
    addLog?.('تحديث مباراة', `تم حفظ بيانات مباراة ${activeMatch.opponent}`, 'info');
  };

  const inputStyle = "w-full bg-slate-100 border-4 border-slate-900 rounded-2xl py-4 px-6 font-black text-slate-900 shadow-inner focus:border-orange-600 outline-none drop-shadow-sm";
  const labelStyle = "text-xs font-black text-slate-900 mr-2 uppercase block mb-2 tracking-tighter drop-shadow-sm";

  // دالة لتجميع إحصائيات اللاعبين للعرض في التقرير - تم استبدال Map بـ Object لتجنب خطأ التوافقية
  const getPlayerStats = (): PlayerMatchStats[] => {
    if (!activeMatch) return [];
    const statsObj: { [key: string]: PlayerMatchStats } = {};

    // معالجة الأساسيين
    activeMatch.lineup.starters.filter(s => s.playerId).forEach(s => {
      statsObj[s.playerId] = {
        id: s.playerId,
        name: s.name,
        number: s.number,
        role: 'أساسي',
        mins: parseInt(s.minutesPlayed || '0'),
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0
      };
    });

    // معالجة البدلاء
    activeMatch.lineup.subs.filter(s => s.playerId).forEach(s => {
      statsObj[s.playerId] = {
        id: s.playerId,
        name: s.name,
        number: s.number,
        role: 'بديل',
        mins: parseInt(s.minutesPlayed || '0'),
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0
      };
    });

    // معالجة الأحداث
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
      {/* Header Panel */}
      <div className="bg-white p-8 rounded-[3rem] border-4 border-slate-900 flex flex-col md:flex-row justify-between items-center no-print shadow-[10px_10px_0px_0px_rgba(0,31,63,1)] gap-6">
        <div>
          <h2 className="text-xl md:text-3xl font-black text-[#001F3F] flex items-center gap-4 uppercase tracking-tighter drop-shadow-md">
            <Trophy size={36} className="text-orange-600" /> إدارة مباريات وأنشطة نادي الكرامة
          </h2>
          <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.3em]">Match Command & Analytics Center</p>
        </div>
        {!isViewer && (
          <button 
            onClick={() => setIsAddOpen(true)} 
            className="bg-[#001F3F] text-white px-12 py-4 rounded-[2rem] font-black text-lg shadow-[6px_6px_0px_0px_rgba(255,107,0,1)] hover:bg-black transition-all border-b-4 border-black active:translate-y-1 active:shadow-none flex items-center gap-3"
          >
            <Plus size={24}/> جدولة مواجهة جديدة
          </button>
        )}
      </div>

      {/* Match Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 no-print">
        {filteredMatches.map(m => (
          <div key={m.id} className={`bg-white p-8 rounded-[3rem] border-4 border-slate-900 relative shadow-xl transition-all ${m.isCompleted ? 'border-emerald-600' : 'hover:border-orange-600 border-b-[16px]'}`}>
             <div className="flex justify-between items-start mb-8">
                <span className="bg-orange-600 text-white text-[11px] font-black px-5 py-2 rounded-2xl border-2 border-white shadow-lg uppercase">{m.matchType}</span>
                <span className="text-sm font-black text-slate-900 tabular-nums drop-shadow-sm">{m.date}</span>
             </div>
             <div className="text-center mb-10">
                <p className="text-6xl font-black text-slate-900 tabular-nums drop-shadow-[0_4px_4px_rgba(0,0,0,0.3)]">{m.ourScore} - {m.opponentScore}</p>
                <p className="font-black text-2xl text-slate-900 mt-6 uppercase drop-shadow-sm">الكرامة × {m.opponent}</p>
                <p className="text-xs font-black text-orange-600 mt-2 uppercase tracking-widest">{m.category} | {m.pitch}</p>
             </div>
             <div className="flex gap-4">
                <button onClick={() => setActiveMatch(m)} className="flex-1 bg-[#001F3F] text-white py-5 rounded-[2rem] font-black text-sm uppercase shadow-2xl hover:bg-black transition-all border-b-4 border-black">
                  {m.isCompleted ? 'عرض التقرير النهائي' : 'إدارة أحداث المباراة'}
                </button>
                {isManager && (
                  <button onClick={() => deleteMatch(m.id)} className="p-4 bg-red-50 text-red-600 rounded-[1.5rem] border-2 border-red-900 hover:bg-red-600 hover:text-white transition-all shadow-md">
                    <Trash2 size={24}/>
                  </button>
                )}
             </div>
          </div>
        ))}
      </div>

      {/* Add Match Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[600] flex items-center justify-center p-4">
           <div className="bg-white rounded-[4rem] w-full max-w-xl border-[10px] border-slate-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 bg-slate-100 border-b-8 border-slate-900 flex justify-between items-center">
                 <h3 className="font-black text-slate-900 text-2xl uppercase tracking-tighter drop-shadow-sm">جدولة مواجهة رسمية مسبقة</h3>
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
                    <input required type="text" className={inputStyle} value={formData.opponent} onChange={e => setFormData({...formData, opponent: e.target.value})} placeholder="مثال: نادي الاتحاد.." />
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
                 <button type="submit" className="w-full bg-[#001F3F] text-white py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:bg-black border-b-8 border-black transition-all uppercase">تثبيت الجدولة بالنظام</button>
              </form>
           </div>
        </div>
      )}

      {/* Active Match Editor Modal */}
      {activeMatch && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[700] overflow-y-auto no-print text-right" dir="rtl">
           <div className="max-w-7xl mx-auto p-4 md:p-12 min-h-screen">
              <div className="bg-white rounded-[4rem] border-[12px] border-slate-900 p-8 md:p-16 shadow-2xl relative">
                
                {/* Modal Header */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-16 border-b-[10px] border-slate-900 pb-12 gap-10">
                   <div className="text-center md:text-right">
                      <h2 className="text-3xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase drop-shadow-md">الكرامة × {activeMatch.opponent}</h2>
                      <div className="flex gap-4 mt-6 justify-center md:justify-start">
                         <span className="bg-slate-900 text-white text-sm font-black px-6 py-3 rounded-2xl border-4 border-slate-900 shadow-xl tabular-nums">{activeMatch.date}</span>
                         <span className="bg-orange-600 text-white text-sm font-black px-6 py-3 rounded-2xl border-4 border-orange-900 shadow-xl uppercase">{activeMatch.category}</span>
                         {activeMatch.isCompleted && <span className="bg-emerald-600 text-white text-sm font-black px-6 py-3 rounded-2xl border-4 border-emerald-900 flex items-center gap-2 shadow-xl"><CheckCircle size={20}/> تقرير معتمد</span>}
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-5 justify-center">
                      {!activeMatch.isCompleted && (
                        <button onClick={() => saveMatch(true)} className="bg-emerald-600 text-white px-10 py-5 rounded-[2.5rem] font-black text-lg shadow-2xl flex items-center gap-3 border-b-8 border-black hover:bg-emerald-700 transition-all">
                          <CheckCircle size={24}/> اعتماد وإغلاق التقرير
                        </button>
                      )}
                      {activeMatch.isCompleted && isManager && (
                        <button onClick={() => saveMatch(false)} className="bg-red-600 text-white px-10 py-5 rounded-[2.5rem] font-black text-lg shadow-2xl flex items-center gap-3 border-b-8 border-black hover:bg-red-700 transition-all">
                           <Unlock size={24}/> فتح للتعديل
                        </button>
                      )}
                      <button onClick={() => saveMatch(false)} className="bg-blue-600 text-white px-10 py-5 rounded-[2.5rem] font-black text-lg shadow-2xl flex items-center gap-3 border-b-8 border-black hover:bg-blue-700 transition-all">
                        <Save size={24}/> حفظ المسودة
                      </button>
                      <button onClick={() => setActiveMatch(null)} className="bg-slate-100 p-6 rounded-[2rem] border-4 border-slate-900 hover:bg-red-50 hover:text-red-600 transition-all"><X size={40}/></button>
                   </div>
                </header>

                <div className={`grid grid-cols-1 lg:grid-cols-12 gap-16 ${activeMatch.isCompleted ? 'opacity-80 pointer-events-none' : ''}`}>
                   
                   {/* Left Column: Lineup & Score */}
                   <div className="lg:col-span-8 space-y-16">
                      
                      {/* Score & Stoppage Section */}
                      <section className="bg-slate-900 text-white p-12 rounded-[4rem] border-8 border-orange-600 shadow-2xl">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div>
                               <h3 className="text-center text-xs font-black text-orange-400 mb-8 uppercase tracking-[0.3em]">النتيجة النهائية</h3>
                               <div className="flex justify-center items-center gap-8">
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black opacity-50 uppercase text-center">الكرامة</p>
                                     <input type="number" className="w-24 h-24 bg-white/10 border-4 border-white/20 text-white rounded-[2rem] text-center font-black text-5xl outline-none focus:border-orange-600" value={activeMatch.ourScore} onChange={e => setActiveMatch({...activeMatch, ourScore: e.target.value})} />
                                  </div>
                                  <span className="text-6xl font-black text-orange-600">:</span>
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black opacity-50 uppercase text-center">{activeMatch.opponent}</p>
                                     <input type="number" className="w-24 h-24 bg-white/10 border-4 border-white/20 text-white rounded-[2rem] text-center font-black text-5xl outline-none focus:border-white" value={activeMatch.opponentScore} onChange={e => setActiveMatch({...activeMatch, opponentScore: e.target.value})} />
                                  </div>
                               </div>
                            </div>
                            <div>
                               <h3 className="text-center text-xs font-black text-blue-400 mb-8 uppercase tracking-[0.3em]">الوقت بدل الضائع</h3>
                               <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black opacity-50 uppercase text-center">الشوط الأول (د)</p>
                                     <input type="number" className="w-full bg-white/10 border-4 border-white/20 text-white rounded-2xl py-4 text-center font-black text-2xl outline-none" value={activeMatch.stoppageTime1} onChange={e => setActiveMatch({...activeMatch, stoppageTime1: e.target.value})} />
                                  </div>
                                  <div className="space-y-4">
                                     <p className="text-[10px] font-black opacity-50 uppercase text-center">الشوط الثاني (د)</p>
                                     <input type="number" className="w-full bg-white/10 border-4 border-white/20 text-white rounded-2xl py-4 text-center font-black text-2xl outline-none" value={activeMatch.stoppageTime2} onChange={e => setActiveMatch({...activeMatch, stoppageTime2: e.target.value})} />
                                  </div>
                               </div>
                            </div>
                         </div>
                      </section>

                      {/* Starters Section */}
                      <section>
                         <h3 className="text-2xl font-black text-slate-900 mb-10 border-r-8 border-orange-600 pr-5 uppercase flex items-center gap-4 drop-shadow-sm"><Users size={32}/> التشكيلة الأساسية (11 لاعب)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeMatch.lineup.starters.map((s, idx) => (
                               <div key={idx} className="bg-slate-50 p-6 rounded-[2.5rem] border-4 border-slate-200 shadow-sm flex flex-col gap-4 group hover:border-orange-600 transition-all">
                                  <div className="flex justify-between items-center">
                                     <span className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-2 border-white">#{s.number || (idx+1)}</span>
                                     <div className="flex items-center gap-3 bg-emerald-100 text-emerald-800 px-5 py-2 rounded-2xl border-2 border-emerald-200 font-black text-sm">
                                        <Timer size={20}/> {s.minutesPlayed || '0'} دقيقة
                                     </div>
                                  </div>
                                  <select className={inputStyle} value={s.playerId} onChange={e => updateStarter(idx, e.target.value)}>
                                     <option value="">-- اختر لاعب أساسي --</option>
                                     {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category).map(p => (
                                       <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                     ))}
                                  </select>
                               </div>
                            ))}
                         </div>
                      </section>

                      {/* التبديلات - Substitutions Section */}
                      <section className="bg-blue-50/50 p-10 rounded-[4rem] border-4 border-blue-900 shadow-xl">
                         <div className="flex justify-between items-center mb-10">
                            <h3 className="text-2xl font-black text-blue-900 uppercase flex items-center gap-4 drop-shadow-sm"><ArrowRightLeft size={32}/> التبديلات ودكة البدلاء</h3>
                            <button onClick={addSubSlot} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 border-b-4 border-black shadow-lg">
                               <Plus size={20}/> إضافة تبديل جديد
                            </button>
                         </div>
                         
                         <div className="space-y-6">
                            {activeMatch.lineup.subs.map((sub, idx) => (
                               <div key={idx} className="bg-white p-8 rounded-[3rem] border-4 border-blue-200 shadow-sm flex flex-col gap-6 relative">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                     <div className="space-y-2">
                                        <label className={labelStyle}>اللاعب الداخل (بديل)</label>
                                        <select className={inputStyle} value={sub.playerId} onChange={e => updateSub(idx, 'playerId', e.target.value)}>
                                           <option value="">-- اختر البديل --</option>
                                           {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category).map(p => (
                                             <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                           ))}
                                        </select>
                                     </div>
                                     <div className="space-y-2">
                                        <label className={labelStyle}>اللاعب الخارج (أساسي)</label>
                                        <select className={inputStyle} value={sub.replacedPlayerId} onChange={e => updateSub(idx, 'replacedPlayerId', e.target.value)}>
                                           <option value="">-- اختر اللاعب الخارج --</option>
                                           {activeMatch.lineup.starters.filter(s => s.playerId).map(s => (
                                             <option key={s.playerId} value={s.playerId}>{s.name} (#{s.number})</option>
                                           ))}
                                        </select>
                                     </div>
                                     <div className="space-y-2">
                                        <label className={labelStyle}>دقيقة التبديل</label>
                                        <input type="number" className={inputStyle} value={sub.substitutionMinute} onChange={e => updateSub(idx, 'substitutionMinute', e.target.value)} placeholder="مثال: 70" />
                                     </div>
                                  </div>
                                  
                                  {sub.playerId && sub.replacedPlayerId && sub.substitutionMinute && (
                                    <div className="bg-slate-50 p-4 rounded-2xl border-2 border-blue-100 flex justify-between items-center animate-in fade-in">
                                       <div className="flex gap-4">
                                          <div className="text-center">
                                             <p className="text-[10px] font-black text-red-600 uppercase">دقائق الخارج</p>
                                             <p className="font-black text-lg">{sub.substitutionMinute} د</p>
                                          </div>
                                          <div className="text-center border-r-2 border-slate-200 pr-4">
                                             <p className="text-[10px] font-black text-emerald-600 uppercase">دقائق الداخل</p>
                                             <p className="font-black text-lg">{sub.minutesPlayed} د</p>
                                          </div>
                                       </div>
                                       <p className="text-[10px] font-black text-slate-400 italic">محسوب تلقائياً مع الوقت المضاف</p>
                                    </div>
                                  )}

                                  <button onClick={() => removeSubSlot(idx)} className="absolute -top-4 -left-4 p-3 bg-red-600 text-white rounded-full border-4 border-white shadow-lg hover:scale-110 transition-all">
                                    <Trash2 size={18}/>
                                  </button>
                               </div>
                            ))}
                            {activeMatch.lineup.subs.length === 0 && <p className="text-center py-10 font-black text-slate-300 italic">لم يتم تسجيل أي تبديلات بعد.</p>}
                         </div>
                      </section>

                      {/* ملخص أداء اللاعبين المجمع */}
                      <section className="bg-white p-10 rounded-[4rem] border-4 border-slate-900 shadow-xl overflow-hidden">
                         <h3 className="text-2xl font-black text-slate-900 mb-8 border-r-8 border-emerald-600 pr-5 uppercase flex items-center gap-4 drop-shadow-sm">
                            <ClipboardList size={32}/> ملخص بيانات اللاعبين في المباراة
                         </h3>
                         <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse min-w-[600px]">
                               <thead>
                                  <tr className="bg-slate-900 text-white border-b-4 border-slate-950">
                                     <th className="p-4 text-[11px] font-black uppercase">اللاعب</th>
                                     <th className="p-4 text-[11px] font-black uppercase text-center">الوضعية</th>
                                     <th className="p-4 text-[11px] font-black uppercase text-center">الدقائق</th>
                                     <th className="p-4 text-[11px] font-black uppercase text-center text-emerald-400">أهداف</th>
                                     <th className="p-4 text-[11px] font-black uppercase text-center text-blue-400">أسيست</th>
                                     <th className="p-4 text-[11px] font-black uppercase text-center text-yellow-400">🟨</th>
                                     <th className="p-4 text-[11px] font-black uppercase text-center text-red-400">🟥</th>
                                  </tr>
                               </thead>
                               <tbody>
                                  {getPlayerStats().map(p => (
                                     <tr key={p.id} className="border-b-2 border-slate-100 hover:bg-slate-50 transition-all font-black text-xs">
                                        <td className="p-4">
                                           <div className="flex items-center gap-3">
                                              <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">#{p.number}</span>
                                              <span>{p.name}</span>
                                           </div>
                                        </td>
                                        <td className="p-4 text-center">
                                           <span className={`px-3 py-1 rounded-lg text-[9px] ${p.role === 'أساسي' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                              {p.role}
                                           </span>
                                        </td>
                                        <td className="p-4 text-center tabular-nums">{p.mins} د</td>
                                        <td className="p-4 text-center text-emerald-700 font-black">{p.goals || '-'}</td>
                                        <td className="p-4 text-center text-blue-700 font-black">{p.assists || '-'}</td>
                                        <td className="p-4 text-center text-yellow-600 font-black">{p.yellows || '-'}</td>
                                        <td className="p-4 text-center text-red-600 font-black">{p.reds || '-'}</td>
                                     </tr>
                                  ))}
                               </tbody>
                            </table>
                         </div>
                      </section>
                   </div>

                   {/* Right Column: Events & Technical Report */}
                   <div className="lg:col-span-4 space-y-16">
                      
                      {/* Events Tracker */}
                      <section className="bg-slate-50 p-10 rounded-[4rem] border-4 border-slate-900 shadow-xl">
                         <h3 className="text-xl font-black text-slate-900 mb-8 border-r-8 border-emerald-600 pr-4 uppercase flex items-center gap-3 drop-shadow-sm"><Activity size={28}/> سجل أحداث المباراة</h3>
                         <div className="grid grid-cols-2 gap-3 mb-8">
                            <button onClick={() => addEvent('goal')} className="bg-emerald-600 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md">⚽ هدف</button>
                            <button onClick={() => addEvent('assist')} className="bg-blue-600 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md">👟 أسيست</button>
                            <button onClick={() => addEvent('yellow')} className="bg-yellow-400 text-slate-900 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md">🟨 إنذار</button>
                            <button onClick={() => addEvent('red')} className="bg-red-600 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md">🟥 طرد</button>
                         </div>
                         <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                            {activeMatch.events.map(ev => (
                               <div key={ev.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 shadow-sm relative group">
                                  <div className="flex justify-between items-center mb-4">
                                     <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase border-2 ${
                                       ev.type === 'goal' ? 'bg-emerald-600 text-white border-emerald-700' : 
                                       ev.type === 'assist' ? 'bg-blue-600 text-white border-blue-700' : 
                                       ev.type === 'yellow' ? 'bg-yellow-400 text-slate-900 border-yellow-500' : 'bg-red-600 text-white border-red-700'
                                     }`}>{ev.type === 'goal' ? 'هدف' : ev.type === 'assist' ? 'أسيست' : ev.type === 'yellow' ? 'إنذار' : 'طرد'}</span>
                                     <button onClick={() => setActiveMatch({...activeMatch, events: activeMatch.events.filter(x => x.id !== ev.id)})} className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                  </div>
                                  <div className="space-y-3">
                                     <select className={inputStyle} value={ev.player} onChange={e => updateEvent(ev.id, 'player', e.target.value)}>
                                        <option value="">-- اختر اللاعب --</option>
                                        {[...activeMatch.lineup.starters, ...activeMatch.lineup.subs].filter(x => x.playerId).map(x => (
                                          <option key={x.playerId} value={x.playerId}>{x.name} (#{x.number})</option>
                                        ))}
                                     </select>
                                     <input type="number" className={inputStyle} placeholder="الدقيقة" value={ev.minute} onChange={e => updateEvent(ev.id, 'minute', e.target.value)} />
                                  </div>
                               </div>
                            ))}
                         </div>
                      </section>

                      {/* Technical Report Section */}
                      <section className="bg-white p-10 rounded-[4rem] border-4 border-[#001F3F] shadow-xl">
                         <h3 className="text-xl font-black text-[#001F3F] mb-8 border-r-8 border-[#FF6B00] pr-4 uppercase flex items-center gap-3 drop-shadow-sm"><FileText size={28}/> التقرير الفني للمكتب</h3>
                         <textarea 
                            className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] p-8 text-sm font-black text-slate-900 h-80 resize-none outline-none focus:border-orange-600 shadow-inner drop-shadow-sm"
                            placeholder="اكتب التقرير الفني الشامل للمباراة، الملاحظات على الأداء، التكتيك المتبع، والأخطاء المرصودة..."
                            value={activeMatch.notes}
                            onChange={e => setActiveMatch({...activeMatch, notes: e.target.value})}
                         ></textarea>
                         <div className="mt-8 bg-[#001F3F] p-6 rounded-[2rem] text-white">
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles size={14}/> تذكير المحلل</p>
                            <p className="text-[11px] font-black leading-relaxed opacity-80">سيتم استخدام هذا التقرير في تغذية نظام الذكاء الاصطناعي الخاص بالنادي لتحليل مسار تطور الفريق.</p>
                         </div>
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
