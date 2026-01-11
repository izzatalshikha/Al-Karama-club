
import React, { useState } from 'react';
import { ShieldCheck, CloudUpload, Trash2, Key, Info, UserPlus, X, Edit2, ShieldAlert, Layers, Plus, Database, Lock, Eye, EyeOff } from 'lucide-react';
import { AppState, AppUser, UserRole, Category } from '../types';
import { generateUUID } from '../App';

interface SettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const SettingsView: React.FC<SettingsProps> = ({ state, setState, addLog }) => {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [showPassInForm, setShowPassInForm] = useState(false);
  
  const currentUser = state.currentUser;
  const isGlobalManager = currentUser?.role === 'مدير';

  const [userFormData, setUserFormData] = useState<Partial<AppUser>>({
    username: '',
    role: 'إداري فئة',
    password: '',
    restrictedCategory: ''
  });

  const roles: UserRole[] = ['مدير', 'إداري فئة', 'مشاهد'];

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.username || !userFormData.password) return alert('يرجى إكمال كافة البيانات المطلوبة');

    if (editingUserId) {
      setState(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === editingUserId ? { ...u, ...userFormData } as AppUser : u)
      }));
      addLog?.('تعديل صلاحية مستخدم', `تم تحديث بيانات المستخدم: ${userFormData.username}`, 'info');
    } else {
      const newUser: AppUser = {
        id: generateUUID(),
        username: userFormData.username!.trim(),
        role: userFormData.role as UserRole,
        password: userFormData.password!,
        restrictedCategory: userFormData.role === 'إداري فئة' ? userFormData.restrictedCategory : undefined
      };
      setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
      addLog?.('إنشاء حساب مستخدم', `تم إنشاء مستخدم جديد بنجاح: ${newUser.username} برتبة ${newUser.role}`, 'success');
    }

    setIsUserModalOpen(false);
    setEditingUserId(null);
    setUserFormData({ username: '', role: 'إداري فئة', password: '', restrictedCategory: '' });
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

  const deleteUser = (id: string, name: string) => {
    if (name.toUpperCase() === 'IZZAT') return alert('لا يمكن حذف الحساب الجذري للنظام.');
    if (confirm(`هل أنت متأكد من حذف حساب ${name}؟`)) {
      setState(p => ({ ...p, users: p.users.filter(u => u.id !== id) }));
      addLog?.('حذف مستخدم', `تم حذف حساب المستخدم: ${name}`, 'error');
    }
  };

  const labelClass = "text-[10px] font-black text-slate-500 mr-2 uppercase block mb-1.5";
  const fieldClass = "w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 font-black text-slate-800 outline-none focus:border-orange-600 transition-all";

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      {isGlobalManager && (
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border-2 border-slate-900">
           <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <ShieldCheck size={28} className="text-[#001F3F]" /> مركز التحكم في الحسابات والأدوار
                </h3>
                <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">إدارة الدخول، الصلاحيات، وكلمات السر (خاص بالمديرين)</p>
              </div>
              <button onClick={() => { setEditingUserId(null); setIsUserModalOpen(true); }} className="bg-[#001F3F] text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg border-b-4 border-black">
                <UserPlus size={18}/> إضافة حساب جديد
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.users.map(user => (
                <div key={user.id} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-200 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-1.5 h-full bg-[#001F3F]"></div>
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                         <Key size={18} className="text-orange-600"/>
                      </div>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase border ${user.role === 'مدير' ? 'bg-orange-600 text-white border-orange-700' : user.role === 'مشاهد' ? 'bg-slate-200 text-slate-600' : 'bg-[#001F3F] text-white border-black'}`}>
                        {user.role}
                      </span>
                   </div>
                   <h4 className="font-black text-lg text-slate-900">{user.username}</h4>
                   <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-tighter">
                      {user.restrictedCategory ? `مخصص لفئة: ${user.restrictedCategory}` : 'صلاحيات وصول شاملة'}
                   </p>
                   <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
                      <p className="text-[10px] font-black text-slate-300">PASS: {user.password ? '****' : 'N/A'}</p>
                      <div className="flex gap-2">
                         <button onClick={() => { setEditingUserId(user.id); setUserFormData(user); setIsUserModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                         {user.username.toUpperCase() !== 'IZZAT' && (
                           <button onClick={() => deleteUser(user.id, user.username)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                         )}
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100">
        <h3 className="text-3xl font-black text-slate-800 mb-10">إدارة الفئات الرياضية</h3>
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <input 
            type="text" 
            value={newCatName} 
            onChange={e => setNewCatName(e.target.value)}
            placeholder="مثال: فئة البراعم.."
            className="flex-1 bg-slate-50 border-4 border-slate-100 rounded-[2rem] p-6 font-black text-2xl outline-none focus:border-orange-600 transition-all"
          />
          <button 
            onClick={handleAddCategory}
            disabled={!isGlobalManager}
            className="bg-[#001F3F] text-white px-12 py-6 rounded-[2rem] font-black disabled:opacity-30"
          >
            تثبيت الفئة الجديدة
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
           {state.categories.map(cat => (
             <div key={cat} className="bg-slate-50 border-2 border-slate-200 px-6 py-3 rounded-2xl flex items-center gap-4 group">
                <span className="font-black text-slate-700">{cat}</span>
                {isGlobalManager && (
                  <button onClick={() => removeCategory(cat)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
                )}
             </div>
           ))}
        </div>
      </div>

      <div className="bg-[#001F3F] p-16 rounded-[5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
           <div className="text-white">
              <h3 className="text-3xl font-black mb-2">نسخة الحماية والنسخ الاحتياطي</h3>
              <p className="font-black text-orange-400 uppercase tracking-widest text-sm">تصدير كافة البيانات المسجلة على النظام في ملف واحد</p>
           </div>
           <button onClick={exportData} className="bg-white text-[#001F3F] font-black px-12 py-6 rounded-[2.5rem] flex items-center justify-center gap-5 text-2xl shadow-xl hover:scale-105 transition-all">
             <Database size={32}/> تصدير قاعدة البيانات (JSON)
           </button>
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-[#001F3F]/90 backdrop-blur-3xl flex items-center justify-center z-[500] p-6 no-print overflow-y-auto">
          <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-2xl border-[10px] border-white p-12">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-2xl font-black text-[#001F3F] uppercase tracking-tighter">إعدادات دخول الحساب</h3>
               <button onClick={() => setIsUserModalOpen(false)} className="bg-slate-100 p-3 rounded-full"><X/></button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-6">
              <div>
                <label className={labelClass}>اسم المستخدم (الاسم الحقيقي أو الكنية)</label>
                <input required type="text" value={userFormData.username || ''} onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
                  className={fieldClass} placeholder="مثال: Ahmed_KSC" />
              </div>

              <div>
                <label className={labelClass}>كلمة المرور الخاصة بالحساب</label>
                <div className="relative">
                   <input required type={showPassInForm ? "text" : "password"} value={userFormData.password || ''} onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                    className={fieldClass} placeholder="اكتب كلمة سر قوية.." />
                   <button type="button" onClick={() => setShowPassInForm(!showPassInForm)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassInForm ? <EyeOff size={20}/> : <Eye size={20}/>}
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClass}>رتبة الصلاحية</label>
                    <select className={fieldClass}
                      value={userFormData.role} onChange={e => setUserFormData({ ...userFormData, role: e.target.value as UserRole, restrictedCategory: '' })}>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                 </div>
                 {userFormData.role === 'إداري فئة' && (
                    <div>
                      <label className={labelClass}>الفئة المخصصة</label>
                      <select required className={fieldClass}
                        value={userFormData.restrictedCategory} onChange={e => setUserFormData({ ...userFormData, restrictedCategory: e.target.value })}>
                        <option value="">-- اختر الفئة --</option>
                        {/* Fixed the incorrect map call that used 'cat' instead of 'c' */}
                        {state.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                 )}
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-100 flex items-start gap-3">
                 <ShieldAlert className="text-blue-600 shrink-0" size={20}/>
                 <p className="text-[10px] font-black text-blue-900 leading-relaxed uppercase">
                    تنبيه: "إداري الفئة" سيقتصر وصوله فقط على البيانات الخاصة بفئته المحددة أعلاه، ولن يتمكن من تعديل الحضور بعد رصده للمرة الأولى.
                 </p>
              </div>

              <button type="submit" className="w-full bg-[#001F3F] text-white font-black py-6 rounded-[2.5rem] shadow-2xl text-2xl hover:bg-black transition-all">
                {editingUserId ? 'تحديث بيانات الحساب' : 'تثبيت الحساب في النظام'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
