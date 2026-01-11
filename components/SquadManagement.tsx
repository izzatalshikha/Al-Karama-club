
import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Trash2, Search, X, Shield, Award, Layers, Home, Plus, AlertCircle, Calendar,
  MapPin, Hash, UserCheck, ChevronLeft, FolderPlus, Filter, Settings2, BookOpen, Globe, CreditCard, Map,
  Briefcase, Printer, FileSpreadsheet, Eye, FileText, Users, ChevronRight
} from 'lucide-react';
import { AppState, Person, Role, Category } from '../types';
import ClubLogo from './ClubLogo';
import { generateUUID } from '../App';

interface SquadManagementProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  onOpenReport?: (player: Person) => void;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const SquadManagement: React.FC<SquadManagementProps> = ({ state, setState, onOpenReport, addLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string>('الكل');
  const [activeSubTab, setActiveSubTab] = useState<'players' | 'staff'>('players');
  const [showFullReportView, setShowFullReportView] = useState(false);
  
  const currentUser = state.currentUser;
  const restrictedCat = currentUser?.restrictedCategory;
  const isViewer = currentUser?.role === 'مشاهد';

  const [formData, setFormData] = useState<Partial<Person>>({
    role: 'لاعب',
    category: restrictedCat || state.categories[0] || '',
    joinDate: new Date().toISOString().split('T')[0]
  });

  const roles: Role[] = ['لاعب', 'مدرب', 'مساعد مدرب', 'مدرب حراس', 'مدرب لياقة', 'إداري', 'طبيب', 'معالج', 'منسق إعلامي', 'مرافق'];

  const calculateAge = (date?: string) => {
    if (!date) return null;
    const b = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - b.getFullYear();
    if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
    return age >= 0 ? age : 0;
  };

  const handleSave = (e: React.FormEvent) => {
    if (isViewer) return;
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      setState(p => ({
        ...p,
        people: p.people.map(person => {
          if (person.id === editingId) {
             const updated = { ...person, ...formData };
             return updated as Person;
          }
          return person;
        })
      }));
      addLog?.('تعديل عضو', `تم تحديث ملف العضو: ${formData.name}`, 'info');
    } else {
      const newPerson: Person = {
        id: generateUUID(),
        name: formData.name || '',
        fatherName: formData.fatherName || '',
        motherName: formData.motherName || '',
        birthDate: formData.birthDate || '',
        birthPlace: formData.birthPlace || '',
        khana: formData.khana || '',
        nationalId: formData.nationalId || '',
        federalNumber: formData.federalNumber || '',
        internationalId: formData.internationalId || '',
        address: formData.address || '',
        category: formData.category || restrictedCat || state.categories[0],
        role: formData.role || 'لاعب',
        number: formData.number || 0,
        phone: formData.phone || '',
        joinDate: formData.joinDate || new Date().toISOString().split('T')[0],
        contractStart: formData.contractStart || undefined,
        contractEnd: formData.contractEnd || undefined,
        contractValue: formData.contractValue || undefined,
        coachingCertificate: formData.coachingCertificate || undefined,
        academicDegree: formData.academicDegree || undefined,
        medicalHistory: undefined,
        injuries: undefined,
        penalties: undefined,
        notes: undefined
      };

      setState(p => ({ ...p, people: [...p.people, newPerson] }));
      addLog?.('تسجيل عضو جديد', `تم تسجيل ${newPerson.role}: ${newPerson.name}`, 'success');
    }
    setIsModalOpen(false);
    setEditingId(null);
  };

  const baseFiltered = state.people.filter(p => {
    // تقييد الفئة للإداري المخصص
    const matchCat = restrictedCat ? p.category === restrictedCat : (localCategoryFilter === 'الكل' ? true : p.category === localCategoryFilter);
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      (p.number?.toString().includes(searchTerm));
    return matchCat && matchSearch;
  });

  const filteredPlayers = baseFiltered.filter(p => p.role === 'لاعب');
  const filteredStaff = baseFiltered.filter(p => p.role !== 'لاعب');
  const displayList = activeSubTab === 'players' ? filteredPlayers : filteredStaff;

  const fieldClass = "w-full bg-white border-2 border-slate-900 rounded-xl py-2.5 px-4 font-black text-slate-900 outline-none focus:ring-4 focus:ring-orange-600/10 focus:border-orange-600 transition-all placeholder:text-slate-500 text-sm";
  const labelClass = "text-[10px] font-black text-slate-900 mr-2 uppercase block mb-1.5";

  // Full Category Report (Print View)
  if (showFullReportView) {
    const activeCategory = restrictedCat || localCategoryFilter;
    const reportList = baseFiltered.sort((a,b) => (a.number || 0) - (b.number || 0));
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-center no-print">
           <button onClick={() => setShowFullReportView(false)} className="flex items-center gap-2 text-slate-500 font-black hover:text-[#001F3F] transition-all">
             <ChevronRight size={20}/> العودة للإدارة
           </button>
           <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 shadow-xl hover:bg-black transition-all border-b-4 border-black">
             <Printer size={18}/> طباعة الكشف PDF
           </button>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border-4 border-slate-900 shadow-xl print:border-2 print:rounded-none print:shadow-none print:p-4">
           <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8 print:mb-4">
              <div className="flex items-center gap-4">
                 <ClubLogo size={80} />
                 <div>
                    <h2 className="text-2xl font-black text-[#001F3F]">نادي الكرامة الرياضي</h2>
                    <p className="text-sm font-black text-orange-600">مكتب كرة القدم المركزي</p>
                 </div>
              </div>
              <div className="text-left font-black">
                 <p className="text-xl">كشف الفئة الشامل</p>
                 <p className="text-sm text-slate-400">فئة: {activeCategory}</p>
                 <p className="text-[10px] mt-1">تاريخ الاستخراج: {new Date().toLocaleDateString('ar-SY')}</p>
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                 <thead>
                    <tr className="bg-slate-100 border-y-2 border-slate-900">
                       <th className="p-3 text-[10px] font-black border-l border-slate-200">الاسم الكامل</th>
                       <th className="p-3 text-[10px] font-black border-l border-slate-200 text-center">الرقم</th>
                       <th className="p-3 text-[10px] font-black border-l border-slate-200 text-center">الصفة</th>
                       <th className="p-3 text-[10px] font-black border-l border-slate-200 text-center">تاريخ الميلاد</th>
                       <th className="p-3 text-[10px] font-black border-l border-slate-200 text-center">الرقم الوطني</th>
                       <th className="p-3 text-[10px] font-black text-center">رقم القيد</th>
                    </tr>
                 </thead>
                 <tbody>
                    {reportList.map((p, idx) => (
                       <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 text-xs font-black border-l border-slate-200">{p.name}</td>
                          <td className="p-3 text-xs font-black border-l border-slate-200 text-center">{p.number || '--'}</td>
                          <td className="p-3 text-xs font-black border-l border-slate-200 text-center">{p.role}</td>
                          <td className="p-3 text-xs font-black border-l border-slate-200 text-center">{p.birthDate}</td>
                          <td className="p-3 text-xs font-black border-l border-slate-200 text-center">{p.nationalId || '--'}</td>
                          <td className="p-3 text-xs font-black text-center">{p.khana || '--'}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           <div className="mt-16 flex justify-around items-start opacity-0 print:opacity-100">
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">توقيع مدرب الفئة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">توقيع إداري الفئة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">مدير مكتب كرة القدم</p>
                 <p className="font-black text-xs text-blue-900">عزت عامر الشيخة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
           </div>
           <div className="mt-10 pt-4 border-t border-slate-200 text-center hidden print:block">
              <p className="text-[8px] font-black text-slate-400">وثيقة رسمية صادرة عن النظام الإلكتروني لنادي الكرامة الرياضي - مكتب كرة القدم</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-slate-900 no-print space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex-1 relative w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-900" size={18} />
            <input 
              type="text" 
              placeholder="البحث بالاسم أو رقم القميص..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className={`${fieldClass} pr-12 h-12 text-lg`} 
            />
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {!restrictedCat && (
              <select 
                value={localCategoryFilter}
                onChange={e => setLocalCategoryFilter(e.target.value)}
                className="bg-slate-100 border-2 border-slate-900 rounded-xl py-2 pr-4 pl-10 font-black text-sm text-slate-900 outline-none h-12 appearance-none cursor-pointer hover:bg-white transition-colors min-w-[140px]"
              >
                <option value="الكل">جميع الفئات</option>
                {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            <button 
              onClick={() => {
                if (!restrictedCat && localCategoryFilter === 'الكل') { alert("يرجى اختيار فئة محددة أولاً لاستخراج الكشف الشامل."); return; }
                setShowFullReportView(true);
              }}
              className="bg-emerald-600 text-white px-6 h-12 rounded-xl font-black text-sm flex items-center gap-3 hover:bg-black transition-all shadow-lg shrink-0 border-b-4 border-black group"
            >
              <FileText size={20} className="group-hover:scale-110" /> كشف الفئة الشامل
            </button>

            {!isViewer && (
              <button 
                onClick={() => { 
                  setEditingId(null); 
                  setFormData({ role: 'لاعب', category: restrictedCat || (localCategoryFilter !== 'الكل' ? localCategoryFilter : (state.categories[0] || '')), joinDate: new Date().toISOString().split('T')[0] }); 
                  setIsModalOpen(true); 
                }} 
                className="bg-[#001F3F] text-white px-8 h-12 rounded-xl font-black text-sm flex items-center gap-3 hover:bg-black transition-all shadow-lg shrink-0 border-b-4 border-black"
              >
                <UserPlus size={20} /> إضافة عضو
              </button>
            )}
          </div>
        </div>

        <div className="flex p-1.5 bg-slate-100 border-2 border-slate-900 rounded-2xl w-fit mx-auto md:mx-0">
          <button 
            onClick={() => setActiveSubTab('players')}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-sm transition-all ${activeSubTab === 'players' ? 'bg-[#001F3F] text-white shadow-md scale-105' : 'text-slate-500 hover:text-slate-900'}`}
          >
            اللاعبين
            <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeSubTab === 'players' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {filteredPlayers.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveSubTab('staff')}
            className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-black text-sm transition-all ${activeSubTab === 'staff' ? 'bg-[#001F3F] text-white shadow-md scale-105' : 'text-slate-500 hover:text-slate-900'}`}
          >
            الكوادر الفنية والإدارية
            <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeSubTab === 'staff' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {filteredStaff.length}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 no-print">
        {displayList.map(person => (
          <div key={person.id} className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-slate-900 group relative transition-all hover:shadow-xl border-b-[8px] hover:border-orange-600">
             <div className="flex justify-between items-start mb-4">
               <div className="w-12 h-12 bg-slate-100 border-2 border-slate-900 rounded-xl flex items-center justify-center font-black text-slate-900 text-lg shadow-inner group-hover:bg-[#001F3F] group-hover:text-white transition-colors">
                 {person.name.charAt(0).toUpperCase()}
               </div>
               <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${person.role === 'لاعب' ? 'bg-orange-600 text-white shadow-sm' : 'bg-[#001F3F] text-white shadow-sm'}`}>
                    {person.role}
                  </span>
                  <span className="text-[11px] font-black text-slate-900 mt-2 flex items-center gap-1 opacity-70">
                    <Layers size={12} /> {person.category}
                  </span>
               </div>
             </div>
             
             <div className="space-y-2">
               <h4 className="font-black text-xl text-slate-900 leading-tight group-hover:text-blue-900 transition-colors">{person.name}</h4>
               <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-black text-slate-600">
                 <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"><MapPin size={12} className="text-orange-600" /> {person.birthPlace}</span>
                 <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100"><Calendar size={12} className="text-[#001F3F]" /> {calculateAge(person.birthDate)} سنة</span>
               </div>
             </div>

             <div className="mt-6 pt-4 border-t-2 border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="bg-[#001F3F] text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg border-2 border-black shadow-md">
                     #{person.number || '00'}
                   </div>
                   <button onClick={() => onOpenReport?.(person)} className="text-slate-900 text-xs font-black hover:text-orange-600 underline underline-offset-4 decoration-2 decoration-orange-600/30 hover:decoration-orange-600 transition-all">الملف الفني الشامل</button>
                </div>
                {!isViewer && (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(person.id); setFormData(person); setIsModalOpen(true); }} className="p-2.5 bg-slate-100 text-slate-900 hover:bg-[#001F3F] hover:text-white rounded-xl border-2 border-slate-900 transition-all shadow-sm"><Plus size={16}/></button>
                    <button onClick={() => { if(confirm(`هل أنت متأكد من حذف ${person.name}؟`)) { setState(p => ({...p, people: p.people.filter(x => x.id !== person.id)})); addLog?.('حذف عضو', `تم مسح ملف: ${person.name}`, 'error'); } }} className="p-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl border-2 border-red-900 transition-all shadow-sm"><Trash2 size={16}/></button>
                  </div>
                )}
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && !isViewer && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[250] p-4 no-print">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border-[6px] border-slate-900 flex flex-col h-[90vh]">
            <div className="p-5 border-b-2 bg-slate-50 flex justify-between items-center shrink-0">
              <h3 className="text-md font-black text-slate-900 uppercase tracking-wider">{editingId ? 'تحديث بيانات الكادر' : 'تسجيل عضو جديد بنادي الكرامة'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 p-2.5 rounded-xl text-slate-900 hover:text-red-600 transition-all hover:rotate-90"><X size={22} /></button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
              <div className="space-y-6">
                <h4 className="text-[12px] font-black text-[#001F3F] flex items-center gap-2 border-r-4 border-orange-600 pr-3 uppercase">البيانات الشخصية والولادة</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1 col-span-1 md:col-span-2">
                    <label className={labelClass}>الاسم الثنائي الكامل</label>
                    <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className={fieldClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>اسم الأب</label>
                    <input type="text" value={formData.fatherName || ''} onChange={e => setFormData({...formData, fatherName: e.target.value})} className={fieldClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>اسم الأم</label>
                    <input type="text" value={formData.motherName || ''} onChange={e => setFormData({...formData, motherName: e.target.value})} className={fieldClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>تاريخ الميلاد</label>
                    <input type="date" value={formData.birthDate || ''} onChange={e => setFormData({...formData, birthDate: e.target.value})} className={fieldClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-orange-600 mr-2 uppercase block mb-1.5">العمر المحسوب (تلقائياً)</label>
                    <div className="w-full bg-orange-50 border-2 border-orange-600 rounded-xl py-2.5 px-4 font-black text-lg text-[#001F3F] flex items-center justify-center h-[46px] shadow-inner">
                      {calculateAge(formData.birthDate) !== null ? `${calculateAge(formData.birthDate)} سنة` : '--'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>مكان الولادة</label>
                    <input type="text" value={formData.birthPlace || ''} onChange={e => setFormData({...formData, birthPlace: e.target.value})} className={fieldClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>القيد (الخانة)</label>
                    <input type="text" value={formData.khana || ''} onChange={e => setFormData({...formData, khana: e.target.value})} className={fieldClass} />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[12px] font-black text-orange-600 flex items-center gap-2 border-r-4 border-slate-900 pr-3 uppercase">الوثائق الثبوتية والاتصال والعنوان</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>الرقم الوطني</label>
                    <input type="text" value={formData.nationalId || ''} onChange={e => setFormData({...formData, nationalId: e.target.value})} className={fieldClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>الرقم الاتحادي</label>
                    <input type="text" value={formData.federalNumber || ''} onChange={e => setFormData({...formData, federalNumber: e.target.value})} className={fieldClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>الرقم الدولي</label>
                    <input type="text" value={formData.internationalId || ''} onChange={e => setFormData({...formData, internationalId: e.target.value})} className={fieldClass} placeholder="ID الدولي..." />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>رقم الهاتف</label>
                    <input type="text" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className={fieldClass} />
                  </div>
                  <div className="space-y-1 col-span-1 md:col-span-4">
                    <label className={labelClass}>العنوان الحالي بالتفصيل</label>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className={`${fieldClass} pr-10`} placeholder="المحافظة - المنطقة - الشارع - البناء..." />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-[12px] font-black text-emerald-700 flex items-center gap-2 border-r-4 border-slate-900 pr-3 uppercase">الوضعية الفنية والتعاقدية</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className={labelClass}>الدور / الصفة</label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className={fieldClass}>
                      {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>الفئة الرياضية</label>
                    <select disabled={!!restrictedCat} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={fieldClass}>
                      {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>بداية العقد</label>
                    <input type="date" value={formData.contractStart || ''} onChange={e => setFormData({...formData, contractStart: e.target.value})} className={fieldClass} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>نهاية العقد</label>
                    <input type="date" value={formData.contractEnd || ''} onChange={e => setFormData({...formData, contractEnd: e.target.value})} className={fieldClass} />
                  </div>
                  <div className="space-y-1 col-span-1 md:col-span-2">
                    <label className={labelClass}>القيمة المالية / الراتب</label>
                    <input type="text" value={formData.contractValue || ''} onChange={e => setFormData({...formData, contractValue: e.target.value})} className={fieldClass} placeholder="القيمة بالعقد..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-black text-orange-600 block mb-1.5 uppercase tracking-tighter">رقم القميص</label>
                    <input type="number" value={formData.number || ''} onChange={e => setFormData({...formData, number: parseInt(e.target.value)})} className="w-full bg-[#001F3F] text-white border-none rounded-xl py-2 px-4 font-black text-2xl text-center outline-none h-14 shadow-2xl" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-10 border-t-2 border-slate-200 pb-10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-200 text-slate-900 font-black py-4 rounded-xl text-[12px] border-2 border-slate-900 uppercase">إلغاء الأمر</button>
                <button type="submit" className="flex-[2] bg-[#001F3F] text-white font-black py-4 rounded-xl shadow-2xl hover:bg-black transition-all text-[12px] uppercase">
                  حفظ وتثبيت البيانات بالنظام
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
