
import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Plus, Trash2, Edit, X, Printer, FileText, CheckCircle } from 'lucide-react';
import { AppState, TrainingSession, Category } from '../types';

interface TrainingPlannerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  defaultSelectedId?: string | null;
  addLog?: (m: string, d?: string, t?: any) => void;
}

export default function TrainingPlanner({ state, setState, defaultSelectedId, addLog }: TrainingPlannerProps) {
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  
  const isManager = currentUser?.role === 'مدير';
  const canEdit = isManager || (currentUser?.role === 'إداري فئة' && !!restrictedCat);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState<TrainingSession | null>(null);
  const [formData, setFormData] = useState<Partial<TrainingSession>>({
    category: restrictedCat || (state.categories.length > 0 ? state.categories[0] : 'رجال')
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.time || !formData.location) return;

    // التحقق الصارم من الوقت المستقبلي
    const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
    const now = new Date();
    if (selectedDateTime <= now) {
      alert('تنبيه: لا يمكن جدولة تمرين في وقت قديم. يرجى اختيار موعد قادم وحقيقي.');
      return;
    }

    if (editingSessionId) {
      setState(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => s.id === editingSessionId ? { ...s, ...formData } as TrainingSession : s)
      }));
      addLog?.('تعديل موعد تمرين', `تم تحديث تمرين فئة ${formData.category}`, 'info');
    } else {
      const newSession: TrainingSession = {
        id: Math.random().toString(36).substr(2, 9),
        category: formData.category as Category,
        date: formData.date || '',
        time: formData.time || '16:00',
        location: formData.location || '',
        objective: formData.objective || 'تمرين عام',
        isCompleted: false
      };
      setState(prev => ({ ...prev, sessions: [newSession, ...prev.sessions] }));
      addLog?.('إضافة موعد تمرين', `تمت جدولة تمرين لفئة ${newSession.category}`, 'info');
    }
    setIsModalOpen(false);
    setEditingSessionId(null);
  };

  const filteredSessions = (restrictedCat 
    ? state.sessions.filter(s => s.category === restrictedCat)
    : state.sessions).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <h3 className="text-slate-900 font-black text-md">أجندة الحصص التدريبية المجدولة</h3>
        {canEdit && (
          <button onClick={() => { setEditingSessionId(null); setIsModalOpen(true); }}
            className="bg-[#001F3F] text-white px-6 py-2 rounded-xl flex items-center gap-2 font-black shadow-lg hover:bg-black transition-all">
            <Plus size={20} /> إضافة حصة جديدة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map(session => (
          <div key={session.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-slate-900 relative group overflow-hidden border-b-8 hover:border-[#001F3F] transition-all no-print">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-[#001F3F] text-white p-3 rounded-2xl shadow-md"><Calendar size={24} /></div>
              <div>
                <span className="bg-orange-100 text-orange-900 text-[10px] px-2.5 py-1 rounded-lg font-black border border-orange-600 uppercase">{session.category}</span>
                <h4 className="font-black text-lg text-slate-900 mt-1">{session.objective}</h4>
              </div>
            </div>
            <div className="space-y-3 mt-4 pt-4 border-t-2 border-slate-100 text-sm">
              <div className="flex items-center gap-3 text-slate-900 font-black text-xs">
                <MapPin size={18} className="text-orange-600" />
                <span>{session.location}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-900 font-black text-xs">
                <Clock size={18} className="text-[#001F3F]" />
                <span>{session.date} | {session.time}</span>
              </div>
            </div>
            
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowReport(session)} className="flex-1 bg-slate-100 border-2 border-slate-900 text-slate-900 py-2 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 hover:bg-white transition-all">
                <FileText size={14}/> تقرير التمرين
              </button>
              {canEdit && (
                <button onClick={() => {setEditingSessionId(session.id); setFormData(session); setIsModalOpen(true);}} className="p-2 bg-[#001F3F] text-white rounded-xl shadow-md"><Edit size={16}/></button>
              )}
            </div>

            {canEdit && (
              <button onClick={() => {
                if(confirm('حذف موعد التمرين؟')) {
                  setState(prev => ({...prev, sessions: prev.sessions.filter(s => s.id !== session.id)}));
                  addLog?.('حذف تمرين', `تم مسح تمرين فئة ${session.category}`, 'warning');
                }
              }} className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-all p-2 bg-red-100 text-red-600 rounded-lg border border-red-900"><Trash2 size={16}/></button>
            )}
          </div>
        ))}
      </div>

      {/* Training Report View */}
      {showReport && (
        <div className="fixed inset-0 bg-white z-[500] overflow-y-auto p-8 font-['Tajawal'] text-slate-900" dir="rtl">
           <div className="max-w-3xl mx-auto border-4 border-slate-900 p-10 rounded-[2.5rem] bg-white relative">
              <div className="absolute top-8 left-8 no-print flex gap-2">
                 <button onClick={() => setShowReport(null)} className="bg-slate-200 p-2 rounded-lg text-slate-900"><X size={20}/></button>
                 <button onClick={() => window.print()} className="bg-[#001F3F] text-white p-2 rounded-lg"><Printer size={20}/></button>
              </div>

              <div className="text-center mb-10 border-b-4 border-slate-900 pb-8">
                 <div className="w-20 h-20 bg-slate-900 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl text-white font-black">K</div>
                 <h1 className="text-2xl font-black uppercase">تقرير الحصة التدريبية اليومية</h1>
                 <p className="text-blue-900 font-black text-sm uppercase tracking-widest mt-1">نادي الكرامة الرياضي - مكتب كرة القدم</p>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10">
                 <div className="space-y-4">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-slate-400 uppercase">الفئة العمرية</span>
                       <span className="text-lg font-black">{showReport.category}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-slate-400 uppercase">الهدف من التمرين</span>
                       <span className="text-lg font-black">{showReport.objective}</span>
                    </div>
                 </div>
                 <div className="space-y-4 text-left">
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-black text-slate-400 uppercase">التاريخ والمكان</span>
                       <span className="text-sm font-black">{showReport.date} - {showReport.location}</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-black text-slate-400 uppercase">حالة الرصد</span>
                       <span className="bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-900">مكتمل وموثق</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <h4 className="text-md font-black border-r-4 border-orange-600 pr-3 uppercase">ملخص الحضور والانضباط</h4>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border-2 border-slate-900 p-4 rounded-2xl text-center">
                       <p className="text-[10px] font-black text-slate-500 uppercase">حاضر</p>
                       <p className="text-2xl font-black text-emerald-600">{state.attendance.filter(a => a.sessionId === showReport.id && a.status === 'حاضر').length}</p>
                    </div>
                    <div className="bg-slate-50 border-2 border-slate-900 p-4 rounded-2xl text-center">
                       <p className="text-[10px] font-black text-slate-500 uppercase">متأخر</p>
                       <p className="text-2xl font-black text-orange-600">{state.attendance.filter(a => a.sessionId === showReport.id && a.status === 'متأخر').length}</p>
                    </div>
                    <div className="bg-slate-50 border-2 border-slate-900 p-4 rounded-2xl text-center">
                       <p className="text-[10px] font-black text-slate-500 uppercase">غياب</p>
                       <p className="text-2xl font-black text-red-600">{state.attendance.filter(a => a.sessionId === showReport.id && a.status === 'غائب').length}</p>
                    </div>
                    <div className="bg-slate-50 border-2 border-slate-900 p-4 rounded-2xl text-center">
                       <p className="text-[10px] font-black text-slate-500 uppercase">إجمالي اللاعبين</p>
                       <p className="text-2xl font-black text-[#001F3F]">{state.people.filter(p => p.category === showReport.category && p.role === 'لاعب').length}</p>
                    </div>
                 </div>
              </div>

              <div className="mt-16 pt-10 border-t-2 border-slate-200 grid grid-cols-2 text-center">
                 <div>
                    <p className="text-sm font-black">إداري الفئة</p>
                    <div className="h-20"></div>
                    <p className="text-xs font-black text-slate-400">.............................</p>
                 </div>
                 <div>
                    <p className="text-sm font-black">رئيس مكتب كرة القدم</p>
                    <div className="h-20"></div>
                    <p className="text-xs font-black text-slate-400">.............................</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-[200] p-4 no-print">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border-4 border-slate-900">
            <div className="p-8 border-b-2 bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase">جدولة حصة تدريبية</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 p-2 rounded-xl text-slate-900 hover:text-red-600 transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-900 mr-2 uppercase">فئة الحصة</label>
                <select className="w-full bg-slate-100 border-2 border-slate-900 rounded-2xl p-4 outline-none font-black text-slate-950 disabled:opacity-70"
                  value={formData.category} disabled={!!restrictedCat} onChange={e => setFormData({ ...formData, category: e.target.value as Category })}>
                  {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-900 mr-2 uppercase">التاريخ</label>
                  <input type="date" required 
                    value={formData.date || ''} 
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-slate-100 border-2 border-slate-900 rounded-2xl p-4 font-black text-slate-950 outline-none focus:ring-4 focus:ring-blue-900/10" 
                    onChange={e => setFormData({ ...formData, date: e.target.value })} 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-900 mr-2 uppercase">الوقت</label>
                  <input type="time" required value={formData.time || ''} className="w-full bg-slate-100 border-2 border-slate-900 rounded-2xl p-4 font-black text-slate-950 outline-none" onChange={e => setFormData({ ...formData, time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-900 mr-2 uppercase">الموقع / الملعب</label>
                <input type="text" required value={formData.location || ''} placeholder="ملعب التمرين الرئيسي..." className="w-full bg-slate-100 border-2 border-slate-900 rounded-2xl p-4 font-black text-slate-950 outline-none focus:border-orange-600" onChange={e => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-900 mr-2 uppercase">الهدف الفني</label>
                <input type="text" value={formData.objective || ''} placeholder="لياقة، تكتيك، تمرين تخصصي..." className="w-full bg-slate-100 border-2 border-slate-900 rounded-2xl p-4 font-black text-slate-950 outline-none" onChange={e => setFormData({ ...formData, objective: e.target.value })} />
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-900 font-black py-4 rounded-2xl border-2 border-slate-900 hover:bg-slate-200 transition-all uppercase text-xs">إلغاء</button>
                <button type="submit" className="flex-1 bg-[#001F3F] text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl uppercase text-xs">حفظ وتثبيت التمرين</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
