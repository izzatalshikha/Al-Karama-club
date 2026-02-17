
import React, { useState, useMemo } from 'react';
import { 
  UserPlus, Trash2, Search, Edit2, MapPin, Calendar, ChevronRight, 
  X, Save, Target, Phone, Ruler, Weight, Home, Fingerprint, 
  BadgeCheck, Edit3, Wallet, HeartPulse, ShieldAlert, 
  GraduationCap, Award, Activity, Loader2
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
      if (!isManager && restrictedCat && p.category !== restrictedCat) return false;
      const matchCat = localCategoryFilter === 'الكل' || p.category === localCategoryFilter;
      const matchSearch = p.name.includes(searchTerm) || (p.number?.toString() === searchTerm);
      const matchSubTab = activeSubTab === 'players' ? p.role === 'لاعب' : p.role !== 'لاعب';
      return matchCat && matchSearch && matchSubTab;
    });
  }, [state.people, isManager, restrictedCat, localCategoryFilter, searchTerm, activeSubTab]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || isSaving) return;

    setIsSaving(true);
    
    const updatedPerson = {
      ...initialFormState,
      ...formData,
      id: editingId || generateUUID(),
      name: formData.name!.trim(),
    } as Person;

    try {
      // محاولة الحفظ الكاملة
      const { error } = await supabase.from('people').upsert(updatedPerson);
      
      if (error) {
        // إذا كان الخطأ بسبب نقص عمود في قاعدة البيانات (كما حدث معك)
        if (error.message.includes('column')) {
            throw new Error(`قاعدة البيانات في Supabase لا تحتوي على كافة الأعمدة اللازمة. يرجى تشغيل كود SQL لتحديث الجدول. الخطأ: ${error.message}`);
        }
        throw error;
      }

      setState(prev => ({
        ...prev,
        people: editingId 
          ? prev.people.map(p => p.id === editingId ? updatedPerson : p)
          : [updatedPerson, ...prev.people]
      }));

      addLog?.(editingId ? 'تم تحديث البيانات بنجاح' : 'تمت الإضافة بنجاح', 'success');
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(initialFormState);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف ${name}؟`)) return;
    try {
      const { error } = await supabase.from('people').delete().eq('id', id);
      if (error) throw error;
      setState(p => ({ ...p, people: p.people.filter(x => x.id !== id) }));
      addLog?.('تم حذف عضو', 'error');
    } catch (err: any) {
      alert('خطأ في الحذف: ' + err.message);
    }
  };

  const openEdit = (p: Person) => {
    setEditingId(p.id);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const inputClass = "w-full bg-[#0f172a] border border-white/10 rounded-xl py-3 px-4 text-white focus:border-orange-500 outline-none transition-all placeholder:text-slate-600 text-sm";
  const labelClass = "text-[10px] font-black text-slate-400 uppercase mb-1.5 block flex items-center gap-2";
  const sectionTitle = "text-orange-500 font-black text-xs uppercase tracking-widest border-r-4 border-orange-500 pr-3 mb-6 mt-8";

  return (
    <div className="space-y-8 relative">
      <div className="modern-card p-6 flex flex-col md:flex-row gap-6 items-center">
         <div className="flex-1 relative w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            <input type="text" placeholder="البحث في سجلات النادي..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[#0f172a] border border-white/5 rounded-2xl py-4 pr-12 pl-6 text-white outline-none focus:border-orange-500 transition-all" />
         </div>
         <button onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
           className="bg-orange-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-lg hover:bg-orange-600 transition-all active:scale-95 whitespace-nowrap">
            <UserPlus size={20}/> إضافة عضو جديد
         </button>
      </div>

      <div className="flex p-1.5 bg-[#0f172a] border border-white/5 rounded-2xl w-fit">
          <button onClick={() => setActiveSubTab('players')} className={`px-10 py-3 rounded-xl font-black text-xs transition-all ${activeSubTab === 'players' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>اللاعبين</button>
          <button onClick={() => setActiveSubTab('staff')} className={`px-10 py-3 rounded-xl font-black text-xs transition-all ${activeSubTab === 'staff' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>الكوادر</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMembers.map(person => (
          <div key={person.id} className="modern-card p-8 group hover:border-orange-500/50 transition-all flex flex-col border-b-4 border-b-orange-500/20">
             <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-3xl text-white border-2 border-orange-500/20 shadow-xl">
                   {person.name.charAt(0)}
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{person.category}</span>
                   <span className="text-xs text-slate-400 font-bold">{person.role}</span>
                </div>
             </div>
             <h3 className="text-xl font-black text-white mb-2">{person.name} <span className="text-orange-500 text-sm">#{person.number}</span></h3>
             <div className="mt-auto pt-6 border-t border-white/5 flex justify-between items-center">
                <button onClick={() => onOpenReport?.(person)} className="text-xs font-black text-slate-400 hover:text-orange-500 flex items-center gap-1 transition-colors">الملف الفني <ChevronRight size={14}/></button>
                <div className="flex gap-2">
                   <button onClick={() => openEdit(person)} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-blue-600 transition-all"><Edit2 size={16}/></button>
                   <button onClick={() => handleDelete(person.id, person.name)} className="p-2.5 bg-white/5 rounded-xl text-slate-400 hover:text-white hover:bg-red-600 transition-all"><Trash2 size={16}/></button>
                </div>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-[#0f172a] border-4 border-slate-700 w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/10 bg-[#1e293b] flex justify-between items-center">
              <h3 className="text-xl font-black text-white flex items-center gap-3"><UserPlus className="text-orange-500" /> {editingId ? 'تعديل البيانات' : 'إضافة عضو جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"><X size={24}/></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-10 space-y-2 custom-scrollbar bg-[#0f172a] text-right" dir="rtl">
              
              <h4 className={sectionTitle}>1. المعلومات الشخصية والهوية</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1"><label className={labelClass}>الاسم الكامل</label><input required className={inputClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>اسم الأب</label><input className={inputClass} value={formData.fatherName || ''} onChange={e => setFormData({...formData, fatherName: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>اسم الأم</label><input className={inputClass} value={formData.motherName || ''} onChange={e => setFormData({...formData, motherName: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>تاريخ الميلاد</label><input type="date" className={inputClass} value={formData.birthDate || ''} onChange={e => setFormData({...formData, birthDate: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>مكان الولادة</label><input className={inputClass} value={formData.birthPlace || ''} onChange={e => setFormData({...formData, birthPlace: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الخانة (القيد)</label><input className={inputClass} value={formData.khana || ''} onChange={e => setFormData({...formData, khana: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الوطني (11 خانة)</label><input className={inputClass} value={formData.nationalId || ''} onChange={e => setFormData({...formData, nationalId: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الاتحادي</label><input className={inputClass} value={formData.federalNumber || ''} onChange={e => setFormData({...formData, federalNumber: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الدولي (إن وجد)</label><input className={inputClass} value={formData.internationalId || ''} onChange={e => setFormData({...formData, internationalId: e.target.value})} /></div>
              </div>

              <h4 className={sectionTitle}>2. التفاصيل الفنية والاتصال</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1"><label className={labelClass}>الدور</label><select className={inputClass} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}><option value="لاعب">لاعب</option><option value="مدرب">مدرب</option><option value="إداري">إداري</option></select></div>
                <div className="space-y-1"><label className={labelClass}>الفئة</label><select disabled={!isManager} className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="">اختر الفئة</option>{state.categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="space-y-1"><label className={labelClass}>رقم القميص</label><input type="number" className={inputClass} value={formData.number || ''} onChange={e => setFormData({...formData, number: parseInt(e.target.value)})} /></div>
                <div className="space-y-1"><label className={labelClass}>المركز</label><input className={inputClass} value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} /></div>
                <div className="space-y-1 md:col-span-2"><label className={labelClass}>رقم الهاتف</label><input className={inputClass} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div className="space-y-1 md:col-span-2"><label className={labelClass}>عنوان السكن التفصيلي</label><input className={inputClass} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              </div>

              <h4 className={sectionTitle}>3. البيانات التعاقدية والمالية</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1"><label className={labelClass}><Calendar size={12}/> تاريخ بدء العقد</label><input type="date" className={inputClass} value={formData.contractStart || ''} onChange={e => setFormData({...formData, contractStart: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}><Calendar size={12}/> تاريخ انتهاء العقد</label><input type="date" className={inputClass} value={formData.contractEnd || ''} onChange={e => setFormData({...formData, contractEnd: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}><Wallet size={12}/> القيمة المالية للعقد</label><input className={inputClass} value={formData.contractValue || ''} onChange={e => setFormData({...formData, contractValue: e.target.value})} /></div>
              </div>

              <h4 className={sectionTitle}>4. السجلات الصحية والبدنية</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1"><label className={labelClass}><HeartPulse size={12}/> السوابق الطبية</label><textarea className={inputClass + " h-20"} value={formData.medicalHistory || ''} onChange={e => setFormData({...formData, medicalHistory: e.target.value})} placeholder="عمليات جراحية، أمراض مزمنة..." /></div>
                <div className="space-y-1"><label className={labelClass}><Activity size={12}/> سجل الإصابات الرياضية</label><textarea className={inputClass + " h-20"} value={formData.injuries || ''} onChange={e => setFormData({...formData, injuries: e.target.value})} placeholder="كسور، تمزقات عضلية..." /></div>
                <div className="space-y-1"><label className={labelClass}><Ruler size={12}/> الطول (سم)</label><input className={inputClass} value={formData.height || ''} onChange={e => setFormData({...formData, height: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}><Weight size={12}/> الوزن (كغ)</label><input className={inputClass} value={formData.weight || ''} onChange={e => setFormData({...formData, weight: e.target.value})} /></div>
              </div>

              <h4 className={sectionTitle}>5. الانضباط والمؤهلات</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1"><label className={labelClass}><ShieldAlert size={12}/> سجل العقوبات الإدارية</label><textarea className={inputClass + " h-20"} value={formData.penalties || ''} onChange={e => setFormData({...formData, penalties: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}><Award size={12}/> الشهادات التدريبية الحاصل عليها</label><input className={inputClass} value={formData.coachingCertificate || ''} onChange={e => setFormData({...formData, coachingCertificate: e.target.value})} /></div>
                <div className="space-y-1 md:col-span-2"><label className={labelClass}><GraduationCap size={12}/> الشهادة العلمية الحالية</label><input className={inputClass} value={formData.academicDegree || ''} onChange={e => setFormData({...formData, academicDegree: e.target.value})} /></div>
              </div>

              <div className="pt-10">
                <button type="submit" disabled={isSaving} className="w-full bg-orange-500 text-white py-6 rounded-2xl font-black text-xl shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3 border-b-8 border-orange-900 active:translate-y-1 active:border-b-0">
                  {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24}/>} 
                  تثبيت البيانات في السجل المركزي
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
