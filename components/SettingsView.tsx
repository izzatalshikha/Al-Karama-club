
import React, { useState } from 'react';
import { ShieldCheck, CloudUpload, Trash2, Key, Info, UserPlus, X, Edit2, ShieldAlert, Layers, Plus, Database, Lock, Eye, EyeOff } from 'lucide-react';
import { AppState, AppUser, UserRole, Category } from '../types';
import { generateUUID, supabase } from '../App';

interface SettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addLog?: (m: string, d?: string, t?: any) => void;
  syncToCloud?: (table: string, data: any) => Promise<boolean>;
}

const SettingsView: React.FC<SettingsProps> = ({ state, setState, addLog, syncToCloud }) => {
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

  const roles: UserRole[] = ['مدير', 'إداري فئة', 'مشاهد', 'أمين مستودع'];

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.username || !userFormData.password) return alert('يرجى إكمال كافة البيانات المطلوبة');

    if (editingUserId) {
      const updatedUser = { ...state.users.find(u => u.id === editingUserId), ...userFormData } as AppUser;
      const success = await syncToCloud?.('app_users', updatedUser);
      if (success) {
        setState(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === editingUserId ? updatedUser : u)
        }));
        addLog?.('تعديل صلاحية مستخدم', `تم تحديث بيانات المستخدم: ${userFormData.username}`, 'info');
      }
    } else {
      const newUser: AppUser = {
        id: generateUUID(),
        username: userFormData.username!.trim(),
        role: userFormData.role as UserRole,
        password: userFormData.password!,
        restrictedCategory: (userFormData.role === 'إداري فئة' || userFormData.role === 'مشاهد') ? userFormData.restrictedCategory : undefined
      };
      const success = await syncToCloud?.('app_users', newUser);
      if (success) {
        setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
        addLog?.('إنشاء حساب مستخدم', `تم إنشاء مستخدم جديد بنجاح: ${newUser.username}`, 'success');
      }
    }

    setIsUserModalOpen(false);
    setEditingUserId(null);
    setUserFormData({ username: '', role: 'إداري فئة', password: '', restrictedCategory: '' });
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const catName = newCatName.trim();
    if (state.categories.includes(catName)) return alert('هذه الفئة موجودة مسبقاً.');
    
    // Update local state early for responsiveness
    setState(prev => ({ ...prev, categories: [...prev.categories, catName] }));
    
    // Sync to Supabase
    if (syncToCloud) {
       await syncToCloud('categories', { name: catName });
    }
    
    addLog?.('إضافة فئة', `تمت إضافة فئة: ${catName}`, 'success');
    setNewCatName('');
  };

  const removeCategory = async (cat: string) => {
    if (confirm(`حذف فئة ${cat}؟`)) {
      // Local clean
      setState(prev => ({ ...prev, categories: prev.categories.filter(c => c !== cat) }));
      
      // Request cloud deletion
      try {
         const { error } = await supabase.from('categories').delete().eq('name', cat);
         if (error) throw error;
      } catch (e: any) {
         addLog?.('خطأ', `تعذر الحذف من السحابة: ${e.message}`, 'error');
      }
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (name.toUpperCase() === 'IZZAT' || name === 'عزت عامر الشيخة') return alert('لا يمكن حذف الحساب الجذري.');
    if (confirm(`هل أنت متأكد من حذف حساب ${name}؟`)) {
      await supabase.from('app_users').delete().eq('id', id);
      setState(p => ({ ...p, users: p.users.filter(u => u.id !== id) }));
      addLog?.('حذف مستخدم', `تم حذف حساب: ${name}`, 'error');
    }
  };

  const labelClass = "text-[11px] font-black text-slate-900 mr-2 uppercase block mb-1.5 drop-shadow-sm";
  const fieldClass = "w-full bg-slate-50 border-4 border-slate-900 rounded-2xl py-4 px-6 font-black text-slate-900 outline-none focus:border-orange-600 shadow-inner";

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 font-['Tajawal'] text-right" dir="rtl">
      {isGlobalManager && (
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border-[6px] border-slate-900">
           <div className="flex justify-between items-center mb-10 border-b-4 border-slate-900 pb-8">
              <div>
                <h3 className="text-2xl md:text-4xl font-black text-slate-900 flex items-center gap-4 drop-shadow-md">
                  <ShieldCheck size={40} className="text-[#001F3F]" /> إدارة حسابات وصلاحيات النظام
                </h3>
                <p className="text-xs font-black text-orange-600 mt-2 uppercase tracking-widest drop-shadow-sm">التحكم المركزي الكامل بكافة المستخدمين والوصول</p>
              </div>
              <button onClick={() => { setEditingUserId(null); setIsUserModalOpen(true); }} className="bg-[#001F3F] text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl border-b-4 border-black hover:bg-black transition-all">
                <UserPlus size={24}/> إنشاء حساب جديد
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {state.users.map(user => (
                <div key={user.id} className="bg-slate-100 p-8 rounded-[3rem] border-4 border-slate-900 relative overflow-hidden group shadow-md hover:border-orange-600 transition-all">
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 bg-white border-4 border-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                         <Key size={28} className="text-orange-600"/>
                      </div>
                      <span className={`text-[10px] font-black px-4 py-2 rounded-xl uppercase border-2 shadow-sm ${user.role === 'مدير' ? 'bg-orange-600 text-white border-orange-900' : 'bg-[#001F3F] text-white border-black'}`}>
                        {user.role}
                      </span>
                   </div>
                   <h4 className="font-black text-2xl text-slate-900 drop-shadow-sm">{user.username}</h4>
                   <p className="text-[11px] font-black text-slate-500 mt-2 uppercase tracking-tighter">
                      {user.restrictedCategory ? `الوصول محصور بـ: ${user.restrictedCategory}` : 'صلاحيات وصول شاملة للنظام'}
                   </p>
                   <div className="mt-8 pt-6 border-t-2 border-slate-200 flex justify-between items-center">
                      <div className="flex flex-col">
                         <p className="text-[9px] font-black text-slate-400 uppercase">كلمة السر</p>
                         <p className="text-xs font-black text-slate-900 tracking-widest">••••••••</p>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => { setEditingUserId(user.id); setUserFormData(user); setIsUserModalOpen(true); }} className="p-3 bg-white border-2 border-slate-900 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 size={20}/></button>
                         {(user.username.toUpperCase() !== 'IZZAT' && user.username !== 'عزت عامر الشيخة') && (
                           <button onClick={() => deleteUser(user.id, user.username)} className="p-3 bg-white border-2 border-slate-900 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={20}/></button>
                         )}
                      </div>
                   </div>
                </div>
              ))}
              {state.users.length === 0 && (
                <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-300 rounded-[3rem]">
                   <p className="text-xl font-black text-slate-400 italic">لا توجد حسابات فرعية منشأة حالياً.</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* باقي الأقسام تتبع نفس النمط الصارم للرؤية */}
      <div className="bg-white p-12 rounded-[4rem] shadow-sm border-[6px] border-slate-900">
        <h3 className="text-2xl md:text-4xl font-black text-slate-900 mb-10 drop-shadow-sm">إدارة فئات النادي الرياضية</h3>
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <input 
            type="text" 
            value={newCatName} 
            onChange={e => setNewCatName(e.target.value)}
            placeholder="أدخل اسم الفئة الجديدة.."
            className="flex-1 bg-slate-100 border-4 border-slate-900 rounded-[2rem] p-6 font-black text-2xl outline-none focus:border-orange-600 transition-all shadow-inner"
          />
          <button 
            onClick={handleAddCategory}
            disabled={!isGlobalManager}
            className="bg-[#001F3F] text-white px-12 py-6 rounded-[2rem] font-black text-xl shadow-2xl border-b-8 border-black hover:bg-black transition-all disabled:opacity-30"
          >
            تثبيت الفئة
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
           {state.categories.map(cat => (
             <div key={cat} className="bg-slate-50 border-4 border-slate-900 px-8 py-4 rounded-[2rem] flex items-center gap-5 shadow-md">
                <span className="font-black text-xl text-slate-900 drop-shadow-sm">{cat}</span>
                {isGlobalManager && (
                  <button onClick={() => removeCategory(cat)} className="text-red-600 hover:bg-red-50 p-2 rounded-full transition-all"><X size={20}/></button>
                )}
             </div>
           ))}
        </div>
      </div>

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-[#001F3F]/95 backdrop-blur-3xl flex items-center justify-center z-[800] p-6 no-print overflow-y-auto text-right" dir="rtl">
          <div className="bg-white rounded-[4rem] w-full max-w-2xl shadow-2xl border-[10px] border-white p-12">
            <div className="flex justify-between items-center mb-10 border-b-4 border-slate-900 pb-6">
               <h3 className="text-2xl md:text-3xl font-black text-[#001F3F] uppercase tracking-tighter drop-shadow-sm">برمجة حساب مستخدم</h3>
               <button onClick={() => setIsUserModalOpen(false)} className="bg-slate-100 p-4 rounded-full hover:rotate-90 transition-all border-2 border-slate-900"><X/></button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-8">
              <div className="space-y-2">
                <label className={labelClass}>اسم الدخول (المعرف)</label>
                <input required type="text" value={userFormData.username || ''} onChange={e => setUserFormData({ ...userFormData, username: e.target.value })}
                  className={fieldClass} placeholder="مثال: Ahmed_Staff" />
              </div>

              <div className="space-y-2">
                <label className={labelClass}>كلمة المرور (Secret Code)</label>
                <div className="relative">
                   <input required type={showPassInForm ? "text" : "password"} value={userFormData.password || ''} onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                    className={fieldClass} placeholder="••••••••" />
                   <button type="button" onClick={() => setShowPassInForm(!showPassInForm)} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-900">
                      {showPassInForm ? <EyeOff size={24}/> : <Eye size={24}/>}
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <label className={labelClass}>الرتبة / الصلاحية</label>
                    <select className={fieldClass}
                      value={userFormData.role} onChange={e => setUserFormData({ ...userFormData, role: e.target.value as UserRole, restrictedCategory: '' })}>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                 </div>
                 {(userFormData.role === 'إداري فئة' || userFormData.role === 'مشاهد') && (
                    <div className="space-y-2">
                      <label className={labelClass}>الفئة المحصورة</label>
                      <select className={fieldClass}
                        value={userFormData.restrictedCategory} onChange={e => setUserFormData({ ...userFormData, restrictedCategory: e.target.value })}>
                        <option value="">-- فئة مخصصة --</option>
                        {state.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                 )}
              </div>

              <div className="bg-blue-50 p-6 rounded-[2rem] border-4 border-blue-900 flex items-start gap-4">
                 <ShieldAlert className="text-blue-900 shrink-0" size={32}/>
                 <p className="text-[11px] font-black text-blue-900 leading-relaxed uppercase drop-shadow-sm">
                    تنبيه أمني: تأكد من تزويد المستخدم ببياناته يدوياً. النظام يشفر كلمات المرور سحابياً لحماية أمن معلومات نادي الكرامة.
                 </p>
              </div>

              <button type="submit" className="w-full bg-[#001F3F] text-white font-black py-6 rounded-[2.5rem] shadow-2xl text-2xl hover:bg-black transition-all border-b-8 border-black">
                {editingUserId ? 'تثبيت التحديثات' : 'تفعيل الحساب الجديد'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
