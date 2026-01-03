
import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Trash2, Search, X, Hash, Phone, User as UserIcon, 
  Banknote, Edit, MapPin, CreditCard, Shield, Globe, BookOpen, 
  FileBarChart, Layers, Plus, GraduationCap, Award, Calendar, 
  StickyNote, UserCheck 
} from 'lucide-react';
import { AppState, Category, Person, Role } from '../types';

interface SquadManagementProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onOpenReport?: (player: Person) => void;
}

const SquadManagement: React.FC<SquadManagementProps> = ({ state, setState, onOpenReport }) => {
  const currentUser = state.currentUser;
  const isManager = currentUser?.role === 'مدير';
  const restrictedCat = currentUser?.restrictedCategory;

  const [selectedCategory, setSelectedCategory] = useState<Category | 'الكل'>(restrictedCat || 'الكل');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Person>>({
    category: restrictedCat || (state.categories.length > 0 ? state.categories[0] : 'رجال'),
    role: 'لاعب',
    nationality: 'سوري'
  });

  const roles: Role[] = ['لاعب', 'مدرب', 'مساعد مدرب', 'إداري', 'طبيب'];

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    if (isNaN(birth.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : 0;
  };

  const filteredPeople = state.people.filter(p => {
    const matchesCategory = selectedCategory === 'الكل' ? true : p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const finalCategory = restrictedCat || (formData.category as Category);

    if (editingPersonId) {
      setState(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === editingPersonId ? { ...p, ...formData, category: finalCategory } as Person : p)
      }));
    } else {
      const newPerson: Person = {
        id: Math.random().toString(36).substr(2, 9),
        joinDate: new Date().toISOString().split('T')[0],
        ...(formData as Person),
        category: finalCategory
      };
      setState(prev => ({ ...prev, people: [...prev.people, newPerson] }));
    }

    setIsModalOpen(false);
    setEditingPersonId(null);
    setFormData({ category: restrictedCat || (state.categories[0] || 'رجال'), role: 'لاعب', nationality: 'سوري' });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (state.categories.includes(newCatName.trim())) {
      alert('هذه الفئة موجودة مسبقاً');
      return;
    }

    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCatName.trim()],
      notifications: [{
        id: Math.random().toString(36).substr(2, 9),
        message: `تمت إضافة فئة "${newCatName}" بنجاح`,
        type: 'success',
        timestamp: Date.now()
      }]
    }));
    setNewCatName('');
    setIsCatModalOpen(false);
  };

  const deleteCategory = (cat: Category) => {
    if (state.people.some(p => p.category === cat)) {
      alert('لا يمكن حذف الفئة لأنها تحتوي على لاعبين أو كوادر. يرجى نقلهم أو حذفهم أولاً.');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف فئة ${cat}؟`)) {
      setState(prev => ({
        ...prev,
        categories: prev.categories.filter(c => c !== cat)
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 no-print">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="البحث بالاسم..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pr-12 pl-10 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-950" />
          </div>
          
          <div className="flex gap-2">
            {isManager && (
              <button onClick={() => setIsCatModalOpen(true)}
                className="bg-blue-100 text-blue-700 px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black hover:bg-blue-200 transition-all">
                <Layers size={20} /> إدارة الفئات
              </button>
            )}
            {(isManager || !!restrictedCat) && (
              <button onClick={() => { setEditingPersonId(null); setFormData({ category: restrictedCat || (state.categories[0] || 'رجال'), role: 'لاعب', nationality: 'سوري' }); setIsModalOpen(true); }}
                className="bg-orange-600 text-white px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black hover:bg-orange-700 transition-all shadow-xl shadow-orange-200">
                <UserPlus size={20} /> إضافة عضو
              </button>
            )}
          </div>
        </div>

        {!restrictedCat && (
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border w-max max-w-full overflow-x-auto no-scrollbar">
            <button onClick={() => setSelectedCategory('الكل')} className={`px-6 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${selectedCategory === 'الكل' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>الكل</button>
            {state.categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-xl text-sm font-black transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>{cat}</button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-slate-500 font-black text-xs">الاسم والتفاصيل</th>
                <th className="px-6 py-5 text-slate-500 font-black text-xs">العمر والميلاد</th>
                <th className="px-6 py-5 text-slate-500 font-black text-xs text-center">الرقم</th>
                <th className="px-6 py-5 text-slate-500 font-black text-xs">بيانات القيد والعنوان</th>
                <th className="px-6 py-5 text-slate-500 font-black text-xs text-center no-print">تقرير فني</th>
                <th className="px-6 py-5 text-slate-500 font-black text-xs text-center no-print">تحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPeople.map(person => (
                <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-950 text-base block">{person.name}</span>
                    <span className="text-[10px] text-slate-400 font-black block">{person.phone || 'بدون هاتف'}</span>
                    <div className="flex gap-1.5 mt-1">
                      <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-black">{person.category}</span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black">{person.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-blue-900 block">{calculateAge(person.birthDate) ?? '-'} سنة</span>
                    <span className="text-[10px] text-slate-400 font-bold">{person.birthDate}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white text-sm font-black border-2 border-orange-500/30">
                      {person.number || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[10px] space-y-1 font-black">
                      <div className="flex items-center gap-1 text-slate-700"><CreditCard size={12}/> {person.nationalId || 'لا يوجد'}</div>
                      <div className="flex items-center gap-1 text-blue-800"><Shield size={12}/> {person.federalNumber || 'لا يوجد'}</div>
                      <div className="flex items-center gap-1 text-slate-500"><MapPin size={12}/> {person.address || 'العنوان غير مسجل'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center no-print">
                    {(person.role === 'لاعب' || person.role === 'مدرب' || person.role === 'مساعد مدرب') && onOpenReport && (
                      <button onClick={() => onOpenReport(person)} 
                        className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                        <FileBarChart size={20} />
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center no-print">
                    <div className="flex items-center justify-center gap-2">
                       {(isManager || restrictedCat === person.category) && (
                         <>
                           <button onClick={() => { setEditingPersonId(person.id); setFormData(person); setIsModalOpen(true); }} className="text-blue-500 p-2 hover:bg-blue-50 rounded-xl"><Edit size={18} /></button>
                           <button onClick={() => { if(confirm('حذف؟')) setState(prev => ({...prev, people: prev.people.filter(p => p.id !== person.id)})); }} className="text-red-400 p-2 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden my-auto border border-white/20">
            <div className="p-8 border-b flex items-center justify-between bg-slate-50">
               <div>
                  <h3 className="text-2xl font-black text-slate-800">{editingPersonId ? 'تحديث البيانات' : 'تسجيل عضو جديد'}</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">نموذج قيد رسمي - نادي الكرامة</p>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 p-2 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-10 space-y-10 max-h-[85vh] overflow-y-auto custom-scrollbar">
              
              {/* 1. البيانات الشخصية والعائلية */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-blue-900 flex items-center gap-2 border-r-4 border-blue-600 pr-3">
                   البيانات الشخصية والعائلية
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الاسم الثنائي</label>
                    <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">اسم الأب</label>
                    <input type="text" value={formData.fatherName || ''} onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">اسم الأم</label>
                    <input type="text" value={formData.motherName || ''} onChange={e => setFormData({ ...formData, motherName: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">تاريخ الولادة</label>
                    <input type="date" value={formData.birthDate || ''} onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">العمر (تلقائي)</label>
                    <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 font-black text-blue-600 text-center">
                      {calculateAge(formData.birthDate) ?? '--'} عام
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">مكان الولادة</label>
                    <input type="text" value={formData.birthPlace || ''} onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* 2. البيانات الرسمية والعنوان */}
              <div className="space-y-6 pt-6 border-t border-slate-50">
                <h4 className="text-sm font-black text-orange-600 flex items-center gap-2 border-r-4 border-orange-500 pr-3">
                   البيانات الرسمية والعنوان
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الرقم الوطني</label>
                    <div className="relative">
                       <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="text" value={formData.nationalId || ''} onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                        className="w-full bg-slate-100 border-none rounded-2xl py-4 pr-12 pl-4 font-bold text-slate-950 focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الرقم الاتحادي</label>
                    <div className="relative">
                       <Shield className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="text" value={formData.federalNumber || ''} onChange={e => setFormData({ ...formData, federalNumber: e.target.value })}
                        className="w-full bg-slate-100 border-none rounded-2xl py-4 pr-12 pl-4 font-bold text-slate-950 focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">رقم الهاتف</label>
                    <div className="relative">
                       <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="text" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-slate-100 border-none rounded-2xl py-4 pr-12 pl-4 font-bold text-slate-950 focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-black text-slate-500">العنوان بالتفصيل</label>
                    <div className="relative">
                       <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                       <input type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-slate-100 border-none rounded-2xl py-4 pr-12 pl-4 font-bold text-slate-950 focus:ring-2 focus:ring-orange-500 outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. المؤهلات والدور الرياضي */}
              <div className="space-y-6 pt-6 border-t border-slate-50">
                <h4 className="text-sm font-black text-emerald-700 flex items-center gap-2 border-r-4 border-emerald-600 pr-3">
                   المؤهلات والدور الرياضي
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الدور</label>
                    <select className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 outline-none" 
                      value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as Role })}>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الفئة</label>
                    <select className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 outline-none" 
                      value={formData.category} disabled={!!restrictedCat} onChange={e => setFormData({ ...formData, category: e.target.value as Category })}>
                      {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">رقم القميص</label>
                    <div className="relative">
                      <Hash className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="number" value={formData.number || ''} onChange={e => setFormData({ ...formData, number: parseInt(e.target.value) || undefined })}
                        className="w-full bg-slate-100 border-none rounded-2xl py-4 pr-12 pl-4 font-bold text-slate-950 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الشهادة التعليمية</label>
                    <input type="text" value={formData.academicDegree || ''} onChange={e => setFormData({ ...formData, academicDegree: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 outline-none" />
                  </div>
                  
                  {(formData.role === 'مدرب' || formData.role === 'مساعد مدرب') && (
                    <div className="md:col-span-4 space-y-1.5">
                      <label className="text-xs font-black text-slate-500">الشهادة التدريبية</label>
                      <div className="relative">
                        <Award className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" value={formData.coachingCertificate || ''} onChange={e => setFormData({ ...formData, coachingCertificate: e.target.value })}
                          className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl py-4 pr-12 pl-4 font-bold text-slate-950 outline-none" placeholder="AFC A / AFC B / PRO..." />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. بيانات العقد والملاحظات */}
              <div className="space-y-6 pt-6 border-t border-slate-50">
                <h4 className="text-sm font-black text-slate-700 flex items-center gap-2 border-r-4 border-slate-900 pr-3">
                   بيانات العقد والملاحظات
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">بداية العقد</label>
                    <input type="date" value={formData.contractStart || ''} onChange={e => setFormData({ ...formData, contractStart: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">نهاية العقد</label>
                    <input type="date" value={formData.contractEnd || ''} onChange={e => setFormData({ ...formData, contractEnd: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">مدة العقد</label>
                    <input type="text" value={formData.contractDuration || ''} onChange={e => setFormData({ ...formData, contractDuration: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 outline-none" placeholder="مثال: سنتين" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">قيمة العقد / الراتب</label>
                    <input type="text" value={formData.contractValue || ''} onChange={e => setFormData({ ...formData, contractValue: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 outline-none" />
                  </div>
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs font-black text-slate-500">ملاحظات إضافية</label>
                    <div className="relative">
                      <StickyNote className="absolute right-4 top-4 text-slate-400" size={18} />
                      <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        rows={3} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pr-12 pl-4 font-bold text-slate-950 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="أي معلومات فنية أو إدارية أخرى..." />
                    </div>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t pt-8">
                <button type="submit" className="w-full bg-blue-900 text-white font-black py-5 rounded-[2rem] shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 text-lg group">
                  <UserCheck className="group-hover:scale-110 transition-transform" size={24} />
                  {editingPersonId ? 'حفظ التحديثات الرسمية' : 'اعتماد تسجيل العضو في النادي'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال إدارة الفئات (نفس الكود السابق مع وضوح أكثر) */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[150] p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden my-auto border border-blue-100">
            <div className="p-8 border-b flex items-center justify-between bg-blue-50/50">
               <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Layers size={22} className="text-blue-600"/> إدارة الفئات الرياضية</h3>
               <button onClick={() => setIsCatModalOpen(false)} className="bg-slate-200 p-2 rounded-xl hover:bg-red-100 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input required type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="اسم الفئة الجديدة..."
                  className="flex-1 bg-slate-100 border-none rounded-2xl p-4 font-bold text-slate-950 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none" />
                <button type="submit" className="bg-blue-900 text-white px-6 rounded-2xl font-black hover:bg-black transition-colors">إضافة</button>
              </form>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">الفئات الحالية بالمرتبة</p>
                <div className="grid grid-cols-1 gap-2">
                  {state.categories.map(cat => (
                    <div key={cat} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all">
                      <span className="font-black text-slate-800">{cat}</span>
                      <button onClick={() => deleteCategory(cat)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SquadManagement;
