
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, MapPin, Clock, Plus, X, Shield, Award, Calendar, 
  ChevronLeft, Trash2, Target, AlertTriangle, UserPlus, 
  Printer, FileText, Users, Save, ShieldAlert, BookOpen, Info, Timer, LogOut, LogIn, Crown, Map, ChevronRight, CheckCircle
} from 'lucide-react';
import { AppState, Match, MatchType, MatchEvent, Person } from '../types';
import { generateUUID, supabase } from '../App';
import ClubLogo from './ClubLogo';

interface MatchPlannerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  defaultSelectedId?: string | null;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const MatchPlanner: React.FC<MatchPlannerProps> = ({ state, setState, defaultSelectedId, addLog }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  const isManager = currentUser?.role === 'مدير';
  const isViewer = currentUser?.role === 'مشاهد';
  const isCatAdmin = currentUser?.role === 'إداري فئة';

  const [formData, setFormData] = useState<Partial<Match>>({ 
    matchType: 'دوري', 
    category: restrictedCat || (state.globalCategoryFilter === 'الكل' ? state.categories[0] : state.globalCategoryFilter),
    pitch: 'ملعب الكرامة'
  });

  const matchTypes: MatchType[] = ['دوري', 'كأس', 'ودية', 'بطولة ودية', 'مباراة دولية'];

  useEffect(() => {
    if (isAddOpen) {
      setFormData(prev => ({
        ...prev,
        category: restrictedCat || (state.globalCategoryFilter === 'الكل' ? state.categories[0] : state.globalCategoryFilter)
      }));
    }
  }, [isAddOpen, state.globalCategoryFilter, state.categories, restrictedCat]);

  // تحديث تلقائي لدقائق اللاعبين عند تغيير الوقت الضائع لتجنب الخطأ اليدوي
  useEffect(() => {
    if (activeMatch && !isViewer) {
      const newLineup = { ...activeMatch.lineup };
      let hasChanged = false;
      const st1 = parseInt(activeMatch.stoppageTime1 || '0') || 0;
      const st2 = parseInt(activeMatch.stoppageTime2 || '0') || 0;

      // تحديث دقائق الأساسيين والبدلاء بناءً على الوقت الضائع الجديد
      newLineup.subs.forEach((s, idx) => {
        if (s.substitutionMinute && s.replacedPlayerId) {
          const minute = parseInt(s.substitutionMinute) || 0;
          let subMins = 0;
          if (minute <= 45) {
            subMins = (45 - minute) + st1 + 45 + st2;
          } else {
            subMins = (90 - minute) + st2;
          }
          if (s.minutesPlayed !== subMins.toString()) {
            s.minutesPlayed = subMins.toString();
            hasChanged = true;
          }

          // تحديث اللاعب المستبدل أيضاً
          const starterIdx = newLineup.starters.findIndex(st => st.playerId === s.replacedPlayerId);
          if (starterIdx !== -1) {
            let stMins = 0;
            if (minute <= 45) {
              stMins = minute;
            } else {
              stMins = 45 + st1 + (minute - 45);
            }
            if (newLineup.starters[starterIdx].minutesPlayed !== stMins.toString()) {
              newLineup.starters[starterIdx].minutesPlayed = stMins.toString();
              hasChanged = true;
            }
          }
        }
      });

      if (hasChanged) {
        setActiveMatch(prev => prev ? { ...prev, lineup: newLineup } : null);
      }
    }
  }, [activeMatch?.stoppageTime1, activeMatch?.stoppageTime2]);

  // تقييد العرض بناءً على الفئة لإداري الفئة
  const filteredMatches = useMemo(() => {
    return state.matches.filter(m => {
      if (restrictedCat) return m.category === restrictedCat;
      return (state.globalCategoryFilter === 'الكل' || m.category === state.globalCategoryFilter);
    }).sort((a,b) => b.date.localeCompare(a.date));
  }, [state.matches, state.globalCategoryFilter, restrictedCat]);

  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    
    // منع إداري الفئة من تجاوز فئته المخصصة
    const finalCategory = restrictedCat || formData.category;
    if (!formData.opponent || !formData.date || !formData.time || !finalCategory) return;

    const newMatch: Match = {
      id: generateUUID(),
      matchType: (formData.matchType as MatchType) || 'دوري',
      opponent: formData.opponent,
      pitch: formData.pitch || 'ملعب الكرامة',
      date: formData.date,
      time: formData.time,
      category: finalCategory,
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

    setState(p => ({ ...p, matches: [newMatch, ...p.matches] }));
    addLog?.('جدولة مباراة', `تمت جدولة مواجهة ${newMatch.matchType} ضد ${newMatch.opponent}`, 'success');
    setIsAddOpen(false);
  };

  const toggleMatchComplete = (id: string, currentStatus: boolean) => {
    if (isViewer) return;
    setState(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === id ? { ...m, isCompleted: !currentStatus } : m)
    }));
    addLog?.('تحديث حالة مباراة', currentStatus ? 'تم إعادة فتح المباراة' : 'تم تأشير المباراة كمنتهية', 'info');
  };

  const updateActiveMatchLineup = (index: number, playerId: string, isStarter: boolean) => {
    if (!activeMatch || isViewer) return;
    const person = state.people.find(p => p.id === playerId);
    if (!person) return;

    const newLineup = { ...activeMatch.lineup };
    if (isStarter) {
      newLineup.starters[index] = { ...newLineup.starters[index], playerId: person.id, name: person.name, number: person.number?.toString() || '' };
    }
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const toggleCaptain = (playerId: string) => {
    if (!activeMatch || !playerId || isViewer) return;
    const newLineup = { ...activeMatch.lineup };
    newLineup.captain = newLineup.captain === playerId ? '' : playerId;
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const updateMinutes = (index: number, minutes: string, isStarter: boolean) => {
    if (!activeMatch || isViewer) return;
    const newLineup = { ...activeMatch.lineup };
    if (isStarter) {
      newLineup.starters[index].minutesPlayed = minutes;
    } else {
      newLineup.subs[index].minutesPlayed = minutes;
    }
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const handleSubstitutionCalculation = (subIndex: number, replacedPlayerId: string, subMinute: string) => {
    if (!activeMatch || isViewer) return;
    const newLineup = { ...activeMatch.lineup };
    const minute = parseInt(subMinute) || 0;
    const st1 = parseInt(activeMatch.stoppageTime1 || '0') || 0;
    const st2 = parseInt(activeMatch.stoppageTime2 || '0') || 0;

    const starterIdx = newLineup.starters.findIndex(s => s.playerId === replacedPlayerId);
    if (starterIdx !== -1) {
      if (minute <= 45) {
        newLineup.starters[starterIdx].minutesPlayed = minute.toString();
      } else {
        const starterMins = 45 + st1 + (minute - 45);
        newLineup.starters[starterIdx].minutesPlayed = starterMins.toString();
      }
    }

    let subMins = 0;
    if (minute <= 45) {
      subMins = (45 - minute) + st1 + 45 + st2;
    } else {
      subMins = (90 - minute) + st2;
    }
    
    newLineup.subs[subIndex].replacedPlayerId = replacedPlayerId;
    newLineup.subs[subIndex].substitutionMinute = subMinute;
    newLineup.subs[subIndex].minutesPlayed = subMins.toString();

    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const addSub = () => {
    if (!activeMatch || isViewer) return;
    setActiveMatch({
      ...activeMatch,
      lineup: {
        ...activeMatch.lineup,
        subs: [...activeMatch.lineup.subs, { playerId: '', name: '', number: '', minutesPlayed: '0', substitutionMinute: '', replacedPlayerId: '' }]
      }
    });
  };

  const updateSub = (index: number, playerId: string) => {
    if (!activeMatch || isViewer) return;
    const person = state.people.find(p => p.id === playerId);
    if (!person) return;

    const newSubs = [...activeMatch.lineup.subs];
    newSubs[index] = { ...newSubs[index], playerId: person.id, name: person.name, number: person.number?.toString() || '' };
    setActiveMatch({ ...activeMatch, lineup: { ...activeMatch.lineup, subs: newSubs } });
  };

  const removeSub = (index: number) => {
    if (!activeMatch || isViewer) return;
    const newSubs = activeMatch.lineup.subs.filter((_, i) => i !== index);
    setActiveMatch({ ...activeMatch, lineup: { ...activeMatch.lineup, subs: newSubs } });
  };

  const addEvent = (type: MatchEvent['type']) => {
    if (!activeMatch || isViewer) return;
    const newEvent: MatchEvent = {
      id: generateUUID(),
      type,
      player: '',
      minute: '',
      note: ''
    };
    setActiveMatch({ ...activeMatch, events: [...activeMatch.events, newEvent] });
  };

  const removeEvent = (eventId: string) => {
    if (!activeMatch || isViewer) return;
    setActiveMatch({
      ...activeMatch,
      events: activeMatch.events.filter(e => e.id !== eventId)
    });
  };

  const saveMatchDetails = () => {
    if (!activeMatch || isViewer) return;
    setState(p => ({
      ...p,
      matches: p.matches.map(m => m.id === activeMatch.id ? activeMatch : m)
    }));
    addLog?.('تحديث المباراة', `تم حفظ تفاصيل مباراة ${activeMatch.opponent}`, 'info');
    setActiveMatch(null);
  };

  const getAvailablePlayers = (currentId: string) => {
    const selectedIds = [
      ...activeMatch!.lineup.starters.map(s => s.playerId),
      ...activeMatch!.lineup.subs.map(s => s.playerId)
    ].filter(id => id && id !== currentId);
    
    return state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch?.category && !selectedIds.includes(p.id));
  };

  const fieldClass = "w-full bg-slate-50 border-2 border-slate-900 rounded-xl py-3 px-4 font-black text-slate-900 outline-none focus:border-orange-600 transition-all text-sm";
  const labelClass = "text-[10px] font-black text-[#001F3F] mr-2 uppercase block mb-1.5";

  if (showPrintView) {
    return (
      <div className="fixed inset-0 bg-white z-[500] overflow-y-auto p-12 text-right dir-rtl">
        <div className="max-w-5xl mx-auto border-4 border-slate-900 p-12 print:border-2">
           <div className="no-print flex justify-between items-center mb-10 border-b pb-4">
              <button onClick={() => setShowPrintView(false)} className="flex items-center gap-2 font-black text-slate-500"><ChevronRight/> العودة للأجندة</button>
              <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-xl"><Printer size={18}/> طباعة PDF</button>
           </div>

           <div className="flex justify-between items-center border-b-4 border-slate-900 pb-8 mb-10">
              <div className="flex items-center gap-4">
                 <ClubLogo size={90} />
                 <div>
                    <h2 className="text-3xl font-black text-[#001F3F]">نادي الكرامة الرياضي</h2>
                    <p className="text-md font-black text-orange-600 uppercase">مكتب كرة القدم المركزي</p>
                 </div>
              </div>
           </div>

           <table className="w-full text-right border-collapse">
              <thead>
                 <tr className="bg-slate-100 border-y-2 border-slate-900 text-xs font-black">
                    <th className="p-4 border-l">التاريخ</th>
                    <th className="p-4 border-l">المنافس</th>
                    <th className="p-4 border-l text-center">النتيجة</th>
                    <th className="p-4">الملعب</th>
                 </tr>
              </thead>
              <tbody>
                 {filteredMatches.map(m => (
                    <tr key={m.id} className="border-b border-slate-200 text-sm font-black">
                       <td className="p-4 border-l">{m.date} - {m.time}</td>
                       <td className="p-4 border-l">{m.opponent}</td>
                       <td className="p-4 border-l text-center">{m.isCompleted ? `${m.ourScore} - ${m.opponentScore}` : 'لم تلعب'}</td>
                       <td className="p-4">{m.pitch}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center no-print gap-4">
        <div>
           <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
             <Trophy size={24} className="text-orange-600" /> إدارة أجندة المباريات المركزية
           </h2>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowPrintView(true)} className="bg-white text-slate-900 border-2 border-slate-900 px-6 py-3 rounded-xl font-black text-sm">طباعة الأجندة</button>
          {!isViewer && <button onClick={() => setIsAddOpen(true)} className="bg-[#001F3F] text-white px-8 py-3 rounded-xl font-black text-sm">جدولة مواجهة</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {filteredMatches.map(m => (
          <div key={m.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-900 relative border-b-8 transition-all ${m.isCompleted ? 'border-emerald-600' : 'hover:border-orange-600'}`}>
             <div className="flex justify-between items-start mb-6">
                <span className="bg-orange-600 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase">{m.matchType}</span>
                <span className="text-[10px] font-black text-slate-400">{m.date} - {m.category}</span>
             </div>
             <div className="text-center mb-6">
                <p className="text-3xl font-black">{m.ourScore} - {m.opponentScore}</p>
                <p className="text-sm font-black mt-2">{m.opponent}</p>
                <p className="text-[10px] font-black text-slate-400 mt-2 flex items-center justify-center gap-1"><MapPin size={10}/> {m.pitch}</p>
             </div>
             <div className="flex flex-col gap-2">
                <button onClick={() => setActiveMatch(m)} className="w-full bg-[#001F3F] text-white py-3 rounded-xl font-black text-xs">التشكيل والتقرير</button>
                {!isViewer && (isManager || restrictedCat === m.category) && (
                  <button onClick={async () => { if(confirm('حذف المباراة؟')) { await supabase.from('matches').delete().eq('id', m.id); setState(p => ({...p, matches: p.matches.filter(x => x.id !== m.id)})); } }} className="w-full py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] border border-red-200">حذف المباراة</button>
                )}
             </div>
          </div>
        ))}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[300] p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg border-[6px] border-slate-900">
             <div className="p-6 bg-slate-100 border-b-2 border-slate-900 flex justify-between items-center">
                <h3 className="font-black">جدولة مباراة</h3>
                <button onClick={() => setIsAddOpen(false)} className="bg-white p-2 rounded-lg border-2 border-slate-900"><X size={20}/></button>
             </div>
             <form onSubmit={handleAddMatch} className="p-8 space-y-5">
                <div>
                  <label className={labelClass}>الفئة</label>
                  <select 
                    disabled={!!restrictedCat}
                    className={fieldClass} 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                  >
                    {state.categories.filter(c => !restrictedCat || c === restrictedCat).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>الخصم</label><input required type="text" className={fieldClass} value={formData.opponent || ''} onChange={e => setFormData({...formData, opponent: e.target.value})} /></div>
                <div><label className={labelClass}>الملعب</label><input type="text" className={fieldClass} value={formData.pitch || ''} onChange={e => setFormData({...formData, pitch: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                   <input required type="date" className={fieldClass} value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                   <input required type="time" className={fieldClass} value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-[#001F3F] text-white py-4 rounded-xl font-black">حفظ الموعد</button>
             </form>
          </div>
        </div>
      )}

      {activeMatch && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[400] overflow-y-auto p-4 lg:p-10 no-print">
           <div className="max-w-6xl mx-auto bg-white rounded-[3rem] border-[8px] border-slate-900 p-8 shadow-2xl">
              <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b-4 pb-6 gap-4">
                 <div className="flex items-center gap-4">
                   <div className="bg-[#001F3F] text-white w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl border-4 border-slate-900 shadow-md">K</div>
                   <h2 className="text-2xl font-black">نادي الكرامة × {activeMatch.opponent}</h2>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={saveMatchDetails} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black border-b-4 border-black hover:bg-emerald-700 transition-all">حفظ التقرير</button>
                    <button onClick={() => setActiveMatch(null)} className="bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-black border-2 border-slate-300 hover:bg-white transition-all">إغلاق</button>
                 </div>
              </header>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-2 space-y-10">
                    <section>
                       <h3 className="text-lg font-black mb-6 border-r-4 border-orange-600 pr-4">التشكيلة الأساسية</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeMatch.lineup.starters.map((s, idx) => (
                             <div key={idx} className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                   <span className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-xs">{idx + 1}</span>
                                   <select className="flex-1 bg-white border-2 border-slate-300 rounded-lg p-2 font-black text-xs" value={s.playerId} onChange={e => updateActiveMatchLineup(idx, e.target.value, true)}>
                                      <option value="">-- لاعب --</option>
                                      {getAvailablePlayers(s.playerId).map(p => <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>)}
                                   </select>
                                   <button type="button" onClick={() => toggleCaptain(s.playerId)} className={`p-2 rounded-lg border-2 ${activeMatch.lineup.captain === s.playerId ? 'bg-orange-600 text-white border-orange-900 shadow-md' : 'bg-white text-slate-300'}`}><Crown size={16}/></button>
                                </div>
                                <div className="flex items-center gap-2">
                                   <label className="text-[9px] font-black text-slate-400 uppercase">دقائق اللعب:</label>
                                   <input type="number" className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-black" value={s.minutesPlayed || '90'} onChange={e => updateMinutes(idx, e.target.value, true)} />
                                </div>
                             </div>
                          ))}
                       </div>
                    </section>

                    <section>
                       <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-black border-r-4 border-blue-900 pr-4">التبديلات (حساب الدقائق التلقائي)</h3>
                          <button onClick={addSub} className="bg-blue-900 text-white px-4 py-2 rounded-lg font-black text-xs flex items-center gap-2">+ إضافة تبديل</button>
                       </div>
                       <div className="space-y-4">
                          {activeMatch.lineup.subs.map((s, idx) => (
                             <div key={idx} className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                                <div>
                                   <label className="text-[9px] font-black text-blue-900 mb-1 block">اللاعب البديل (الداخل)</label>
                                   <select className="w-full bg-white border-2 border-slate-300 rounded-lg p-3 font-black text-xs" value={s.playerId} onChange={e => updateSub(idx, e.target.value)}>
                                      <option value="">-- اختر لاعب --</option>
                                      {getAvailablePlayers(s.playerId).map(p => <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>)}
                                   </select>
                                </div>
                                <div>
                                   <label className="text-[9px] font-black text-red-600 mb-1 block">اللاعب المستبدل (الخارج)</label>
                                   <select className="w-full bg-white border-2 border-slate-300 rounded-lg p-3 font-black text-xs" value={s.replacedPlayerId || ''} onChange={e => handleSubstitutionCalculation(idx, e.target.value, s.substitutionMinute || '0')}>
                                      <option value="">-- اختر الخارج --</option>
                                      {activeMatch.lineup.starters.map(st => <option key={st.playerId} value={st.playerId}>{st.name} (#{st.number})</option>)}
                                   </select>
                                </div>
                                <div>
                                   <label className="text-[9px] font-black text-slate-500 mb-1 block">دقيقة التبديل</label>
                                   <div className="flex gap-2">
                                      <input type="number" className="w-full bg-white border-2 border-slate-300 rounded-lg p-3 font-black text-center" value={s.substitutionMinute || ''} onChange={e => handleSubstitutionCalculation(idx, s.replacedPlayerId || '', e.target.value)} />
                                      <div className="bg-emerald-600 text-white p-3 rounded-lg flex items-center justify-center font-black text-xs shadow-md shrink-0">
                                         {s.minutesPlayed} د
                                      </div>
                                   </div>
                                </div>
                                <button onClick={() => removeSub(idx)} className="absolute -top-3 -left-3 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-black transition-all"><X size={14}/></button>
                             </div>
                          ))}
                       </div>
                    </section>
                 </div>

                 <div className="space-y-6">
                    <section className="bg-slate-900 text-white p-8 rounded-[2rem] border-4 border-orange-600">
                       <h3 className="font-black text-center text-orange-400 mb-6 uppercase tracking-widest">النتيجة والوقت المضاف</h3>
                       <div className="flex justify-center items-center gap-4 mb-8">
                          <input type="number" className="w-20 h-20 bg-white text-slate-900 rounded-2xl text-center font-black text-4xl border-4 border-orange-600 shadow-xl" value={activeMatch.ourScore} onChange={e => setActiveMatch({...activeMatch, ourScore: e.target.value})} />
                          <span className="text-4xl font-black mt-2">:</span>
                          <input type="number" className="w-20 h-20 bg-white text-slate-900 rounded-2xl text-center font-black text-4xl border-4 border-slate-300 shadow-xl" value={activeMatch.opponentScore} onChange={e => setActiveMatch({...activeMatch, opponentScore: e.target.value})} />
                       </div>
                       
                       <div className="space-y-4 pt-6 border-t border-white/10">
                          <div>
                             <label className="text-[9px] font-black text-white/50 block mb-1 uppercase tracking-tighter">وقت بدل ضائع (شوط أول)</label>
                             <input type="number" className="w-full bg-white/10 border-2 border-white/20 rounded-xl py-2 px-4 text-white font-black text-center" value={activeMatch.stoppageTime1 || '0'} onChange={e => setActiveMatch({...activeMatch, stoppageTime1: e.target.value})} />
                          </div>
                          <div>
                             <label className="text-[9px] font-black text-white/50 block mb-1 uppercase tracking-tighter">وقت بدل ضائع (شوط ثاني)</label>
                             <input type="number" className="w-full bg-white/10 border-2 border-white/20 rounded-xl py-2 px-4 text-white font-black text-center" value={activeMatch.stoppageTime2 || '0'} onChange={e => setActiveMatch({...activeMatch, stoppageTime2: e.target.value})} />
                          </div>
                       </div>
                    </section>

                    <section className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200">
                       <h3 className="font-black text-xs mb-4 text-slate-900 uppercase">أحداث المباراة</h3>
                       <div className="grid grid-cols-2 gap-2 mb-4">
                          <button onClick={() => addEvent('goal')} className="bg-emerald-600 text-white p-2 rounded-lg text-[10px] font-black">⚽ هدف</button>
                          <button onClick={() => addEvent('assist')} className="bg-blue-600 text-white p-2 rounded-lg text-[10px] font-black">👟 تمريرة</button>
                          <button onClick={() => addEvent('yellow')} className="bg-yellow-400 text-slate-900 p-2 rounded-lg text-[10px] font-black">🟨 إنذار</button>
                          <button onClick={() => addEvent('red')} className="bg-red-600 text-white p-2 rounded-lg text-[10px] font-black">🟥 طرد</button>
                       </div>
                       <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {activeMatch.events.map((ev, i) => (
                             <div key={ev.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
                                <span className="text-[10px]">{ev.type === 'goal' ? '⚽' : ev.type === 'yellow' ? '🟨' : ev.type === 'red' ? '🟥' : '👟'}</span>
                                <select className="flex-1 text-[9px] font-black bg-slate-50 border p-1 rounded" value={ev.player} onChange={e => {
                                   const evs = [...activeMatch.events];
                                   evs[i].player = e.target.value;
                                   setActiveMatch({...activeMatch, events: evs});
                                }}>
                                   <option value="">-- لاعب --</option>
                                   {state.people.filter(p => p.category === activeMatch.category).map(p => <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>)}
                                </select>
                                <input type="number" className="w-10 text-[9px] font-black border p-1 rounded text-center" value={ev.minute} onChange={e => {
                                   const evs = [...activeMatch.events];
                                   evs[i].minute = e.target.value;
                                   setActiveMatch({...activeMatch, events: evs});
                                }} />
                                <button onClick={() => removeEvent(ev.id)} className="text-red-500"><X size={12}/></button>
                             </div>
                          ))}
                       </div>
                    </section>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MatchPlanner;
