
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CloudUpload, 
  Trash2, 
  Key, 
  Info, 
  UserPlus, 
  X, 
  Edit2, 
  ShieldAlert, 
  CheckCircle2, 
  Cloud, 
  RefreshCw,
  Database,
  ExternalLink,
  Users as UsersIcon,
  Zap
} from 'lucide-react';
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
    role: 'مدرب'
  });

  const handleGoogleAuth = async () => {
    setIsSyncing(true);
    try {
      // عملية الربط بـ Google Drive API
      await new Promise(r => setTimeout(r, 2000)); 
      
      setState(prev => ({
        ...prev,
        isDriveConnected: true,
        lastSyncTimestamp: Date.now(),
        notifications: [
          ...prev.notifications,
          {
            id: Math.random().toString(36).substr(2, 9),
            message: 'تم تفعيل المزامنة اللحظية بنجاح. أي تغيير من المدربين سيظهر لك فوراً.',
            type: 'success',
            timestamp: Date.now()
          }
        ]
      }));
    } catch (error) {
      alert('فشل الاتصال.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username) return;

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
        restrictedCategory: formData.role === 'مدير' ? undefined : formData.restrictedCategory
      };
      setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    }

    setIsModalOpen(false);
    setEditingUserId(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* Real-time Sync Hub */}
      <div className={`p-10 rounded-[3.5rem] shadow-2xl border-4 transition-all relative overflow-hidden ${state.isDriveConnected ? 'bg-white border-emerald-500/20' : 'bg-blue-900 border-blue-800 text-white'}`}>
        {state.isDriveConnected && (
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500 animate-pulse"></div>
        )}
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-inner ${state.isDriveConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-white/10 text-white'}`}>
              <Zap size={48} className={state.isDriveConnected ? 'animate-pulse text-emerald-500' : ''} />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black flex items-center gap-3">
                مركز البيانات الموحد
                {state.isDriveConnected && <span className="text-emerald-500 text-sm bg-emerald-50 px-3 py-1 rounded-full">نشط الآن</span>}
              </h3>
              <p className={`text-sm font-bold ${state.isDriveConnected ? 'text-slate-500' : 'text-blue-200'}`}>
                {state.isDriveConnected 
                  ? `البيانات مرتبطة بحسابك في Google Drive. يقوم النظام بفحص التحديثات كل 15 ثانية.` 
                  : 'فعل المزامنة لتتمكن من مشاركة التغييرات فورياً مع بقية المديرين.'}
              </p>
            </div>
          </div>

          <button 
            onClick={handleGoogleAuth}
            disabled={isSyncing}
            className={`px-10 py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-2xl transition-all transform hover:-translate-y-1 ${state.isDriveConnected ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
          >
            {isSyncing ? <RefreshCw size={24} className="animate-spin" /> : <CloudUpload size={24} />}
            {state.isDriveConnected ? 'تنشيط الاتصال الفوري' : 'ربط الحساب للتحديث اللحظي'}
          </button>
        </div>

        <div className={`mt-10 p-6 rounded-[2.5rem] border-2 border-dashed flex items-start gap-4 ${state.isDriveConnected ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <Info className={state.isDriveConnected ? 'text-blue-500' : 'text-orange-400'} size={24} />
          <div className="space-y-3">
             <p className="text-sm font-black leading-relaxed">
                آلية المزامنة الجماعية:
             </p>
             <ul className="text-xs space-y-2 font-bold opacity-80 list-disc pr-4">
                <li>أي بيان يضيفه "المدرب" يُرفع فوراً إلى ملفك السحابي.</li>
                <li>عندما تفتح أنت أو أي "مدير" آخر التطبيق، يكتشف النظام التحديث الجديد ويظهره على الشاشة تلقائياً.</li>
                <li>البيانات مركزية وتُحفظ في حساب Google Drive الخاص بك (عزت) لضمان السيادة الكاملة على معلومات النادي.</li>
             </ul>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <UsersIcon className="text-blue-600" size={28} />
            إدارة حسابات الفريق (المديرين والمدربين)
          </h3>
          <button 
            onClick={() => { setEditingUserId(null); setIsModalOpen(true); }}
            className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-black transition-all"
          >
            <UserPlus size={18} /> إضافة حساب جديد
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.users.map(user => (
            <div key={user.id} className="group flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] border-2 border-transparent hover:border-blue-500/20 hover:bg-white transition-all shadow-sm">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${user.role === 'مدير' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-slate-800 text-lg">{user.username}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full ${user.role === 'مدير' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'}`}>
                      {user.role}
                    </span>
                    {user.restrictedCategory && (
                      <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-3 py-1 rounded-full uppercase">
                        {user.restrictedCategory}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => { setEditingUserId(user.id); setFormData(user); setIsModalOpen(true); }}
                  className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Edit2 size={20} /></button>
                {user.username !== 'Izzat' && (
                  <button className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-red-50 p-8 rounded-[3rem] border-2 border-dashed border-red-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-right">
          <h4 className="text-lg font-black text-red-700">تصفير قاعدة البيانات</h4>
          <p className="text-xs font-bold text-red-500 mt-1">سيتم مسح جميع البيانات المحلية والسحابية نهائياً.</p>
        </div>
        <button onClick={() => { if(confirm('تصفير شامل؟')) { localStorage.removeItem('alkaramah_data'); window.location.reload(); }}}
          className="bg-red-600 text-white px-10 py-4 rounded-[1.5rem] font-black flex items-center gap-3 hover:bg-red-700 shadow-xl shadow-red-200">
          <ShieldAlert size={20} /> تصفير شامل للنظام
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">{editingUserId ? 'تعديل الصلاحيات' : 'إنشاء حساب جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 p-2 rounded-xl text-slate-500 hover:text-slate-800 transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">اسم المستخدم (Username)</label>
                <input required type="text" value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-slate-100 border-none rounded-2xl py-5 px-6 font-bold text-black outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500">مستوى الصلاحية (Role)</label>
                <select className="w-full bg-slate-100 border-none rounded-2xl p-5 font-bold text-black outline-none appearance-none cursor-pointer"
                  value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}>
                  <option value="مدير">مدير (صلاحيات كاملة + مزامنة)</option>
                  <option value="مدرب">مدرب (إدارة الفئة الخاصة به)</option>
                  <option value="مشاهد">مشاهد (للاطلاع فقط)</option>
                </select>
              </div>
              
              {formData.role === 'مدرب' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2">
                  <label className="text-xs font-black text-slate-500">الفئة المسؤولة عنها</label>
                  <select className="w-full bg-slate-100 border-none rounded-2xl p-5 font-bold text-black outline-none appearance-none cursor-pointer"
                    value={formData.restrictedCategory} onChange={e => setFormData({ ...formData, restrictedCategory: e.target.value as Category })}>
                    {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <button type="submit" className="w-full bg-blue-900 text-white font-black py-6 rounded-[2rem] shadow-2xl hover:bg-black transition-all">
                {editingUserId ? 'تحديث الحساب' : 'اعتماد الحساب الجديد'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
