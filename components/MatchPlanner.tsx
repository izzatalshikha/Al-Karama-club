
import React, { useState } from 'react';
import { Trophy, MapPin, Clock, Plus, X, Shield, Award, Calendar, ChevronLeft, Trash2, Target, AlertTriangle, UserPlus, Printer, FileText } from 'lucide-react';
import { AppState, Match, MatchType, MatchEvent } from '../types';

interface MatchPlannerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  defaultSelectedId?: string | null;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const MatchPlanner: React.FC<MatchPlannerProps> = ({ state, setState, defaultSelectedId, addLog }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [formData, setFormData] = useState<Partial<Match>>({ 
    matchType: 'دوري', 
    category: state.globalCategoryFilter === 'الكل' ? state.categories[0] : state.globalCategoryFilter 
  });

  const globalFilter = state.globalCategoryFilter;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.opponent || !formData.date || !formData.time || !formData.category) {
      alert("يرجى ملء جميع الحقول المطلوبة (الخصم، التاريخ، الوقت، الفئة)");
      return;
    }

    // التحقق الصارم من أن الوقت في المستقبل
    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();
    if (selectedDateTime <= now) {
      alert("تنبيه: لا يمكن جدولة مباراة في وقت قديم. يرجى اختيار وقت مستقبلي.");
      return;
    }

    const newMatch: Match = {
      id: Math.random().toString(36).substr(2, 9),
      matchType: (formData.matchType as MatchType) || 'دوري',
      opponent: formData.opponent,
      location: formData.location || 'غير محدد',
      date: formData.date,
      time: formData.time,
      category: formData.category,
      advancePayment: formData.advancePayment || '0',
      isCompleted: false,
      ourScore: '0',
      opponentScore: '0',
      events: [],
      lineup: { starters: Array(11).fill({name:'', number:''}), subs: [], staff: [], captain: '' }
    };

    setState(p => ({ ...p, matches: [newMatch, ...p.matches] }));
    addLog?.('جدولة مباراة', `تمت جدولة مواجهة جديدة ضد ${newMatch.opponent}`, 'success');
    setIsAddOpen(false);
  };

  const getPlayerNumber = (name: string) => {
    return state.people.find(p => p.name === name)?.number?.toString() || '';
  };

  const addSub = () => {
    if (!activeMatch) return;
    setActiveMatch({
      ...activeMatch,
      lineup: {
        ...activeMatch.lineup,
        subs: [...activeMatch.lineup.subs, { name: '', number: '' }]
      }
    });
  };

  const removeSub = (index: number) => {
    if (!activeMatch) return;
    const newSubs = [...activeMatch.lineup.subs];
    newSubs.splice(index, 1);
    setActiveMatch({
      ...activeMatch,
      lineup: { ...activeMatch.lineup, subs: newSubs }
    });
  };

  const updateSub = (index: number, name: string) => {
    if (!activeMatch) return;
    const newSubs = [...activeMatch.lineup.subs];
    newSubs[index] = { name, number: getPlayerNumber(name) };
    setActiveMatch({
      ...activeMatch,
      lineup: { ...activeMatch.lineup, subs: newSubs }
    });
  };

  const addEvent = (type: MatchEvent['type']) => {
    if (!activeMatch) return;
    const newEvent: MatchEvent = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      player: '',
      minute: '',
    };
    setActiveMatch({ ...activeMatch, events: [...activeMatch.events, newEvent] });
  };

  const updateEvent = (id: string, updates: Partial<MatchEvent>) => {
    if (!activeMatch) return;
    setActiveMatch({
      ...activeMatch,
      events: activeMatch.events.map(e => e.id === id ? { ...e, ...updates } : e)
    });
  };

  const removeEvent = (id: string) => {
    if (!activeMatch) return;
    setActiveMatch({ ...activeMatch, events: activeMatch.events.filter(e => e.id !== id) });
  };

  const filteredMatches = state.matches.filter(m => (globalFilter === 'الكل' || m.category === globalFilter));
  const fieldClass = "w-full bg-white border-2 border-slate-900 rounded-xl py-2 px-4 font-black text-slate-900 outline-none focus:border-orange-600 transition-all";
  const labelClass = "text-[10px] font-black text-slate-900 mr-2 uppercase block mb-1";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center no-print relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-orange-600"></div>
        <div>
          <h3 className="text-md font-black text-slate-900">مركز إدارة المواجهات المباشرة</h3>
          <p className="text-[9px] font-black text-[#001F3F] mt-1 uppercase tracking-widest">Al-Karamah Football System</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ matchType: 'دوري', category: globalFilter === 'الكل' ? state.categories[0] : globalFilter });
            setIsAddOpen(true);
          }} 
          className="bg-orange-600 text-white px-5 py-2 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-black transition-all mt-3 md:mt-0"
        >
          <Plus size={16} /> جدولة مواجهة جديدة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredMatches.map(m => (
          <div key={m.id} className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-slate-900 relative group overflow-hidden border-b-[6px] border-[#001F3F] transition-all no-print">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[9px] font-black bg-[#001F3F] text-white px-2.5 py-1 rounded-lg uppercase">{m.category} | {m.matchType}</span>
                <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border-2 ${m.isCompleted ? 'bg-emerald-100 text-emerald-900 border-emerald-900' : 'bg-orange-100 text-orange-900 border-orange-900 animate-pulse'}`}>
                  {m.isCompleted ? 'انتهت' : 'قادمة'}
                </span>
             </div>
             
             <div className="flex items-center justify-between text-center gap-2 py-2">
                <div className="flex-1">
                  <div className="w-12 h-12 bg-[#001F3F] text-white rounded-xl mx-auto flex items-center justify-center font-black text-xl mb-1 shadow-lg">K</div>
                  <p className="font-black text-[10px] text-slate-900 uppercase">الكرامة</p>
                </div>
                
                <div className="bg-slate-100 px-5 py-4 rounded-2xl flex items-center justify-center font-black text-2xl border-2 border-slate-900 text-slate-900 shadow-inner">
                  {m.isCompleted ? `${m.ourScore}:${m.opponentScore}` : 'VS'}
                </div>

                <div className="flex-1">
                  <div className="w-12 h-12 bg-white border-2 border-slate-900 text-slate-900 rounded-xl mx-auto flex items-center justify-center font-black text-xl mb-1 shadow-md">?</div>
                  <p className="font-black text-[10px] text-slate-900 uppercase">{m.opponent}</p>
                </div>
             </div>

             <div className="mt-5 pt-4 border-t-2 border-slate-100 flex flex-col xl:flex-row justify-between items-center gap-3">
                <div className="space-y-1 w-full xl:w-auto">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-900"><Calendar size={12} className="text-[#001F3F]"/> {m.date} | {m.time}</div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-900"><MapPin size={12} className="text-orange-600"/> {m.location}</div>
                </div>
                <div className="flex gap-2 w-full xl:w-auto">
                  <button onClick={() => { setActiveMatch(m); setShowReport(true); }} className="flex-1 bg-white border-2 border-slate-900 text-slate-900 px-3 py-2 rounded-lg text-[9px] font-black hover:bg-slate-100 flex items-center justify-center gap-1.5 shadow-sm">
                    <FileText size={14}/> التقرير
                  </button>
                  <button onClick={() => { setActiveMatch(m); setShowReport(false); }} className="flex-1 bg-[#001F3F] text-white px-4 py-2 rounded-lg text-[9px] font-black hover:bg-black transition-all shadow-md">
                    إدارة المباراة
                  </button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Add Match Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-[#001F3F]/95 backdrop-blur-md flex items-center justify-center z-[250] p-6 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border-4 border-slate-900">
             <div className="p-6 border-b-2 border-slate-100 bg-slate-50 flex justify-between items-center rounded-t-[2.2rem]">
               <h3 className="text-lg font-black text-slate-900 uppercase">جدولة لقاء جديد</h3>
               <button onClick={() => setIsAddOpen(false)} className="p-2 bg-slate-200 rounded-xl text-slate-900 hover:text-red-600 transition-all"><X size={20}/></button>
             </div>
             <form onSubmit={handleAdd} className="p-6 space-y-5">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className={labelClass}>الفئة العمرية</label>
                   <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={fieldClass}>
                     {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className={labelClass}>نوع المباراة</label>
                   <select value={formData.matchType} onChange={e => setFormData({...formData, matchType: e.target.value as MatchType})} className={fieldClass}>
                     <option value="دوري">دوري</option>
                     <option value="كأس">كأس</option>
                     <option value="ودية">ودية</option>
                     <option value="مباراة دولية">مباراة دولية</option>
                   </select>
                 </div>
               </div>
               <div className="space-y-1">
                 <label className={labelClass}>الفريق المنافس</label>
                 <input required type="text" value={formData.opponent || ''} onChange={e => setFormData({...formData, opponent: e.target.value})} placeholder="اسم الخصم..." className={fieldClass} />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className={labelClass}>التاريخ</label>
                   <input required type="date" value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} className={fieldClass} />
                 </div>
                 <div className="space-y-1">
                   <label className={labelClass}>الوقت</label>
                   <input required type="time" value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} className={fieldClass} />
                 </div>
               </div>
               <div className="space-y-1">
                 <label className={labelClass}>الملعب / المكان</label>
                 <input type="text" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="اسم الملعب..." className={fieldClass} />
               </div>
               <div className="flex gap-4 mt-4">
                 <button type="button" onClick={() => setIsAddOpen(false)} className="flex-1 bg-slate-200 text-slate-900 font-black py-3 rounded-xl border-2 border-slate-900 uppercase text-[11px]">إلغاء</button>
                 <button type="submit" className="flex-[2] bg-[#001F3F] text-white font-black py-3 rounded-xl shadow-lg uppercase text-[11px] hover:bg-black transition-all">تثبيت المواجهة</button>
               </div>
             </form>
          </div>
        </div>
      )}

      {/* Management & Tactics Modal */}
      {activeMatch && !showReport && (
        <div className="fixed inset-0 bg-[#001F3F]/95 backdrop-blur-md flex items-center justify-center z-[300] p-4 overflow-y-auto no-print">
           <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl border-4 border-slate-900 flex flex-col h-[90vh]">
              <div className="p-6 border-b-2 bg-slate-100 flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3">
                    <Trophy size={20} className="text-orange-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase">إدارة تكتيك المباراة: الكرامة × {activeMatch.opponent}</h3>
                 </div>
                 <button onClick={() => setActiveMatch(null)} className="p-2 bg-slate-300 rounded-xl text-slate-900 hover:text-red-600 transition-all"><X size={20}/></button>
              </div>
              
              <div className="p-8 overflow-y-auto custom-scrollbar space-y-10">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                       {/* Starters Section */}
                       <div className="space-y-4">
                          <h4 className="text-[11px] font-black text-slate-900 border-r-4 border-orange-600 pr-3 uppercase">التشكيلة الأساسية (11 لاعب)</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {activeMatch.lineup.starters.map((s, i) => (
                              <div key={i} className="flex gap-2 items-center">
                                <span className="w-8 h-8 bg-[#001F3F] text-white rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm">{i+1}</span>
                                <select 
                                  value={s.name} 
                                  onChange={e => {
                                    const newList = [...activeMatch.lineup.starters];
                                    newList[i] = { name: e.target.value, number: getPlayerNumber(e.target.value) };
                                    setActiveMatch({...activeMatch, lineup: {...activeMatch.lineup, starters: newList}});
                                  }}
                                  className="flex-1 bg-white border-2 border-slate-900 rounded-lg py-1.5 px-3 text-[11px] font-black text-slate-900 outline-none"
                                >
                                  <option value="">اختر لاعب أساسي...</option>
                                  {state.people.filter(p => p.category === activeMatch.category && p.role === 'لاعب').map(p => <option key={p.id} value={p.name}>{p.name} (#{p.number})</option>)}
                                </select>
                                <div className="w-10 h-8 bg-slate-100 border-2 border-slate-900 rounded-lg flex items-center justify-center font-black text-xs text-slate-900">{s.number || '--'}</div>
                              </div>
                            ))}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-8">
                       {/* Unlimited Substitutes Section */}
                       <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border-2 border-slate-900">
                          <div className="flex justify-between items-center mb-2">
                             <h4 className="text-[11px] font-black text-slate-900 border-r-4 border-blue-900 pr-3 uppercase tracking-wider">التشكيل الاحتياطي</h4>
                             <button onClick={addSub} className="bg-[#001F3F] text-white p-1.5 rounded-lg hover:bg-orange-600 transition-all shadow-md">
                                <UserPlus size={16}/>
                             </button>
                          </div>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                             {activeMatch.lineup.subs.map((s, i) => (
                               <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-slate-300">
                                  <select 
                                    value={s.name} 
                                    onChange={e => updateSub(i, e.target.value)}
                                    className="flex-1 bg-transparent border-none font-black text-[11px] text-slate-900 outline-none"
                                  >
                                    <option value="">اختر لاعب احتياطي...</option>
                                    {state.people.filter(p => p.category === activeMatch.category && p.role === 'لاعب').map(p => <option key={p.id} value={p.name}>{p.name} (#{p.number})</option>)}
                                  </select>
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center font-black text-[10px] text-blue-900">{s.number || '--'}</div>
                                  <button onClick={() => removeSub(i)} className="text-red-600 hover:bg-red-50 p-1 rounded-lg transition-colors"><Trash2 size={14}/></button>
                               </div>
                             ))}
                             {activeMatch.lineup.subs.length === 0 && <p className="text-[10px] text-slate-400 font-black text-center py-4 italic">لم يتم إضافة بدلاء بعد</p>}
                          </div>
                       </div>

                       {/* Events & Result Sections */}
                       <div className="bg-emerald-50 p-5 rounded-2xl border-2 border-emerald-900">
                          <h4 className="text-[11px] font-black text-emerald-900 flex items-center gap-2 mb-4 border-r-4 border-blue-900 pr-2 uppercase"><Target size={16}/> أحداث المباراة (أهداف/أسيست)</h4>
                          <div className="space-y-2">
                             {activeMatch.events.filter(e => e.type === 'goal' || e.type === 'assist').map(e => (
                                <div key={e.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border-2 border-slate-900">
                                   <select value={e.type} onChange={opt => updateEvent(e.id, {type: opt.target.value as any})} className="bg-slate-100 border rounded p-1 font-black text-[10px] text-slate-900">
                                      <option value="goal">هدف</option><option value="assist">أسيست</option>
                                   </select>
                                   <select value={e.player} onChange={opt => updateEvent(e.id, {player: opt.target.value})} className="flex-1 bg-slate-100 border rounded p-1 font-black text-[10px] text-slate-900">
                                      <option value="">اختر اللاعب</option>
                                      {[...activeMatch.lineup.starters, ...activeMatch.lineup.subs].filter(p => p.name).map(p => <option key={p.name} value={p.name}>{p.name} (#{p.number})</option>)}
                                   </select>
                                   <input type="text" placeholder="دقيقة" value={e.minute} onChange={o => updateEvent(e.id, {minute: o.target.value})} className="w-12 bg-slate-50 border rounded p-1 font-black text-[10px] text-center" />
                                   <button onClick={() => removeEvent(e.id)} className="text-red-600"><Trash2 size={14}/></button>
                                </div>
                             ))}
                             <button onClick={() => addEvent('goal')} className="w-full border-2 border-dashed border-emerald-900 py-2 rounded-lg text-emerald-900 font-black text-[10px] hover:bg-emerald-100 uppercase">+ إضافة حدث هجومي</button>
                          </div>
                       </div>

                       <div className="bg-red-50 p-5 rounded-2xl border-2 border-red-900">
                          <h4 className="text-[11px] font-black text-red-900 flex items-center gap-2 mb-4 border-r-4 border-slate-900 pr-2 uppercase"><AlertTriangle size={16}/> سجل البطاقات الملونة</h4>
                          <div className="space-y-2">
                             {activeMatch.events.filter(e => e.type === 'yellow' || e.type === 'red').map(e => (
                                <div key={e.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border-2 border-slate-900">
                                   <select value={e.type} onChange={opt => updateEvent(e.id, {type: opt.target.value as any})} className="bg-slate-100 border rounded p-1 font-black text-[10px] text-slate-900">
                                      <option value="yellow">صفراء</option><option value="red">حمراء</option>
                                   </select>
                                   <select value={e.player} onChange={opt => updateEvent(e.id, {player: opt.target.value})} className="flex-1 bg-slate-100 border rounded p-1 font-black text-[10px] text-slate-900">
                                      <option value="">اختر اللاعب</option>
                                      {[...activeMatch.lineup.starters, ...activeMatch.lineup.subs].filter(p => p.name).map(p => <option key={p.name} value={p.name}>{p.name} (#{p.number})</option>)}
                                   </select>
                                   <input type="text" placeholder="دقيقة" value={e.minute} onChange={o => updateEvent(e.id, {minute: o.target.value})} className="w-12 bg-slate-50 border rounded p-1 font-black text-[10px] text-center" />
                                   <button onClick={() => removeEvent(e.id)} className="text-red-600"><Trash2 size={14}/></button>
                                </div>
                             ))}
                             <button onClick={() => addEvent('yellow')} className="w-full border-2 border-dashed border-red-900 py-2 rounded-lg text-red-900 font-black text-[10px] hover:bg-red-100 uppercase">+ إضافة بطاقة ملونة</button>
                          </div>
                       </div>

                       <div className="bg-slate-100 p-5 rounded-2xl border-2 border-slate-900 shadow-inner">
                         <h4 className="text-[11px] font-black text-slate-900 mb-3 uppercase tracking-wider">النتيجة النهائية للمباراة</h4>
                         <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-1">
                               <label className="text-[8px] font-black text-[#001F3F] block uppercase">الكرامة</label>
                               <input type="number" value={activeMatch.ourScore} onChange={e => setActiveMatch({...activeMatch, ourScore: e.target.value})} 
                                className="w-full bg-[#001F3F] text-white border-none rounded-xl p-3 text-2xl font-black text-center shadow-lg" />
                            </div>
                            <span className="font-black text-2xl text-slate-900">:</span>
                            <div className="flex-1 space-y-1">
                               <label className="text-[8px] font-black text-slate-900 block uppercase">الخصم</label>
                               <input type="number" value={activeMatch.opponentScore} onChange={e => setActiveMatch({...activeMatch, opponentScore: e.target.value})} 
                                className="w-full bg-white border-2 border-slate-900 rounded-xl p-3 text-2xl font-black text-center text-slate-900" />
                            </div>
                         </div>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-10 border-t-2 border-slate-200">
                    <button onClick={() => setActiveMatch(null)} className="flex-1 bg-slate-200 text-slate-900 font-black py-4 rounded-xl text-[11px] border-2 border-slate-900 uppercase hover:bg-slate-300">إلغاء</button>
                    <button onClick={() => {
                      const finalMatch = {...activeMatch, isCompleted: true};
                      setState(p => ({ ...p, matches: p.matches.map(m => m.id === activeMatch.id ? finalMatch : m) }));
                      addLog?.('اعتماد مباراة', `تم حفظ تقرير مباراة ${activeMatch.opponent}`, 'success');
                      setActiveMatch(null);
                    }} className="flex-[2] bg-[#001F3F] text-white font-black py-4 rounded-xl shadow-2xl hover:bg-black transition-all text-[11px] uppercase">
                      حفظ واعتماد التقرير الفني
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Printable Match Report View */}
      {showReport && activeMatch && (
        <div className="fixed inset-0 bg-white z-[500] overflow-y-auto p-8 font-['Tajawal'] text-slate-900" dir="rtl">
           <div className="max-w-4xl mx-auto border-4 border-slate-900 p-10 rounded-[2rem] bg-white relative">
              <div className="absolute top-8 left-8 no-print flex gap-2">
                 <button onClick={() => setShowReport(false)} className="bg-slate-200 p-2 rounded-lg text-slate-900"><X size={20}/></button>
                 <button onClick={() => window.print()} className="bg-[#001F3F] text-white p-2 rounded-lg"><Printer size={20}/></button>
              </div>

              <div className="flex justify-between items-center border-b-4 border-slate-900 pb-8 mb-8">
                 <div className="text-right space-y-1">
                    <h1 className="text-3xl font-black text-slate-900">نادي الكرامة الرياضي</h1>
                    <p className="text-sm font-black text-blue-900 uppercase tracking-widest">مكتب كرة القدم - تقرير مباراة رسمي</p>
                    <div className="flex gap-4 pt-2 text-xs font-black">
                       <span>التاريخ: {activeMatch.date}</span>
                       <span>الوقت: {activeMatch.time}</span>
                    </div>
                 </div>
                 <div className="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center font-black text-5xl text-white shadow-xl">K</div>
              </div>

              <div className="grid grid-cols-3 gap-8 text-center mb-10 bg-slate-50 p-6 rounded-3xl border-2 border-slate-900">
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">الفريق المضيف</p>
                    <p className="text-xl font-black text-slate-900 mt-1">الكرامة ({activeMatch.category})</p>
                 </div>
                 <div className="flex flex-col items-center justify-center">
                    <div className="text-4xl font-black text-slate-900 bg-white border-2 border-slate-900 px-6 py-2 rounded-2xl">
                       {activeMatch.ourScore} : {activeMatch.opponentScore}
                    </div>
                    <p className="text-[10px] font-black text-orange-600 mt-2 uppercase tracking-tighter">{activeMatch.matchType}</p>
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase">الفريق الضيف</p>
                    <p className="text-xl font-black text-slate-900 mt-1">{activeMatch.opponent}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-900 border-r-4 border-orange-600 pr-3 uppercase">التشكيلة الأساسية</h4>
                    <div className="space-y-1.5">
                       {activeMatch.lineup.starters.map((s, i) => (
                          <div key={i} className="flex justify-between items-center border-b border-slate-200 py-1">
                             <span className="text-xs font-black text-slate-900">{i+1}. {s.name || '---'}</span>
                             <span className="text-xs font-black text-blue-900">#{s.number || '--'}</span>
                          </div>
                       ))}
                    </div>

                    <h4 className="text-sm font-black text-slate-900 border-r-4 border-blue-900 pr-3 uppercase pt-4">البدلاء</h4>
                    <div className="space-y-1.5">
                       {activeMatch.lineup.subs.map((s, i) => (
                          <div key={i} className="flex justify-between items-center border-b border-slate-200 py-1">
                             <span className="text-xs font-black text-slate-900">{s.name || '---'}</span>
                             <span className="text-xs font-black text-blue-900">#{s.number || '--'}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-900 border-r-4 border-emerald-600 pr-3 uppercase">مسجلي الأهداف</h4>
                    <div className="space-y-1.5">
                       {activeMatch.events.filter(e => e.type === 'goal').map((e, i) => (
                          <div key={i} className="flex justify-between items-center border-b border-slate-200 py-1">
                             <span className="text-xs font-black text-slate-900">{e.player}</span>
                             <span className="text-[10px] font-black text-emerald-600">د '{e.minute}</span>
                          </div>
                       ))}
                       {activeMatch.events.filter(e => e.type === 'goal').length === 0 && <p className="text-xs italic text-slate-400">لا يوجد أهداف</p>}
                    </div>

                    <h4 className="text-sm font-black text-slate-900 border-r-4 border-red-600 pr-3 uppercase pt-4">البطاقات الملونة</h4>
                    <div className="space-y-1.5">
                       {activeMatch.events.filter(e => e.type === 'yellow' || e.type === 'red').map((e, i) => (
                          <div key={i} className="flex justify-between items-center border-b border-slate-200 py-1">
                             <span className="text-xs font-black text-slate-900">{e.player}</span>
                             <span className={`text-[10px] font-black ${e.type === 'red' ? 'text-red-600' : 'text-orange-500'}`}>
                                {e.type === 'red' ? 'حمراء' : 'صفراء'} - د '{e.minute}
                             </span>
                          </div>
                       ))}
                       {activeMatch.events.filter(e => e.type === 'yellow' || e.type === 'red').length === 0 && <p className="text-xs italic text-slate-400">لا يوجد بطاقات</p>}
                    </div>
                 </div>
              </div>

              <div className="mt-16 pt-10 border-t-4 border-slate-900 grid grid-cols-2 text-center">
                 <div>
                    <p className="text-sm font-black text-slate-900">توقيع مدرب الفريق</p>
                    <div className="h-16"></div>
                    <p className="text-xs font-black text-slate-400">...................................</p>
                 </div>
                 <div>
                    <p className="text-sm font-black text-slate-900">خاتم مكتب كرة القدم</p>
                    <div className="h-16"></div>
                    <p className="text-xs font-black text-slate-400">...................................</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default MatchPlanner;
