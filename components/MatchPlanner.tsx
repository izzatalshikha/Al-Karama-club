
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
}

const MatchPlanner: React.FC<MatchPlannerProps> = ({ state, setState, defaultSelectedId, addLog, getSuspension }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  
  const currentUser = state.currentUser;
  const isManager = currentUser?.role === 'مدير';
  const isViewer = currentUser?.role === 'مشاهد';
  const restrictedCat = currentUser?.restrictedCategory;

  const [formData, setFormData] = useState<Partial<Match>>({ 
    matchType: 'دوري', 
    category: restrictedCat || (state.categories[0] || 'الرجال'),
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
      if (!sub.playerId || !sub.substitutionMinute) return { ...sub, minutesPlayed: '0' };
      const subMin = parseInt(sub.substitutionMinute) || 0;
      return { ...sub, minutesPlayed: Math.max(0, fullTime - subMin).toString() };
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
    if (!formData.opponent || !formData.date || isViewer) return;
    const newMatch: Match = {
      id: generateUUID(),
      category: formData.category || state.categories[0],
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
      events: [],
      lineup: {
        starters: Array(11).fill(null).map(() => ({ playerId: '', name: '', number: '', minutesPlayed: '90' })),
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

  const saveMatch = async (complete: boolean = false) => {
    if (!activeMatch || isViewer) return;
    const finalMatch = recalculateAllMinutes({ ...activeMatch, isCompleted: complete });
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

  const inputStyle = "w-full bg-slate-900 border border-white/10 rounded-xl py-3 px-4 font-bold text-white focus:border-orange-500 outline-none transition-all text-sm disabled:opacity-50";
  const labelStyle = "text-[10px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-['IBM_Plex_Sans_Arabic']" dir="rtl">
      {/* Header Section */}
      <div className="modern-card p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b-4 border-orange-500/20">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Trophy className="text-orange-500" size={32} /> Stadia | إدارة مباريات وأنشطة النادي
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Football Operations Hub</p>
        </div>
        {!isViewer && (
          <button onClick={() => setIsAddOpen(true)} className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-lg hover:bg-orange-600 transition-all active:scale-95">
            <Plus size={20}/> جدولة مباراة جديدة
          </button>
        )}
      </div>

      {/* Match Summary Bar */}
      <div className="modern-card p-6 bg-slate-900/40">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><ClipboardList size={14}/> ملخص المباريات السريع</h3>
        <div className="space-y-2">
           {filteredMatches.slice(0, 5).map(m => (
             <div key={m.id} className="flex justify-between items-center text-[10px] font-bold py-2 border-b border-white/5 last:border-0">
                <span className="text-orange-500 w-24">{m.category}</span>
                <span className="text-white flex-1 text-center font-black">الكرامة ({m.ourScore}) - ({m.opponentScore}) {m.opponent}</span>
                <span className="text-slate-500 w-24 text-left tabular-nums">{m.date}</span>
             </div>
           ))}
           {filteredMatches.length === 0 && <p className="text-center text-[10px] text-slate-600 italic">لا توجد مباريات مسجلة</p>}
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMatches.map(m => {
          const canEdit = isManager || (!m.isCompleted && !isViewer);
          return (
            <div key={m.id} className="modern-card p-8 flex flex-col border-b-4 border-white/5 hover:border-orange-500/50 transition-all group">
               <div className="flex justify-between items-start mb-6">
                  <span className="bg-orange-500/10 text-orange-500 text-[10px] font-black px-3 py-1 rounded-full border border-orange-500/20 uppercase">{m.matchType}</span>
                  <span className="text-[10px] text-slate-500 font-bold tabular-nums">{m.date}</span>
               </div>
               <div className="text-center py-6">
                  <div className="flex justify-center items-center gap-6">
                    <div className="text-4xl font-black text-white tabular-nums">{m.ourScore}</div>
                    <div className="text-slate-700 font-black text-2xl">:</div>
                    <div className="text-4xl font-black text-white tabular-nums">{m.opponentScore}</div>
                  </div>
                  <h3 className="text-xl font-black text-white mt-4 truncate">الكرامة × {m.opponent}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{m.category} | {m.pitch}</p>
                  
                  {/* Detailed Match Info Brief */}
                  <div className="mt-4 space-y-1">
                    {m.referee && <p className="text-[9px] text-slate-400 font-bold flex items-center justify-center gap-1"><Gavel size={10}/> الحكم: {m.referee}</p>}
                    {m.homeCoach && <p className="text-[9px] text-slate-400 font-bold flex items-center justify-center gap-1"><Briefcase size={10}/> مدربنا: {m.homeCoach}</p>}
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-500/10 py-1.5 rounded-xl border border-emerald-500/20">
                     <WalletCards size={12}/> سلفة المباراة: {m.advancePayment || '0'} ل.س
                  </div>
               </div>
               <div className="mt-auto pt-6 border-t border-white/5 flex gap-3">
                  <button onClick={() => setActiveMatch(m)} className="flex-1 bg-white/5 hover:bg-orange-500 text-white py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2">
                    {canEdit ? <Activity size={16}/> : <FileText size={16}/>}
                    {canEdit ? 'إدارة الأحداث والتعديل' : 'عرض التقرير الفني'}
                  </button>
                  {isManager && (
                    <button onClick={() => deleteMatch(m.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                      <Trash2 size={16}/>
                    </button>
                  )}
               </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add Match */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setIsAddOpen(false)}></div>
           <div className="relative bg-[#0f172a] border-2 border-white/10 w-full max-w-2xl rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-white/5 flex justify-between items-center">
                 <h3 className="text-xl font-black text-white uppercase tracking-tighter">جدولة مواجهة جديدة</h3>
                 <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400"><X/></button>
              </div>
              <form onSubmit={handleCreateMatch} className="p-10 space-y-6 text-right overflow-y-auto max-h-[80vh] custom-scrollbar" dir="rtl">
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className={labelStyle}>الفئة</label>
                       <select required className={inputStyle} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className={labelStyle}>نوع المنافسة</label>
                       <select className={inputStyle} value={formData.matchType} onChange={e => setFormData({...formData, matchType: e.target.value as any})}>
                          <option value="دوري">دوري</option>
                          <option value="كأس">كأس</option>
                          <option value="ودية">ودية</option>
                       </select>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className={labelStyle}>اسم الخصم</label>
                       <input required type="text" className={inputStyle} value={formData.opponent} onChange={e => setFormData({...formData, opponent: e.target.value})} placeholder="أدخل اسم النادي..." />
                    </div>
                    <div>
                       <label className={labelStyle}>السلفة (ل.س)</label>
                       <input type="text" className={inputStyle} value={formData.advancePayment} onChange={e => setFormData({...formData, advancePayment: e.target.value})} placeholder="0" />
                    </div>
                 </div>
                 
                 {/* New Fields in Modal */}
                 <div className="grid grid-cols-1 gap-6">
                    <div>
                       <label className={labelStyle}>حكم المباراة</label>
                       <input type="text" className={inputStyle} value={formData.referee} onChange={e => setFormData({...formData, referee: e.target.value})} placeholder="اسم الحكم الرئيسي..." />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className={labelStyle}>مدرب الكرامة</label>
                       <input type="text" className={inputStyle} value={formData.homeCoach} onChange={e => setFormData({...formData, homeCoach: e.target.value})} placeholder="اسم المدرب..." />
                    </div>
                    <div>
                       <label className={labelStyle}>مدرب الفريق الخصم</label>
                       <input type="text" className={inputStyle} value={formData.awayCoach} onChange={e => setFormData({...formData, awayCoach: e.target.value})} placeholder="اسم المدرب..." />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className={labelStyle}>التاريخ</label>
                       <input required type="date" className={inputStyle} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div>
                       <label className={labelStyle}>التوقيت</label>
                       <input type="time" className={inputStyle} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-orange-600 transition-all">تثبيت المباراة سحابياً</button>
              </form>
           </div>
        </div>
      )}

      {/* Deep Management Overlay (Full Interface) */}
      {activeMatch && (
        <div className="fixed inset-0 z-[110] bg-black overflow-y-auto custom-scrollbar no-print" dir="rtl">
           <div className="min-h-screen bg-[#020617] p-4 md:p-10">
              <div className="max-w-7xl mx-auto space-y-8">
                 
                 {/* Header Actions */}
                 <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                       <button onClick={() => setActiveMatch(null)} className="p-4 bg-white/5 rounded-2xl hover:bg-orange-500 text-white transition-all"><Undo2 size={24}/></button>
                       <div>
                          <h2 className="text-3xl font-black text-white">الكرامة × {activeMatch.opponent}</h2>
                          <div className="flex gap-3 mt-1">
                             <span className="text-orange-500 font-bold text-xs uppercase tracking-widest">{activeMatch.category}</span>
                             <span className="text-slate-500 font-bold text-xs uppercase">| {activeMatch.date}</span>
                             {activeMatch.isCompleted && <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500/20">معتمدة</span>}
                          </div>
                       </div>
                    </div>
                    {!isViewer && (isManager || !activeMatch.isCompleted) && (
                      <div className="flex gap-3 w-full md:w-auto">
                         <button onClick={() => saveMatch(true)} className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all">
                            <CheckCircle size={20}/> اعتماد التقرير النهائي
                         </button>
                         <button onClick={() => saveMatch(false)} className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                            <Save size={20}/> حفظ كمسودة
                         </button>
                      </div>
                    )}
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Column 1: Score & Lineup */}
                    <div className="lg:col-span-8 space-y-8">
                       
                       {/* Scoreboard Card */}
                       <div className="modern-card p-10 bg-gradient-to-br from-slate-900 to-black border-white/10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                             <div className="space-y-6">
                                <h4 className="text-center text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">النتيجة النهائية (Score)</h4>
                                <div className="flex justify-center items-center gap-6">
                                   <div className="text-center">
                                      <p className="text-[9px] font-black text-slate-500 mb-2 uppercase">الكرامة</p>
                                      <input type="number" className="w-24 h-24 bg-white/5 border-2 border-white/10 rounded-[2rem] text-center text-5xl font-black text-white outline-none focus:border-orange-500" value={activeMatch.ourScore} onChange={e => setActiveMatch({...activeMatch, ourScore: e.target.value})} />
                                   </div>
                                   <div className="text-4xl font-black text-slate-700 mt-6">:</div>
                                   <div className="text-center">
                                      <p className="text-[9px] font-black text-slate-500 mb-2 uppercase">{activeMatch.opponent}</p>
                                      <input type="number" className="w-24 h-24 bg-white/5 border-2 border-white/10 rounded-[2rem] text-center text-5xl font-black text-white outline-none focus:border-orange-500" value={activeMatch.opponentScore} onChange={e => setActiveMatch({...activeMatch, opponentScore: e.target.value})} />
                                   </div>
                                </div>
                             </div>
                             <div className="space-y-6">
                                <h4 className="text-center text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">المالية والوقت المضاف</h4>
                                <div className="grid grid-cols-1 gap-4">
                                   <div className="flex gap-4">
                                      <div className="flex-1">
                                        <p className="text-[9px] font-black text-slate-500 mb-2 uppercase text-center">شوط 1 (د)</p>
                                        <input type="number" className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-3 text-center text-lg font-black text-white outline-none" value={activeMatch.stoppageTime1} onChange={e => setActiveMatch({...activeMatch, stoppageTime1: e.target.value})} />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-[9px] font-black text-slate-500 mb-2 uppercase text-center">شوط 2 (د)</p>
                                        <input type="number" className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-3 text-center text-lg font-black text-white outline-none" value={activeMatch.stoppageTime2} onChange={e => setActiveMatch({...activeMatch, stoppageTime2: e.target.value})} />
                                      </div>
                                   </div>
                                   <div>
                                      <p className="text-[9px] font-black text-slate-500 mb-2 uppercase text-center">سلفة المباراة (ل.س)</p>
                                      <input type="text" className="w-full bg-white/10 border-2 border-emerald-500/20 rounded-2xl py-4 text-center text-xl font-black text-emerald-500 outline-none" value={activeMatch.advancePayment} onChange={e => setActiveMatch({...activeMatch, advancePayment: e.target.value})} />
                                   </div>
                                </div>
                             </div>
                          </div>
                       </div>

                       {/* Match Officials & Technical Staff Section */}
                       <div className="modern-card p-8 border-white/5 bg-slate-900/40">
                          <h4 className="text-lg font-black text-white mb-8 border-r-4 border-yellow-500 pr-4 flex items-center gap-3 uppercase"><Gavel/> طاقم المباراة والكوادر الفنية</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                               <label className={labelStyle}>حكم المباراة</label>
                               <input type="text" className={inputStyle} value={activeMatch.referee || ''} onChange={e => setActiveMatch({...activeMatch, referee: e.target.value})} placeholder="اسم الحكم..." />
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
                       </div>

                       {/* Starting XI */}
                       <div className="modern-card p-8 border-white/5">
                          <h4 className="text-lg font-black text-white mb-8 border-r-4 border-orange-500 pr-4 flex items-center gap-3 uppercase"><Users/> التشكيلة الأساسية (11 لاعب)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {activeMatch.lineup.starters.map((s, i) => (
                               <div key={i} className="flex gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center font-black text-white border border-white/10">{i+1}</div>
                                  <select className={inputStyle} value={s.playerId} onChange={e => updateStarter(i, e.target.value)}>
                                     <option value="">-- اختر لاعب --</option>
                                     {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category).map(p => (
                                       <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                     ))}
                                  </select>
                               </div>
                             ))}
                          </div>
                       </div>

                       {/* Substitutes Section */}
                       <div className="modern-card p-8 border-white/5">
                          <div className="flex justify-between items-center mb-8">
                             <h4 className="text-lg font-black text-white border-r-4 border-blue-500 pr-4 flex items-center gap-3 uppercase"><ArrowRightLeft/> دكة البدلاء والتبديلات</h4>
                             <button onClick={addSubstitute} className="bg-blue-600/10 text-blue-500 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all">+ إضافة بديل</button>
                          </div>
                          <div className="space-y-4">
                             {activeMatch.lineup.subs.map((sub, idx) => (
                               <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-6 rounded-[2rem] border border-white/5 relative group">
                                  <button onClick={() => removeSubstitute(idx)} className="absolute -left-2 -top-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                                  <div className="md:col-span-1">
                                     <label className={labelStyle}>اللاعب البديل</label>
                                     <select className={inputStyle} value={sub.playerId} onChange={e => {
                                       const p = state.people.find(x => x.id === e.target.value);
                                       const newSubs = [...activeMatch.lineup.subs];
                                       newSubs[idx] = { ...newSubs[idx], playerId: p?.id || '', name: p?.name || '', number: p?.number?.toString() || '' };
                                       setActiveMatch({...activeMatch, lineup: {...activeMatch.lineup, subs: newSubs}});
                                     }}>
                                        <option value="">-- اختر لاعب --</option>
                                        {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category && !activeMatch.lineup.starters.some(s => s.playerId === p.id)).map(p => (
                                          <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                        ))}
                                     </select>
                                  </div>
                                  <div>
                                     <label className={labelStyle}>المستبدل (الخارج)</label>
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
                                  <div className="flex flex-col justify-center text-center bg-black/30 rounded-xl">
                                     <p className="text-[8px] font-black text-slate-500 uppercase">دقائق اللعب</p>
                                     <p className="text-xl font-black text-orange-500 tabular-nums">
                                        {(() => {
                                           const f = 90 + parseInt(activeMatch.stoppageTime2 || '0');
                                           const m = parseInt(sub.substitutionMinute) || 0;
                                           return sub.substitutionMinute ? Math.max(0, f - m) : 0;
                                        })()} د
                                     </p>
                                  </div>
                               </div>
                             ))}
                             {activeMatch.lineup.subs.length === 0 && <p className="text-center py-10 text-slate-600 text-xs italic">لا يوجد بدلاء مسجلين لهذه المباراة</p>}
                          </div>
                       </div>
                    </div>

                    {/* Column 2: Events & Notes */}
                    <div className="lg:col-span-4 space-y-8">
                       
                       {/* Match Events */}
                       <div className="modern-card p-8 border-white/5 bg-slate-900/40">
                          <h4 className="text-lg font-black text-white mb-8 border-r-4 border-emerald-500 pr-4 flex items-center gap-3 uppercase"><Activity/> أحداث المباراة اللحظية</h4>
                          
                          <div className="grid grid-cols-3 gap-2 mb-8">
                             {[
                               { t: 'goal' as const, l: '⚽ هدف', c: 'hover:bg-emerald-600' },
                               { t: 'assist' as const, l: '👟 أسيست', c: 'hover:bg-blue-600' },
                               { t: 'yellow' as const, l: '🟨 إنذار', c: 'hover:bg-yellow-600' },
                               { t: 'red' as const, l: '🟥 طرد', c: 'hover:bg-red-600' },
                               { t: 'injury' as const, l: '🏥 إصابة', c: 'hover:bg-purple-600' }
                             ].map(btn => (
                               <button key={btn.t} onClick={() => addEvent(btn.t)} className={`bg-white/5 border border-white/10 py-3 rounded-xl text-[9px] font-black text-slate-400 transition-all ${btn.c} hover:text-white active:scale-95`}>
                                  {btn.l}
                               </button>
                             ))}
                          </div>

                          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                             {activeMatch.events.map(ev => (
                               <div key={ev.id} className="bg-black/40 p-4 rounded-2xl border border-white/5 relative group">
                                  <button onClick={() => removeEvent(ev.id)} className="absolute left-3 top-3 text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                  <div className="flex items-center gap-3 mb-3">
                                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${ev.type==='goal'?'bg-emerald-500':ev.type==='yellow'?'bg-yellow-500':ev.type==='red'?'bg-red-500':'bg-blue-500'} text-white`}>{ev.type}</span>
                                     <input type="number" placeholder="الدقيقة" className="w-16 bg-white/5 border-none text-xs text-orange-500 font-black focus:ring-0" value={ev.minute} onChange={e => {
                                        const newEvents = activeMatch.events.map(x => x.id === ev.id ? {...x, minute: e.target.value} : x);
                                        setActiveMatch({...activeMatch, events: newEvents});
                                     }} />
                                  </div>
                                  <select className={`${inputStyle} text-xs py-2`} value={ev.player} onChange={e => {
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
                             {activeMatch.events.length === 0 && <p className="text-center py-10 text-slate-600 text-xs italic">لم يتم رصد أي أحداث حتى الآن</p>}
                          </div>
                       </div>

                       {/* Technical Notes */}
                       <div className="modern-card p-8 border-white/5">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase mb-4 tracking-widest flex items-center gap-2"><StickyNote size={14}/> الملاحظات الفنية للمباراة</h4>
                          <textarea 
                            className="w-full bg-slate-900 border border-white/10 rounded-2xl p-6 text-sm text-white h-48 resize-none outline-none focus:border-orange-500 font-medium leading-relaxed"
                            placeholder="اكتب التقرير الفني المختصر للمباراة، النقاط التكتيكية، وأداء الفريق..."
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
