
import React, { useState } from 'react';
import { AppState, InjuryRecord, Person } from '../types';
import { generateUUID } from '../App';
import { HeartPulse, Plus, ShieldAlert, Activity, Calendar, History, Save, X, User } from 'lucide-react';

interface MedicalCenterProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
}

const MedicalCenter: React.FC<MedicalCenterProps> = ({ state, setState }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InjuryRecord>>({
    status: 'علاج مكثف',
    severity: 'خفيفة',
    startDate: new Date().toISOString().split('T')[0]
  });

  const players = state.people.filter(p => p.role === 'لاعب' && (state.globalCategoryFilter === 'الكل' || p.category === state.globalCategoryFilter));

  const handleSaveInjury = (e: React.FormEvent) => {
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

    setState(prev => ({ ...prev, injuries: [newInjury, ...prev.injuries] }));
    setIsModalOpen(false);
  };

  const getActiveInjuries = () => state.injuries.filter(i => i.status !== 'تعافى');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ملخص الطبي */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-500/10 p-8 rounded-[3rem] border-2 border-red-500/30 flex items-center justify-between">
           <div>
              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">إصابات نشطة</p>
              <h2 className="text-5xl font-black text-red-500">{getActiveInjuries().length}</h2>
           </div>
           <ShieldAlert size={60} className="text-red-500 opacity-20" />
        </div>
        <div className="bg-orange-500/10 p-8 rounded-[3rem] border-2 border-orange-500/30 flex items-center justify-between">
           <div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">تحت التأهيل</p>
              <h2 className="text-5xl font-black text-orange-500">
                 {state.injuries.filter(i => i.status === 'تأهيل').length}
              </h2>
           </div>
           <Activity size={60} className="text-orange-500 opacity-20" />
        </div>
        <div className="bg-[#001F3F] p-8 rounded-[3rem] border-2 border-[#FF6B00] flex items-center justify-center">
           <button onClick={() => setIsModalOpen(true)} className="bg-[#FF6B00] text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:bg-orange-600 transition-all">
             <Plus size={24}/> تسجيل إصابة جديدة
           </button>
        </div>
      </div>

      {/* قائمة الإصابات */}
      <div className="bg-[#001F3F] rounded-[3rem] border-2 border-white/10 overflow-hidden shadow-2xl">
         <div className="p-8 border-b-2 border-white/5 flex justify-between items-center bg-white/5">
            <h3 className="text-xl font-black flex items-center gap-3"><History size={24} className="text-orange-500"/> سجل العيادة الطبية</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-right">
               <thead className="bg-black/20 font-black text-[10px] uppercase tracking-widest">
                  <tr>
                     <th className="p-6">اللاعب</th>
                     <th className="p-6">نوع الإصابة</th>
                     <th className="p-6">الموقع</th>
                     <th className="p-6">الشدة</th>
                     <th className="p-6">بداية الإصابة</th>
                     <th className="p-6">الحالة الحالية</th>
                     <th className="p-6"></th>
                  </tr>
               </thead>
               <tbody className="divide-y-2 divide-white/5 font-bold text-sm">
                  {state.injuries.map(injury => {
                    const player = state.people.find(p => p.id === injury.personId);
                    return (
                      <tr key={injury.id} className="hover:bg-white/5 transition-all">
                         <td className="p-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-xs">#{player?.number}</div>
                            {player?.name}
                         </td>
                         <td className="p-6">{injury.type}</td>
                         <td className="p-6">{injury.location}</td>
                         <td className="p-6">
                            <span className={`px-3 py-1 rounded-lg text-[9px] ${injury.severity === 'حرجة' ? 'bg-red-500 text-white' : injury.severity === 'متوسطة' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}`}>
                               {injury.severity}
                            </span>
                         </td>
                         <td className="p-6 tabular-nums opacity-60">{injury.startDate}</td>
                         <td className="p-6">
                            <select 
                              value={injury.status}
                              onChange={e => setState(p => ({...p, injuries: p.injuries.map(i => i.id === injury.id ? {...i, status: e.target.value as any} : i)}))}
                              className="bg-black/30 border-2 border-white/10 rounded-xl px-4 py-2 text-[10px] font-black outline-none"
                            >
                               <option value="علاج مكثف">علاج مكثف</option>
                               <option value="تأهيل">تأهيل</option>
                               <option value="تعافى">تعافى</option>
                            </select>
                         </td>
                         <td className="p-6">
                            <button onClick={() => setState(p => ({...p, injuries: p.injuries.filter(i => i.id !== injury.id)}))} className="text-red-500 hover:scale-110 transition-transform"><X size={18}/></button>
                         </td>
                      </tr>
                    );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* مودال الإصابة */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-6">
           <div className="bg-white rounded-[3rem] w-full max-w-xl p-10 border-8 border-[#001F3F] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-2xl font-black text-[#001F3F]">تسجيل حالة طبية</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-[#001F3F] hover:rotate-90 transition-all"><X size={32}/></button>
              </div>
              <form onSubmit={handleSaveInjury} className="space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase mr-2">اللاعب المصاب</label>
                    <select required className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-4 font-black text-[#001F3F]" value={formData.personId} onChange={e => setFormData({...formData, personId: e.target.value})}>
                       <option value="">-- اختر اللاعب --</option>
                       {players.map(p => <option key={p.id} value={p.id}>{p.name} (#{p.number})</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase mr-2">نوع الإصابة</label>
                       <input required className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-4 font-black text-[#001F3F]" value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="تمزق، التواء..." />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase mr-2">موقع الإصابة</label>
                       <input className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-4 font-black text-[#001F3F]" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="العضلة الضامة، الكاحل..." />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase mr-2">تاريخ البداية</label>
                       <input type="date" required className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-4 font-black text-[#001F3F]" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase mr-2">العودة المتوقعة</label>
                       <input type="date" className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl p-4 font-black text-[#001F3F]" value={formData.expectedReturn || ''} onChange={e => setFormData({...formData, expectedReturn: e.target.value})} />
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-[#001F3F] text-white py-5 rounded-2xl font-black text-xl shadow-2xl hover:bg-black transition-all">تثبيت السجل الطبي</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default MedicalCenter;
