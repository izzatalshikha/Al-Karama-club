import React, { useState } from 'react';
import { AppState, DirectoryService, ServiceCategory } from '../types';
import { generateUUID } from '../App';
import { MapPin, Phone, Info, Star, Plus, Trash2, Building, Utensils, Hospital, Edit3 } from 'lucide-react';

interface ServicesViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addLog: (msg: string, type: 'success' | 'error') => void;
  syncToCloud: (collection: string, data: any) => Promise<boolean>;
}

const SYRIAN_GOVERNORATES = [
  'دمشق', 'حلب', 'حمص', 'اللاذقية', 'حماة', 'طرطوس', 'الرقة', 'دير الزور', 'السويداء', 'الحسكة', 'درعا', 'إدلب', 'القنيطرة', 'ريف دمشق'
];

const CATEGORIES: { id: ServiceCategory; icon: React.FC<any>; label: string; color: string; bg: string }[] = [
  { id: 'فنادق', icon: Building, label: 'فنادق', color: 'text-violet-600', bg: 'bg-violet-100' },
  { id: 'مطاعم', icon: Utensils, label: 'مطاعم', color: 'text-amber-600', bg: 'bg-amber-100' },
  { id: 'مشافي', icon: Hospital, label: 'مشافي', color: 'text-rose-600', bg: 'bg-rose-100' },
];

const ServicesView: React.FC<ServicesViewProps> = ({ state, setState, addLog, syncToCloud }) => {
  const [selectedGov, setSelectedGov] = useState<string>(SYRIAN_GOVERNORATES[0]);
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>('فنادق');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<DirectoryService>>({
    name: '', address: '', phone: '', description: '', features: ''
  });

  const canEdit = state.currentUser?.role === 'مدير' || state.currentUser?.role === 'مدرب';

  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.address?.trim()) {
      addLog('الرجاء إدخال اسم وعنوان المكان على الأقل', 'error');
      return;
    }

    if (editingId) {
      const updatedSvc = { ...formData, id: editingId, category: formData.category || activeCategory, governorate: formData.governorate || selectedGov } as DirectoryService;
      await syncToCloud('services_directory', updatedSvc);
      setState(prev => ({
        ...prev,
        servicesDirectory: (prev.servicesDirectory || []).map(s => s.id === editingId ? updatedSvc : s)
      }));
      setEditingId(null);
      addLog('تم تحديث الخدمة بنجاح', 'success');
    } else {
      const newSvc: DirectoryService = {
        id: generateUUID(),
        category: formData.category || activeCategory,
        governorate: formData.governorate || selectedGov,
        name: formData.name,
        address: formData.address,
        phone: formData.phone || '',
        description: formData.description || '',
        features: formData.features || ''
      };
      
      await syncToCloud('services_directory', newSvc);
      setState(prev => ({
        ...prev,
        servicesDirectory: [...(prev.servicesDirectory || []), newSvc]
      }));
      addLog('تمت إضافة الخدمة بنجاح', 'success');
    }

    setIsAdding(false);
    setFormData({ name: '', address: '', phone: '', description: '', features: '' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف ${name}؟`)) return;
    
    // In a real app we might call syncToCloud to delete, but for now we'll just remove from state
    // Consider adding a delete helper if needed
    setState(prev => ({
      ...prev,
      servicesDirectory: prev.servicesDirectory.filter(s => s.id !== id)
    }));
    addLog('تم الحذف بنجاح', 'success');
  };

  const openEdit = (svc: DirectoryService) => {
    setEditingId(svc.id);
    setFormData(svc);
    setIsAdding(true);
  };

  const filteredServices = (state.servicesDirectory || []).filter(s => s.governorate === selectedGov && s.category === activeCategory);

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-orange-500 outline-none transition-all";
  const labelClass = "block text-xs font-bold text-slate-500 mb-2";

  return (
    <div className="space-y-6 pb-24 md:pb-6" dir="rtl">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-xl md:text-2xl font-black text-blue-950 flex items-center gap-3">
          <MapPin className="text-orange-500" size={28} />
          دليل الخدمات والمرافق
        </h2>
        {canEdit && !isAdding && (
          <button 
            onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ category: activeCategory, governorate: selectedGov }); }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden md:inline">إضافة مكان</span>
          </button>
        )}
      </div>

      <div className="flex overflow-x-auto pb-2 gap-2 hide-scrollbar">
         {SYRIAN_GOVERNORATES.map(gov => (
           <button
             key={gov}
             onClick={() => setSelectedGov(gov)}
             className={`shrink-0 px-5 py-2.5 rounded-full font-bold text-sm transition-all border ${
               selectedGov === gov 
                 ? 'bg-blue-900 border-blue-900 text-white shadow-md' 
                 : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
             }`}
           >
             {gov}
           </button>
         ))}
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex flex-col items-center justify-center p-4 md:p-6 rounded-2xl border-2 transition-all ${
              activeCategory === cat.id 
                ? `border-${cat.color.split('-')[1]}-500 ${cat.bg} shadow-md`
                : 'border-transparent bg-white hover:bg-slate-50'
            }`}
          >
            <cat.icon size={32} className={`mb-3 ${activeCategory === cat.id ? cat.color : 'text-slate-400'}`} />
            <span className={`font-black text-sm md:text-base ${activeCategory === cat.id ? cat.color : 'text-slate-600'}`}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {isAdding && canEdit && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg animate-fade-in">
           <h3 className="text-lg font-bold text-blue-900 mb-6">{editingId ? 'تعديل بيانات المكان' : 'إضافة مكان جديد'}</h3>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             <div>
               <label className={labelClass}>الاسم</label>
               <input type="text" className={inputClass} placeholder="اسم الفندق / المطعم / المشفى..." value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
             </div>
             <div>
               <label className={labelClass}>رقم الهاتف</label>
               <input type="text" className={inputClass} placeholder="أرقام التواصل..." value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
             </div>
             <div className="md:col-span-2">
               <label className={labelClass}>العنوان التفصيلي</label>
               <input type="text" className={inputClass} placeholder="المنطقة، الشارع، أقرب معلم..." value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
             </div>
             <div className="md:col-span-2">
               <label className={labelClass}>وصف المكان</label>
               <textarea className={`${inputClass} resize-none h-24`} placeholder="وصف عام للمكان..." value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
             </div>
             <div className="md:col-span-2">
               <label className={labelClass}>الخدمات والميزات</label>
               <textarea className={`${inputClass} resize-none h-24`} placeholder="مثال: غرف مكيفة، إنترنت مجاني، قاعة اجتماعات..." value={formData.features || ''} onChange={e => setFormData({...formData, features: e.target.value})}></textarea>
             </div>
           </div>

           <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
             <button onClick={() => { setIsAdding(false); setEditingId(null); setFormData({}); }} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">إلغاء</button>
             <button onClick={handleSave} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-sm transition-all shadow-emerald-500/20">حفظ المكان</button>
           </div>
        </div>
      )}

      {!isAdding && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-200">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                 <MapPin size={32} />
               </div>
               <p className="font-bold text-slate-500 text-lg">لا يوجد {activeCategory} مضافة في {selectedGov}</p>
            </div>
          ) : (
            filteredServices.map(svc => (
              <div key={svc.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-200 transition-all flex flex-col group relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-50 to-transparent -mr-12 -mt-12 rounded-full opacity-50 pointer-events-none"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className="text-xl font-black text-blue-950 mb-1">{svc.name}</h3>
                    <p className="text-xs font-bold text-slate-400 bg-slate-50 inline-block px-3 py-1 rounded-full">{svc.governorate}</p>
                  </div>
                  {canEdit && (
                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(svc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(svc.id, svc.name)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>

                <div className="space-y-3 mb-6 flex-1 relative z-10">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-orange-500"><MapPin size={16} /></div>
                    <p className="text-sm text-slate-600 leading-relaxed">{svc.address}</p>
                  </div>
                  {svc.phone && (
                    <div className="flex items-center gap-3">
                      <div className="text-blue-500"><Phone size={16} /></div>
                      <p className="text-sm font-bold text-slate-700 dir-ltr">{svc.phone}</p>
                    </div>
                  )}
                  {svc.description && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-indigo-400"><Info size={16} /></div>
                      <p className="text-xs text-slate-500 leading-relaxed">{svc.description}</p>
                    </div>
                  )}
                </div>

                {svc.features && (
                  <div className="pt-4 border-t border-slate-50 relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                       <Star size={14} className="text-amber-500" />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">الخدمات والميزات</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {svc.features}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ServicesView;
