import React, { useState, useMemo } from 'react';
import { 
  UserPlus, Trash2, Search, Edit2, ChevronRight, 
  X, Save, Fingerprint, Activity, GraduationCap, Award, Loader2, Filter, Briefcase, Plus, Calendar,
  Shield, Dumbbell, Stethoscope, HeartPulse, Camera, User, Users, UserCog, Goal, Key
} from 'lucide-react';
import { AppState, Person, Role, CoachingCertificate, PreviousExperience } from '../types';
import { generateUUID, supabase } from '../App';

interface StaffManagementProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  onOpenReport?: (player: Person) => void;
  addLog?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ state, setState, onOpenReport, addLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localCategoryFilter, setLocalCategoryFilter] = useState('الكل');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = state.currentUser!;
  const isManager = currentUser.role === 'مدير';
  const isViewer = currentUser.role === 'مشاهد' || currentUser?.role === 'معالج';
  const restrictedCat = currentUser.restrictedCategory;
  const allowedCategories = restrictedCat ? String(restrictedCat).split(',').filter(Boolean) : null;
  const hasRestriction = allowedCategories !== null && allowedCategories.length > 0;
  const defaultCategory = hasRestriction ? allowedCategories[0] : (state.categories[0] || 'الرجال');

  const initialFormState: Partial<Person> = {
    name: '', fatherName: '', motherName: '', birthDate: '', birthPlace: '', khana: '',
    nationalId: '', federalNumber: '', internationalId: '', address: '',
    category: defaultCategory,
    role: 'مدرب', phone: '', joinDate: new Date().toISOString().split('T')[0],
    academicDegree: '', certificates: [], experiences: []
  };

  const [formData, setFormData] = useState<Partial<Person>>(initialFormState);
  const [autoCreateAccount, setAutoCreateAccount] = useState(false);

  const filteredMembers = useMemo(() => {
    return state.people.filter(p => {
      const personCategories = p.category ? p.category.split(',') : [];
      if (hasRestriction && !personCategories.some(c => allowedCategories.includes(c))) return false;
      const matchCat = localCategoryFilter === 'الكل' || personCategories.includes(localCategoryFilter);
      const matchSearch = p.name.includes(searchTerm) || (p.phone?.includes(searchTerm));
      const matchRole = p.role !== 'لاعب';
      return matchCat && matchSearch && matchRole;
    });
  }, [state.people, restrictedCat, localCategoryFilter, searchTerm]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || isSaving || isViewer) return;

    setIsSaving(true);
    const updatedPerson = {
      ...initialFormState,
      ...formData,
      id: editingId || generateUUID(),
      name: formData.name!.trim(),
    } as any;

    try {
      let updatedUserObj = null;
      let newAccountStr = '';
      if (!editingId && autoCreateAccount) {
         const pass = Math.random().toString(36).slice(-6);
         const uRole = updatedPerson.role === 'طبيب' || updatedPerson.role === 'معالج' ? 'طبيب' : 'إداري فئات';
         const newAcc = {
           id: generateUUID(),
           username: updatedPerson.name,
           password: pass,
           role: uRole,
           restrictedCategory: (updatedPerson.category || '').split(',')[0] || ''
         };
         const { error: userErr } = await supabase.from('app_users').insert(newAcc);
         if (userErr) throw userErr;
         updatedUserObj = newAcc;
         newAccountStr = `\nتنبيه: تم إنشاء حساب بصلاحية (${uRole}) للمستخدم الجديد: اسم الحساب: ${updatedPerson.name} | كلمة المرور: ${pass}`;
      }

      const { error } = await supabase.from('people').upsert(updatedPerson);
      if (error) throw error;

      setState(prev => ({
        ...prev,
        users: updatedUserObj ? [...prev.users, updatedUserObj] as any : prev.users,
        people: editingId 
          ? prev.people.map(p => p.id === editingId ? updatedPerson : p)
          : [updatedPerson, ...prev.people]
      }));

      addLog?.(editingId ? 'تم تحديث البيانات بنجاح' : 'تمت الإضافة بنجاح', 'success');
      if (newAccountStr) {
         alert(newAccountStr);
         addLog?.("تم إنشاء حساب", newAccountStr, "info");
      }
      setIsModalOpen(false);
      setEditingId(null);
      setAutoCreateAccount(false);
      setFormData(initialFormState);
    } catch (err: any) {
      alert("خطأ في السحابة: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف سجل ${name} نهائياً؟`) || isViewer) return;
    try {
      const { error } = await supabase.from('people').delete().eq('id', id);
      if (error) throw error;
      setState(p => ({ ...p, people: p.people.filter(x => x.id !== id) }));
      addLog?.('تم حذف السجل', 'error');
    } catch (err: any) {
      alert('خطأ في الحذف: ' + err.message);
    }
  };

  const handleCreateAccount = async (person: Person) => {
    const existing = state.users.find(u => u.username === person.name);
    if (existing) {
       alert(`يوجد حساب مسبقاً بهذا الاسم: ${existing.username}`);
       return;
    }
    
    if (!confirm(`هل تريد توليد حساب تلقائي للموظف ${person.name}؟`)) return;

    try {
      const pass = Math.random().toString(36).slice(-6);
      const uRole = person.role === 'طبيب' || person.role === 'معالج' ? 'طبيب' : 'إداري فئات';
      const newAcc = {
        id: generateUUID(),
        username: person.name,
        password: pass,
        role: uRole,
        restrictedCategory: (person.category || '').split(',')[0] || ''
      };

      const { error } = await supabase.from('app_users').insert(newAcc);
      if (error) throw error;

      setState(prev => ({
        ...prev,
        users: [...prev.users, newAcc] as any
      }));
      
      const msg = `تم إنشاء الحساب بنجاح!\nاسم الحساب: ${person.name}\nكلمة المرور: ${pass}`;
      alert(msg);
      addLog?.('تم إنشاء حساب بنجاح', 'success');
    } catch(e: any) {
      alert("خطأ في إنشاء الحساب: " + e.message);
    }
  };

  const openEdit = (p: Person) => {
    if (isViewer) return;
    setEditingId(p.id);
    setFormData({ ...p, certificates: p.certificates || [], experiences: p.experiences || [] });
    setIsModalOpen(true);
  };

  const inputClass = "w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-950 focus:border-orange-500 outline-none transition-all placeholder:text-slate-500 text-sm font-bold shadow-sm";
  const labelClass = "text-[11px] font-black text-slate-600 uppercase mb-1.5 block flex items-center gap-2 tracking-widest";
  const sectionHeader = "text-orange-700 font-black text-[11px] uppercase tracking-[0.2em] border-r-4 border-orange-500 pr-3 mb-6 mt-8 flex items-center gap-2 bg-orange-50 py-2 rounded-l-lg";

  return (
    <div className="space-y-8 relative font-['IBM_Plex_Sans_Arabic']" dir="rtl">
      {/* شريط البحث والفلترة */}
      <div className="modern-card p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center">
         <div className="flex-1 relative w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="text" placeholder="البحث بالاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 md:py-4 pr-12 pl-6 text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/10 transition-all font-bold shadow-sm text-sm" />
         </div>

         {!hasRestriction ? (
           <div className="relative w-full md:w-64">
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <select 
                value={localCategoryFilter} 
                onChange={e => setLocalCategoryFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 md:py-4 pr-12 pl-6 text-blue-900 outline-none focus:ring-2 focus:ring-orange-500/10 transition-all font-black text-xs cursor-pointer appearance-none shadow-sm"
              >
                 <option value="الكل">جميع الفئات</option>
                 {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>
         ) : allowedCategories.length > 1 ? (
           <div className="relative w-full md:w-64">
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <select value={localCategoryFilter} onChange={e => setLocalCategoryFilter(e.target.value)} className="w-full bg-orange-50 border border-orange-200 rounded-xl py-3 md:py-4 pr-12 pl-6 text-orange-600 outline-none font-black text-xs cursor-pointer appearance-none shadow-sm">
                 <option value="الكل">كل فئات الصلاحية</option>
                 {allowedCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>
         ) : (
           <div className="bg-orange-50 border border-orange-200 px-6 py-4 rounded-xl text-orange-600 font-black text-[10px] md:text-xs uppercase tracking-widest shadow-sm w-full md:w-auto text-center">
              فئة: {allowedCategories[0]}
           </div>
         )}

         {!isViewer && (
           <button onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
             className="bg-orange-500 text-white px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center gap-3 shadow-lg shadow-orange-500/10 hover:bg-orange-600 transition-all whitespace-nowrap w-full md:w-auto justify-center">
              <UserPlus size={20}/> إضافة كادر جديد
           </button>
         )}
      </div>

      <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl w-full sm:w-fit shadow-inner">
          <button className="flex-1 sm:flex-none px-4 md:px-10 py-2.5 rounded-lg font-black text-[10px] md:text-xs transition-all bg-white text-blue-950 shadow-md">
            المدربين والكوادر ({filteredMembers.length})
          </button>
      </div>

      {/* قائمة البطاقات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-4">
        {filteredMembers.map(person => {
          const hasAccount = state.users.some(u => u.username === person.name);
          const getRoleIcon = (role: string) => {
            switch(role) {
              case 'مدرب': return <UserCog size={12} className="text-orange-600" />;
              case 'مساعد مدرب': return <Users size={12} className="text-orange-500" />;
              case 'مدرب حراس': return <Shield size={12} className="text-blue-600" />;
              case 'مدرب لياقة': return <Dumbbell size={12} className="text-emerald-600" />;
              case 'إداري': return <Briefcase size={12} className="text-purple-600" />;
              case 'طبيب': return <Stethoscope size={12} className="text-red-500" />;
              case 'معالج': return <HeartPulse size={12} className="text-rose-400" />;
              case 'منسق إعلامي': return <Camera size={12} className="text-indigo-500" />;
              case 'مرافق': return <User size={12} className="text-slate-500" />;
              default: return <User size={12} className="text-slate-500" />;
            }
          };

          return (
          <div key={person.id} className="modern-card p-4 md:p-5 group hover:border-orange-500 transition-all flex flex-col border-b-4 border-b-orange-500/20">
             <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center font-black text-xl text-blue-900 border border-blue-100 shadow-sm group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-400 transition-all">
                   {person.name.charAt(0)}
                </div>
                <div className="flex flex-col items-end gap-1">
                   <span className="text-[8px] md:text-[9px] font-black text-orange-700 uppercase tracking-widest leading-tight text-right w-full sm:max-w-24 break-words truncate" title={person.category}>{person.category.split(',').join(' • ')}</span>
                   <span className="text-[10px] text-slate-600 font-bold flex items-center gap-1">
                      {person.role}
                      {getRoleIcon(person.role || '')}
                   </span>
                </div>
             </div>
             <h3 className="text-sm md:text-base font-black text-blue-950 mb-1 group-hover:text-orange-700 transition-colors uppercase tracking-tight truncate">{person.name}</h3>
             <p className="text-[8px] md:text-[9px] text-slate-600 font-bold mb-2 italic truncate">{person.academicDegree || 'بدون تحصيل'}</p>
             <div className="flex flex-wrap gap-1 mb-3">
                {person.certificates && person.certificates.length > 0 && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">{person.certificates.length} شهادات</span>}
                {person.experiences && person.experiences.length > 0 && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">{person.experiences.length} خبرات</span>}
             </div>
             <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center gap-2">
                <button onClick={() => onOpenReport?.(person)} className="text-[10px] font-black text-slate-700 hover:text-orange-600 flex items-center gap-1 transition-colors uppercase tracking-widest whitespace-nowrap">الملف <ChevronRight size={12}/></button>
                <div className="flex gap-1.5">
                   {!isViewer && (
                     <>
                       {!hasAccount && (
                         <button onClick={() => handleCreateAccount(person)} title="إنشاء حساب للنظام" className="p-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all shadow-sm"><Key size={12} /></button>
                       )}
                       <button onClick={() => openEdit(person)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 size={12} /></button>
                       <button onClick={() => handleDelete(person.id, person.name)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={12} /></button>
                     </>
                   )}
                </div>
             </div>
          </div>
        );
      })}
        {filteredMembers.length === 0 && (
          <div className="col-span-full py-16 md:py-20 text-center border-4 border-dashed border-slate-200 rounded-[2rem] md:rounded-[3rem]">
            <Search size={48} className="mx-auto mb-4 text-slate-200 md:w-16 md:h-16" />
            <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] md:text-sm">لا بيانات لعرضها حالياً</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center lg:p-4">
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full h-full lg:h-auto lg:max-w-5xl lg:max-h-[90vh] lg:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-5 md:p-6 border-b border-slate-100 bg-white flex justify-between items-center">
              <h3 className="text-base md:text-xl font-black text-blue-900 flex items-center gap-2 md:gap-3 italic uppercase"><UserPlus className="text-orange-500 w-5 h-5 md:w-6 md:h-6" /> {editingId ? 'تعديل سجل الكادر' : 'إضافة كادر جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-slate-100 hover:bg-red-500 text-slate-600 hover:text-white rounded-xl transition-all shadow-sm"><X size={20}/></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-2 custom-scrollbar bg-slate-50 text-right pb-32 lg:pb-10" dir="rtl">
              
              {/* القسم 1: الهوية */}
              <h4 className={sectionHeader}><Fingerprint size={16}/> 1. معلومات الهوية والنقابة</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1"><label className={labelClass}>الاسم الثنائي/الثلاثي</label><input required className={inputClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>اسم الأب</label><input className={inputClass} value={formData.fatherName || ''} onChange={e => setFormData({...formData, fatherName: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>اسم الأم</label><input className={inputClass} value={formData.motherName || ''} onChange={e => setFormData({...formData, motherName: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>تاريخ الميلاد</label><input type="date" className={inputClass} value={formData.birthDate || ''} onChange={e => setFormData({...formData, birthDate: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>مكان الولادة</label><input className={inputClass} value={formData.birthPlace || ''} onChange={e => setFormData({...formData, birthPlace: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الخانة</label><input className={inputClass} value={formData.khana || ''} onChange={e => setFormData({...formData, khana: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الوطني</label><input className={inputClass} value={formData.nationalId || ''} onChange={e => setFormData({...formData, nationalId: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الاتحادي</label><input className={inputClass} value={formData.federalNumber || ''} onChange={e => setFormData({...formData, federalNumber: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الدولي</label><input className={inputClass} value={formData.internationalId || ''} onChange={e => setFormData({...formData, internationalId: e.target.value})} /></div>
                <div className="sm:col-span-1 space-y-1"><label className={labelClass}>رقم الهاتف</label><input className={inputClass} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div className="sm:col-span-2 space-y-1"><label className={labelClass}>العنوان التفصيلي</label><input className={inputClass} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              </div>

              {/* القسم 2: الرياضة */}
              <h4 className={sectionHeader}><Activity size={16}/> 2. التوصيف الوظيفي بالنادي</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1"><label className={labelClass}>الدور الوظيفي</label><select className={inputClass} value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value as Role})}><option value="مدرب">مدرب</option><option value="مساعد مدرب">مساعد مدرب</option><option value="مدرب حراس">مدرب حراس</option><option value="مدرب لياقة">مدرب لياقة</option><option value="إداري">إداري</option><option value="طبيب">طبيب</option><option value="معالج">معالج</option><option value="منسق إعلامي">منسق إعلامي</option><option value="مرافق">مرافق</option></select></div>
                <div className="space-y-1 col-span-1 sm:col-span-2 md:col-span-1">
                   <label className={labelClass}>الفئات المسندة</label>
                   <div className="flex flex-wrap gap-2 relative z-10 py-1">
                     {(hasRestriction ? allowedCategories : state.categories).map(c => {
                       const selected = (formData.category || '').split(',').includes(c);
                       return (
                         <label key={c} className={`px-2 md:px-3 py-1.5 rounded-lg border-2 text-[10px] md:text-11px font-bold cursor-pointer transition-colors ${selected ? 'bg-orange-100 border-orange-500 text-orange-800' : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'}`}>
                           <input type="checkbox" className="hidden" checked={selected} onChange={(e) => {
                             let cats = (formData.category || '').split(',').filter(Boolean);
                             if (e.target.checked) cats.push(c);
                             else cats = cats.filter(x => x !== c);
                             setFormData({...formData, category: cats.join(',')});
                           }} />
                           {c}
                         </label>
                       )
                     })}
                   </div>
                </div>
                <div className="space-y-1"><label className={labelClass}>تاريخ الانضمام</label><input type="date" className={inputClass} value={formData.joinDate || ''} onChange={e => setFormData({...formData, joinDate: e.target.value})} /></div>
              </div>

              {/* الشهادات التدريبية */}
              <div className="mt-8 flex justify-between items-center bg-orange-50 px-3 py-2 rounded-l-lg border-r-4 border-orange-500 mb-6 w-full">
                <h4 className="text-orange-700 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 m-0"><Award size={16}/> 3. الشهادات التدريبية</h4>
                <button type="button" onClick={() => setFormData({...formData, certificates: [...(formData.certificates || []), { id: generateUUID(), name: '', date: '' }]})} className="bg-orange-500 text-white p-1 rounded hover:bg-orange-600 transition-all"><Plus size={16}/></button>
              </div>
              
              <div className="space-y-3">
                {(!formData.certificates || formData.certificates.length === 0) && <p className="text-sm text-slate-500 italic p-4 bg-slate-100 rounded-xl border border-slate-200">لا يوجد شهادات تدريبية مضافة</p>}
                {(formData.certificates || []).map((cert, index) => (
                  <div key={cert.id} className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                    <div className="flex-1 space-y-1">
                      <label className={labelClass}>اسم الشهادة التدريبية</label>
                      <input className={inputClass} placeholder="مثال: رخصة تدريب A من الاتحاد الآسيوي" value={cert.name} onChange={e => {
                        const newCerts = [...(formData.certificates || [])];
                        newCerts[index].name = e.target.value;
                        setFormData({...formData, certificates: newCerts});
                      }} />
                    </div>
                    <div className="w-full md:w-1/3 space-y-1">
                      <label className={labelClass}>تاريخ الشهادة</label>
                      <input type="date" className={inputClass} value={cert.date} onChange={e => {
                        const newCerts = [...(formData.certificates || [])];
                        newCerts[index].date = e.target.value;
                        setFormData({...formData, certificates: newCerts});
                      }} />
                    </div>
                    <button type="button" onClick={() => {
                       const newCerts = [...(formData.certificates || [])];
                       newCerts.splice(index, 1);
                       setFormData({...formData, certificates: newCerts});
                    }} className="mt-6 p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all self-end h-min"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>

              {/* الخبرات السابقة */}
              <div className="mt-8 flex justify-between items-center bg-orange-50 px-3 py-2 rounded-l-lg border-r-4 border-orange-500 mb-6 w-full">
                <h4 className="text-orange-700 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 m-0"><Briefcase size={16}/> 4. الخبرات السابقة</h4>
                <button type="button" onClick={() => setFormData({...formData, experiences: [...(formData.experiences || []), { id: generateUUID(), employer: '', position: '' }]})} className="bg-orange-500 text-white p-1 rounded hover:bg-orange-600 transition-all"><Plus size={16}/></button>
              </div>

              <div className="space-y-3">
                {(!formData.experiences || formData.experiences.length === 0) && <p className="text-sm text-slate-500 italic p-4 bg-slate-100 rounded-xl border border-slate-200">لا يوجد خبرات سابقة مضافة</p>}
                {(formData.experiences || []).map((exp, index) => (
                  <div key={exp.id} className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                    <div className="flex-1 space-y-1">
                      <label className={labelClass}>جهة العمل النادي / المنتخب</label>
                      <input className={inputClass} placeholder="مثال: نادي تشرين" value={exp.employer} onChange={e => {
                        const newExps = [...(formData.experiences || [])];
                        newExps[index].employer = e.target.value;
                        setFormData({...formData, experiences: newExps});
                      }} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className={labelClass}>المنصب / الصفة الوظيفية</label>
                      <input className={inputClass} placeholder="مثال: مدرب لياقة" value={exp.position} onChange={e => {
                        const newExps = [...(formData.experiences || [])];
                        newExps[index].position = e.target.value;
                        setFormData({...formData, experiences: newExps});
                      }} />
                    </div>
                    <button type="button" onClick={() => {
                       const newExps = [...(formData.experiences || [])];
                       newExps.splice(index, 1);
                       setFormData({...formData, experiences: newExps});
                    }} className="mt-6 p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all self-end h-min"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>

              <div className="pt-6 md:pt-8 w-full border-t border-slate-100 flex flex-col gap-4">
                {!editingId && (
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border-dashed border-2 border-slate-200">
                     <div>
                        <p className="text-[12px] md:text-sm font-black text-slate-800 flex items-center gap-2"><Key size={16} className="text-orange-600"/> إنشاء حساب للتطبيق تلقائياً</p>
                        <p className="text-[9px] md:text-[10px] text-slate-500 font-bold mt-1 max-w-[200px] sm:max-w-xs">إنشاء حساب لدخول النظام بناءً على دوره الوظيفي مع توليد كلمة مرور.</p>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={autoCreateAccount} onChange={(e) => setAutoCreateAccount(e.target.checked)} />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                     </label>
                  </div>
                )}
                <button type="submit" disabled={isSaving} className="w-full bg-blue-900 text-white py-5 md:py-6 rounded-xl md:rounded-2xl font-black text-lg md:text-xl shadow-xl shadow-blue-900/10 hover:bg-blue-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                  {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24}/>} 
                  تثبيت سجل الكادر المركزي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
