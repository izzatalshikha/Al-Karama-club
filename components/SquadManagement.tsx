
import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Trash2, Search, X, Hash, Phone, User as UserIcon, 
  Banknote, Edit, MapPin, CreditCard, Shield, Globe, BookOpen, 
  FileBarChart, Layers, Plus, GraduationCap, Award, Calendar, 
  StickyNote, UserCheck, Fingerprint, IdCard, School, Clock,
  Globe2
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
    nationality: 'سوري',
    name: '',
    fatherName: '',
    motherName: '',
    birthDate: '',
    birthPlace: '',
    khana: '',
    nationalId: '',
    federalNumber: '',
    internationalId: '', // الحالة الجديدة
    address: '',
    academicDegree: '',
    coachingCertificate: '',
    number: undefined,
    phone: ''
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
    resetForm();
  };

  const resetForm = () => {
    setFormData({ 
      category: restrictedCat || (state.categories[0] || 'رجال'), 
      role: 'لاعب', 
      nationality: 'سوري',
      name: '',
      fatherName: '',
      motherName: '',
      birthDate: '',
      birthPlace: '',
      khana: '',
      nationalId: '',
      federalNumber: '',
      internationalId: '', // تصفير الحقل
      address: '',
      academicDegree: '',
      coachingCertificate: '',
      number: undefined,
      phone: ''
    });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (state.categories.includes(newCatName.trim())) {
      alert('الفئة موجودة مسبقاً');
      return;
    }

    setState(prev => ({
      ...prev,
      categories: [...prev.categories, newCatName.trim()]
    }));
    setNewCatName('');
    setIsCatModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 no-print">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input type="text" placeholder="البحث عن اسم..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pr-12 pl-10 outline-none focus:ring-2 focus:ring-blue-500 font-black text-slate-950" />
          </div>
          <div className="flex gap-2">
            {isManager && (
              <button onClick={() => setIsCatModalOpen(true)} className="bg-blue-50 text-blue-700 px-6 py-3.5 rounded-2xl font-black">الفئات</button>
            )}
            <button onClick={() => { setEditingPersonId(null); resetForm(); setIsModalOpen(true); }}
              className="bg-orange-600 text-white px-8 py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black shadow-xl shadow-orange-200">
              <UserPlus size={20} /> إضافة عضو
            </button>
          </div>
        </div>

        {!restrictedCat && (
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border overflow-x-auto no-scrollbar max-w-full">
            <button onClick={() => setSelectedCategory('الكل')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${selectedCategory === 'الكل' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>الكل</button>
            {state.categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{cat}</button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-slate-500 font-black text-xs">الاسم والدور</th>
                <th className="px-6 py-5 text-slate-500 font-black text-xs">العمر</th>
                <th className="px-6 py-5 text-slate-500 font-black text-xs text-center">الرقم</th>
                <th className="px-6 py-5 text-slate-500 font-black text-xs">العنوان</th>
                <th className="px-6 py-5 text-slate-500 font-black text-xs text-center no-print">التقرير</th>
                <th className="px-6 py-5 text-slate-500 font-black text-xs text-center no-print">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPeople.map(person => (
                <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-black text-slate-950 block">{person.name}</span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{person.category} - {person.role}</span>
                  </td>
                  <td className="px-6 py-4 font-black text-blue-900">{calculateAge(person.birthDate) || '--'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white text-xs font-black">
                      {person.number || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-black text-slate-500">{person.address || 'غير مسجل'}</td>
                  <td className="px-6 py-4 text-center no-print">
                    <button onClick={() => onOpenReport?.(person)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl"><FileBarChart size={20}/></button>
                  </td>
                  <td className="px-6 py-4 text-center no-print">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setEditingPersonId(person.id); setFormData(person); setIsModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl"><Edit size={18} /></button>
                      <button onClick={() => { if(confirm('هل أنت متأكد من حذف هذا العضو؟')) setState(prev => ({...prev, people: prev.people.filter(p => p.id !== person.id)})); }} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[200] p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl shadow-2xl overflow-hidden my-auto border border-white/20">
            <div className="p-8 border-b bg-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-900 text-white rounded-xl"><UserPlus size={24}/></div>
                 <h3 className="text-xl font-black text-slate-800">{editingPersonId ? 'تحديث البيانات الرسمية' : 'تسجيل عضو جديد في النادي'}</h3>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 p-2 rounded-xl text-slate-500 hover:text-red-600 transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
              
              {/* القسم الأول: المعلومات الشخصية */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-blue-900 border-r-4 border-blue-900 pr-3 flex items-center gap-2">
                  <UserIcon size={18}/> البيانات الأساسية والعائلية
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الاسم الثلاثي الكامل</label>
                    <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="الاسم والشهرة" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">اسم الأب</label>
                    <input type="text" value={formData.fatherName || ''} onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" placeholder="اسم الوالد" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">اسم الأم</label>
                    <input type="text" value={formData.motherName || ''} onChange={e => setFormData({ ...formData, motherName: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" placeholder="اسم الوالدة" />
                  </div>
                </div>
              </div>

              {/* القسم الثاني: بيانات الولادة */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-orange-600 border-r-4 border-orange-500 pr-3 flex items-center gap-2">
                  <Calendar size={18}/> بيانات الولادة والعمر
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">تاريخ الميلاد</label>
                    <input type="date" value={formData.birthDate || ''} onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">مكان الميلاد</label>
                    <input type="text" value={formData.birthPlace || ''} onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" placeholder="المحافظة / المدينة" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">العمر الحالي (حساب تلقائي)</label>
                    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-black text-blue-900 flex items-center gap-2">
                      <Clock size={16} /> {calculateAge(formData.birthDate) !== null ? `${calculateAge(formData.birthDate)} سنة` : 'بانتظار التاريخ...'}
                    </div>
                  </div>
                </div>
              </div>

              {/* القسم الثالث: أرقام القيد والهوية */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-emerald-600 border-r-4 border-emerald-500 pr-3 flex items-center gap-2">
                  <Fingerprint size={18}/> بيانات القيد والهوية الرسمية
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">القيد (الخانة)</label>
                    <input type="text" value={formData.khana || ''} onChange={e => setFormData({ ...formData, khana: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" placeholder="رقم القيد" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الرقم الوطني</label>
                    <input type="text" value={formData.nationalId || ''} onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" placeholder="11 خانة" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الرقم الاتحادي</label>
                    <input type="text" value={formData.federalNumber || ''} onChange={e => setFormData({ ...formData, federalNumber: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" placeholder="رقم الاتحاد السوري" />
                  </div>
                  {/* الحقل الجديد المطلوب */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الرقم الدولي (FIFA/ID)</label>
                    <div className="relative">
                       <Globe2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input type="text" value={formData.internationalId || ''} onChange={e => setFormData({ ...formData, internationalId: e.target.value })}
                         className="w-full bg-slate-100 border-none rounded-2xl p-4 pr-12 font-black text-blue-800 outline-none focus:ring-2 focus:ring-blue-500" placeholder="الرقم الدولي" />
                    </div>
                  </div>
                </div>
              </div>

              {/* القسم الرابع: البيانات الرياضية */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-slate-800 border-r-4 border-slate-800 pr-3 flex items-center gap-2">
                  <Shield size={18}/> المعلومات الرياضية والاتصال
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الدور الرياضي</label>
                    <select className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" 
                      value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as Role })}>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الفئة</label>
                    <select className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" 
                      value={formData.category} disabled={!!restrictedCat} onChange={e => setFormData({ ...formData, category: e.target.value as Category })}>
                      {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">رقم القميص</label>
                    <input type="number" value={formData.number || ''} onChange={e => setFormData({ ...formData, number: parseInt(e.target.value) || undefined })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" placeholder="--" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">رقم الهاتف</label>
                    <input type="text" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" placeholder="09xxxxxxxx" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500">العنوان بالتفصيل</label>
                  <input type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="المدينة - الحي - الشارع" />
                </div>
              </div>

              {/* القسم الخامس: الشهادات والتحصيل */}
              <div className="space-y-6">
                <h4 className="text-sm font-black text-indigo-600 border-r-4 border-indigo-500 pr-3 flex items-center gap-2">
                  <School size={18}/> التحصيل العلمي والشهادات
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الشهادة التعليمية (المؤهل العلمي)</label>
                    <input type="text" value={formData.academicDegree || ''} onChange={e => setFormData({ ...formData, academicDegree: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" placeholder="مثال: إجازة في التربية الرياضية" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500">الشهادة التدريبية (للكوادر)</label>
                    <input type="text" value={formData.coachingCertificate || ''} onChange={e => setFormData({ ...formData, coachingCertificate: e.target.value })}
                      className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black text-slate-950 outline-none" placeholder="مثال: شهادة AFC - B" />
                  </div>
                </div>
              </div>

              <div className="pt-10 border-t">
                <button type="submit" className="w-full bg-blue-900 text-white font-black py-5 rounded-[2rem] shadow-2xl hover:bg-black transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 text-lg">
                  {editingPersonId ? 'حفظ كافة التعديلات' : 'إتمام التسجيل الرسمي في كشوف النادي'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SquadManagement;
