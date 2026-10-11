import React, { useState } from 'react';
import { RefreshCw, Plus, Save, Trash2, Edit2, X, Paperclip, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { AppState, TransferRequest } from '../types';
import { generateUUID } from '../App';

interface TransfersManagementProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addLog: (msg: string) => void;
}

const TransfersManagement: React.FC<TransfersManagementProps> = ({ state, setState, addLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TransferRequest>>({});
  
  const currentUser = state.currentUser!;
  const canEdit = currentUser.role === 'مدير' || currentUser.role === 'إداري فئة' || currentUser.role === 'مدرب';

  const transfers = state.transfers || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.playerId) return;

    if (editingId) {
      setState(prev => ({
        ...prev,
        transfers: prev.transfers.map(t => t.id === editingId ? { ...t, ...formData } as TransferRequest : t)
      }));
      addLog('تم تحديث طلب الانتقال/الإعارة');
    } else {
      const newTransfer: TransferRequest = {
        ...formData,
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        status: 'قيد الانتظار',
      } as TransferRequest;
      setState(prev => ({
        ...prev,
        transfers: [...(prev.transfers || []), newTransfer]
      }));
      addLog('تم إضافة طلب انتقال/إعارة جديد');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      setState(prev => ({
        ...prev,
        transfers: prev.transfers.filter(t => t.id !== id)
      }));
      addLog('تم حذف طلب الانتقال/الإعارة');
    }
  };

  const handleStatusChange = (id: string, status: TransferRequest['status']) => {
    setState(prev => ({
      ...prev,
      transfers: prev.transfers.map(t => t.id === id ? { ...t, status } : t)
    }));
    addLog(`تم تغيير حالة الطلب إلى ${status}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'مقبول': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 size={14}/> مقبول</span>;
      case 'مرفوض': return <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><XCircle size={14}/> مرفوض</span>;
      default: return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={14}/> قيد الانتظار</span>;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, documentUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-blue-900 flex items-center gap-3">
            <RefreshCw className="text-orange-500" />
            الانتقالات والإعارة
          </h2>
          <p className="text-slate-500 mt-2 text-sm font-medium">إدارة طلبات ومستندات انتقال وإعارة اللاعبين</p>
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setFormData({});
              setEditingId(null);
              setIsModalOpen(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20"
          >
            <Plus size={20} /> إضافة طلب
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {transfers.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-3xl border border-slate-100">
            <RefreshCw className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400">لا توجد طلبات انتقال حالياً</h3>
          </div>
        ) : transfers.map(transfer => {
          const player = state.people.find(p => p.id === transfer.playerId);
          return (
            <div key={transfer.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-blue-900">{player?.name || transfer.playerName || 'لاعب غير معروف'}</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">{transfer.date}</p>
                </div>
                {getStatusBadge(transfer.status)}
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">بيانات اللاعب:</span>
                  <span className="font-bold text-slate-700">{transfer.playerData || (player ? `${player.category} - ${player.position}` : '-')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">اسم المدرب:</span>
                  <span className="font-bold text-slate-700">{transfer.coachName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">اسم المشرف:</span>
                  <span className="font-bold text-slate-700">{transfer.supervisorName}</span>
                </div>
              </div>

              {transfer.notes && (
                <p className="text-sm text-slate-600 bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <span className="font-bold block mb-1 text-orange-800">ملاحظات:</span>
                  {transfer.notes}
                </p>
              )}

              {transfer.documentUrl && (
                <div className="mt-2">
                  <a href={transfer.documentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 p-3 rounded-xl justify-center font-bold transition-all">
                    <Paperclip size={16} /> عرض المستند المرفق
                  </a>
                </div>
              )}

              {canEdit && (
                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                  <button onClick={() => {
                    setFormData(transfer);
                    setEditingId(transfer.id);
                    setIsModalOpen(true);
                  }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                    <Edit2 size={16} /> تعديل
                  </button>
                  {currentUser.role === 'مدير' && (
                    <button onClick={() => handleDelete(transfer.id)} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                      <Trash2 size={16} /> حذف
                    </button>
                  )}
                </div>
              )}
              {canEdit && currentUser.role === 'مدير' && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button onClick={() => handleStatusChange(transfer.id, 'مقبول')} className="bg-emerald-50 text-emerald-600 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100">قبول</button>
                  <button onClick={() => handleStatusChange(transfer.id, 'قيد الانتظار')} className="bg-amber-50 text-amber-600 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-100">انتظار</button>
                  <button onClick={() => handleStatusChange(transfer.id, 'مرفوض')} className="bg-rose-50 text-rose-600 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-100">رفض</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center">
              <h3 className="text-xl font-black text-blue-900 flex items-center gap-3">
                <RefreshCw className="text-orange-500" /> 
                {editingId ? 'تعديل الطلب' : 'إضافة طلب جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 hover:bg-red-500 text-slate-600 hover:text-white rounded-xl transition-all">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">اللاعب</label>
                  <select
                    required
                    value={formData.playerId || ''}
                    onChange={(e) => {
                      const p = state.people.find(x => x.id === e.target.value);
                      setFormData({...formData, playerId: e.target.value, playerName: p?.name, playerData: p ? `${p.category} - ${p.position || ''}` : ''});
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  >
                    <option value="">اختر لاعباً...</option>
                    {state.people.filter(p => p.role === 'لاعب').map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">بيانات إضافية للاعب</label>
                  <input
                    type="text"
                    value={formData.playerData || ''}
                    onChange={(e) => setFormData({...formData, playerData: e.target.value})}
                    placeholder="بيانات إضافية أو تفاصيل عن الانتقال"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">اسم المدرب</label>
                  <input
                    required
                    type="text"
                    value={formData.coachName || ''}
                    onChange={(e) => setFormData({...formData, coachName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">اسم المشرف / الإداري</label>
                  <input
                    required
                    type="text"
                    value={formData.supervisorName || ''}
                    onChange={(e) => setFormData({...formData, supervisorName: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>

                <div className="col-span-full space-y-2">
                  <label className="text-sm font-bold text-slate-700">المستند الموقع (صورة أو ملف)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleImageUpload}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                  {formData.documentUrl && (
                    <div className="mt-2 text-sm text-emerald-600 font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} /> تم إرفاق المستند
                    </div>
                  )}
                </div>

                <div className="col-span-full space-y-2">
                  <label className="text-sm font-bold text-slate-700">الملاحظات</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    placeholder="أي ملاحظات إضافية حول الإعارة أو الانتقال..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">إلغاء</button>
                <button type="submit" className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
                  <Save size={20} /> حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransfersManagement;
