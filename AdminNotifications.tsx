import React, { useMemo, useState } from 'react';
import { AppState, TechnicalReport } from '../types';
import { Bell, CheckCircle2, MessageSquare, CalendarX2, Car, Trash2, Search, Filter } from 'lucide-react';
import { supabase } from '../App';

interface AdminNotificationsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud?: (table: string, data: any) => Promise<boolean>;
}

const AdminNotifications: React.FC<AdminNotificationsProps> = ({ state, setState, syncToCloud }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');

  const notifications = useMemo(() => {
    return state.technicalReports
      .filter(r => ['parent_message', 'pickup_permission', 'absence_request'].includes(r.type))
      .filter(r => {
         if (filterType !== 'all' && r.type !== filterType) return false;
         if (filterStatus === 'pending' && r.rating !== 0) return false;
         if (filterStatus === 'resolved' && r.rating !== 1) return false;
         return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
  }, [state.technicalReports, filterType, filterStatus]);

  const handleMarkResolved = async (report: TechnicalReport) => {
    const updated = { ...report, rating: 1 };
    
    // Update local state
    setState(prev => ({
      ...prev,
      technicalReports: prev.technicalReports.map(r => r.id === report.id ? updated : r)
    }));

    // Update cloud
    if (syncToCloud) {
       await syncToCloud('technical_reports', updated);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإشعار تماماً؟')) return;
    
    setState(prev => ({
      ...prev,
      technicalReports: prev.technicalReports.filter(r => r.id !== id)
    }));

    if (syncToCloud) {
       try {
         await supabase.from('technical_reports').delete().eq('id', id);
       } catch (err) {}
    }
  };

  const getTypeIcon = (type: string) => {
     switch (type) {
        case 'parent_message': return <MessageSquare size={18} className="text-blue-500" />;
        case 'absence_request': return <CalendarX2 size={18} className="text-orange-500" />;
        case 'pickup_permission': return <Car size={18} className="text-purple-500" />;
        default: return <Bell size={18} className="text-slate-500" />;
     }
  };

  const getTypeName = (type: string) => {
     switch (type) {
        case 'parent_message': return 'رسالة/استفسار';
        case 'absence_request': return 'طلب غياب';
        case 'pickup_permission': return 'تصريح اصطحاب';
        default: return 'إشعار';
     }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-2xl">
            <Bell size={24} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">إشعارات وطلبات الأهالي</h2>
            <p className="text-slate-500 text-sm font-medium">مراجعة والرد على الاستفسارات والتصاريح</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="p-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-700"
          >
            <option value="all">كل الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="resolved">محلول/مقروء</option>
          </select>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-700"
          >
             <option value="all">كل الأنواع</option>
             <option value="parent_message">الرسائل</option>
             <option value="absence_request">طلبات الغياب</option>
             <option value="pickup_permission">تصاريح الاصطحاب</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
         {notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
               <CheckCircle2 size={48} className="mx-auto mb-4 text-slate-200" />
               <p className="text-lg font-bold text-slate-400">لا توجد إشعارات مطابقة</p>
            </div>
         ) : (
            <div className="space-y-4">
               {notifications.map(req => (
                  <div key={req.id} className={`flex flex-col md:flex-row gap-4 p-5 rounded-2xl border ${req.rating === 1 ? 'bg-slate-50/50 border-slate-200 opacity-70' : 'bg-white border-blue-100 shadow-sm'} transition-all`}>
                     <div className="flex items-center gap-3 md:w-48 shrink-0">
                        <div className={`p-2 rounded-xl shrink-0 ${req.rating === 1 ? 'bg-slate-100' : 'bg-blue-50'}`}>
                           {getTypeIcon(req.type)}
                        </div>
                        <div>
                           <p className="font-bold text-slate-800 text-sm">{getTypeName(req.type)}</p>
                           <p className="text-xs text-slate-500 font-medium">{req.date}</p>
                        </div>
                     </div>
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-xs bg-slate-100 text-slate-700 font-black px-2 py-1 rounded-md">{req.author}</span>
                           <span className="text-xs text-blue-600 bg-blue-50 font-bold px-2 py-1 rounded-md">{req.category}</span>
                           {req.rating === 1 && <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded-md flex items-center gap-1"><CheckCircle2 size={12}/> تمت المراجعة</span>}
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap font-medium leading-relaxed text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">{req.content}</p>
                     </div>
                     <div className="flex flex-row md:flex-col gap-2 shrink-0 md:justify-center">
                        {req.rating === 0 && (
                           <button onClick={() => handleMarkResolved(req)} className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 font-bold transition-colors">
                              <CheckCircle2 size={18} />
                              <span className="md:hidden lg:inline">علامة كمقروء</span>
                           </button>
                        )}
                        <button onClick={() => handleDelete(req.id)} className="flex-1 md:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold transition-colors">
                           <Trash2 size={18} />
                           <span className="hidden lg:inline">حذف</span>
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
    </div>
  );
};

export default AdminNotifications;
