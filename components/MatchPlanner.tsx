
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
  const [formData, setFormData] = useState<Partial<Match>>({ 
    matchType: 'دوري', 
    category: state.globalCategoryFilter === 'الكل' ? state.categories[0] : state.globalCategoryFilter 
  });

  const matchTypes: MatchType[] = ['دوري', 'كأس', 'ودية', 'بطولة ودية', 'مباراة دولية'];

  // Sync formData category when modal opens
  useEffect(() => {
    if (isAddOpen) {
      setFormData(prev => ({
        ...prev,
        category: state.globalCategoryFilter === 'الكل' ? state.categories[0] : state.globalCategoryFilter
      }));
    }
  }, [isAddOpen, state.globalCategoryFilter, state.categories]);

  const filteredMatches = useMemo(() => {
    return state.matches.filter(m => (state.globalCategoryFilter === 'الكل' || m.category === state.globalCategoryFilter))
      .sort((a,b) => b.date.localeCompare(a.date));
  }, [state.matches, state.globalCategoryFilter]);

  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.opponent || !formData.date || !formData.time || !formData.category) return;

    const newMatch: Match = {
      id: generateUUID(),
      matchType: (formData.matchType as MatchType) || 'دوري',
      opponent: formData.opponent,
      pitch: formData.pitch || 'ملعب الكرامة',
      date: formData.date,
      time: formData.time,
      category: formData.category,
      advancePayment: '0',
      isCompleted: false,
      ourScore: '0',
      opponentScore: '0',
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
    setState(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === id ? { ...m, isCompleted: !currentStatus } : m)
    }));
    addLog?.('تحديث حالة مباراة', currentStatus ? 'تم إعادة فتح المباراة' : 'تم تأشير المباراة كمنتهية', 'info');
  };

  const updateActiveMatchLineup = (index: number, playerId: string, isStarter: boolean) => {
    if (!activeMatch) return;
    const person = state.people.find(p => p.id === playerId);
    if (!person) return;

    const newLineup = { ...activeMatch.lineup };
    if (isStarter) {
      newLineup.starters[index] = { ...newLineup.starters[index], playerId: person.id, name: person.name, number: person.number?.toString() || '' };
    }
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const toggleCaptain = (playerId: string) => {
    if (!activeMatch || !playerId) return;
    const newLineup = { ...activeMatch.lineup };
    // إذا كان اللاعب هو الكابتن الحالي، نلغيه، وإلا نجعله الكابتن الجديد
    newLineup.captain = newLineup.captain === playerId ? '' : playerId;
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const updateMinutes = (index: number, minutes: string, isStarter: boolean) => {
    if (!activeMatch) return;
    const newLineup = { ...activeMatch.lineup };
    if (isStarter) {
      newLineup.starters[index].minutesPlayed = minutes;
    } else {
      newLineup.subs[index].minutesPlayed = minutes;
    }
    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const handleSubstitutionCalculation = (subIndex: number, replacedPlayerId: string, subMinute: string) => {
    if (!activeMatch) return;
    const newLineup = { ...activeMatch.lineup };
    const minute = parseInt(subMinute) || 0;
    
    // 1. تحديث بيانات التبديل في البدلاء
    newLineup.subs[subIndex].replacedPlayerId = replacedPlayerId;
    newLineup.subs[subIndex].substitutionMinute = subMinute;
    
    // 2. حساب دقائق اللاعب الداخل (الاحتياطي)
    newLineup.subs[subIndex].minutesPlayed = (90 - minute).toString();
    
    // 3. البحث عن اللاعب الخارج في الأساسيين وتحديث دقائقه
    const starterIdx = newLineup.starters.findIndex(s => s.playerId === replacedPlayerId);
    if (starterIdx !== -1) {
      newLineup.starters[starterIdx].minutesPlayed = subMinute;
    }

    setActiveMatch({ ...activeMatch, lineup: newLineup });
  };

  const addSub = () => {
    if (!activeMatch) return;
    setActiveMatch({
      ...activeMatch,
      lineup: {
        ...activeMatch.lineup,
        subs: [...activeMatch.lineup.subs, { playerId: '', name: '', number: '', minutesPlayed: '0', substitutionMinute: '', replacedPlayerId: '' }]
      }
    });
  };

  const updateSub = (index: number, playerId: string) => {
    if (!activeMatch) return;
    const person = state.people.find(p => p.id === playerId);
    if (!person) return;

    const newSubs = [...activeMatch.lineup.subs];
    newSubs[index] = { ...newSubs[index], playerId: person.id, name: person.name, number: person.number?.toString() || '' };
    setActiveMatch({ ...activeMatch, lineup: { ...activeMatch.lineup, subs: newSubs } });
  };

  const removeSub = (index: number) => {
    if (!activeMatch) return;
    const newSubs = activeMatch.lineup.subs.filter((_, i) => i !== index);
    setActiveMatch({ ...activeMatch, lineup: { ...activeMatch.lineup, subs: newSubs } });
  };

  const addEvent = (type: MatchEvent['type']) => {
    if (!activeMatch) return;
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
    if (!activeMatch) return;
    setActiveMatch({
      ...activeMatch,
      events: activeMatch.events.filter(e => e.id !== eventId)
    });
  };

  const saveMatchDetails = () => {
    if (!activeMatch) return;
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

  // Match Schedule Print Popup
  if (showPrintView) {
    return (
      <div className="fixed inset-0 bg-white z-[500] overflow-y-auto p-12 text-right dir-rtl">
        <div className="max-w-5xl mx-auto border-4 border-slate-900 p-12 print:border-2">
           <div className="no-print flex justify-between items-center mb-10 border-b pb-4">
              <button onClick={() => setShowPrintView(false)} className="flex items-center gap-2 font-black text-slate-500"><ChevronRight/> العودة للأجندة</button>
              <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-xl"><Printer size={18}/> طباعة الأجندة PDF</button>
           </div>

           <div className="flex justify-between items-center border-b-4 border-slate-900 pb-8 mb-10">
              <div className="flex items-center gap-4">
                 <ClubLogo size={90} />
                 <div>
                    <h2 className="text-3xl font-black text-[#001F3F]">نادي الكرامة الرياضي</h2>
                    <p className="text-md font-black text-orange-600 uppercase">مكتب كرة القدم المركزي</p>
                 </div>
              </div>
              <div className="text-left font-black">
                 <p className="text-2xl uppercase">أجندة المباريات والنتائج</p>
                 <p className="text-sm text-slate-500">الفئة: {state.globalCategoryFilter}</p>
                 <p className="text-[10px] mt-1">تاريخ التقرير: {new Date().toLocaleDateString('ar-SY')}</p>
              </div>
           </div>

           <table className="w-full text-right border-collapse">
              <thead>
                 <tr className="bg-slate-100 border-y-2 border-slate-900 text-xs font-black">
                    <th className="p-4 border-l border-slate-300">التاريخ</th>
                    <th className="p-4 border-l border-slate-300">المنافس</th>
                    <th className="p-4 border-l border-slate-300 text-center">النوع</th>
                    <th className="p-4 border-l border-slate-300 text-center">النتيجة</th>
                    <th className="p-4">الملعب</th>
                 </tr>
              </thead>
              <tbody>
                 {filteredMatches.map(m => (
                    <tr key={m.id} className="border-b border-slate-200 text-sm font-black">
                       <td className="p-4 border-l border-slate-200">{m.date} - {m.time}</td>
                       <td className="p-4 border-l border-slate-200">{m.opponent}</td>
                       <td className="p-4 border-l border-slate-200 text-center text-[10px]">{m.matchType}</td>
                       <td className="p-4 border-l border-slate-200 text-center bg-slate-50">
                          {m.isCompleted ? `${m.ourScore} - ${m.opponentScore}` : 'لم تلعب'}
                       </td>
                       <td className="p-4 text-xs italic text-slate-500">{m.pitch || 'غير محدد'}</td>
                    </tr>
                 ))}
              </tbody>
           </table>

           <div className="mt-24 flex justify-around items-start opacity-0 print:opacity-100">
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">توقيع مدرب الفئة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">مدير مكتب كرة القدم</p>
                 <p className="font-black text-xs text-blue-900">عزت عامر الشيخة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
           </div>
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
           <p className="text-[10px] font-black text-slate-400 mt-1">تنسيق التشكيلة، دقائق اللعب، الأهداف، والبطاقات للفئات</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              if (state.globalCategoryFilter === 'الكل') return alert("يرجى اختيار فئة محددة أولاً لطباعة الأجندة.");
              setShowPrintView(true);
            }} 
            className="bg-white text-slate-900 border-2 border-slate-900 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Printer size={18}/> طباعة الأجندة
          </button>
          <button onClick={() => setIsAddOpen(true)} className="bg-[#001F3F] text-white px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg border-b-4 border-black hover:bg-black transition-all">
            <Plus size={20} /> جدولة مواجهة جديدة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {filteredMatches.map(m => (
          <div key={m.id} className={`bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-900 relative group overflow-hidden border-b-8 transition-all ${m.isCompleted ? 'border-emerald-600' : 'hover:border-orange-600'}`}>
             <div className="flex justify-between items-start mb-6">
                <div className="flex gap-1">
                   <span className="bg-orange-600 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase">{m.matchType}</span>
                   {m.isCompleted && <span className="bg-emerald-600 text-white text-[9px] font-black px-3 py-1 rounded-lg uppercase flex items-center gap-1"><CheckCircle size={10}/> منتهية</span>}
                </div>
                <span className="text-[10px] font-black text-slate-400 flex items-center gap-1"><Calendar size={12}/> {m.date} - {m.category}</span>
             </div>
             
             <div className="flex items-center justify-between gap-4 mb-4">
                <div className="text-center flex-1">
                   <div className="w-14 h-14 bg-slate-100 border-2 border-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-2 font-black text-xl">K</div>
                   <p className="font-black text-xs">الكرامة</p>
                </div>
                <div className="text-center px-4">
                   <p className="text-3xl font-black text-slate-900">{m.ourScore} - {m.opponentScore}</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase mt-2">{m.time}</p>
                </div>
                <div className="text-center flex-1">
                   <div className="w-14 h-14 bg-slate-100 border-2 border-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-2 font-black text-xl">{m.opponent.charAt(0)}</div>
                   <p className="font-black text-xs truncate max-w-[80px]">{m.opponent}</p>
                </div>
             </div>

             <div className="mb-6 flex flex-col gap-1 px-2">
                {m.pitch && (
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500">
                     <Map size={12} className="text-emerald-600" /> {m.pitch}
                  </div>
                )}
             </div>

             <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={() => setActiveMatch(m)} className="flex-1 bg-[#001F3F] text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-black transition-all">
                    <BookOpen size={16}/> التشكيل والتقرير
                  </button>
                  <button onClick={async () => { if(confirm('حذف المباراة؟')) { await supabase.from('matches').delete().eq('id', m.id); setState(p => ({...p, matches: p.matches.filter(x => x.id !== m.id)})); } }} className="p-3 bg-red-50 text-red-600 rounded-xl border-2 border-red-900 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={16}/></button>
                </div>
                <button 
                  onClick={() => toggleMatchComplete(m.id, !!m.isCompleted)}
                  className={`w-full py-2.5 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 border-2 transition-all ${m.isCompleted ? 'bg-emerald-50 border-emerald-600 text-emerald-700' : 'bg-slate-100 border-slate-900 text-slate-900 hover:bg-emerald-50'}`}
                >
                  <CheckCircle size={14}/> {m.isCompleted ? 'إعادة فتح المباراة' : 'إنهاء المباراة (إخفاء من اللوحة)'}
                </button>
             </div>
          </div>
        ))}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-[#001F3F]/95 backdrop-blur-md flex items-center justify-center z-[300] p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border-[6px] border-slate-900 overflow-hidden">
             <div className="p-6 bg-slate-100 border-b-2 border-slate-900 flex justify-between items-center">
                <h3 className="font-black text-slate-900 uppercase">جدولة مواجهة جديدة</h3>
                <button onClick={() => setIsAddOpen(false)} className="bg-white p-2 rounded-lg border-2 border-slate-900"><X size={20}/></button>
             </div>
             <form onSubmit={handleAddMatch} className="p-8 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className={labelClass}>الفئة</label>
                      <select required className={fieldClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                   </div>
                   <div>
                      <label className={labelClass}>نوع المباراة</label>
                      <select required className={fieldClass} value={formData.matchType} onChange={e => setFormData({...formData, matchType: e.target.value as MatchType})}>
                        {matchTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                </div>
                <div>
                   <label className={labelClass}>اسم الخصم</label>
                   <input required type="text" className={fieldClass} value={formData.opponent || ''} onChange={e => setFormData({...formData, opponent: e.target.value})} />
                </div>
                <div>
                   <label className={labelClass}>الملعب</label>
                   <input type="text" className={fieldClass} value={formData.pitch || ''} onChange={e => setFormData({...formData, pitch: e.target.value})} placeholder="مثلاً: ملعب الباسل.." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className={labelClass}>التاريخ</label>
                      <input required type="date" className={fieldClass} value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                   </div>
                   <div>
                      <label className={labelClass}>التوقيت</label>
                      <input required type="time" className={fieldClass} value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} />
                   </div>
                </div>
                <button type="submit" className="w-full bg-[#001F3F] text-white py-4 rounded-xl font-black shadow-xl hover:bg-black transition-all mt-4 uppercase">تثبيت الجدولة المركزية</button>
             </form>
          </div>
        </div>
      )}

      {activeMatch && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[400] overflow-y-auto custom-scrollbar p-4 lg:p-10 no-print">
           <div className="max-w-6xl mx-auto bg-white rounded-[3rem] border-[8px] border-slate-900 min-h-screen flex flex-col shadow-2xl">
              <header className="p-8 border-b-4 border-slate-900 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div className="flex items-center gap-4">
                    <div className="bg-[#001F3F] text-white w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl border-4 border-slate-900">K</div>
                    <div>
                       <h2 className="text-2xl font-black text-slate-900">إدارة تفاصيل المباراة والتشكيل</h2>
                       <p className="text-sm font-black text-orange-600 tracking-widest uppercase">نادي الكرامة × {activeMatch.opponent} ({activeMatch.matchType}) {activeMatch.pitch ? `| ${activeMatch.pitch}` : ''}</p>
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={saveMatchDetails} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 border-b-4 border-black hover:bg-emerald-700">
                       <Save size={20}/> حفظ التغييرات والتشكيل
                    </button>
                    <button onClick={() => setActiveMatch(null)} className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-black border-2 border-red-900">
                       إلغاء التعديل
                    </button>
                 </div>
              </header>

              <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-2 space-y-10">
                    <section>
                       <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3 border-r-4 border-orange-600 pr-4">
                          <Users size={22}/> التشكيل الأساسي واختيار القائد
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeMatch.lineup.starters.map((s, idx) => {
                             const isCaptain = activeMatch.lineup.captain === s.playerId;
                             return (
                             <div key={idx} className={`flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border-2 transition-all ${isCaptain ? 'border-orange-600 bg-orange-50/50 shadow-md ring-2 ring-orange-100' : 'border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                   <span className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</span>
                                   <select 
                                     className="flex-1 bg-white border-2 border-slate-300 rounded-lg p-2 font-black text-xs outline-none focus:border-blue-600"
                                     value={s.playerId}
                                     onChange={e => updateActiveMatchLineup(idx, e.target.value, true)}
                                   >
                                      <option value="">-- اختر اللاعب --</option>
                                      {getAvailablePlayers(s.playerId).map(p => (
                                         <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                      ))}
                                   </select>
                                   <div className="w-12 text-center bg-[#001F3F] text-white border-2 border-slate-900 rounded-lg p-2 font-black text-xs">
                                      #{s.number || '--'}
                                   </div>
                                   <button 
                                     type="button"
                                     onClick={() => toggleCaptain(s.playerId)}
                                     title={isCaptain ? "إلغاء شارة الكابتن" : "تعيين ككابتن للفريق"}
                                     disabled={!s.playerId}
                                     className={`p-2 rounded-lg border-2 transition-all ${isCaptain ? 'bg-orange-600 text-white border-orange-900 scale-110' : 'bg-white text-slate-300 border-slate-200 hover:text-orange-600 hover:border-orange-600 disabled:opacity-30'}`}
                                   >
                                      <Crown size={18} />
                                   </button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                     <Timer size={14} className="text-slate-400" />
                                     <label className="text-[9px] font-black text-slate-500 uppercase">دقائق اللعب النهائية:</label>
                                     <input 
                                       type="number" 
                                       className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-[10px] font-black outline-none" 
                                       value={s.minutesPlayed || '90'} 
                                       onChange={e => updateMinutes(idx, e.target.value, true)} 
                                     />
                                  </div>
                                  {isCaptain && (
                                     <div className="flex items-center gap-1">
                                        <Crown size={12} className="text-orange-600 fill-orange-600" />
                                        <span className="text-[9px] font-black text-orange-600 bg-white px-2 py-0.5 rounded border border-orange-600 uppercase">قائد الفريق</span>
                                     </div>
                                  )}
                                </div>
                             </div>
                          )})}
                       </div>
                    </section>

                    <section>
                       <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-black text-slate-900 flex items-center gap-3 border-r-4 border-blue-900 pr-4">
                             <UserPlus size={22}/> التبديلات وحساب الدقائق الذكي
                          </h3>
                          <button onClick={addSub} className="bg-blue-900 text-white px-4 py-2 rounded-lg font-black text-xs flex items-center gap-2 shadow-md">
                             <Plus size={16}/> إضافة تبديل جديد
                          </button>
                       </div>
                       <div className="space-y-4">
                          {activeMatch.lineup.subs.map((s, idx) => (
                             <div key={idx} className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-100 shadow-sm space-y-4 relative group">
                                <div className="flex items-center gap-4">
                                   <div className="flex-1">
                                      <label className="text-[9px] font-black text-blue-900 mb-1 block uppercase">اللاعب البديل (الداخل)</label>
                                      <select 
                                        className="w-full bg-white border-2 border-slate-300 rounded-lg p-3 font-black text-xs shadow-sm"
                                        value={s.playerId}
                                        onChange={e => updateSub(idx, e.target.value)}
                                      >
                                         <option value="">-- اختر البديل --</option>
                                         {getAvailablePlayers(s.playerId).map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>
                                         ))}
                                      </select>
                                   </div>
                                   <div className="w-16 h-16 bg-white border-2 border-blue-900 rounded-2xl flex items-center justify-center font-black text-xl text-blue-900 shadow-inner shrink-0 mt-4">
                                      #{s.number || '--'}
                                   </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/60 p-4 rounded-2xl border border-white">
                                   <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-500 flex items-center gap-1 uppercase">
                                        <LogOut size={12} className="text-red-500" /> اللاعب المستبدل (الخارج)
                                      </label>
                                      <select 
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-black"
                                        value={s.replacedPlayerId || ''}
                                        onChange={e => handleSubstitutionCalculation(idx, e.target.value, s.substitutionMinute || '0')}
                                      >
                                         <option value="">-- اختر اللاعب الخارج --</option>
                                         {activeMatch.lineup.starters.map(starter => (
                                            <option key={starter.playerId} value={starter.playerId}>{starter.name || 'لاعب فارغ'} (#{starter.number})</option>
                                         ))}
                                      </select>
                                   </div>
                                   <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-500 flex items-center gap-1 uppercase">
                                        <Clock size={12} className="text-orange-600" /> وقت التبديل (الدقيقة)
                                      </label>
                                      <input 
                                        type="number" 
                                        placeholder="0"
                                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-black text-center"
                                        value={s.substitutionMinute || ''}
                                        onChange={e => handleSubstitutionCalculation(idx, s.replacedPlayerId || '', e.target.value)}
                                      />
                                   </div>
                                   <div className="space-y-1">
                                      <label className="text-[9px] font-black text-emerald-600 flex items-center gap-1 uppercase">
                                        <Timer size={12} /> دقائق اللعب المحسوبة
                                      </label>
                                      <div className="w-full bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-[10px] font-black text-center text-emerald-700">
                                         {s.minutesPlayed} دقيقة لعب
                                      </div>
                                   </div>
                                </div>
                                
                                <button 
                                  onClick={() => removeSub(idx)} 
                                  className="absolute top-2 left-2 p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={16}/>
                                </button>
                             </div>
                          ))}
                       </div>
                       {activeMatch.lineup.subs.length === 0 && <p className="text-center py-12 text-slate-300 italic font-black text-xs border-2 border-dashed border-slate-100 rounded-[2.5rem]">لا يوجد تبديلات مسجلة لهذه المباراة</p>}
                    </section>
                 </div>

                 <div className="space-y-10">
                    <section className="bg-slate-900 text-white p-8 rounded-[2rem] border-4 border-orange-600 shadow-xl">
                       <div className="flex justify-between items-center mb-6">
                          <h3 className="font-black text-sm uppercase tracking-widest text-orange-400">النتيجة والتحكم</h3>
                          {activeMatch.isCompleted && <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">منتهية</span>}
                       </div>
                       <div className="flex items-center justify-center gap-6">
                          <div className="text-center">
                            <label className="text-[9px] font-black uppercase mb-1 block">الكرامة</label>
                            <input type="number" className="w-20 h-20 bg-white text-slate-900 rounded-2xl text-center font-black text-4xl border-4 border-orange-600 outline-none" 
                              value={activeMatch.ourScore} onChange={e => setActiveMatch({...activeMatch, ourScore: e.target.value})} />
                          </div>
                          <span className="text-4xl font-black mt-4">:</span>
                          <div className="text-center">
                            <label className="text-[9px] font-black uppercase mb-1 block">الخصم</label>
                            <input type="number" className="w-20 h-20 bg-white text-slate-900 rounded-2xl text-center font-black text-4xl border-4 border-slate-300 outline-none" 
                              value={activeMatch.opponentScore} onChange={e => setActiveMatch({...activeMatch, opponentScore: e.target.value})} />
                          </div>
                       </div>
                       <div className="mt-8">
                          <label className="flex items-center gap-3 cursor-pointer justify-center bg-white/10 p-4 rounded-xl border border-white/5 hover:bg-white/20 transition-all">
                             <input type="checkbox" className="w-5 h-5 accent-orange-600" checked={activeMatch.isCompleted} onChange={e => setActiveMatch({...activeMatch, isCompleted: e.target.checked})} />
                             <span className="font-black text-xs uppercase">تم تأكيد انتهاء المباراة</span>
                          </label>
                       </div>
                    </section>

                    <section className="space-y-4">
                       <h3 className="text-md font-black text-slate-900 flex items-center gap-2 border-r-4 border-orange-600 pr-3">
                          <Target size={20} className="text-orange-600"/> أحداث المباراة المسجلة
                       </h3>
                       <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => addEvent('goal')} className="bg-emerald-50 text-emerald-700 p-3 rounded-xl font-black text-[10px] border-2 border-emerald-200 hover:bg-emerald-100 uppercase transition-all shadow-sm">⚽ تسجيل هدف</button>
                          <button onClick={() => addEvent('assist')} className="bg-blue-50 text-blue-700 p-3 rounded-xl font-black text-[10px] border-2 border-blue-200 hover:bg-blue-100 uppercase transition-all shadow-sm">👟 صناعة هدف</button>
                          <button onClick={() => addEvent('yellow')} className="bg-yellow-50 text-yellow-700 p-3 rounded-xl font-black text-[10px] border-2 border-yellow-200 hover:bg-yellow-100 uppercase transition-all shadow-sm">🟨 بطاقة صفراء</button>
                          <button onClick={() => addEvent('red')} className="bg-red-50 text-red-700 p-3 rounded-xl font-black text-[10px] border-2 border-red-200 hover:bg-red-100 uppercase transition-all shadow-sm">🟥 بطاقة حمراء</button>
                       </div>

                       <div className="space-y-3 mt-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                          {activeMatch.events.map((ev, idx) => (
                             <div key={ev.id} className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 space-y-3">
                                <div className="flex justify-between items-center">
                                   <span className="text-[10px] font-black uppercase flex items-center gap-1">
                                      {ev.type === 'goal' && '⚽ هدف للكرامة'}
                                      {ev.type === 'assist' && '👟 تمريرة حاسمة'}
                                      {ev.type === 'yellow' && '🟨 إنذار أصفر'}
                                      {ev.type === 'red' && '🟥 طرد مباشر'}
                                   </span>
                                   <button onClick={() => removeEvent(ev.id)} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                                </div>
                                <div className="flex gap-2">
                                   <select className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-[10px] font-black outline-none"
                                     value={ev.player} onChange={e => {
                                       const updatedEvents = [...activeMatch.events];
                                       updatedEvents[idx].player = e.target.value;
                                       setActiveMatch({...activeMatch, events: updatedEvents});
                                     }}>
                                      <option value="">-- اختر اللاعب --</option>
                                      {state.people.filter(p => p.role === 'لاعب' && p.category === activeMatch.category).map(p => (
                                         <option key={p.id} value={p.name}>{p.name} (#{p.number})</option>
                                      ))}
                                   </select>
                                   <input type="text" placeholder="الدقيقة" className="w-16 bg-white border border-slate-300 rounded-lg p-2 text-[10px] font-black text-center outline-none" 
                                     value={ev.minute} onChange={e => {
                                       const updatedEvents = [...activeMatch.events];
                                       updatedEvents[idx].minute = e.target.value;
                                       setActiveMatch({...activeMatch, events: updatedEvents});
                                     }} />
                                </div>
                             </div>
                          ))}
                          {activeMatch.events.length === 0 && <p className="text-center py-10 text-slate-300 font-black italic text-[10px]">لا يوجد أحداث مسجلة لهذه المباراة</p>}
                       </div>
                    </section>

                    <section>
                       <label className={labelClass}>ملاحظات فنية وإدارية شاملة</label>
                       <textarea className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-4 font-black text-xs h-32 outline-none focus:border-orange-600 transition-all" 
                         value={activeMatch.notes || ''} onChange={e => setActiveMatch({...activeMatch, notes: e.target.value})} placeholder="سجل تقريرك الفني المختصر للمباراة هنا..."></textarea>
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
