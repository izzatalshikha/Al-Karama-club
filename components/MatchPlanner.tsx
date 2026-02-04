
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, MapPin, Clock, Plus, X, Shield, Award, Calendar, 
  ChevronLeft, Trash2, Target, AlertTriangle, UserPlus, 
  Printer, FileText, Users, Save, ShieldAlert, BookOpen, Info, Timer, LogOut, LogIn, Crown, Map, ChevronRight, CheckCircle, Zap, TrendingUp, Activity, UserCircle, Sparkles, Loader2, BrainCircuit, Lock, Unlock
} from 'lucide-react';
import { AppState, Match, MatchType, MatchEvent, Person } from '../types';
import { generateUUID, supabase } from '../App';
import ClubLogo from './ClubLogo';
import { GoogleGenAI } from "@google/genai";

interface MatchPlannerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  defaultSelectedId?: string | null;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const MatchPlanner: React.FC<MatchPlannerProps> = ({ state, setState, defaultSelectedId, addLog }) => {
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
    opponentScore: '0'
  });

  const filteredMatches = useMemo(() => {
    return state.matches.filter(m => {
      if (restrictedCat) return m.category === restrictedCat;
      return (state.globalCategoryFilter === 'الكل' || m.category === state.globalCategoryFilter);
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [state.matches, state.globalCategoryFilter, restrictedCat]);

  // وظيفة إنشاء مباراة جديدة
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
        starters: Array(11).fill(null).map(() => ({ playerId: '', name: '', number: '', minutesPlayed: '90' })),
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

  const addSub = () => {
    if (!activeMatch || isViewer || activeMatch.isCompleted) return;
    setActiveMatch({
      ...activeMatch,
      lineup: {
        ...activeMatch.lineup,
        subs: [...activeMatch.lineup.subs, { playerId: '', name: '', number: '', minutesPlayed: '0', substitutionMinute: '', replacedPlayerId: '' }]
      }
    });
  };

  const updateSub = (index: number, playerId: string) => {
    if (!activeMatch || isViewer || activeMatch.isCompleted) return;
    const person = state.people.find(p => p.id === playerId);
    if (!person) return;
    const newSubs = [...activeMatch.lineup.subs];
    newSubs[index] = { ...newSubs[index], playerId: person.id, name: person.name, number: person.number?.toString() || '' };
    setActiveMatch({ ...activeMatch, lineup: { ...activeMatch.lineup, subs: newSubs } });
  };

  const handleSubstitutionCalculation = (subIndex: number, replacedPlayerId: string, subMinute: string) => {
    if (!activeMatch || isViewer || activeMatch.isCompleted) return;
    const newLineup = { ...activeMatch.lineup };
    const minute = parseInt(subMinute) || 0;
    const starterIdx = newLineup.starters.findIndex(s => s.playerId === replacedPlayerId);
    if (starterIdx !== -1) {
      newLineup.starters[starterIdx].minutesPlayed = minute.toString();
    }
    newLineup.subs[subIndex].replacedPlayerId = replacedPlayerId;
    newLineup.subs[subIndex].substitutionMinute = subMinute;
    newLineup.subs[subIndex].minutesPlayed = (90 - minute).toString();
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const removeSub = (index: number) => {
    if (!activeMatch || isViewer || activeMatch.isCompleted) return;
    const newSubs = activeMatch.lineup.subs.filter((_, i) => i !== index);
    setActiveMatch({ ...activeMatch, lineup: { ...activeMatch.lineup, subs: newSubs } });
  };

  const addMatchEvent = (type: MatchEvent['type']) => {
    if (!activeMatch || isViewer || activeMatch.isCompleted) return;
    const newEvent: MatchEvent = {
      id: generateUUID(),
      type,
      player: '',
      minute: '',
      note: ''
    };
    setActiveMatch({
      ...activeMatch,
      events: [...(activeMatch.events || []), newEvent]
    });
  };

  const updateMatchEvent = (id: string, field: keyof MatchEvent, value: string) => {
    if (!activeMatch || isViewer || activeMatch.isCompleted) return;
    const newEvents = activeMatch.events.map(e => e.id === id ? { ...e, [field]: value } : e);
    setActiveMatch({ ...activeMatch, events: newEvents });
  };

  const removeMatchEvent = (id: string) => {
    if (!activeMatch || isViewer || activeMatch.isCompleted) return;
    const newEvents = activeMatch.events.filter(e => e.id !== id);
    setActiveMatch({ ...activeMatch, events: newEvents });
  };

  const updateActiveMatchLineup = (index: number, playerId: string, isStarter: boolean) => {
    if (!activeMatch || isViewer || activeMatch.isCompleted) return;
    const person = state.people.find(p => p.id === playerId);
    const newLineup = { ...activeMatch.lineup };
    if (isStarter) {
      if (!person) newLineup.starters[index] = { playerId: '', name: '', number: '', minutesPlayed: '90' };
      else newLineup.starters[index] = { playerId: person.id, name: person.name, number: person.number?.toString() || '', minutesPlayed: '90' };
    }
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const saveMatchDetails = (lockStatus: boolean = false) => {
    if (!activeMatch || isViewer) return;
    const finalLockStatus = isManager ? lockStatus : activeMatch.isCompleted;
    setState(p => ({
      ...p,
      matches: p.matches.map(m => m.id === activeMatch.id ? { ...activeMatch, isCompleted: finalLockStatus } : m)
    }));
    setActiveMatch(null);
  };

  const getAvailablePlayers = (currentId: string) => {
    const selectedIds = [
      ...activeMatch!.lineup.starters.map(s => s.playerId),
      ...activeMatch!.lineup.subs.map(s => s.playerId)
    ].filter(id => id && id !== currentId);
    return state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch?.category && !selectedIds.includes(p.id));
  };

  const getTeamPlayers = () => {
    return state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch?.category);
  };

  const inputStyle = "w-full bg-slate-50 border border-[#001F3F] rounded-xl py-2 px-3 font-bold text-[#001F3F] text-xs shadow-inner transition-all";
  const labelStyle = "text-[10px] font-black text-[#001F3F] mr-1 uppercase block mb-1";

  return (
    <div className="space-y-4 md:space-y-6 pb-20 px-1 font-['Tajawal']" dir="rtl">
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 flex justify-between items-center no-print shadow-md">
        <h2 className="text-sm md:text-xl font-black text-[#001F3F] flex items-center gap-2 uppercase tracking-tighter">
          <Trophy size={20} className="text-orange-600" /> إدارة المباريات
        </h2>
        {!isViewer && <button onClick={() => setIsAddOpen(true)} className="bg-[#001F3F] text-white px-4 py-2 rounded-xl font-black text-[10px] shadow-lg border-b-4 border-black">جدولة مواجهة</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 no-print">
        {filteredMatches.map(m => (
          <div key={m.id} className={`bg-white p-5 rounded-2xl border-2 border-slate-900 relative shadow-sm border-b-8 transition-all ${m.isCompleted ? 'border-red-600' : 'hover:border-orange-600'}`}>
             <div className="flex justify-between items-start mb-4">
                <span className="bg-orange-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase">{m.matchType}</span>
                <span className="text-[10px] font-black text-slate-500 tabular-nums">{m.date}</span>
             </div>
             <div className="text-center mb-6">
                <p className="text-2xl font-black text-[#001F3F] tabular-nums">{m.ourScore} - {m.opponentScore}</p>
                <p className="font-bold text-sm text-slate-800 mt-2">{m.opponent}</p>
             </div>
             <div className="flex gap-2">
                <button onClick={() => setActiveMatch(m)} className="flex-1 bg-[#001F3F] text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">
                  {m.isCompleted ? 'عرض التقرير' : 'التشكيل والأحداث'}
                </button>
                {!isViewer && !m.isCompleted && (
                  <button onClick={() => { if(confirm('حذف المباراة؟')) setState(p => ({...p, matches: p.matches.filter(x => x.id !== m.id)})); }} className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200"><Trash2 size={16}/></button>
                )}
             </div>
          </div>
        ))}
        {filteredMatches.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
             <Trophy className="mx-auto text-slate-200 mb-4" size={48} />
             <p className="text-slate-400 font-black italic">لا توجد مباريات مجدولة لهذه الفئة</p>
          </div>
        )}
      </div>

      {/* نافذة إضافة مباراة جديدة (إصلاح العطل) */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[500] p-4 no-print">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border-[6px] border-slate-900 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 bg-slate-100 border-b-2 border-slate-900 flex justify-between items-center">
                 <h3 className="font-black text-slate-900 uppercase">جدولة مواجهة جديدة</h3>
                 <button onClick={() => setIsAddOpen(false)} className="bg-white p-2 rounded-lg border-2 border-slate-900"><X size={20}/></button>
              </div>
              <form onSubmit={handleCreateMatch} className="p-8 space-y-5 text-right">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className={labelStyle}>الفئة</label>
                       <select required disabled={!!restrictedCat} className={inputStyle} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                          {state.categories.filter(c => !restrictedCat || c === restrictedCat).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className={labelStyle}>نوع المباراة</label>
                       <select className={inputStyle} value={formData.matchType} onChange={e => setFormData({...formData, matchType: e.target.value as any})}>
                          <option value="دوري">دوري</option>
                          <option value="كأس">كأس</option>
                          <option value="ودية">ودية</option>
                          <option value="بطولة ودية">بطولة ودية</option>
                          <option value="مباراة دولية">مباراة دولية</option>
                       </select>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className={labelStyle}>اسم الفريق المنافس</label>
                    <input required type="text" className={inputStyle} value={formData.opponent} onChange={e => setFormData({...formData, opponent: e.target.value})} placeholder="أدخل اسم الخصم..." />
                 </div>
                 <div className="space-y-1">
                    <label className={labelStyle}>الملعب / الموقع</label>
                    <input type="text" className={inputStyle} value={formData.pitch} onChange={e => setFormData({...formData, pitch: e.target.value})} placeholder="ملعب الكرامة..." />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className={labelStyle}>التاريخ</label>
                       <input required type="date" className={inputStyle} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label className={labelStyle}>التوقيت</label>
                       <input required type="time" className={inputStyle} value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-[#001F3F] text-white py-5 rounded-2xl font-black shadow-xl hover:bg-black transition-all mt-4 uppercase">حفظ وتثبيت المواجهة</button>
              </form>
           </div>
        </div>
      )}

      {activeMatch && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[400] overflow-y-auto no-print">
           <div className="max-w-4xl mx-auto p-2 md:p-8 min-h-screen text-right" dir="rtl">
              <div className="bg-white rounded-[2rem] border-[4px] border-slate-900 p-4 md:p-8 shadow-2xl relative">
                
                <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b-4 border-slate-900 pb-6 gap-4">
                   <div className="text-center md:text-right">
                      <h2 className="text-xl md:text-2xl font-black text-[#001F3F] tracking-tighter uppercase">{activeMatch.opponent} × الكرامة</h2>
                      <div className="flex gap-2 mt-2 justify-center md:justify-start">
                         <span className="bg-slate-100 text-[#001F3F] text-[9px] font-black px-2 py-1 rounded-full border border-slate-900">{activeMatch.date}</span>
                         {activeMatch.isCompleted && <span className="bg-red-50 text-red-600 text-[9px] font-black px-2 py-1 rounded-full border border-red-200 flex items-center gap-1"><Lock size={10}/> مقفل</span>}
                      </div>
                   </div>
                   <div className="flex flex-wrap gap-2 justify-center">
                      {isManager && (
                        <button onClick={() => saveMatchDetails(!activeMatch.isCompleted)} className={`${activeMatch.isCompleted ? 'bg-red-600' : 'bg-emerald-600'} text-white px-4 py-2 rounded-xl font-black text-[10px] shadow-md flex items-center gap-2 transition-all`}>
                          {activeMatch.isCompleted ? <Unlock size={16}/> : <Lock size={16}/>} {activeMatch.isCompleted ? 'فتح التعديل' : 'اعتماد وقفل'}
                        </button>
                      )}
                      {!activeMatch.isCompleted && <button onClick={() => saveMatchDetails(false)} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[10px] shadow-md flex items-center gap-2"><Save size={16}/> حفظ</button>}
                      <button onClick={() => setActiveMatch(null)} className="bg-slate-100 p-2 rounded-xl border-2 border-slate-300 transition-all hover:bg-red-50 hover:text-red-600"><X size={20}/></button>
                   </div>
                </header>

                <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${activeMatch.isCompleted ? 'opacity-80 pointer-events-none' : ''}`}>
                   <div className="lg:col-span-8 space-y-8">
                      {/* التشكيلة الأساسية */}
                      <section>
                         <h3 className="text-sm font-black text-[#001F3F] mb-4 border-r-4 border-orange-600 pr-2 uppercase tracking-tighter">التشكيلة الأساسية (Starting XI)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeMatch.lineup.starters.map((s, idx) => (
                               <div key={idx} className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 shadow-sm flex flex-col gap-2">
                                  <div className="flex justify-between items-center">
                                     <span className="w-8 h-8 bg-[#001F3F] text-white rounded-lg flex items-center justify-center font-black text-xs">#{s.number || (idx+1)}</span>
                                     <div className="flex items-center gap-1">
                                        <Timer size={10} className="text-emerald-600"/>
                                        <input type="number" className="w-10 bg-white border border-slate-300 rounded text-center font-bold text-[9px] p-1" value={s.minutesPlayed || '90'} onChange={e => {
                                           const nl = {...activeMatch.lineup}; nl.starters[idx].minutesPlayed = e.target.value; setActiveMatch({...activeMatch, lineup: nl});
                                        }} />
                                     </div>
                                  </div>
                                  <select className={inputStyle} value={s.playerId} onChange={e => updateActiveMatchLineup(idx, e.target.value, true)}>
                                     <option value="">-- اختر لاعب --</option>
                                     {getAvailablePlayers(s.playerId).map(p => <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>)}
                                  </select>
                               </div>
                            ))}
                         </div>
                      </section>

                      {/* أحداث المباراة */}
                      <section className="bg-white p-5 rounded-2xl border-2 border-[#001F3F] shadow-sm space-y-4">
                         <div className="flex justify-between items-center">
                            <h3 className="text-sm font-black text-[#001F3F] uppercase flex items-center gap-2">
                               <Sparkles size={18} className="text-orange-500"/> أحداث المواجهة (أهداف وبطاقات)
                            </h3>
                            <div className="flex gap-1">
                               <button onClick={() => addMatchEvent('goal')} className="bg-emerald-600 text-white p-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1"><Plus size={10}/> هدف</button>
                               <button onClick={() => addMatchEvent('yellow')} className="bg-yellow-500 text-white p-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1"><AlertTriangle size={10}/> إنذار</button>
                               <button onClick={() => addMatchEvent('red')} className="bg-red-600 text-white p-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1"><X size={10}/> طرد</button>
                            </div>
                         </div>
                         <div className="space-y-3">
                            {activeMatch.events && activeMatch.events.map((ev, idx) => (
                               <div key={ev.id} className={`p-3 rounded-xl border-2 flex flex-col md:flex-row gap-3 items-center ${ev.type === 'goal' ? 'bg-emerald-50 border-emerald-100' : ev.type === 'yellow' ? 'bg-yellow-50 border-yellow-100' : ev.type === 'red' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                  <div className="flex items-center gap-2">
                                     {ev.type === 'goal' && <Trophy className="text-emerald-600" size={16}/>}
                                     {ev.type === 'assist' && <Zap className="text-blue-600" size={16}/>}
                                     {ev.type === 'yellow' && <div className="w-3 h-5 bg-yellow-400 rounded-sm"></div>}
                                     {ev.type === 'red' && <div className="w-3 h-5 bg-red-600 rounded-sm"></div>}
                                     <span className="text-[10px] font-black text-slate-900 uppercase">{ev.type}</span>
                                  </div>
                                  <div className="flex-1 w-full">
                                     <select className={inputStyle} value={ev.player} onChange={e => updateMatchEvent(ev.id, 'player', e.target.value)}>
                                        <option value="">-- اللاعب --</option>
                                        {getTeamPlayers().map(p => <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>)}
                                     </select>
                                  </div>
                                  <div className="w-16">
                                     <input type="number" className={inputStyle + " text-center"} placeholder="دقيقة" value={ev.minute} onChange={e => updateMatchEvent(ev.id, 'minute', e.target.value)} />
                                  </div>
                                  <button onClick={() => removeMatchEvent(ev.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={14}/></button>
                               </div>
                            ))}
                            {(!activeMatch.events || activeMatch.events.length === 0) && <p className="text-center py-4 text-slate-400 font-bold italic text-[10px]">لا توجد أحداث مسجلة للمواجهة.</p>}
                         </div>
                      </section>

                      {/* التبديلات اللانهائية */}
                      <section className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-[#001F3F]">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-black text-[#001F3F] uppercase flex items-center gap-2"><TrendingUp size={18} className="text-blue-600"/> التبديلات اللانهائية</h3>
                            <button onClick={addSub} className="bg-[#001F3F] text-white px-3 py-1.5 rounded-lg font-black text-[9px] flex items-center gap-1 shadow-md hover:bg-black transition-all"><Plus size={12}/> إضافة تبديل</button>
                         </div>
                         <div className="space-y-3">
                            {activeMatch.lineup.subs.map((s, idx) => (
                               <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-2 items-end md:items-center shadow-sm relative">
                                  <div className="flex-1 w-full">
                                     <label className={labelStyle}>البديل</label>
                                     <select className={inputStyle} value={s.playerId} onChange={e => updateSub(idx, e.target.value)}>
                                        <option value="">-- دخول لاعب --</option>
                                        {getAvailablePlayers(s.playerId).map(p => <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>)}
                                     </select>
                                  </div>
                                  <div className="flex-1 w-full">
                                     <label className={labelStyle}>بدلاً من</label>
                                     <select className={inputStyle} value={s.replacedPlayerId || ''} onChange={e => handleSubstitutionCalculation(idx, e.target.value, s.substitutionMinute || '0')}>
                                        <option value="">-- خروج لاعب --</option>
                                        {activeMatch.lineup.starters.map(st => <option key={st.playerId} value={st.playerId}>{st.name}</option>)}
                                     </select>
                                  </div>
                                  <div className="w-16">
                                     <label className={labelStyle}>دقيقة</label>
                                     <input type="number" className={inputStyle + " text-center"} value={s.substitutionMinute || ''} placeholder="0" onChange={e => handleSubstitutionCalculation(idx, s.replacedPlayerId || '', e.target.value)} />
                                  </div>
                                  <button onClick={() => removeSub(idx)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14}/></button>
                               </div>
                            ))}
                         </div>
                      </section>
                   </div>

                   <div className="lg:col-span-4 space-y-6">
                      {/* النتيجة والوقت بدل الضائع (الميزة المحفوظة) */}
                      <section className="bg-slate-900 text-white p-6 rounded-2xl border-4 border-orange-600 text-center shadow-xl">
                         <h3 className="text-[10px] font-black text-orange-400 mb-6 uppercase tracking-widest">النتيجة والوقت المضاف</h3>
                         <div className="flex justify-center items-center gap-4 mb-6">
                            <input type="number" className="w-14 h-14 bg-white text-slate-900 rounded-xl text-center font-black text-xl outline-none" value={activeMatch.ourScore} onChange={e => setActiveMatch({...activeMatch, ourScore: e.target.value})} />
                            <span className="text-3xl font-black text-orange-600">:</span>
                            <input type="number" className="w-14 h-14 bg-white text-slate-900 rounded-xl text-center font-black text-xl outline-none" value={activeMatch.opponentScore} onChange={e => setActiveMatch({...activeMatch, opponentScore: e.target.value})} />
                         </div>
                         
                         <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                            <div>
                               <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">وقت إضافي (ش1)</label>
                               <input type="number" className="w-full bg-white/10 border border-white/20 rounded-lg py-1 px-2 text-center text-white font-bold text-xs" value={activeMatch.stoppageTime1 || ''} onChange={e => setActiveMatch({...activeMatch, stoppageTime1: e.target.value})} placeholder="+0" />
                            </div>
                            <div>
                               <label className="text-[8px] font-black text-slate-400 block mb-1 uppercase">وقت إضافي (ش2)</label>
                               <input type="number" className="w-full bg-white/10 border border-white/20 rounded-lg py-1 px-2 text-center text-white font-bold text-xs" value={activeMatch.stoppageTime2 || ''} onChange={e => setActiveMatch({...activeMatch, stoppageTime2: e.target.value})} placeholder="+0" />
                            </div>
                         </div>
                      </section>

                      {/* الملاحظات */}
                      <section className="bg-white p-5 rounded-2xl border-2 border-slate-900 shadow-sm space-y-4">
                         <h3 className="font-black text-xs text-[#001F3F] flex items-center gap-2"><FileText size={16} className="text-blue-600"/> التقرير الفني</h3>
                         <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-[10px] text-slate-800 outline-none focus:border-blue-600 min-h-[100px] resize-none" value={activeMatch.notes || ''} onChange={e => setActiveMatch({...activeMatch, notes: e.target.value})} placeholder="اكتب تحليل المباراة..."></textarea>
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
