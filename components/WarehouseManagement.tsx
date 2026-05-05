
import React, { useState, useMemo } from 'react';
import { Package, Plus, Trash2, Edit3, Search, Filter, Box, Archive, ClipboardList, ShieldAlert, X, Save, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { AppState, WarehouseItem, Category } from '../types';
import { generateUUID, supabase } from '../App';

interface WarehouseManagementProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  addLog?: (m: string, d?: string, t?: any) => void;
  syncToCloud?: (table: string, data: any) => Promise<boolean>;
}

const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ state, setState, addLog, syncToCloud }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [localCategoryFilter, setLocalCategoryFilter] = useState<string>('الكل');
  
  const currentUser = state.currentUser!;
  const restrictedCat = currentUser.restrictedCategory;
  const isManager = currentUser.role === 'مدير';
  const isWarehouseKeeper = currentUser.role === 'أمين مستودع';
  const isViewer = currentUser.role === 'مشاهد';

  const [formData, setFormData] = useState<Partial<WarehouseItem>>({
    category: restrictedCat || 'المخزن العام',
    condition: 'جديد',
    unit: 'قطعة',
    quantity: 0
  });

  const filteredItems = useMemo(() => {
    return state.warehouse.filter(item => {
      // إذا كان المستخدم محصوراً في فئة، يرى بيانات فئته + المخزن العام فقط
      const canAccess = isManager || isWarehouseKeeper || item.category === restrictedCat || item.category === 'المخزن العام';
      if (!canAccess) return false;

      const matchCat = localCategoryFilter === 'الكل' ? true : item.category === localCategoryFilter;
      const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchCat && matchSearch;
    }).sort((a, b) => a.category.localeCompare(b.category));
  }, [state.warehouse, localCategoryFilter, searchTerm, restrictedCat, isManager, isWarehouseKeeper]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    if (!formData.name || formData.quantity === undefined) return;

    const itemToSave = {
      id: editingId || generateUUID(),
      name: formData.name!,
      category: formData.category as any || 'المخزن العام',
      quantity: formData.quantity!,
      unit: formData.unit as any || 'قطعة',
      condition: formData.condition as any || 'جديد',
      lastUpdated: new Date().toISOString(),
      notes: formData.notes || ''
    };

    const success = await syncToCloud?.('warehouse', itemToSave);
    if (!success) return;

    if (editingId) {
      setState(p => ({
        ...p,
        warehouse: p.warehouse.map(item => item.id === editingId ? itemToSave : item)
      }));
      addLog?.('تحديث مستودع', `تم تعديل بيانات: ${formData.name}`, 'info');
    } else {
      setState(p => ({ ...p, warehouse: [itemToSave, ...p.warehouse] }));
      addLog?.('إضافة للمستودع', `تم تسجيل صنف جديد: ${itemToSave.name}`, 'success');
    }

    setIsModalOpen(false);
    setEditingId(null);
  };

  const labelClass = "text-[10px] font-black text-slate-900 mr-2 uppercase block mb-1.5";
  const fieldClass = "w-full bg-slate-50 border-2 border-slate-900 rounded-xl py-3 px-4 font-black text-slate-900 outline-none focus:border-orange-600 transition-all text-sm";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-between items-center gap-6 no-print">
        <div className="flex items-center gap-4 w-full justify-center md:justify-start">
           <div className="bg-blue-900 p-3 rounded-2xl text-white shadow-lg">
             <Package size={28} />
           </div>
           <div>
             <h2 className="text-xl font-black text-blue-900">المستودع المركزي</h2>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">إدارة العتاد واللباس</p>
           </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
           <div className="relative w-full md:flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="بحث في المستودع..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-4 font-black text-xs md:text-sm outline-none focus:border-blue-900 transition-all shadow-sm focus:ring-4 focus:ring-blue-900/5"
              />
           </div>
           
           <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
             {(isManager || isWarehouseKeeper || (isViewer && !restrictedCat)) && (
               <select 
                 value={localCategoryFilter}
                 onChange={e => setLocalCategoryFilter(e.target.value)}
                 className="flex-1 md:flex-none min-w-[120px] bg-white border border-slate-200 rounded-xl py-3 px-4 font-black text-xs outline-none cursor-pointer hover:bg-slate-50 transition-all shadow-sm"
               >
                 <option value="الكل">جميع الأقسام</option>
                 <option value="المخزن العام">المخزن العام</option>
                 {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             )}

             {!isViewer && (
               <button onClick={() => { setEditingId(null); setFormData({ category: restrictedCat || 'المخزن العام', condition: 'جديد', unit: 'قطعة', quantity: 0 }); setIsModalOpen(true); }} className="flex-1 md:flex-none whitespace-nowrap bg-blue-900 text-white px-6 py-3 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 hover:bg-blue-800 transition-all active:scale-95">
                 <Plus size={20}/> إضافة صنف
               </button>
             )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 px-2 md:px-0">
         {filteredItems.map(item => (
           <div key={item.id} className="bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm relative group hover:shadow-xl transition-all border-b-8 hover:border-orange-500 border-b-slate-100">
              <div className="flex justify-between items-start mb-4">
                 <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase border-2 ${item.category === 'المخزن العام' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-900 border-blue-100'}`}>
                   {item.category}
                 </span>
                 <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    {!isViewer && (isManager || isWarehouseKeeper || item.category === restrictedCat) && (
                      <>
                        <button onClick={() => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); }} className="p-2 bg-slate-100 text-blue-900 rounded-lg border border-slate-200 hover:bg-blue-900 hover:text-white transition-all"><Edit3 size={14}/></button>
                        <button onClick={async () => { 
                          if(confirm('هل تريد حذف هذا الصنف؟')) { 
                            const { error } = await supabase.from('warehouse').delete().eq('id', item.id);
                            if (error) return alert('فشل الحذف: ' + error.message);
                            setState(p => ({...p, warehouse: p.warehouse.filter(x => x.id !== item.id)})); 
                            addLog?.('حذف من المستودع', `تم مسح: ${item.name}`, 'error'); 
                          } 
                        }} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                      </>
                    )}
                 </div>
              </div>
              <div className="mb-6">
                 <h4 className="text-lg font-black text-blue-900 mb-2 truncate">{item.name}</h4>
                 <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ring-4 ring-opacity-10 ${item.condition === 'جديد' ? 'bg-emerald-500 ring-emerald-500' : item.condition === 'تالف' ? 'bg-red-500 ring-red-500' : 'bg-orange-500 ring-orange-500'}`}></span>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.condition}</span>
                 </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center transition-colors group-hover:bg-blue-50">
                 <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">الكمية المتوفرة</p>
                    <p className="text-2xl font-black text-blue-900">{item.quantity} <span className="text-[10px] text-slate-400 font-bold uppercase">{item.unit}</span></p>
                 </div>
                 <div className="bg-white p-3 rounded-xl shadow-sm"><Box size={24} className="text-blue-900/20 group-hover:text-blue-900/60 transition-colors" /></div>
              </div>
           </div>
         ))}
         {filteredItems.length === 0 && (
           <div className="col-span-full py-20 md:py-32 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 p-8">
              <Box size={64} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-black text-lg italic italic">لا توجد سجلات مطابقة في المخزن</p>
           </div>
         )}
      </div>

      {isModalOpen && !isViewer && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-md flex items-center justify-center z-[500] p-0 md:p-4 no-print" dir="rtl">
           <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                 <h3 className="font-black text-blue-900 uppercase">{editingId ? 'تعديل الصنف' : 'إضافة صنف جديد'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-red-500 hover:text-white transition-all shadow-sm"><X size={20}/></button>
              </div>
              <form onSubmit={handleSave} className="flex-1 p-6 md:p-8 space-y-6 bg-slate-50 overflow-y-auto pb-32">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className={labelClass}>القسم / الفئة</label>
                       <select 
                        disabled={!!restrictedCat && !isWarehouseKeeper}
                        className={fieldClass} 
                        value={formData.category} 
                        onChange={e => setFormData({...formData, category: e.target.value as any})}
                       >
                          <option value="المخزن العام">المخزن العام</option>
                          {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1.5">
                       <label className={labelClass}>حالة الصنف</label>
                       <select className={fieldClass} value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value as any})}>
                          <option value="جديد">جديد</option>
                          <option value="مستعمل">مستعمل</option>
                          <option value="تالف">تالف</option>
                       </select>
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className={labelClass}>وصف الصنف</label>
                    <input required type="text" placeholder="مثلاً: كرات أديداس 2024 .." className={fieldClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className={labelClass}>الكمية</label>
                       <input required type="number" className={fieldClass} value={formData.quantity || 0} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1.5">
                       <label className={labelClass}>الوحدة</label>
                       <select className={fieldClass} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                          <option value="قطعة">قطعة</option>
                          <option value="طقم">طقم</option>
                          <option value="كرة">كرة</option>
                          <option value="حذاء">حذاء</option>
                       </select>
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className={labelClass}>ملاحظات إضافية (اختياري)</label>
                    <textarea rows={3} className={`${fieldClass} py-4 resize-none`} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="تفاصيل العهدة أو التوزيع.." />
                 </div>
                 <button type="submit" className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-900/10 hover:bg-blue-800 transition-all active:scale-95 mt-4">
                    <Save size={24}/> حفظ بيانات المخزن
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;
