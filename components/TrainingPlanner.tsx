
import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Plus, Trash2, Edit, X, FileText, Printer, ClipboardCheck, Users } from 'lucide-react';
import { AppState, TrainingSession, Category } from '../types';
import ClubLogo from './ClubLogo';

interface TrainingPlannerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export default function TrainingPlanner({ state, setState }: TrainingPlannerProps) {
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  
  const isManager = currentUser?.role === 'مدير';
  const [selectedCategory, setSelectedCategory] = useState<Category | 'الكل'>(restrictedCat || 'الكل');
  
  const canEdit = isManager || (currentUser?.role === 'مدرب' && !!restrictedCat);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TrainingSession>>({
    category: restrictedCat || (state.categories.length > 0 ? state.categories[0] : 'رجال')
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.location) return;

    if (editingSessionId) {
      setState(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => s.id === editingSessionId ? { ...s, ...formData } as TrainingSession : s)
      }));
    } else {
      const newSession: TrainingSession = {
        id: Math.random().toString(36).substr(2, 9),
        category: formData.category as Category,
        date: formData.date || '',
        time: formData.time || '16:00',
        location: formData.location || '',
        objective: formData.objective || 'تمرين عام'
      };
      setState(prev => ({ 
        ...prev, 
        sessions: [newSession, ...prev.sessions],
        notifications: [
          ...prev.notifications,
          {
            id: Math.random().toString(36).substr(2, 9),
            message: `قام ${currentUser?.username} بإضافة تمرين جديد لفئة ${newSession.category}.`,
            type: 'info',
            timestamp: Date.now()
          }
        ]
      }));
    }
    setIsModalOpen(false);
    setEditingSessionId(null);
  };

  const getAttendanceSummary = (sessionId: string) => {
    const sessionRecords = state.attendance.filter(a => a.sessionId === sessionId);
    const present = sessionRecords.filter(a => a.status === 'حاضر').length;
    const late = sessionRecords.filter(a => a.status === 'متأخر').length;
    const absent = sessionRecords.filter(a => a.status === 'غائب').length;
    return { present, late, absent, total: sessionRecords.length };
  };

  const filteredSessions = state.sessions.filter(s => {
    const matchesCat = selectedCategory === 'الكل' ? true : s.category === selectedCategory;
    return matchesCat;
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        {isManager && (
          <div className="flex bg-white p-1.5 rounded-2xl border overflow-x-auto no-scrollbar max-w-full">
            <button onClick={() => setSelectedCategory('الكل')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${selectedCategory === 'الكل' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>الكل</button>
            {state.categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{cat}</button>
            ))}
          </div>
        )}
        
        {canEdit && (
          <button onClick={() => { setEditingSessionId(null); setIsModalOpen(true); }}
            className="w-full md:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl shadow-blue-100">
            <Plus size={20} /> إضافة تمرين
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map(session => (
          <div key={session.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative group overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-50 text-orange-600 p-3 rounded-2xl"><Calendar size={24} /></div>
              <div>
                <span className="bg-blue-900 text-white text-[9px] px-2 py-0.5 rounded font-black uppercase">{session.category}</span>
                <h4 className="font-black text-lg text-slate-800 mt-1">{session.objective}</h4>
              </div>
            </div>
            <div className="space-y-3 mt-4 pt-4 border-t border-slate-50 text-sm">
              <div className="flex items-center gap-3 text-slate-500">
                <MapPin size={18} className="text-orange-500" />
                <span className="font-black text-slate-950">{session.location}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <Clock size={18} className="text-blue-500" />
                <span className="font-black text-slate-950">{session.date} | {session.time}</span>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
               <button onClick={() => { setSelectedSession(session); setIsReportModalOpen(true); }} className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-2">
                  <FileText size={14} /> عرض التقرير
               </button>
               {canEdit && (
                 <div className="flex gap-1">
                    <button onClick={() => {setEditingSessionId(session.id); setFormData(session); setIsModalOpen(true);}} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Edit size={16}/></button>
                    <button onClick={() => {if(confirm('حذف التمرين؟')) setState(prev => ({...prev, sessions: prev.sessions.filter(s => s.id !== session.id)}))}} className="p-2 bg-red-50 text-red-600 rounded-xl"><Trash2 size={16}/></button>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 no-print" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">{editingSessionId ? 'تعديل موعد التمرين' : 'إضافة موعد تمرين جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 p-2 rounded-xl text-slate-500 hover:text-red-600 transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">الفئة العمرية</label>
                <select className="w-full bg-slate-100 rounded-2xl p-4 outline-none font-black text-slate-950" value={formData.category} disabled={!!restrictedCat} onChange={e => setFormData({ ...formData, category: e.target.value as Category })}>
                  {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">تاريخ التمرين</label>
                  <input type="date" required value={formData.date || ''} className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none" onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">توقيت التمرين</label>
                  <input type="time" required value={formData.time || ''} className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none" onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">الموقع / الملعب</label>
                <input type="text" required value={formData.location || ''} placeholder="اسم الملعب" className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none" onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">هدف التمرين الرئيسي</label>
                <input type="text" value={formData.objective || ''} placeholder="موضوع التمرين" className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none" onChange={e => setFormData({ ...formData, objective: e.target.value })} />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all">تثبيت موعد التمرين</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReportModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[220] p-4 overflow-y-auto">
          <div className="bg-white rounded-[3.5rem] w-full max-w-3xl shadow-2xl p-12 relative overflow-hidden">
             <button onClick={() => setIsReportModalOpen(false)} className="absolute top-8 left-8 p-3 bg-slate-100 rounded-2xl text-slate-500 no-print hover:text-red-600 transition-all"><X size={24}/></button>
             
             <div className="text-center mb-10">
                <div className="mx-auto mb-4 w-20 h-20"><ClubLogo size={80} /></div>
                <h2 className="text-3xl font-black text-blue-900">تقرير تمرين رسمي</h2>
                <p className="text-xs font-black text-orange-500 mt-1 uppercase tracking-widest">فئة {selectedSession.category} - مكتب كرة القدم</p>
             </div>

             <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">موضوع التمرين</p>
                   <p className="text-xl font-black text-slate-800">{selectedSession.objective}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">المكان والتاريخ</p>
                   <p className="text-sm font-black text-slate-800">{selectedSession.location} | {selectedSession.date}</p>
                </div>
             </div>

             <div className="space-y-6">
                <h4 className="text-sm font-black text-blue-900 flex items-center gap-2 border-r-4 border-blue-900 pr-3">إحصائيات الحضور</h4>
                <div className="grid grid-cols-3 gap-4">
                   {Object.entries(getAttendanceSummary(selectedSession.id)).map(([key, val]) => (
                     key !== 'total' && (
                       <div key={key} className={`p-6 rounded-[2rem] text-center border ${key === 'present' ? 'bg-emerald-50 border-emerald-100' : key === 'late' ? 'bg-orange-50 border-orange-100' : 'bg-red-50 border-red-100'}`}>
                          <p className={`text-[10px] font-black uppercase mb-1 ${key === 'present' ? 'text-emerald-600' : key === 'late' ? 'text-orange-600' : 'text-red-600'}`}>{key === 'present' ? 'حاضر' : key === 'late' ? 'متأخر' : 'غائب'}</p>
                          <p className="text-3xl font-black text-slate-900">{val}</p>
                       </div>
                     )
                   ))}
                </div>
             </div>

             <div className="mt-12 pt-10 border-t flex justify-between items-end relative text-center">
                <div className="space-y-1"><div className="w-24 h-px bg-slate-300 mx-auto mb-2"></div><p className="text-[10px] font-black text-slate-400">مدرب الفئة</p></div>
                <div className="space-y-1"><div className="w-24 h-px bg-slate-300 mx-auto mb-2"></div><p className="text-[10px] font-black text-slate-400">ختم المكتب</p></div>
             </div>

             <div className="mt-10 flex justify-center gap-4 no-print">
                <button onClick={() => window.print()} className="bg-blue-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:scale-105 transition-all"><Printer size={20}/> طباعة التقرير</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
