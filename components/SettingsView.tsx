
import React, { useState } from 'react';
import { ShieldCheck, CloudUpload, Trash2, Key, Info, UserPlus, X, Edit2, ShieldAlert } from 'lucide-react';
import { AppState, AppUser, UserRole, Category } from '../types';

interface SettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const SettingsView: React.FC<SettingsProps> = ({ state, setState }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AppUser>>({
    username: '',
    role: 'مدرب'
  });

  const roles: UserRole[] = ['مدير', 'مدرب', 'مشاهد'];

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
    setFormData({ username: '', role: 'مدرب' });
  };

  const deleteUser = (id: string, username: string) => {
    if (username === 'Izzat' || id === state.currentUser?.id) {
      alert('لا يمكن حذف المدير الرئيسي أو حسابك الحالي.');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف المستخدم ${username}؟`)) {
      setState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
    }
  };

  const exportToDrive = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alkaramah_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    alert('تم تجهيز ملف النسخة الاحتياطية. يمكنك رفعه الآن إلى حسابك في Google Drive لضمان أمان البيانات.');
  };

  const resetData = () => {
    if (confirm('هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
      localStorage.removeItem('alkaramah_data');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <ShieldCheck className="text-blue-600" size={28} />
            إدارة صلاحيات المستخدمين
          </h3>
          <button 
            onClick={() => { setEditingUserId(null); setFormData({ username: '', role: 'مدرب' }); setIsModalOpen(true); }}
            className="bg-blue-900 text-white px-6 py-2 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-blue-200"
          >
            <UserPlus size={18} /> إضافة مستخدم
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.users.map(user => (
            <div key={user.id} className="group flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-transparent hover:border-blue-200 hover:bg-white transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${user.role === 'مدير' ? 'bg-orange-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-slate-800">{user.username}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${user.role === 'مدير' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                      {user.role}
                    </span>
                    {user.restrictedCategory && (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        فئة: {user.restrictedCategory}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => { setEditingUserId(user.id); setFormData(user); setIsModalOpen(true); }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                >
                  <Edit2 size={18} />
                </button>
                {user.username !== 'Izzat' && (
                  <button 
                    onClick={() => deleteUser(user.id, user.username)}
                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
          <CloudUpload className="text-orange-600" size={28} />
          التخزين السحابي والنسخ الاحتياطي
        </h3>
        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 flex gap-4 mb-8">
          <Info className="text-blue-600 shrink-0" size={24} />
          <p className="text-sm text-blue-800 font-bold leading-relaxed">
            للتخزين على حسابك في Google Drive: يرجى تصدير البيانات كملف JSON ورفعه يدوياً لضمان المزامنة والأمان. 
            يُنصح بالاحتفاظ بنسخة احتياطية أسبوعية على الأقل لجميع بيانات اللاعبين وسجلات الحضور.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <button 
            onClick={exportToDrive}
            className="flex-1 bg-orange-600 text-white font-black py-5 rounded-[2rem] hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-3 text-lg"
          >
            <CloudUpload size={24} />
            تصدير ملف النسخة الاحتياطية (JSON)
          </button>
          <button 
            onClick={resetData}
            className="sm:w-1/3 bg-red-50 text-red-600 font-black py-5 rounded-[2rem] hover:bg-red-100 transition-all flex items-center justify-center gap-2"
          >
            <ShieldAlert size={20} />
            تصفير النظام
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 no-print">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">
                {editingUserId ? 'تعديل صلاحيات المستخدم' : 'إضافة مستخدم جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 p-2 rounded-xl text-slate-500 hover:text-slate-800 transition-transform hover:rotate-90">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveUser} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 mr-2">اسم المستخدم</label>
                <input 
                  required 
                  type="text" 
                  disabled={formData.username === 'Izzat'}
                  value={formData.username || ''} 
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-slate-100 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 font-bold text-black disabled:opacity-50" 
                  placeholder="مثال: admin_kalo" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 mr-2">نوع الصلاحية (الدور)</label>
                <select 
                  className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-black outline-none"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole, restrictedCategory: e.target.value === 'مدير' ? undefined : formData.restrictedCategory })}
                >
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {formData.role !== 'مدير' && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-xs font-black text-slate-500 mr-2">الفئة المسؤولة (اختياري)</label>
                  <select 
                    className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-black outline-none"
                    value={formData.restrictedCategory || ''}
                    onChange={e => setFormData({ ...formData, restrictedCategory: e.target.value as Category || undefined })}
                  >
                    <option value="">جميع الفئات</option>
                    {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 px-2">* سيتمكن المستخدم من رؤية وتعديل بيانات هذه الفئة فقط.</p>
                </div>
              )}

              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex gap-3">
                <Key className="text-orange-500 shrink-0" size={18} />
                <p className="text-[10px] text-orange-800 font-bold leading-relaxed">
                  ملاحظة: كلمات المرور افتراضية.<br/>
                  المدير: KSC@2026 | المدرب/المشاهد: KSC2026
                </p>
              </div>

              <button type="submit" className="w-full bg-blue-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl hover:bg-black transition-all">
                {editingUserId ? 'تحديث البيانات' : 'إنشاء الحساب'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
