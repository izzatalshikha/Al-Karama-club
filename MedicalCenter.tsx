
import React, { useState } from 'react';
import { AppState, InjuryRecord, Person } from '../types';
import { generateUUID, supabase } from '../App';
import { HeartPulse, Plus, ShieldAlert, Activity, Calendar, History, Save, X, User } from 'lucide-react';

interface MedicalCenterProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  syncToCloud?: (table: string, data: any) => Promise<boolean>;
}

const MedicalCenter: React.FC<MedicalCenterProps> = ({ state, setState, syncToCloud }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const allowedCategories = state.currentUser?.restrictedCategory 
    ? String(state.currentUser.restrictedCategory).split(',').map(s => s.trim())
    : state.categories;

  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>('الكل');

  const [formData, setFormData] = useState<Partial<InjuryRecord>>({
    status: 'علاج مكثف',
    severity: 'خفيفة',
    startDate: new Date().toISOString().split('T')[0]
  });

  const players = state.people.filter(p => p.role === 'لاعب' && (state.globalCategoryFilter === 'الكل' || p.category === state.globalCategoryFilter));

  const handleSaveInjury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personId || !formData.type) return;

    const newInjury: InjuryRecord = {
      id: generateUUID(),
      personId: formData.personId!,
      type: formData.type!,
      location: formData.location || 'غير محدد',
      severity: formData.severity as any || 'خفيفة',
      startDate: formData.startDate!,
      expectedReturn: formData.expectedReturn || '',
      status: formData.status as any || 'تأهيل',
      notes: formData.notes || ''
    };

    const success = await syncToCloud?.('injuries', newInjury);
    if (!success) return;

    setState(prev => ({ ...prev, injuries: [newInjury, ...prev.injuries] }));
    setIsModalOpen(false);
  };

  const [localCategoryFilter, setLocalCategoryFilter] = useState<string>('الكل');

  const filteredInjuries = state.injuries.filter(injury => {
    const player = state.people.find(p => p.id === injury.personId);
    if (!player) return false;
    if (state.currentUser?.restrictedCategory && player.category !== state.currentUser.restrictedCategory) return false;
    if (state.globalCategoryFilter !== 'الكل' && player.category !== state.globalCategoryFilter) return false;
    if (localCategoryFilter !== 'الكل' && player.category !== localCategoryFilter) return false;
    return true;
  });

  const getActiveInjuries = () => filteredInjuries.filter(i => i.status !== 'تعافى');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      {/* فلتر الفئات محلي */}
      <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl w-full sm:w-fit shadow-inner">
         <div className="flex gap-1 overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setLocalCategoryFilter('الكل')}
              className={`px-4 md:px-10 py-2.5 rounded-lg font-black text-[10px] md:text-xs transition-all whitespace-nowrap ${localCategoryFilter === 'الكل' ? 'bg-white text-blue-950 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              جميع الفئات
            </button>
            {allowedCategories.map(cat => (
              <button 
                key={cat}
                onClick={() => setLocalCategoryFilter(cat)}
                className={`px-4 md:px-10 py-2.5 rounded-lg font-black text-[10px] md:text-xs transition-all whitespace-nowrap ${localCategoryFilter === cat ? 'bg-white text-blue-950 shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                {cat}
              </button>
            ))}
         </div>
      </div>

      {/* Medical Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-red-50 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-red-100 flex items-center justify-between shadow-sm">
           <div>
              <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">إصابات نشطة</p>
              <h2 className="text-4xl md:text-5xl font-black text-red-700">{getActiveInjuries().length}</h2>
           </div>
           <ShieldAlert size={48} md:size={60} className="text-red-300" />
        </div>
        <div className="bg-orange-50 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-orange-100 flex items-center justify-between shadow-sm">
           <div>
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">تحت التأهيل</p>
              <h2 className="text-4xl md:text-5xl font-black text-orange-700">
                 {filteredInjuries.filter(i => i.status === 'تأهيل').length}
              </h2>
           </div>
           <Activity size={48} md:size={60} className="text-orange-300" />
        </div>
        <div className="modern-card p-6 md:p-8 bg-blue-900 border-blue-900 flex items-center justify-center shadow-lg shadow-blue-900/10 sm:col-span-2 lg:col-span-1">
           <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-orange-500 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-orange-600 transition-all active:scale-95">
             <Plus size={24}/> تسجيل إصابة جديدة
           </button>
        </div>
      </div>

      {/* Injuries List */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden no-print">
         <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <h3 className="text-lg md:text-xl font-black flex items-center gap-3 text-blue-900 leading-tight">
              <History size={24} className="text-orange-500 shrink-0"/> سجل العيادة الطبية
            </h3>
         </div>
         
         {/* Mobile Cards */}
         <div className="block md:hidden divide-y divide-slate-100">
            {filteredInjuries.map(injury => {
              const player = state.people.find(p => p.id === injury.personId);
              return (
                <div key={injury.id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[10px] font-black text-blue-900 border border-slate-200">#{player?.number}</div>
                      <div>
                        <p className="font-black text-blue-900 text-sm">{player?.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{injury.type}</p>
                      </div>
                    </div>
                    <button onClick={async () => { 
                      if(confirm('حذف هذا السجل؟')) {
                        const { error } = await supabase.from('injuries').delete().eq('id', injury.id);
                        if (error) return alert('فشل الحذف: ' + error.message);
                        setState(p => ({...p, injuries: p.injuries.filter(i => i.id !== injury.id)}));
                      }
                    }} className="p-2 text-slate-300 hover:text-red-500"><X size={18}/></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">الموقع والشدة</p>
                      <p className="text-[10px] font-black text-blue-900 truncate">{injury.location}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${injury.severity === 'حرجة' ? 'bg-red-50 text-red-500 border border-red-100' : injury.severity === 'متوسطة' ? 'bg-orange-50 text-orange-500 border border-orange-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                         {injury.severity}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">الحالة الطبية</p>
                      <select 
                        value={injury.status}
                        onChange={async e => {
                          const newStatus = e.target.value as any;
                          const success = await syncToCloud?.('injuries', { ...injury, status: newStatus });
                          if (success) {
                            setState(p => ({...p, injuries: p.injuries.map(i => i.id === injury.id ? {...i, status: newStatus} : i)}));
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[9px] font-black outline-none focus:border-blue-900 transition-all cursor-pointer shadow-sm"
                      >
                         <option value="علاج مكثف">علاج</option>
                         <option value="تأهيل">تأهيل</option>
                         <option value="تعافى">تعافى</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
         </div>

         {/* Desktop Table */}
         <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right">
               <thead className="bg-slate-50 font-black text-[10px] uppercase tracking-widest text-slate-500">
                  <tr>
                     <th className="p-6">اللاعب</th>
                     <th className="p-6">نوع الإصابة</th>
                     <th className="p-6">الموقع / الشدة</th>
                     <th className="p-6">التاريخ</th>
                     <th className="p-6">الحالة الحالية</th>
                     <th className="p-6"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 font-bold text-sm text-blue-900">
                  {filteredInjuries.map(injury => {
                    const player = state.people.find(p => p.id === injury.personId);
                    return (
                      <tr key={injury.id} className="hover:bg-slate-50 transition-all group">
                         <td className="p-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[10px] font-black text-blue-900 border border-slate-200 group-hover:bg-white">#{player?.number}</div>
                            {player?.name}
                         </td>
                         <td className="p-6">{injury.type}</td>
                         <td className="p-6">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-slate-500">{injury.location}</span>
                              <span className={`w-fit px-3 py-1 rounded-lg text-[9px] font-black uppercase ${injury.severity === 'حرجة' ? 'bg-red-50 text-red-500 border border-red-100' : injury.severity === 'متوسطة' ? 'bg-orange-50 text-orange-500 border border-orange-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                 {injury.severity}
                              </span>
                            </div>
                         </td>
                         <td className="p-6 tabular-nums text-slate-400 text-xs">{injury.startDate}</td>
                         <td className="p-6">
                            <select 
                              value={injury.status}
                              onChange={async e => {
                                const newStatus = e.target.value as any;
                                const success = await syncToCloud?.('injuries', { ...injury, status: newStatus });
                                if (success) {
                                  setState(p => ({...p, injuries: p.injuries.map(i => i.id === injury.id ? {...i, status: newStatus} : i)}));
                                }
                              }}
                              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:border-blue-900 transition-all cursor-pointer shadow-sm"
                            >
                               <option value="علاج مكثف">علاج مكثف</option>
                               <option value="تأهيل">تأهيل</option>
                               <option value="تعافى">تعافى</option>
                            </select>
                         </td>
                         <td className="p-6">
                            <button onClick={async () => { 
                              if(confirm('حذف هذا السجل؟')) {
                                const { error } = await supabase.from('injuries').delete().eq('id', injury.id);
                                if (error) return alert('فشل الحذف: ' + error.message);
                                setState(p => ({...p, injuries: p.injuries.filter(i => i.id !== injury.id)}));
                              }
                            }} className="text-slate-300 hover:text-red-500 transition-colors"><X size={18}/></button>
                         </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
         {filteredInjuries.length === 0 && (
            <div className="py-20 text-center bg-slate-50 border-t border-slate-100">
               <HeartPulse size={64} className="mx-auto text-slate-200 mb-4" />
               <p className="text-slate-400 font-black text-lg italic italic">لا يوجد سجلات طبية مسجلة</p>
            </div>
         )}
      </div>

      {/* Injury Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md z-[600] flex items-center justify-center p-0 md:p-6 no-print">
           <div className="bg-white w-full h-full md:h-auto md:max-w-xl md:rounded-[3rem] border-0 md:border-4 md:border-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
              <div className="flex justify-between items-center p-6 md:p-10 border-b border-slate-100 shrink-0">
                 <h3 className="text-xl md:text-2xl font-black text-blue-900 italic uppercase">تسجيل حالة طبية</h3>
                 <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-2 md:p-3 rounded-xl text-slate-500 hover:text-red-500 transition-all"><X size={24}/></button>
              </div>
              <form onSubmit={handleSaveInjury} className="flex-1 p-6 md:p-10 space-y-6 overflow-y-auto pb-32">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mr-2">فئة اللاعب (لتسهيل البحث)</label>
                       <select className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black text-blue-900 outline-none focus:border-orange-500 transition-all shadow-sm" value={modalCategoryFilter} onChange={e => {setModalCategoryFilter(e.target.value); setFormData({...formData, personId: ''});}}>
                          <option value="الكل">جميع الفئات</option>
                          {allowedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mr-2">اللاعب المصاب</label>
                       <select required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black text-blue-900 outline-none focus:border-orange-500 transition-all shadow-sm" value={formData.personId} onChange={e => setFormData({...formData, personId: e.target.value})}>
                          <option value="">-- اختر اللاعب --</option>
                          {state.people.filter(p => p.role === 'لاعب' && (modalCategoryFilter === 'الكل' || p.category === modalCategoryFilter)).map(p => <option key={p.id} value={p.id}>{p.name} {p.number ? `(#${p.number})` : ''}</option>)}
                       </select>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mr-2">نوع الإصابة</label>
                       <input required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black text-blue-900 outline-none focus:border-orange-500 transition-all shadow-sm" value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="تمزق، التواء..." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mr-2">موقع الإصابة</label>
                       <input className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black text-blue-900 outline-none focus:border-orange-500 transition-all shadow-sm" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="العضلة الضامة، الكاحل..." />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mr-2">بدء الإصابة</label>
                       <input type="date" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black text-blue-900 outline-none focus:border-orange-500 transition-all shadow-sm text-xs" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mr-2">العودة المتوقعة</label>
                       <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black text-blue-900 outline-none focus:border-orange-500 transition-all shadow-sm text-xs" value={formData.expectedReturn || ''} onChange={e => setFormData({...formData, expectedReturn: e.target.value})} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mr-2">ملاحظات التقرير الطبي</label>
                    <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-black text-blue-900 outline-none focus:border-orange-500 transition-all shadow-sm resize-none" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="تفاصيل الإصابة وخطة العلاج..." />
                 </div>
                 <button type="submit" className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/10 hover:bg-blue-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98] mt-4">
                    <Save size={24}/> تثبيت السجل الطبي
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default MedicalCenter;
