
import React, { useState, useEffect } from 'react';
import { Trophy, MapPin, Clock, Plus, Trash2, Banknote, Calendar as CalendarIcon, Edit3, ClipboardList, Target, AlertTriangle, UserCheck, Repeat, FileText, Printer, ChevronDown, Maximize2, Minimize2, X } from 'lucide-react';
import { AppState, Match, Category } from '../types';
import ClubLogo from './ClubLogo';

interface MatchPlannerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const MatchPlanner: React.FC<MatchPlannerProps> = ({ state, setState }) => {
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  
  const canEdit = currentUser?.role === 'مدير' || (currentUser?.role === 'مدرب' && !!restrictedCat);
  const isReadOnly = !canEdit;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  
  const [formData, setFormData] = useState<Partial<Match>>({
    category: restrictedCat || (state.categories.length > 0 ? state.categories[0] : 'رجال')
  });

  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.opponent || !formData.location) return;

    // التحقق من أن تاريخ المباراة ليس في الماضي
    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.date < todayStr) {
      alert('خطأ: لا يمكن جدولة مباراة بتاريخ قديم. يرجى اختيار تاريخ اليوم أو تاريخ مستقبلي.');
      return;
    }

    const newMatch: Match = {
      id: Math.random().toString(36).substr(2, 9),
      category: formData.category as Category,
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
          message: `تمت جدولة مباراة جديدة لفئة ${newMatch.category} ضد فريق ${newMatch.opponent} بتاريخ ${newMatch.date}`,
          type: 'success',
          timestamp: Date.now(),
          isRead: false,
          persistent: true
        }
      ]
    }));
    setIsAddModalOpen(false);
    setFormData({ category: restrictedCat || (state.categories[0] || 'رجال') });
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
          message: `تم اعتماد نتيجة مباراة ${selectedMatch.category} ضد ${selectedMatch.opponent}: (${selectedMatch.ourScore} - ${selectedMatch.opponentScore})`,
          type: 'success',
          timestamp: Date.now(),
          isRead: false,
          persistent: true
        }
      ]
    }));
    setIsResultModalOpen(false);
    setSelectedMatch(null);
  };

  const matchCategoryPlayers = selectedMatch 
    ? state.people.filter(p => p.category === selectedMatch.category && p.role === 'لاعب')
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <h3 className="text-slate-600 font-bold">المواجهات الرسمية</h3>
        {canEdit && (
          <button onClick={() => setIsAddModalOpen(true)} className="bg-orange-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-orange-200">
            <Plus size={20} /> إضافة مباراة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 no-print">
        {state.matches.filter(m => !restrictedCat || m.category === restrictedCat).map(match => (
          <div key={match.id} className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden relative group">
             {canEdit && !match.isCompleted && (
               <button onClick={() => {if(confirm('هل تريد حذف هذه المباراة من الجدول؟')) setState(prev => ({...prev, matches: prev.matches.filter(m => m.id !== match.id)}))}} 
                 className="absolute top-6 left-6 p-2 text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Trash2 size={18} />
               </button>
             )}
             <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <span className="bg-blue-900 text-white px-4 py-1 rounded-full text-[10px] font-black">{match.category}</span>
                  <span className="text-slate-400 font-black text-[10px] uppercase">{match.isCompleted ? 'منتهية' : 'قادمة'}</span>
                </div>
                <div className="flex items-center justify-between gap-8">
                  <div className="flex-1 text-center font-black text-slate-800 text-lg">الكرامة <span className="block text-4xl text-blue-900 mt-2">{match.isCompleted ? match.ourScore : '-'}</span></div>
                  <div className="text-orange-500 font-black text-xl">ضد</div>
                  <div className="flex-1 text-center font-black text-slate-800 text-lg">{match.opponent} <span className="block text-4xl text-slate-400 mt-2">{match.isCompleted ? match.opponentScore : '-'}</span></div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                   <div className="flex gap-4 text-[11px] font-bold text-slate-500">
                     <span className="flex items-center gap-1"><MapPin size={14}/> {match.location}</span>
                     <span className="flex items-center gap-1"><CalendarIcon size={14}/> {match.date}</span>
                   </div>
                   {!isReadOnly && !match.isCompleted && (
                     <button onClick={() => {setSelectedMatch(match); setIsResultModalOpen(true);}} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black hover:bg-black transition-all">تسجيل النتيجة والتقرير</button>
                   )}
                </div>
             </div>
          </div>
        ))}
        {state.matches.filter(m => !restrictedCat || m.category === restrictedCat).length === 0 && (
          <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold italic">
            لا توجد مباريات مجدولة حالياً
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 no-print" onClick={(e) => e.target === e.currentTarget && setIsAddModalOpen(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-xl">إضافة مباراة جديدة</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-200 p-2 rounded-xl text-slate-500 hover:text-red-600 transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddMatch} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">الفئة</label>
                  <select className="w-full bg-slate-100 rounded-2xl p-4 font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" value={formData.category} disabled={!!restrictedCat} onChange={e => setFormData({ ...formData, category: e.target.value as Category })}>
                    {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">المنافس</label>
                  <input type="text" required placeholder="اسم المنافس" className="w-full bg-slate-100 rounded-2xl p-4 font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({ ...formData, opponent: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">الملعب / المكان</label>
                <input type="text" required placeholder="الملعب" className="w-full bg-slate-100 rounded-2xl p-4 font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">التاريخ</label>
                  <input type="date" required 
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-100 rounded-2xl p-4 font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" 
                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">الوقت</label>
                  <input type="time" required className="w-full bg-slate-100 rounded-2xl p-4 font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all">إلغاء</button>
                <button type="submit" className="flex-1 bg-blue-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all">حفظ الجدولة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isResultModalOpen && selectedMatch && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[210] p-4 no-print overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setIsResultModalOpen(false)}>
          <div className="bg-white rounded-[3.5rem] w-full max-w-5xl shadow-2xl my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">تقرير المباراة - فئة {selectedMatch.category}</h3>
              <button onClick={() => setIsResultModalOpen(false)} className="bg-slate-200 p-2 rounded-xl hover:text-red-600 transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateResult} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-2 gap-8 bg-slate-50 p-8 rounded-[3rem]">
                <div className="space-y-2 text-center">
                  <label className="text-xs font-black text-blue-900">الكرامة</label>
                  <input type="number" className="w-full bg-white rounded-2xl p-6 text-center text-4xl font-black text-slate-950 outline-none border-2 border-slate-200 focus:border-blue-500" value={selectedMatch.ourScore} onChange={e => setSelectedMatch({ ...selectedMatch, ourScore: e.target.value })} />
                </div>
                <div className="space-y-2 text-center">
                  <label className="text-xs font-black text-slate-500">{selectedMatch.opponent}</label>
                  <input type="number" className="w-full bg-white rounded-2xl p-6 text-center text-4xl font-black text-slate-950 outline-none border-2 border-slate-200 focus:border-blue-500" value={selectedMatch.opponentScore} onChange={e => setSelectedMatch({ ...selectedMatch, opponentScore: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-orange-700 flex items-center gap-2"><Target size={16} /> المسجلون</h4>
                  {selectedMatch.goalList.map((g, i) => (
                    <div key={i} className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                       <select className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-950 outline-none" value={state.people.find(p => p.name === g.player)?.id || ''} onChange={e => {
                         const p = state.people.find(person => person.id === e.target.value);
                         const newList = [...selectedMatch.goalList];
                         newList[i] = { player: p?.name || '', number: p?.number?.toString() || '', time: newList[i].time };
                         setSelectedMatch({...selectedMatch, goalList: newList});
                       }}>
                         <option value="">-- اختر لاعب --</option>
                         {matchCategoryPlayers.map(p => <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>)}
                       </select>
                       <input type="text" placeholder="دقيقة" className="w-20 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-center text-slate-950" value={g.time} onChange={e => {
                         const newList = [...selectedMatch.goalList];
                         newList[i].time = e.target.value;
                         setSelectedMatch({...selectedMatch, goalList: newList});
                       }} />
                       <button type="button" onClick={() => setSelectedMatch({...selectedMatch, goalList: selectedMatch.goalList.filter((_, idx) => idx !== i)})} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setSelectedMatch({...selectedMatch, goalList: [...selectedMatch.goalList, {player:'', number:'', time:''}]})} className="text-xs font-black text-orange-600 bg-orange-50 px-4 py-2 rounded-xl hover:bg-orange-100 transition-colors">+ إضافة هدف</button>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest">التشكيلة الأساسية (11 لاعب)</h4>
                  <div className="space-y-2">
                    {selectedMatch.lineupDetails?.starters.map((slot, i) => (
                      <div key={i} className="flex items-center gap-3">
                         <span className="text-[10px] text-slate-400 w-4">{i+1}</span>
                         <select className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-950 outline-none" value={state.people.find(p => p.name === slot.name)?.id || ''} onChange={e => {
                           const p = state.people.find(person => person.id === e.target.value);
                           const newList = [...selectedMatch.lineupDetails!.starters];
                           newList[i] = { name: p?.name || '', number: p?.number?.toString() || '' };
                           setSelectedMatch({...selectedMatch, lineupDetails: {...selectedMatch.lineupDetails!, starters: newList}});
                         }}>
                           <option value="">-- اختر لاعب --</option>
                           {matchCategoryPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                         </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t p-6 flex gap-4 mt-auto">
                <button type="button" onClick={() => setIsResultModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-3xl hover:bg-slate-200 transition-all">إلغاء وإغلاق</button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-3xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all">اعتماد تقرير المباراة النهائي</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchPlanner;
