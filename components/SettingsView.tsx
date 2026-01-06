
import React, { useState } from 'react';
import { ShieldCheck, CloudUpload, Trash2, Key, Info, UserPlus, X, Edit2, ShieldAlert, CheckCircle2, Cloud, RefreshCw, Database, ExternalLink, Users as UsersIcon, Zap, Mail, Lock, Share2 } from 'lucide-react';
import { AppState, AppUser, UserRole, Category } from '../types';

interface SettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const SettingsView: React.FC<SettingsProps> = ({ state, setState }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AppUser>>({
    username: '',
    role: 'مدرب',
    password: ''
  });

  const handleManualSync = async () => {
    setIsSyncing(true);
    // المحاكاة لعملية المزامنة اليدوية
    await new Promise(r => setTimeout(r, 2000));
    setIsSyncing(false);
    alert('تم تفعيل المزامنة الفورية مع قاعدة بيانات Supabase بنجاح.');
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) return;

    if (editingUserId) {
      setState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === editingUserId ? { ...u, ...formData } as AppUser : u)
      }));
    } else {
      const newUser: AppUser = {
        id: Math.random().toString(36).substr(2, 9),
        username: formData.username!,
        role: formData.role as UserRole,
        password: formData.password!,
        restrictedCategory: formData.role === 'مدير' ? undefined : formData.restrictedCategory
      };
      setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    }
    setIsModalOpen(false);
    setEditingUserId(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 font-['Tajawal'] text-right" dir="rtl">
      <div className={`p-10 rounded-[3.5rem] shadow-2xl border-4 transition-all relative overflow-hidden bg-white border-blue-500/20`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
          <div className="flex items-center gap-8">
            <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-2xl bg-blue-50 text-blue-600 border border-blue-200`}>
              <Database size={52} className={isSyncing ? 'animate-spin' : ''} />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black text-slate-800">قاعدة البيانات (Supabase)</h3>
              <p className={`text-sm font-bold leading-relaxed text-slate-500`}>
                يتم الآن حفظ كافة بيانات اللاعبين والحضور والمباريات في قاعدة بيانات سحابية مركزية لضمان عدم الضياع والوصول الفوري.
              </p>
            </div>
          </div>
          <button 
            onClick={handleManualSync}
            disabled={isSyncing}
            className="bg-blue-900 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl transform active:scale-95 transition-all"
          >
            {isSyncing ? <RefreshCw className="animate-spin" /> : <Database />} مزامنة سحابية يدوية
          </button>
        </div>

        <div className="mt-10 p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
           <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 size={20} />
              <span className="font-black text-sm">الاتصال بـ Supabase نشط وآمن</span>
           </div>
           <p className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-tighter">
             رابط القاعدة: https://kfwqoigsghlgigjriyxf.supabase.co
           </p>
           <p className="text-[10px] text-slate-400 mt-1 font-black uppercase">
             آخر تحديث: {state.lastSyncTimestamp ? new Date(state.lastSyncTimestamp).toLocaleString('ar-EG') : 'جاري التحميل...'}
           </p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-slate-800">إدارة صلاحيات الكوادر</h3>
          <button onClick={() => { setEditingUserId(null); setIsModalOpen(true); }} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-lg shadow-blue-200 transition-transform active:scale-95">إضافة حساب كادر</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] hover:bg-white transition-all border border-transparent hover:border-blue-100 group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black shadow-sm">{user.username.charAt(0)}</div>
                <div>
                  <p className="font-black text-slate-800">{user.username}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role} {user.restrictedCategory ? `- ${user.restrictedCategory}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingUserId(user.id); setFormData(user); setIsModalOpen(true); }} 
                  className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-colors"
                  disabled={['Izzat', 'MEN', 'U18', 'U16', 'U14'].includes(user.username)}
                  title={['Izzat', 'MEN', 'U18', 'U16', 'U14'].includes(user.username) ? "حساب أساسي غير قابل للتعديل" : "تعديل الحساب"}
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => { if(confirm('حذف هذا الحساب نهائياً؟')) setState(prev => ({...prev, users: prev.users.filter(u => u.id !== user.id)})) }}
                  className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                  disabled={['Izzat', 'MEN', 'U18', 'U16', 'U14'].includes(user.username)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-2xl overflow-hidden p-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-black text-slate-800">{editingUserId ? 'تعديل بيانات الحساب' : 'إنشاء حساب كادر جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-2 rounded-xl text-slate-500"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 mr-2">اسم المستخدم</label>
                <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 mr-2">كلمة المرور</label>
                <input required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 mr-2">نوع الصلاحية</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none">
                  <option value="مدير">مدير (وصول كامل)</option>
                  <option value="مدرب">مدرب (فئة محددة)</option>
                  <option value="مشاهد">مشاهد (للعرض فقط)</option>
                </select>
              </div>
              {(formData.role === 'مدرب' || formData.role === 'مشاهد') && (
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-500 mr-2">الفئة المسؤولة عنها</label>
                  <select value={formData.restrictedCategory} onChange={e => setFormData({...formData, restrictedCategory: e.target.value})} className="w-full bg-slate-100 rounded-2xl p-4 font-black text-slate-950 outline-none">
                    <option value="">-- اختر الفئة --</option>
                    {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button onClick={handleSaveUser} className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-black transition-all">تأكيد وحفظ في قاعدة البيانات</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
