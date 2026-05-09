
import React, { useState, useMemo } from 'react';
import { 
  UserPlus, Trash2, Search, Edit2, MapPin, Calendar, ChevronRight, 
  X, Save, Target, Phone, Ruler, Weight, Home, Fingerprint, 
  BadgeCheck, Edit3, Wallet, HeartPulse, ShieldAlert, 
  GraduationCap, Award, Activity, Loader2, Filter, Gavel, FileText, Hash, Globe, Briefcase
} from 'lucide-react';
import { AppState, Person, Role } from '../types';
import { generateUUID, supabase } from '../App';

interface SquadManagementProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  onOpenReport?: (player: Person) => void;
  addLog?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SquadManagement: React.FC<SquadManagementProps> = ({ state, setState, onOpenReport, addLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localCategoryFilter, setLocalCategoryFilter] = useState('الكل');
  const [activeSubTab, setActiveSubTab] = useState<'players' | 'staff'>('players');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const currentUser = state.currentUser!;
  const isManager = currentUser.role === 'مدير';
  const isViewer = currentUser.role === 'مشاهد';
  const restrictedCat = currentUser.restrictedCategory;

  const initialFormState: Partial<Person> = {
    name: '', fatherName: '', motherName: '', birthDate: '', birthPlace: '', khana: '',
    nationalId: '', federalNumber: '', internationalId: '', address: '',
    category: restrictedCat || (state.categories[0] || 'الرجال'),
    role: 'لاعب', number: undefined, phone: '', joinDate: new Date().toISOString().split('T')[0],
    height: '', weight: '', position: '', contractStart: '', contractEnd: '', contractValue: '',
    medicalHistory: '', injuries: '', penalties: '', notes: '', coachingCertificate: '', academicDegree: ''
  };

  const [formData, setFormData] = useState<Partial<Person>>(initialFormState);

  const filteredMembers = useMemo(() => {
    return state.people.filter(p => {
      if (restrictedCat && p.category !== restrictedCat) return false;
      const matchCat = localCategoryFilter === 'الكل' || p.category === localCategoryFilter;
      const matchSearch = p.name.includes(searchTerm) || (p.number?.toString() === searchTerm);
      const matchSubTab = activeSubTab === 'players' ? p.role === 'لاعب' : p.role !== 'لاعب';
      return matchCat && matchSearch && matchSubTab;
    });
  }, [state.people, restrictedCat, localCategoryFilter, searchTerm, activeSubTab]);

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

    ['number', 'height', 'weight', 'contractValue', 'birthDate', 'contractStart', 'contractEnd'].forEach(key => {
      if (updatedPerson[key] === '') updatedPerson[key] = null;
    });
    if (Number.isNaN(updatedPerson.number)) updatedPerson.number = null;

    try {
      const { error } = await supabase.from('people').upsert(updatedPerson);
      if (error) throw error;

      setState(prev => ({
        ...prev,
        people: editingId 
          ? prev.people.map(p => p.id === editingId ? updatedPerson : p)
          : [updatedPerson, ...prev.people]
      }));

      addLog?.(editingId ? 'تم تحديث البيانات بنجاح' : 'تمت إضافة العضو بنجاح', 'success');
      setIsModalOpen(false);
      setEditingId(null);
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

  const openEdit = (p: Person) => {
    if (isViewer) return;
    setEditingId(p.id);
    setFormData({ ...p });
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
            <input type="text" placeholder="البحث بالاسم أو الرقم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 md:py-4 pr-12 pl-6 text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/10 transition-all font-bold shadow-sm text-sm" />
         </div>

         {!restrictedCat ? (
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
         ) : (
           <div className="bg-orange-50 border border-orange-200 px-6 py-4 rounded-xl text-orange-600 font-black text-[10px] md:text-xs uppercase tracking-widest shadow-sm w-full md:w-auto text-center">
              فئة: {restrictedCat}
           </div>
         )}

         {!isViewer && (
           <button onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
             className="bg-orange-500 text-white px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center gap-3 shadow-lg shadow-orange-500/10 hover:bg-orange-600 transition-all whitespace-nowrap w-full md:w-auto justify-center">
              <UserPlus size={20}/> إضافة جديد
           </button>
         )}
      </div>

      {/* تبديل العرض بين اللاعبين والكوادر */}
      <div className="flex p-1 bg-slate-100 border border-slate-200 rounded-xl w-full sm:w-fit shadow-inner">
          <button onClick={() => setActiveSubTab('players')} className={`flex-1 sm:flex-none px-4 md:px-10 py-2.5 rounded-lg font-black text-[10px] md:text-xs transition-all ${activeSubTab === 'players' ? 'bg-white text-blue-950 shadow-md' : 'text-slate-600 hover:text-blue-900'}`}>اللاعبين ({state.people.filter(p => p.role==='لاعب' && (!restrictedCat || p.category===restrictedCat)).length})</button>
          <button onClick={() => setActiveSubTab('staff')} className={`flex-1 sm:flex-none px-4 md:px-10 py-2.5 rounded-lg font-black text-[10px] md:text-xs transition-all ${activeSubTab === 'staff' ? 'bg-white text-blue-950 shadow-md' : 'text-slate-600 hover:text-blue-900'}`}>الكوادر ({state.people.filter(p => p.role!=='لاعب' && (!restrictedCat || p.category===restrictedCat)).length})</button>
      </div>

      {/* قائمة البطاقات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
        {filteredMembers.map(person => (
          <div key={person.id} className="modern-card p-6 md:p-8 group hover:border-orange-500 transition-all flex flex-col border-b-4 border-b-orange-500/20">
             <div className="flex justify-between items-start mb-4 md:mb-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-2xl md:text-3xl text-blue-900 border-2 border-blue-100 shadow-sm group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-400 transition-all duration-300">
                   {person.name.charAt(0)}
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[9px] md:text-[10px] font-black text-orange-700 uppercase tracking-widest">{person.category}</span>
                   <span className="text-xs text-slate-600 font-bold">{person.role}</span>
                </div>
             </div>
             <h3 className="text-lg md:text-xl font-black text-blue-950 mb-2 group-hover:text-orange-700 transition-colors uppercase tracking-tight truncate">{person.name} {person.number && <span className="text-orange-600 text-sm">#{person.number}</span>}</h3>
             <p className="text-[9px] md:text-[10px] text-slate-600 font-bold mb-2 italic">{person.position || 'بدون مركز محدد'}</p>
             <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6">
                {(person.nationalId || '').trim() !== '' && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[8px] md:text-[9px] font-bold shadow-sm whitespace-nowrap">وطني: {person.nationalId}</span>}
                {(person.federalNumber || '').trim() !== '' && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[8px] md:text-[9px] font-bold shadow-sm whitespace-nowrap">اتحادي: {person.federalNumber}</span>}
                {(person.internationalId || '').trim() !== '' && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[8px] md:text-[9px] font-bold shadow-sm whitespace-nowrap">دولي: {person.internationalId}</span>}
             </div>
             <div className="mt-auto pt-4 md:pt-6 border-t border-slate-100 flex justify-between items-center gap-2">
                <button onClick={() => onOpenReport?.(person)} className="text-[10px] md:text-xs font-black text-slate-700 hover:text-orange-600 flex items-center gap-1 transition-colors uppercase tracking-widest whitespace-nowrap">الملف <ChevronRight size={14}/></button>
                <div className="flex gap-1 md:gap-2">
                   {!isViewer && (
                     <>
                       <button onClick={() => openEdit(person)} className="p-2 md:p-2.5 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 size={14} className="md:w-4 md:h-4"/></button>
                       <button onClick={() => handleDelete(person.id, person.name)} className="p-2 md:p-2.5 bg-red-50 text-red-600 rounded-lg md:rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={14} className="md:w-4 md:h-4"/></button>
                     </>
                   )}
                </div>
             </div>
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <div className="col-span-full py-16 md:py-20 text-center border-4 border-dashed border-slate-200 rounded-[2rem] md:rounded-[3rem]">
            <Search size={48} className="mx-auto mb-4 text-slate-200 md:w-16 md:h-16" />
            <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] md:text-sm">لا بيانات لعرضها حالياً</p>
          </div>
        )}
      </div>

      {/* المودال: نموذج الإضافة والتعديل الشامل (26 حقل) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center lg:p-4">
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full h-full lg:h-auto lg:max-w-5xl lg:max-h-[90vh] lg:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-5 md:p-6 border-b border-slate-100 bg-white flex justify-between items-center">
              <h3 className="text-base md:text-xl font-black text-blue-900 flex items-center gap-2 md:gap-3 italic uppercase"><UserPlus className="text-orange-500 w-5 h-5 md:w-6 md:h-6" /> {editingId ? 'تعديل السجل' : 'إضافة سجل جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-slate-100 hover:bg-red-500 text-slate-600 hover:text-white rounded-xl transition-all shadow-sm"><X size={20}/></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-2 custom-scrollbar bg-slate-50 text-right pb-32 lg:pb-10" dir="rtl">
              
              {/* القسم 1: الهوية */}
              <h4 className={sectionHeader}><Fingerprint size={16}/> 1. معلومات الهوية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1"><label className={labelClass}>الاسم الثلاثي</label><input required className={inputClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>اسم الأب</label><input className={inputClass} value={formData.fatherName || ''} onChange={e => setFormData({...formData, fatherName: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>اسم الأم</label><input className={inputClass} value={formData.motherName || ''} onChange={e => setFormData({...formData, motherName: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>تاريخ الميلاد</label><input type="date" className={inputClass} value={formData.birthDate || ''} onChange={e => setFormData({...formData, birthDate: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>مكان الولادة</label><input className={inputClass} value={formData.birthPlace || ''} onChange={e => setFormData({...formData, birthPlace: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الخانة</label><input className={inputClass} value={formData.khana || ''} onChange={e => setFormData({...formData, khana: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الوطني</label><input className={inputClass} value={formData.nationalId || ''} onChange={e => setFormData({...formData, nationalId: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الاتحادي</label><input className={inputClass} value={formData.federalNumber || ''} onChange={e => setFormData({...formData, federalNumber: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الدولي</label><input className={inputClass} value={formData.internationalId || ''} onChange={e => setFormData({...formData, internationalId: e.target.value})} /></div>
              </div>

              {/* القسم 2: الرياضة */}
              <h4 className={sectionHeader}><Activity size={16}/> 2. البيانات الرياضية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="space-y-1"><label className={labelClass}>الدور الوظيفي</label><select className={inputClass} value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value as Role})}><option value="لاعب">لاعب</option><option value="مدرب">مدرب</option><option value="إداري">إداري</option><option value="طبيب">طبيب</option><option value="معالج">معالج</option></select></div>
                <div className="space-y-1"><label className={labelClass}>الفئة</label><select disabled={!!restrictedCat} className={inputClass} value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})}><option value="">اختر الفئة</option>{state.categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="space-y-1"><label className={labelClass}>رقم القميص</label><input type="number" className={inputClass} value={formData.number || ''} onChange={e => setFormData({...formData, number: e.target.value ? parseInt(e.target.value) : undefined})} /></div>
                <div className="space-y-1"><label className={labelClass}>المركز الأساسي</label><input className={inputClass} value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>تاريخ الانضمام</label><input type="date" className={inputClass} value={formData.joinDate || ''} onChange={e => setFormData({...formData, joinDate: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الطول (سم)</label><input className={inputClass} value={formData.height || ''} onChange={e => setFormData({...formData, height: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الوزن (كغ)</label><input className={inputClass} value={formData.weight || ''} onChange={e => setFormData({...formData, weight: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الشهادة التدريبية</label><input className={inputClass} value={formData.coachingCertificate || ''} onChange={e => setFormData({...formData, coachingCertificate: e.target.value})} /></div>
                <div className="sm:col-span-2 space-y-1"><label className={labelClass}>التحصيل العلمي</label><input className={inputClass} value={formData.academicDegree || ''} onChange={e => setFormData({...formData, academicDegree: e.target.value})} /></div>
                <div className="sm:col-span-2 space-y-1"><label className={labelClass}>رقم الهاتف</label><input className={inputClass} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div className="sm:col-span-full space-y-1"><label className={labelClass}>عنوان السكن التفصيلي</label><input className={inputClass} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              </div>

              {/* القسم 3: العقود */}
              <h4 className={sectionHeader}><Wallet size={16}/> 3. السجل المالي</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1"><label className={labelClass}>بداية العقد</label><input type="date" className={inputClass} value={formData.contractStart || ''} onChange={e => setFormData({...formData, contractStart: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>نهاية العقد</label><input type="date" className={inputClass} value={formData.contractEnd || ''} onChange={e => setFormData({...formData, contractEnd: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>القيمة / الراتب</label><input className={inputClass} value={formData.contractValue || ''} onChange={e => setFormData({...formData, contractValue: e.target.value})} /></div>
              </div>

              {/* القسم 4: الطبي والانضباط */}
              <h4 className={sectionHeader}><ShieldAlert size={16}/> 4. الحالة الطبية والسلوك</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1"><label className={labelClass}>السجل الطبي</label><textarea className={`${inputClass} h-20 md:h-24 resize-none`} value={formData.medicalHistory || ''} onChange={e => setFormData({...formData, medicalHistory: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الإصابات الحالية</label><textarea className={`${inputClass} h-20 md:h-24 resize-none`} value={formData.injuries || ''} onChange={e => setFormData({...formData, injuries: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>العقوبات السابقة</label><textarea className={`${inputClass} h-20 md:h-24 resize-none`} value={formData.penalties || ''} onChange={e => setFormData({...formData, penalties: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>ملاحظات للمدرب</label><textarea className={`${inputClass} h-20 md:h-24 resize-none`} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
              </div>

              <div className="pt-8 md:pt-10">
                <button type="submit" disabled={isSaving} className="w-full bg-blue-900 text-white py-5 md:py-6 rounded-xl md:rounded-2xl font-black text-lg md:text-xl shadow-xl shadow-blue-900/10 hover:bg-blue-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                  {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24}/>} 
                  تثبيت السجل المركزي
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
