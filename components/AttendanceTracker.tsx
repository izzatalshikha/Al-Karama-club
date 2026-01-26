
import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Save, ShieldAlert, History, Search, ShieldCheck, Lock, Unlock, Clock, Calendar as CalendarIcon, AlertCircle, Printer, ChevronRight, FileText, Users } from 'lucide-react';
import { AppState, AttendanceStatus, AttendanceRecord, TrainingSession, Person } from '../types';
import { generateUUID, supabase } from '../App';
import ClubLogo from './ClubLogo';

interface AttendanceTrackerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ state, setState, addLog }) => {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [localRecords, setLocalRecords] = useState<Record<string, { status: AttendanceStatus | null; excuse?: string; time?: string; date?: string }>>({});
  const [showPrintView, setShowPrintView] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const currentUser = state.currentUser!;
  const globalFilter = state.globalCategoryFilter;
  const restrictedCat = currentUser.restrictedCategory;
  const isViewer = currentUser.role === 'مشاهد';
  const isCatAdmin = currentUser.role === 'إداري فئة';
  const isManager = currentUser.role === 'مدير';

  // تصفية الجلسات المتاحة للاختيار
  const sessions = state.sessions
    .filter(s => {
      if (restrictedCat) return s.category === restrictedCat;
      return (globalFilter === 'الكل' || s.category === globalFilter);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeSession = state.sessions.find(s => s.id === selectedSessionId);
  
  // تحديث: جلب كافة أعضاء الفئة مع وضع الكادر أولاً ثم اللاعبين
  const categoryMembers = state.people
    .filter(p => (activeSession ? p.category === activeSession.category : true))
    .sort((a, b) => {
      const isAStaff = a.role !== 'لاعب';
      const isBStaff = b.role !== 'لاعب';
      if (isAStaff && !isBStaff) return -1;
      if (!isAStaff && isBStaff) return 1;
      return 0; // الحفاظ على الترتيب الحالي إذا كان كلاهما من نفس النوع
    });

  const savedRecords = state.attendance.filter(r => r.sessionId === selectedSessionId);

  // فحص انتهاء الوقت التلقائي (30 دقيقة)
  const isTimeExpired = activeSession ? (() => {
    const sessionTime = new Date(`${activeSession.date}T${activeSession.time}`);
    const now = new Date();
    const diffInMinutes = (now.getTime() - sessionTime.getTime()) / (1000 * 60);
    return diffInMinutes > 30;
  })() : false;

  // حالة القفل: إما يدوي من المدير أو تلقائي بمرور الوقت
  const isLocked = activeSession?.isLocked || (isTimeExpired && !isManager);

  const handleSetStatus = (pid: string, status: AttendanceStatus) => {
    if (isLocked || isViewer) return;
    
    const saved = savedRecords.find(r => r.personId === pid);
    const local = localRecords[pid];
    const currentStatus = local?.status !== undefined ? local.status : (saved?.status || null);

    if (isManager && currentStatus === status) {
      setLocalRecords(prev => ({ 
        ...prev, 
        [pid]: { ...prev[pid], status: null } 
      }));
      return;
    }

    if (isCatAdmin && currentStatus !== null) {
      alert('نظام الحماية: لا يمكنك تعديل حالة الحضور بعد رصدها للمرة الأولى.');
      return;
    }

    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    setLocalRecords(prev => ({ 
      ...prev, 
      [pid]: { ...prev[pid], status, time: timeStr } 
    }));
  };

  const handleSetExcuse = (pid: string, excuse: string) => {
    if (isLocked || isViewer) return;
    setLocalRecords(prev => ({ ...prev, [pid]: { ...prev[pid], excuse } }));
  };

  // إصلاح دالة "تثبيت الرصد النهائي" وحل مشكلة المزامنة والقفل
  const saveAttendance = async () => {
    if (!selectedSessionId || isSaving) return;
    if (isLocked && !isManager) {
      alert("عذراً، السجل مقفل حالياً.");
      return;
    }

    setIsSaving(true);
    try {
      const newRecords: AttendanceRecord[] = [];
      const now = new Date();
      const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      
      categoryMembers.forEach(p => {
        const local = localRecords[p.id];
        const saved = savedRecords.find(r => r.personId === p.id);
        
        let statusToSave: AttendanceStatus | null = null;
        let excuseToSave = "";
        
        if (local && local.status !== undefined) {
          statusToSave = local.status;
          excuseToSave = local.excuse || "";
        } else if (saved) {
          statusToSave = saved.status;
          excuseToSave = saved.excuse || "";
        }

        // الغياب التلقائي عند التثبيت إذا كان الوقت قد مضى (للمدير الخيار في تركها فارغة)
        if (isTimeExpired && statusToSave === null && !isManager) {
          statusToSave = 'غائب';
        }

        if (statusToSave !== null) {
          newRecords.push({
            id: saved?.id || generateUUID(),
            personId: p.id,
            sessionId: selectedSessionId,
            date: activeSession!.date,
            time: local?.time || saved?.time || timeStr,
            status: statusToSave as AttendanceStatus,
            excuse: excuseToSave,
            isLocked: true
          });
        }
      });

      // 1. تحديث الحالة السحابية أولاً للسجلات
      if (newRecords.length > 0) {
        const { error: attError } = await supabase.from('attendance').upsert(newRecords.map(r => ({
          ...r,
          fine: r.fine || null
        })), { onConflict: 'id' });
        if (attError) throw attError;
      }

      // 2. تحديث الحالة السحابية للجلسة (قفل الجلسة)
      const { error: sessError } = await supabase.from('sessions').update({ 
        isLocked: true, 
        isCompleted: true 
      }).eq('id', selectedSessionId);
      
      if (sessError) throw sessError;

      // 3. تحديث الحالة المحلية للمزامنة الفورية
      setState(prev => ({
        ...prev,
        attendance: [
          ...prev.attendance.filter(a => a.sessionId !== selectedSessionId),
          ...newRecords
        ],
        sessions: prev.sessions.map(s => s.id === selectedSessionId ? { ...s, isLocked: true, isCompleted: true } : s)
      }));
      
      addLog?.('تثبيت الحضور', `تم رصد حضور فئة ${activeSession?.category} وإغلاق السجل نهائياً`, 'success');
      setLocalRecords({});
      alert('تم تثبيت الرصد النهائي وقفل السجل في السحابة بنجاح.');
    } catch (err: any) {
      console.error("Save Error:", err);
      alert('خطأ في الاتصال بالسحابة أو تثبيت البيانات: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLock = async () => {
    if (!isManager || !activeSession) return;
    const newLockStatus = !activeSession.isLocked;
    
    setState(p => ({
      ...p,
      sessions: p.sessions.map(s => s.id === selectedSessionId ? { ...s, isLocked: newLockStatus } : s)
    }));

    await supabase.from('sessions').update({ isLocked: newLockStatus }).eq('id', selectedSessionId);
    addLog?.('قفل السجل', `${newLockStatus ? 'تم قفل' : 'تم إلغاء قفل'} سجل الحضور يدوياً`, 'warning');
  };

  if (showPrintView && activeSession) {
    const reportRecords = categoryMembers.map(p => {
        const r = savedRecords.find(rec => rec.personId === p.id);
        return { member: p, record: r };
    });

    return (
      <div className="fixed inset-0 bg-white z-[500] overflow-y-auto p-4 sm:p-12 dir-rtl text-right print:p-0">
        <div className="max-w-[210mm] mx-auto border-4 border-slate-900 p-10 print:border-2 print:p-6 bg-white min-h-[297mm] shadow-none">
           <div className="no-print flex justify-between items-center mb-10 border-b pb-4">
              <button onClick={() => setShowPrintView(false)} className="flex items-center gap-2 font-black text-slate-500 hover:text-red-600 transition-colors"><ChevronRight/> العودة للرصد</button>
              <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 shadow-xl"><Printer size={18}/> تصدير PDF (A4)</button>
           </div>

           <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8 print:border-b-2">
              <div className="flex items-center gap-4">
                 <ClubLogo size={80} />
                 <div>
                    <h2 className="text-2xl font-black text-[#001F3F]">نادي الكرامة الرياضي</h2>
                    <p className="text-sm font-black text-orange-600">مكتب كرة القدم المركزي</p>
                 </div>
              </div>
              <div className="text-left font-black">
                 <p className="text-xl uppercase tracking-tighter">كشف حضور وانضباط رسمي</p>
                 <p className="text-sm text-slate-500">{activeSession.objective}</p>
                 <p className="text-[10px] mt-1">الفئة: {activeSession.category} | التاريخ: {activeSession.date}</p>
              </div>
           </div>

           <table className="w-full text-right border-collapse border-2 border-slate-900">
              <thead>
                 <tr className="bg-slate-100 border-b-2 border-slate-900 text-[10px] font-black uppercase">
                    <th className="p-3 border-l border-slate-900 text-center w-12">ت</th>
                    <th className="p-3 border-l border-slate-900">الاسم الكامل</th>
                    <th className="p-3 border-l border-slate-900 text-center">الصفة</th>
                    <th className="p-3 border-l border-slate-900 text-center">الحالة</th>
                    <th className="p-3 border-l border-slate-900 text-center">الوقت</th>
                    <th className="p-3">الملاحظات / العذر</th>
                 </tr>
              </thead>
              <tbody>
                 {reportRecords.map((item, idx) => (
                    <tr key={item.member.id} className={`border-b border-slate-300 text-xs font-black ${item.member.role !== 'لاعب' ? 'bg-slate-50' : ''}`}>
                       <td className="p-3 border-l border-slate-300 text-center">{idx + 1}</td>
                       <td className="p-3 border-l border-slate-300">{item.member.name}</td>
                       <td className="p-3 border-l border-slate-300 text-center text-[10px] opacity-70">{item.member.role}</td>
                       <td className="p-3 border-l border-slate-300 text-center">
                          <span className={item.record?.status === 'حاضر' ? 'text-emerald-600' : item.record?.status === 'متأخر' ? 'text-orange-600' : 'text-red-600'}>
                             {item.record?.status || 'غائب'}
                          </span>
                       </td>
                       <td className="p-3 border-l border-slate-300 text-center">{item.record?.time || '--'}</td>
                       <td className="p-3 text-[10px] italic text-slate-500">{item.record?.excuse || '--'}</td>
                    </tr>
                 ))}
              </tbody>
           </table>

           <div className="mt-20 flex justify-around items-start opacity-0 print:opacity-100">
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">توقيع مدرب الفئة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">إداري الفئة المسؤول</p>
                 <p className="text-[10px]">..........................</p>
              </div>
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">مدير مكتب كرة القدم</p>
                 <p className="font-black text-xs text-blue-900">عزت عامر الشيخة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
           </div>
           
           <div className="mt-10 pt-4 border-t border-slate-200 text-center hidden print:block">
              <p className="text-[8px] font-black text-slate-400">وثيقة رسمية صادرة عن النظام الإلكتروني لنادي الكرامة الرياضي - مقاس A4</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-900 flex flex-col md:flex-row gap-6 items-end no-print relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-[#001F3F]"></div>
        <div className="flex-1 space-y-2 w-full">
           <label className="text-[10px] font-black text-slate-900 mr-2 uppercase tracking-widest flex items-center gap-2">
             <ClipboardCheck size={14} className="text-blue-900"/> اختيار الجلسة التدريبية أو النشاط
           </label>
           <select value={selectedSessionId} onChange={e => { setSelectedSessionId(e.target.value); setLocalRecords({}); }}
            className="w-full bg-slate-100 border-2 border-slate-900 rounded-xl p-4 font-black text-xl text-slate-900 outline-none focus:border-orange-600 transition-all">
             <option value="">-- اختر التمرين من القائمة لفتح الرصد --</option>
             {sessions.map(s => <option key={s.id} value={s.id}>{s.date} | {s.objective} ({s.category})</option>)}
           </select>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          {isManager && selectedSessionId && (
            <button onClick={toggleLock} className={`flex-1 md:flex-none px-6 py-5 rounded-2xl font-black text-lg shadow-sm border-2 ${activeSession?.isLocked ? 'bg-red-50 text-red-600 border-red-600' : 'bg-emerald-50 text-emerald-700 border-emerald-600'}`}>
              {activeSession?.isLocked ? <Lock size={20} className="inline ml-2"/> : <Unlock size={20} className="inline ml-2"/>}
              {activeSession?.isLocked ? 'فتح السجل' : 'قفل السجل'}
            </button>
          )}
          <button onClick={() => setShowPrintView(true)} disabled={!selectedSessionId} className="flex-1 md:flex-none bg-white text-slate-900 border-2 border-slate-900 px-6 py-5 rounded-2xl font-black text-lg disabled:opacity-30 hover:bg-slate-50 transition-all">
            <Printer size={20} className="inline ml-2" /> طباعة A4
          </button>
          {!isViewer && (
            <button onClick={saveAttendance} disabled={!selectedSessionId || (isLocked && !isManager) || isSaving} className="flex-1 md:flex-[1.5] bg-[#001F3F] text-white px-8 py-5 rounded-2xl font-black text-lg shadow-xl disabled:opacity-30 border-b-4 border-black hover:bg-black transition-all">
              {isSaving ? <History className="animate-spin inline ml-2"/> : <Save size={20} className="inline ml-2" />}
              تثبيت الرصد النهائي
            </button>
          )}
        </div>
      </div>

      {isLocked && (
        <div className="bg-red-50 p-6 rounded-[2.5rem] border-4 border-red-900 flex items-center gap-4 shadow-lg animate-in slide-in-from-top duration-500">
           <div className="p-4 bg-red-900 text-white rounded-2xl"><Lock size={32}/></div>
           <div>
              <h3 className="text-xl font-black text-red-900 uppercase">السجل محمي ومقفل إدارياً</h3>
              <p className="text-xs font-black text-red-700 mt-1 uppercase">
                {activeSession?.isLocked ? 'تم اعتماد النتائج النهائية ونسخها للسحابة. لا يمكن التعديل حالياً.' : 'مضى وقت طويل على النشاط، يتطلب التعديل صلاحية "مدير النظام".'}
              </p>
           </div>
        </div>
      )}

      {activeSession && (
        <div className={`bg-white rounded-[2.5rem] shadow-sm border-2 border-slate-900 overflow-hidden relative ${isLocked && !isManager ? 'opacity-70 pointer-events-none grayscale-[0.3]' : ''}`}>
          <div className="p-6 border-b-2 border-slate-900 bg-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-white border-2 border-slate-900 rounded-xl flex items-center justify-center font-black text-2xl text-[#001F3F] shadow-md uppercase">K</div>
               <div>
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{activeSession.objective}</h3>
                 <p className="text-[10px] font-black text-[#001F3F] uppercase tracking-widest">{activeSession.category} • {activeSession.date}</p>
               </div>
             </div>
             <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl border border-blue-200">
                <Users size={18}/>
                <span className="text-[10px] font-black uppercase tracking-tighter">إجمالي الكادر واللاعبين: {categoryMembers.length}</span>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[900px]">
              <thead className="bg-slate-200 border-b-2 border-slate-900">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">الاسم / الدور (الكادر أولاً)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">الرصد الانضباطي</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">التوقيت</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">توضيح إداري / عذر</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200">
                {categoryMembers.map(p => {
                  const saved = savedRecords.find(r => r.personId === p.id);
                  const local = localRecords[p.id];
                  
                  let currentStatus: AttendanceStatus | null = null;
                  let currentTime = "--:--";
                  let currentExcuse = "";

                  if (local !== undefined) {
                    currentStatus = local.status;
                    currentTime = local.time || "--:--";
                    currentExcuse = local.excuse || "";
                  } else if (saved) {
                    currentStatus = saved.status;
                    currentTime = saved.time || "--:--";
                    currentExcuse = saved.excuse || "";
                  }
                  
                  const isMarked = (saved && saved.status) || (local && local.status);
                  const isDisabledForUser = !isManager && isMarked;
                  const isStaff = p.role !== 'لاعب';

                  return (
                    <tr key={p.id} className={`hover:bg-blue-50/30 transition-all ${isStaff ? 'bg-slate-50/80 border-r-8 border-[#001F3F]' : ''}`}>
                      <td className="px-6 py-5 border-l-2 border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-md border-2 border-slate-900 ${currentStatus ? (isStaff ? 'bg-orange-600 text-white' : 'bg-[#001F3F] text-white') : 'bg-white'}`}>
                            {p.role === 'لاعب' ? (p.number || '??') : p.role.charAt(0)}
                          </div>
                          <div>
                             <span className="font-black text-[15px] text-slate-900 block">{p.name}</span>
                             <span className={`text-[9px] font-black uppercase ${isStaff ? 'text-orange-600' : 'text-slate-400'}`}>
                                {p.role} {isStaff ? ' (كادر)' : ''}
                             </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
                          {['حاضر', 'متأخر', 'غائب', 'غياب بعذر'].map(st => (
                            <button key={st} disabled={(isLocked && !isManager) || isDisabledForUser || isViewer} onClick={() => handleSetStatus(p.id, st as AttendanceStatus)}
                              className={`px-4 py-2 rounded-lg text-[9px] font-black border-2 transition-all ${currentStatus === st ? `bg-slate-900 text-white border-slate-900 shadow-lg scale-105` : 'bg-white text-slate-900 border-slate-300 hover:border-slate-900'} disabled:opacity-50`}>
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-black text-[10px] text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">{currentTime}</span>
                      </td>
                      <td className="px-6 py-5">
                        <input disabled={(isLocked && !isManager) || isDisabledForUser || isViewer} type="text" value={currentExcuse} onChange={e => handleSetExcuse(p.id, e.target.value)}
                          className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2 text-[10px] font-black w-full outline-none focus:border-[#001F3F] placeholder:text-slate-300" 
                          placeholder="اكتب التبرير هنا..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;
