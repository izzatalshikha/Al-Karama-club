
import React, { useState } from 'react';
import { Trophy, MapPin, Clock, Plus, Trash2, Calendar as CalendarIcon, Target, X, Hash, FileText, Printer, Shield, UserCheck, Layout, Award, AlertTriangle, ArrowRightLeft, UserCircle } from 'lucide-react';
import { AppState, Match, Category, MatchType, GoalRecord, CardRecord, SubstitutionRecord } from '../types';
import ClubLogo from './ClubLogo';

interface MatchPlannerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const MatchPlanner: React.FC<MatchPlannerProps> = ({ state, setState }) => {
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  
  const canEdit = currentUser?.role === 'مدير' || (currentUser?.role === 'مدرب' && !!restrictedCat);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  const [formData, setFormData] = useState<Partial<Match>>({
    category: restrictedCat || (state.categories.length > 0 ? state.categories[0] : 'رجال'),
    matchType: 'دوري'
  });

  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.opponent || !formData.location) return;

    const newMatch: Match = {
      id: Math.random().toString(36).substr(2, 9),
      category: formData.category as Category,
      matchType: (formData.matchType as MatchType) || 'دوري',
      opponent: formData.opponent,
      location: formData.location,
      advancePayment: formData.advancePayment || '0',
      date: formData.date,
      time: formData.time || '16:00',
      isCompleted: false,
      ourScore: '0',
      opponentScore: '0',
      goalList: [],
      cardList: [],
      lineupDetails: {
        starters: Array(11).fill({ name: '', number: '' }),
        subs: Array(11).fill({ name: '', number: '' }),
        captain: '',
        substitutionList: []
      }
    };

    setState(prev => ({ 
      ...prev, 
      matches: [newMatch, ...prev.matches],
      notifications: [
        ...prev.notifications,
        {
          id: Math.random().toString(36).substr(2, 9),
          message: `قام ${currentUser?.username} بجدولة مباراة ${newMatch.matchType} جديدة ضد ${newMatch.opponent}.`,
          type: 'success',
          timestamp: Date.now()
        }
      ]
    }));
    setIsAddModalOpen(false);
    setFormData({ category: restrictedCat || (state.categories[0] || 'رجال'), matchType: 'دوري' });
  };

  const handleUpdateResult = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;
    setState(prev => ({
      ...prev,
      matches: prev.matches.map(m => m.id === selectedMatch.id ? { ...selectedMatch, isCompleted: true } : m),
      notifications: [
        ...prev.notifications,
        {
          id: Math.random().toString(36).substr(2, 9),
          message: `تم اعتماد نتيجة مباراة ${selectedMatch.opponent} بنتيجة (${selectedMatch.ourScore} - ${selectedMatch.opponentScore}) بواسطة ${currentUser?.username}`,
          type: 'success',
          timestamp: Date.now()
        }
      ]
    }));
    setIsResultModalOpen(false);
  };

  const matchCategoryPlayers = selectedMatch 
    ? state.people.filter(p => p.category === selectedMatch.category && p.role === 'لاعب')
    : [];

  const matchTypes: MatchType[] = ['دوري', 'كأس', 'ودية', 'تنشيطية', 'تجريبية'];

  const updateLineupPlayer = (type: 'starters' | 'subs', index: number, playerName: string) => {
    if (!selectedMatch || !selectedMatch.lineupDetails) return;
    const player = matchCategoryPlayers.find(p => p.name === playerName);
    const newDetails = { ...selectedMatch.lineupDetails };
    newDetails[type][index] = { name: playerName, number: player?.number?.toString() || '' };
    setSelectedMatch({ ...selectedMatch, lineupDetails: newDetails });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <h3 className="text-slate-600 font-bold">إدارة المباريات والتقارير</h3>
        {canEdit && (
          <button onClick={() => setIsAddModalOpen(true)} className="bg-orange-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 font-black shadow-lg shadow-orange-200 transition-transform active:scale-95">
            <Plus size={20} /> إضافة مباراة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        {state.matches.filter(m => !restrictedCat || m.category === restrictedCat).map(match => (
          <div key={match.id} className={`bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden relative group transition-all ${match.isCompleted ? 'border-emerald-100 bg-emerald-50/10' : ''}`}>
             <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-2">
                    <span className="bg-blue-900 text-white px-4 py-1 rounded-full text-[10px] font-black">{match.category}</span>
                    <span className={`px-4 py-1 rounded-full text-[10px] font-black ${match.matchType === 'دوري' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                      {match.matchType}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg ${match.isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {match.isCompleted ? 'منتهية' : 'قادمة'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 py-4">
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-2"><ClubLogo size={32} /></div>
                    <span className="font-black text-slate-800 text-sm">الكرامة</span>
                  </div>
                  <div className="text-center px-4">
                    <div className="text-4xl font-black text-slate-900 mb-1">
                      {match.isCompleted ? `${match.ourScore} - ${match.opponentScore}` : 'VS'}
                    </div>
                    <span className="text-[10px] text-slate-400 font-black">{match.time}</span>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400"><Trophy size={24} /></div>
                    <span className="font-black text-slate-800 text-sm">{match.opponent}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                   <div className="flex gap-4 text-[11px] font-bold text-slate-500">
                     <span className="flex items-center gap-1"><MapPin size={14}/> {match.location}</span>
                     <span className="flex items-center gap-1"><CalendarIcon size={14}/> {match.date}</span>
                   </div>
                   <div className="flex gap-2">
                    {match.isCompleted ? (
                      <button onClick={() => {setSelectedMatch(match); setIsSummaryModalOpen(true);}} className="bg-blue-900 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2">
                        <FileText size={14} /> التقرير النهائي
                      </button>
                    ) : (
                      canEdit && (
                        <button onClick={() => {setSelectedMatch(match); setIsResultModalOpen(true);}} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black">إدخال النتيجة</button>
                      )
                    )}
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 no-print">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-xl">جدولة مباراة جديدة</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-200 p-2 rounded-xl text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddMatch} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">نوع المباراة</label>
                  <select className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none" value={formData.matchType} onChange={e => setFormData({ ...formData, matchType: e.target.value as MatchType })}>
                    {matchTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">الفئة</label>
                  <select className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none" value={formData.category} disabled={!!restrictedCat} onChange={e => setFormData({ ...formData, category: e.target.value as Category })}>
                    {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">اسم الخصم</label>
                <input type="text" required placeholder="المنافس" className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none" onChange={e => setFormData({ ...formData, opponent: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">المكان / الملعب</label>
                <input type="text" required placeholder="اسم الملعب" className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none" onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">التاريخ</label>
                  <input type="date" required className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none" onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">الوقت</label>
                  <input type="time" required className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none" onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl">تأكيد الموعد</button>
            </form>
          </div>
        </div>
      )}

      {isResultModalOpen && selectedMatch && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[210] p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-[3.5rem] w-full max-w-5xl shadow-2xl my-auto max-h-[90vh] flex flex-col">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">تقرير تفصيلي - مباراة {selectedMatch.opponent}</h3>
              <button onClick={() => setIsResultModalOpen(false)} className="bg-slate-200 p-2 rounded-xl text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateResult} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              
              {/* النتيجة */}
              <div className="grid grid-cols-2 gap-8 bg-slate-50 p-8 rounded-[3rem]">
                <div className="space-y-2 text-center">
                  <label className="text-[10px] font-black text-blue-900 uppercase">أهداف الكرامة</label>
                  <input type="number" className="w-full bg-white rounded-2xl p-6 text-center text-4xl font-black text-slate-950 border-2 border-slate-100 outline-none" value={selectedMatch.ourScore} onChange={e => setSelectedMatch({ ...selectedMatch, ourScore: e.target.value })} />
                </div>
                <div className="space-y-2 text-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase">أهداف {selectedMatch.opponent}</label>
                  <input type="number" className="w-full bg-white rounded-2xl p-6 text-center text-4xl font-black text-slate-950 border-2 border-slate-100 outline-none" value={selectedMatch.opponentScore} onChange={e => setSelectedMatch({ ...selectedMatch, opponentScore: e.target.value })} />
                </div>
              </div>

              {/* التشكيلة الأساسية */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-blue-900 flex items-center gap-2 border-r-4 border-blue-900 pr-3">
                   <UserCheck size={18}/> التشكيلة الأساسية (11 لاعب)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedMatch.lineupDetails?.starters.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <select 
                        className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-black text-xs text-slate-950 outline-none" 
                        value={s.name} 
                        onChange={e => updateLineupPlayer('starters', i, e.target.value)}
                      >
                        <option value="">-- لاعب رقم {i+1} --</option>
                        {matchCategoryPlayers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                      <div className="w-12 bg-blue-900 text-white flex items-center justify-center rounded-xl text-xs font-black">
                         {s.number || '--'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* الاحتياط */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-orange-600 flex items-center gap-2 border-r-4 border-orange-500 pr-3">
                   <Layout size={18}/> قائمة الاحتياط (11 لاعب)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedMatch.lineupDetails?.subs.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <select 
                        className="flex-1 bg-orange-50/50 rounded-xl px-4 py-3 font-black text-xs text-slate-950 outline-none" 
                        value={s.name} 
                        onChange={e => updateLineupPlayer('subs', i, e.target.value)}
                      >
                        <option value="">-- احتياط {i+1} --</option>
                        {matchCategoryPlayers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                      <div className="w-12 bg-orange-600 text-white flex items-center justify-center rounded-xl text-xs font-black">
                         {s.number || '--'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* الأهداف */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-emerald-600 flex items-center gap-2 border-r-4 border-emerald-500 pr-3">
                  <Target size={18}/> المسجلون
                </h4>
                <div className="space-y-2">
                  {selectedMatch.goalList.map((g, i) => (
                    <div key={i} className="flex gap-3">
                       <select className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-black text-xs text-slate-950 outline-none" value={g.player} onChange={e => {
                         const p = matchCategoryPlayers.find(person => person.name === e.target.value);
                         const newList = [...selectedMatch.goalList];
                         newList[i] = { player: e.target.value, number: p?.number?.toString() || '', time: newList[i].time };
                         setSelectedMatch({...selectedMatch, goalList: newList});
                       }}>
                         <option value="">اختر لاعب</option>
                         {matchCategoryPlayers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                       </select>
                       <div className="w-14 bg-slate-100 flex items-center justify-center rounded-xl text-[10px] font-black border text-blue-900">{g.number || '--'}</div>
                       <input type="text" placeholder="دقيقة" className="w-24 bg-slate-50 rounded-xl px-4 py-3 font-black text-center text-xs text-slate-950 outline-none" value={g.time} onChange={e => {
                         const newList = [...selectedMatch.goalList];
                         newList[i].time = e.target.value;
                         setSelectedMatch({...selectedMatch, goalList: newList});
                       }} />
                       <button type="button" onClick={() => setSelectedMatch({...selectedMatch, goalList: selectedMatch.goalList.filter((_, idx) => idx !== i)})} className="text-red-400 p-2"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setSelectedMatch({...selectedMatch, goalList: [...selectedMatch.goalList, {player:'', number:'', time:''}]})} className="text-xs font-black text-emerald-600 bg-emerald-50 px-6 py-2 rounded-xl">+ إضافة هدف</button>
                </div>
              </div>

              {/* البطاقات */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-yellow-600 flex items-center gap-2 border-r-4 border-yellow-500 pr-3">
                  <AlertTriangle size={18}/> البطاقات الملونة
                </h4>
                <div className="space-y-2">
                  {selectedMatch.cardList.map((c, i) => (
                    <div key={i} className="flex gap-3">
                       <select className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-black text-xs text-slate-950 outline-none" value={c.player} onChange={e => {
                         const p = matchCategoryPlayers.find(person => person.name === e.target.value);
                         const newList = [...selectedMatch.cardList];
                         newList[i] = { ...newList[i], player: e.target.value, number: p?.number?.toString() || '' };
                         setSelectedMatch({...selectedMatch, cardList: newList});
                       }}>
                         <option value="">اختر لاعب</option>
                         {matchCategoryPlayers.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                       </select>
                       <select className="w-32 bg-slate-50 rounded-xl px-4 py-3 font-black text-xs outline-none" value={c.type} onChange={e => {
                         const newList = [...selectedMatch.cardList];
                         newList[i].type = e.target.value as 'صفراء' | 'حمراء';
                         setSelectedMatch({...selectedMatch, cardList: newList});
                       }}>
                         <option value="صفراء">صفراء</option>
                         <option value="حمراء">حمراء</option>
                       </select>
                       <input type="text" placeholder="دقيقة" className="w-24 bg-slate-50 rounded-xl px-4 py-3 font-black text-center text-xs outline-none" value={c.time} onChange={e => {
                         const newList = [...selectedMatch.cardList];
                         newList[i].time = e.target.value;
                         setSelectedMatch({...selectedMatch, cardList: newList});
                       }} />
                       <button type="button" onClick={() => setSelectedMatch({...selectedMatch, cardList: selectedMatch.cardList.filter((_, idx) => idx !== i)})} className="text-red-400 p-2"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setSelectedMatch({...selectedMatch, cardList: [...selectedMatch.cardList, {player:'', number:'', type:'صفراء', time:''}]})} className="text-xs font-black text-yellow-600 bg-yellow-50 px-6 py-2 rounded-xl">+ تسجيل بطاقة</button>
                </div>
              </div>

              {/* التبديلات */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-blue-600 flex items-center gap-2 border-r-4 border-blue-600 pr-3">
                  <ArrowRightLeft size={18}/> التبديلات
                </h4>
                <div className="space-y-2">
                  {selectedMatch.lineupDetails?.substitutionList.map((s, i) => (
                    <div key={i} className="flex gap-3 bg-blue-50/30 p-4 rounded-2xl border border-blue-100">
                       <div className="flex-1 space-y-1">
                          <label className="text-[9px] font-black text-red-600">اللاعب الخارج</label>
                          <select className="w-full bg-white rounded-xl px-4 py-2 font-black text-xs outline-none" value={s.playerOut} onChange={e => {
                            if (!selectedMatch.lineupDetails) return;
                            const newList = [...selectedMatch.lineupDetails.substitutionList];
                            newList[i].playerOut = e.target.value;
                            setSelectedMatch({...selectedMatch, lineupDetails: {...selectedMatch.lineupDetails, substitutionList: newList}});
                          }}>
                            <option value="">اختر لاعب</option>
                            {selectedMatch.lineupDetails?.starters.filter(st => st.name).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                          </select>
                       </div>
                       <div className="flex-1 space-y-1">
                          <label className="text-[9px] font-black text-emerald-600">اللاعب الداخل</label>
                          <select className="w-full bg-white rounded-xl px-4 py-2 font-black text-xs outline-none" value={s.playerIn} onChange={e => {
                            if (!selectedMatch.lineupDetails) return;
                            const newList = [...selectedMatch.lineupDetails.substitutionList];
                            newList[i].playerIn = e.target.value;
                            setSelectedMatch({...selectedMatch, lineupDetails: {...selectedMatch.lineupDetails, substitutionList: newList}});
                          }}>
                            <option value="">اختر لاعب</option>
                            {selectedMatch.lineupDetails?.subs.filter(st => st.name).map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                          </select>
                       </div>
                       <div className="w-24 space-y-1">
                          <label className="text-[9px] font-black text-slate-400">الدقيقة</label>
                          <input type="text" className="w-full bg-white rounded-xl px-4 py-2 font-black text-center text-xs outline-none" value={s.time} onChange={e => {
                             if (!selectedMatch.lineupDetails) return;
                             const newList = [...selectedMatch.lineupDetails.substitutionList];
                             newList[i].time = e.target.value;
                             setSelectedMatch({...selectedMatch, lineupDetails: {...selectedMatch.lineupDetails, substitutionList: newList}});
                          }} />
                       </div>
                       <button type="button" onClick={() => {
                          if (!selectedMatch.lineupDetails) return;
                          const newList = selectedMatch.lineupDetails.substitutionList.filter((_, idx) => idx !== i);
                          setSelectedMatch({...selectedMatch, lineupDetails: {...selectedMatch.lineupDetails, substitutionList: newList}});
                       }} className="text-red-400 p-2 mt-4"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    if (!selectedMatch.lineupDetails) return;
                    const newList = [...selectedMatch.lineupDetails.substitutionList, {playerOut:'', playerIn:'', time:''}];
                    setSelectedMatch({...selectedMatch, lineupDetails: {...selectedMatch.lineupDetails, substitutionList: newList}});
                  }} className="text-xs font-black text-blue-600 bg-blue-50 px-6 py-2 rounded-xl">+ تسجيل تبديل</button>
                </div>
              </div>

              <div className="pt-6 border-t">
                <button type="submit" className="w-full bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-xl hover:bg-emerald-700 transition-all">اعتماد التقرير النهائي</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSummaryModalOpen && selectedMatch && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[220] p-4 overflow-y-auto">
          <div className="bg-white rounded-[3.5rem] w-full max-w-5xl shadow-2xl my-auto p-12 relative overflow-hidden">
            <button onClick={() => setIsSummaryModalOpen(false)} className="no-print absolute top-8 left-8 p-3 bg-slate-100 rounded-2xl text-slate-500 hover:text-red-600 transition-all"><X size={24}/></button>
            
            <div className="text-center mb-10">
               <div className="mx-auto mb-4 w-20 h-20"><ClubLogo size={80} /></div>
               <h2 className="text-3xl font-black text-blue-900">تقرير المباراة الرسمي</h2>
               <p className="text-sm font-black text-orange-500 mt-1 uppercase tracking-widest">مكتب كرة القدم - نادي الكرامة</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 relative">
               <div className="bg-slate-50 p-6 rounded-[2rem] text-center border">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">نوع المنافسة</p>
                  <p className="text-xl font-black text-slate-800">{selectedMatch.matchType}</p>
               </div>
               <div className="bg-blue-900 text-white p-6 rounded-[2rem] text-center shadow-xl flex flex-col justify-center">
                  <p className="text-[10px] font-black text-blue-200 uppercase mb-1">النتيجة</p>
                  <div className="text-4xl font-black">{selectedMatch.ourScore} - {selectedMatch.opponentScore}</div>
               </div>
               <div className="bg-slate-50 p-6 rounded-[2rem] text-center border">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">التاريخ والمكان</p>
                  <p className="text-sm font-black text-slate-800">{selectedMatch.date} | {selectedMatch.location}</p>
               </div>
            </div>

            {/* عرض التشكيلة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
               <div>
                  <h4 className="text-xs font-black text-blue-900 mb-4 flex items-center gap-2 border-r-4 border-blue-900 pr-2">التشكيلة الأساسية</h4>
                  <div className="grid grid-cols-1 gap-2">
                     {selectedMatch.lineupDetails?.starters.filter(p => p.name).map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                           <span className="text-sm font-black text-slate-800">{p.name}</span>
                           <span className="w-8 h-8 bg-blue-900 text-white rounded-lg flex items-center justify-center text-xs font-black">{p.number}</span>
                        </div>
                     ))}
                  </div>
               </div>
               <div>
                  <h4 className="text-xs font-black text-orange-600 mb-4 flex items-center gap-2 border-r-4 border-orange-500 pr-2">الاحتياط</h4>
                  <div className="grid grid-cols-1 gap-2">
                     {selectedMatch.lineupDetails?.subs.filter(p => p.name).map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-orange-50/30 p-3 rounded-xl border">
                           <span className="text-sm font-black text-slate-700">{p.name}</span>
                           <span className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center text-xs font-black">{p.number}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* عرض الأهداف والبطاقات والتبديلات */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="space-y-4">
                  <h4 className="text-xs font-black text-emerald-600 flex items-center gap-2"><Target size={16}/> الأهداف</h4>
                  {selectedMatch.goalList.map((g, i) => (
                    <div key={i} className="text-xs font-black p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between">
                       <span>{g.player}</span>
                       <span className="text-emerald-700">{g.time}'</span>
                    </div>
                  ))}
               </div>
               <div className="space-y-4">
                  <h4 className="text-xs font-black text-yellow-600 flex items-center gap-2"><AlertTriangle size={16}/> البطاقات</h4>
                  {selectedMatch.cardList.map((c, i) => (
                    <div key={i} className={`text-xs font-black p-3 rounded-xl border flex justify-between ${c.type === 'حمراء' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-yellow-50 border-yellow-100 text-yellow-700'}`}>
                       <span>{c.player}</span>
                       <span>{c.type} {c.time}'</span>
                    </div>
                  ))}
               </div>
               <div className="space-y-4">
                  <h4 className="text-xs font-black text-blue-600 flex items-center gap-2"><ArrowRightLeft size={16}/> التبديلات</h4>
                  {selectedMatch.lineupDetails?.substitutionList.map((s, i) => (
                    <div key={i} className="text-[10px] font-black p-3 bg-blue-50 rounded-xl border border-blue-100">
                       <div className="flex items-center gap-1"><span className="text-emerald-600">IN:</span> {s.playerIn}</div>
                       <div className="flex items-center gap-1"><span className="text-red-600">OUT:</span> {s.playerOut}</div>
                       <div className="text-slate-400 mt-1">{s.time}'</div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="mt-12 pt-10 border-t flex justify-between items-end relative text-center">
                <div className="space-y-1"><div className="w-24 h-px bg-slate-300 mx-auto mb-2"></div><p className="text-[10px] font-black text-slate-400">مدرب الفئة</p></div>
                <div className="space-y-1"><div className="w-24 h-px bg-slate-300 mx-auto mb-2"></div><p className="text-[10px] font-black text-slate-400">ختم المكتب</p></div>
             </div>

            <div className="mt-10 flex justify-center gap-4 no-print">
               <button onClick={() => window.print()} className="bg-blue-900 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"><Printer size={20}/> طباعة التقرير</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchPlanner;
