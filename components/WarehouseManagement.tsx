
import React, { useState, useMemo } from 'react';
import { Package, Plus, Trash2, Edit3, Search, Filter, Box, Archive, ClipboardList, ShieldAlert, X, Save, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { AppState, WarehouseItem, Category } from '../types';
import { generateUUID, supabase } from '../App';

interface WarehouseManagementProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ state, setState, addLog }) => {
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;
    if (!formData.name || formData.quantity === undefined) return;

    if (editingId) {
      setState(p => ({
        ...p,
        warehouse: p.warehouse.map(item => item.id === editingId ? { ...item, ...formData, lastUpdated: new Date().toISOString() } as WarehouseItem : item)
      }));
      addLog?.('تحديث مستودع', `تم تعديل بيانات: ${formData.name}`, 'info');
    } else {
      const newItem: WarehouseItem = {
        id: generateUUID(),
        name: formData.name!,
        category: formData.category as any || 'المخزن العام',
        quantity: formData.quantity!,
        unit: formData.unit as any || 'قطعة',
        condition: formData.condition as any || 'جديد',
        lastUpdated: new Date().toISOString(),
        notes: formData.notes
      };
      setState(p => ({ ...p, warehouse: [newItem, ...p.warehouse] }));
      addLog?.('إضافة للمستودع', `تم تسجيل صنف جديد: ${newItem.name}`, 'success');
    }

    setIsModalOpen(false);
    setEditingId(null);
  };

  const labelClass = "text-[10px] font-black text-slate-900 mr-2 uppercase block mb-1.5";
  const fieldClass = "w-full bg-slate-50 border-2 border-slate-900 rounded-xl py-3 px-4 font-black text-slate-900 outline-none focus:border-orange-600 transition-all text-sm";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-4">
           <div className="bg-[#001F3F] p-3 rounded-2xl text-white">
             <Package size={28} />
           </div>
           <div>
             <h2 className="text-xl font-black text-slate-900">المستودع المركزي والمخازن</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">إدارة العتاد واللباس</p>
           </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="بحث في المستودع..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl py-2 pr-10 pl-4 font-black text-xs outline-none focus:border-orange-600"
              />
           </div>
           
           {(isManager || isWarehouseKeeper || (isViewer && !restrictedCat)) && (
             <select 
               value={localCategoryFilter}
               onChange={e => setLocalCategoryFilter(e.target.value)}
               className="bg-white border-2 border-slate-900 rounded-xl py-2 px-4 font-black text-xs outline-none cursor-pointer"
             >
               <option value="الكل">جميع الأقسام</option>
               <option value="المخزن العام">المخزن العام</option>
               {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           )}

           {!isViewer && (
             <button onClick={() => { setEditingId(null); setFormData({ category: restrictedCat || 'المخزن العام', condition: 'جديد', unit: 'قطعة', quantity: 0 }); setIsModalOpen(true); }} className="bg-[#001F3F] text-white px-6 py-2 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg border-b-4 border-black">
               <Plus size={18}/> إضافة صنف
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {filteredItems.map(item => (
           <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 shadow-sm relative group hover:shadow-xl transition-all border-b-8 hover:border-orange-600">
              <div className="flex justify-between items-start mb-4">
                 <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase border ${item.category === 'المخزن العام' ? 'bg-orange-600 text-white border-orange-700' : 'bg-[#001F3F] text-white border-black'}`}>
                   {item.category}
                 </span>
                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isViewer && (isManager || isWarehouseKeeper || item.category === restrictedCat) && (
                      <>
                        <button onClick={() => { setEditingId(item.id); setFormData(item); setIsModalOpen(true); }} className="p-1.5 bg-slate-100 text-blue-600 rounded-lg"><Edit3 size={14}/></button>
                        <button onClick={async () => { if(confirm('هل تريد حذف هذا الصنف؟')) { setState(p => ({...p, warehouse: p.warehouse.filter(x => x.id !== item.id)})); addLog?.('حذف من المستودع', `تم مسح: ${item.name}`, 'error'); } }} className="p-1.5 bg-red-50 text-red-600 rounded-lg"><Trash2 size={14}/></button>
                      </>
                    )}
                 </div>
              </div>
              <div className="mb-6">
                 <h4 className="text-lg font-black text-slate-900 mb-1">{item.name}</h4>
                 <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${item.condition === 'جديد' ? 'bg-emerald-500' : item.condition === 'تالف' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.condition}</span>
                 </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 flex justify-between items-center">
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">الكمية المتوفرة</p>
                    <p className="text-2xl font-black text-slate-900">{item.quantity} <span className="text-[10px] text-slate-400 font-bold">{item.unit}</span></p>
                 </div>
                 <Box size={32} className="text-slate-200" />
              </div>
           </div>
         ))}
      </div>

      {isModalOpen && !isViewer && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[500] p-4">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg border-[6px] border-slate-900 shadow-2xl overflow-hidden">
              <div className="p-6 bg-slate-100 border-b-2 border-slate-900 flex justify-between items-center">
                 <h3 className="font-black text-slate-900 uppercase">{editingId ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد'}</h3>
                 <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-lg border-2 border-slate-900"><X size={20}/></button>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-5 text-right" dir="rtl">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
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
                    <div className="space-y-1">
                       <label className={labelClass}>حالة الصنف</label>
                       <select className={fieldClass} value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value as any})}>
                          <option value="جديد">جديد</option>
                          <option value="مستعمل">مستعمل</option>
                          <option value="تالف">تالف</option>
                       </select>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <label className={labelClass}>اسم الصنف</label>
                    <input required type="text" className={fieldClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className={labelClass}>الكمية</label>
                       <input required type="number" className={fieldClass} value={formData.quantity || 0} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                       <label className={labelClass}>وحدة القياس</label>
                       <select className={fieldClass} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                          <option value="قطعة">قطعة</option>
                          <option value="طقم">طقم</option>
                          <option value="كرة">كرة</option>
                          <option value="حذاء">حذاء</option>
                       </select>
                    </div>
                 </div>
                 <button type="submit" className="w-full bg-[#001F3F] text-white py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 border-b-4 border-black active:translate-y-1 active:border-b-0 transition-all">
                    <Save size={20}/> حفظ في السجلات
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;
