
import React, { useState } from 'react';
import { ShieldCheck, CloudUpload, Trash2, Key, Info, UserPlus, X, Edit2, ShieldAlert, Layers, Plus, Database } from 'lucide-react';
import { AppState, AppUser, UserRole, Category } from '../types';

interface SettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const SettingsView: React.FC<SettingsProps> = ({ state, setState, addLog }) => {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  
  const [userFormData, setUserFormData] = useState<Partial<AppUser>>({
    username: '',
    role: 'إداري فئة'
  });

  const roles: UserRole[] = ['مدير', 'إداري فئة', 'مشاهد'];

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.username) return;

    if (editingUserId) {
      setState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === editingUserId ? { ...u, ...userFormData } as AppUser : u)
      }));
      addLog?.('تعديل صلاحية مستخدم', `تم تحديث بيانات المستخدم: ${userFormData.username}`);
    } else {
      const newUser: AppUser = {
        id: Math.random().toString(36).substr(2, 9),
        username: userFormData.username!,
        role: userFormData.role as UserRole,
        password: 'KSC' + (Math.floor(Math.random() * 9000) + 1000),
        restrictedCategory: userFormData.role === 'مدير' ? undefined : userFormData.restrictedCategory
      };
      setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
      addLog?.('إنشاء حساب مستخدم', `تم إنشاء مستخدم جديد بنجاح: ${newUser.username}`, 'success');
    }

    setIsUserModalOpen(false);
    setEditingUserId(null);
    setUserFormData({ username: '', role: 'إداري فئة' });
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    if (state.categories.includes(newCatName.trim())) return alert('هذه الفئة موجودة مسبقاً في النظام.');
    
    setState(prev => ({ ...prev, categories: [...prev.categories, newCatName.trim()] }));
    addLog?.('إضافة فئة رياضية', `تم إدراج فئة جديدة بالنظام: ${newCatName.trim()}`, 'success');
    setNewCatName('');
  };

  const removeCategory = (cat: string) => {
    if (confirm(`هل أنت متأكد من حذف فئة ${cat}؟ سيتم فصل كافة اللاعبين المرتبطين بها.`)) {
      setState(prev => ({ ...prev, categories: prev.categories.filter(c => c !== cat) }));
      addLog?.('حذف فئة رياضية', `تم مسح الفئة: ${cat}`, 'warning');
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alkaramah_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    addLog?.('تصدير قاعدة البيانات', 'تم إنشاء وتنزيل نسخة احتياطية شاملة للنظام.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      {/* Category Control */}
      <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100">
        <h3 className="text-3xl font-black text-slate-800 mb-10 flex items-center gap-6">
          <div className="p-4 bg-blue-50 text-blue-900 rounded-[1.5rem] shadow-lg shadow-blue-100"><Layers size={28} /></div>
          إدارة الفئات الرياضية بنظام النادي
        </h3>
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <input 
            type="text" 
            value={newCatName} 
            onChange={e => setNewCatName(e.target.value)}
            placeholder="ادخل اسم الفئة الجديدة هنا..."
            className="flex-1 bg-slate-50 border-4 border-slate-100 rounded-[2rem] p-6 font-black text-2xl outline-none focus:ring-8 focus:ring-blue-900/5 focus:bg-white focus:border-blue-900 transition-all placeholder:text-slate-300"
          />
          <button 
            onClick={handleAddCategory}
            className="bg-[#001F3F] text-white px-12 py-6 rounded-[2rem] font-black text-xl hover:bg-black transition-all flex items-center justify-center gap-4 shadow-2xl shadow-blue-900/20 group"
          >
            <Plus size={32} className="group-hover:rotate-90 transition-transform" /> إضافة الفئة الرياضية
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          {state.categories.map(c => (
            <div key={c} className="group flex items-center gap-6 bg-slate-50 px-8 py-4 rounded-3xl border-4 border-transparent hover:border-blue-900 hover:bg-white transition-all shadow-sm">
              <span className="font-black text-xl text-slate-800">{c}</span>
              <button onClick={() => removeCategory(c)} className="text-red-300 hover:text-red-600 transition-colors transform hover:scale-125">
                <Trash2 size={22} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-12">
          <h3 className="text-3xl font-black text-slate-800 flex items-center gap-6">
            <div className="p-4 bg-orange-50 text-orange-600 rounded-[1.5rem] shadow-lg shadow-orange-100"><ShieldCheck size={28} /></div>
            إدارة صلاحيات المستخدمين والكوادر
          </h3>
          <button 
            onClick={() => { setEditingUserId(null); setUserFormData({ username: '', role: 'إداري فئة' }); setIsUserModalOpen(true); }}
            className="bg-orange-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg flex items-center gap-4 hover:bg-black transition-all shadow-2xl shadow-orange-200 group"
          >
            <UserPlus size={28} className="group-hover:scale-110 transition-transform" /> إضافة مستخدم جديد
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {state.users.map(user => (
            <div key={user.id} className="group flex items-center justify-between p-8 bg-slate-50 rounded-[3rem] border-4 border-transparent hover:border-orange-500 hover:bg-white transition-all shadow-sm">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl ${user.role === 'مدير' ? 'bg-[#001F3F] text-white' : 'bg-orange-100 text-orange-600'}`}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-2xl text-slate-800">{user.username}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm ${user.role === 'مدير' ? 'bg-blue-50 text-blue-900' : 'bg-orange-50 text-orange-700'}`}>
                      {user.role}
                    </span>
                    {user.restrictedCategory && (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-4 py-1.5 rounded-full font-black border border-slate-300 uppercase tracking-widest">
                        فئة: {user.restrictedCategory}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                <button onClick={() => { setEditingUserId(user.id); setUserFormData(user); setIsUserModalOpen(true); }} className="p-4 bg-white text-slate-400 hover:text-blue-900 rounded-2xl shadow-sm border border-slate-100 transition-all">
                  <Edit2 size={22} />
                </button>
                {user.username !== 'IZZAT' && (
                  <button onClick={() => { if(confirm('هل أنت متأكد من حذف هذا الحساب؟')) { setState(p => ({...p, users: p.users.filter(u => u.id !== user.id)})); addLog?.('حذف حساب', `تم مسح حساب المستخدم: ${user.username}`, 'error'); } }} className="p-4 bg-red-50 text-red-300 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm">
                    <Trash2 size={22} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Actions & Backup */}
      <div className="bg-[#001F3F] p-16 rounded-[5rem] shadow-[0_40px_80px_-20px_rgba(0,31,63,0.4)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-blue-500"></div>
        <h3 className="text-3xl font-black text-white mb-10 flex items-center gap-6">
          <div className="p-4 bg-white/10 text-orange-400 rounded-[1.5rem]"><Database size={32} /></div>
          مركز صيانة النظام والنسخ الاحتياطي
        </h3>
        <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border-2 border-white/10 flex gap-8 mb-12">
          <Info className="text-orange-500 shrink-0" size={32} />
          <p className="text-base text-blue-100 font-bold leading-relaxed">
            يُرجى الاحتفاظ بنسخة احتياطية أسبوعية من بيانات النادي لضمان أقصى درجات الأمان. 
            <br/>
            <span className="text-orange-500 font-black mt-3 block text-xl">كلمة المرور الافتراضية للمدير: KSC@2026</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-8">
          <button onClick={exportData} className="flex-1 bg-white text-[#001F3F] font-black py-8 rounded-[2.5rem] hover:bg-orange-500 hover:text-white transition-all shadow-2xl flex items-center justify-center gap-5 text-2xl group">
            <CloudUpload size={36} className="group-hover:-translate-y-2 transition-transform" /> تصدير قاعدة بيانات النادي (JSON)
          </button>
          <button onClick={() => { if(confirm('تصفير النظام؟ سيتم مسح كافة البيانات بشكل نهائي.')) { localStorage.clear(); window.location.reload(); } }} className="sm:w-1/4 bg-red-600/20 text-red-400 font-black py-8 rounded-[2.5rem] hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-4 text-xl">
            <ShieldAlert size={28} /> تصفير شامل
          </button>
        </div>
      </div>

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-[#001F3F]/90 backdrop-blur-3xl flex items-center justify-center z-[200] p-6 no-print">
          <div className="bg-white rounded-[5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-[10px] border-white">
            <div className="p-12 border-b bg-slate-50 flex justify-between items-center rounded-t-[4rem]">
              <h3 className="text-3xl font-black text-slate-800">{editingUserId ? 'تعديل الصلاحيات' : 'تسجيل حساب جديد'}</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="bg-slate-200 p-5 rounded-[2rem] text-slate-600 hover:rotate-90 transition-transform"><X size={32} /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-12 space-y-10">
              <div className="space-y-3">
                <label className="text-[12px] font-black text-slate-500 mr-2 uppercase tracking-widest">اسم المستخدم (للدخول)</label>
                <input required type="text" disabled={userFormData.username === 'IZZAT'} value={userFormData.username || ''} onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
                  className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2rem] py-6 px-10 font-black text-2xl text-slate-800 outline-none focus:ring-8 focus:ring-blue-900/5 focus:bg-white focus:border-blue-900 transition-all disabled:opacity-50" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[12px] font-black text-slate-500 mr-2 uppercase tracking-widest">نوع الحساب</label>
                  <select className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2rem] p-6 font-black text-xl outline-none focus:border-blue-900"
                    value={userFormData.role} onChange={e => setUserFormData({ ...userFormData, role: e.target.value as UserRole, restrictedCategory: e.target.value === 'مدير' ? undefined : userFormData.restrictedCategory })}>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {userFormData.role !== 'مدير' && (
                  <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                    <label className="text-[12px] font-black text-slate-500 mr-2 uppercase tracking-widest">الفئة المسؤولة</label>
                    <select className="w-full bg-slate-50 border-4 border-slate-100 rounded-[2rem] p-6 font-black text-xl outline-none focus:border-orange-500"
                      value={userFormData.restrictedCategory || ''} onChange={e => setUserFormData({ ...userFormData, restrictedCategory: e.target.value as Category || undefined })}>
                      <option value="">جميع الفئات</option>
                      {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-6 pt-6">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 font-black py-6 rounded-[2.5rem] text-xl hover:bg-slate-200 transition-colors">إلغاء</button>
                <button type="submit" className="flex-[2] bg-[#001F3F] text-white font-black py-6 rounded-[2.5rem] shadow-2xl hover:bg-black transition-colors text-2xl">تثبيت البيانات</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
