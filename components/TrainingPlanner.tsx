
import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Plus, Trash2, Edit, X } from 'lucide-react';
import { AppState, TrainingSession, Category } from '../types';

interface TrainingPlannerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export default function TrainingPlanner({ state, setState }: TrainingPlannerProps) {
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  
  const isManager = currentUser?.role === 'مدير';
  const canEdit = isManager || (currentUser?.role === 'مدرب' && !!restrictedCat);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TrainingSession>>({
    category: restrictedCat || (state.categories.length > 0 ? state.categories[0] : 'رجال')
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.location) return;

    // التحقق من أن التاريخ ليس في الماضي (مقارنة اليوم فقط)
    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.date < todayStr) {
      alert('خطأ: لا يمكن إضافة تمرين بتاريخ قديم. يرجى اختيار تاريخ اليوم أو تاريخ مستقبلي.');
      return;
    }

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
            message: `تمت إضافة موعد تمرين جديد لفئة ${newSession.category} بتاريخ ${newSession.date}`,
            type: 'info',
            timestamp: Date.now(),
            isRead: false,
            persistent: true
          }
        ]
      }));
    }
    setIsModalOpen(false);
    setEditingSessionId(null);
    setFormData({
      category: restrictedCat || (state.categories.length > 0 ? state.categories[0] : 'رجال')
    });
  };

  const filteredSessions = (restrictedCat 
    ? state.sessions.filter(s => s.category === restrictedCat)
    : state.sessions).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <h3 className="text-slate-600 font-bold">المواعيد المجدولة للتمارين</h3>
        {canEdit && (
          <button onClick={() => { setEditingSessionId(null); setIsModalOpen(true); }}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-blue-200">
            <Plus size={20} /> إضافة موعد تمرين
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map(session => (
          <div key={session.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative group overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-50 text-orange-600 p-3 rounded-2xl"><Calendar size={24} /></div>
              <div>
                <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-1 rounded-md font-black uppercase">{session.category}</span>
                <h4 className="font-bold text-lg text-slate-800 mt-1">{session.objective}</h4>
              </div>
            </div>
            <div className="space-y-3 mt-4 pt-4 border-t border-slate-50 text-sm">
              <div className="flex items-center gap-3 text-slate-500">
                <MapPin size={18} className="text-orange-500" />
                <span className="font-bold text-slate-950">{session.location}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <Clock size={18} className="text-blue-500" />
                <span className="font-black text-slate-950">{session.date} | {session.time}</span>
              </div>
            </div>
            {canEdit && (
              <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
                <button onClick={() => {setEditingSessionId(session.id); setFormData(session); setIsModalOpen(true);}} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit size={16}/></button>
                <button onClick={() => {if(confirm('هل أنت متأكد من حذف هذا الموعد؟')) setState(prev => ({...prev, sessions: prev.sessions.filter(s => s.id !== session.id)}))}} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16}/></button>
              </div>
            )}
          </div>
        ))}
        {filteredSessions.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100 text-slate-400 font-bold italic">
            لا توجد تمارين مجدولة حالياً
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">{editingSessionId ? 'تعديل موعد التمرين' : 'إضافة موعد تمرين جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 p-2 rounded-xl text-slate-500 hover:text-red-600 transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">الفئة</label>
                <select className="w-full bg-slate-100 rounded-2xl p-4 outline-none font-bold text-slate-950 disabled:opacity-70"
                  value={formData.category} disabled={!!restrictedCat} onChange={e => setFormData({ ...formData, category: e.target.value as Category })}>
                  {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">التاريخ</label>
                  <input type="date" required 
                    value={formData.date || ''} 
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-100 rounded-2xl p-4 font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" 
                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">الوقت</label>
                  <input type="time" required value={formData.time || ''} className="w-full bg-slate-100 rounded-2xl p-4 font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">المكان</label>
                <input type="text" required value={formData.location || ''} placeholder="مكان التمرين" className="w-full bg-slate-100 rounded-2xl p-4 font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">الموضوع / الهدف</label>
                <input type="text" value={formData.objective || ''} placeholder="موضوع التمرين الرئيسي" className="w-full bg-slate-100 rounded-2xl p-4 font-bold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setFormData({ ...formData, objective: e.target.value })} />
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all">إلغاء</button>
                <button type="submit" className="flex-1 bg-blue-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all">حفظ البيانات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
