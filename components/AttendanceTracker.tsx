
import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Save, ShieldAlert, History, Search, ShieldCheck, Lock, Clock, Calendar as CalendarIcon, AlertCircle, Printer, ChevronRight, FileText } from 'lucide-react';
// Import only types from types.ts
import { AppState, AttendanceStatus, AttendanceRecord, TrainingSession } from '../types';
// Correctly import generateUUID helper from App.tsx where it is defined and exported
import { generateUUID } from '../App';
import ClubLogo from './ClubLogo';

interface AttendanceTrackerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ state, setState, addLog }) => {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [localRecords, setLocalRecords] = useState<Record<string, { status: AttendanceStatus; excuse?: string; time?: string; date?: string }>>({});
  const [showPrintView, setShowPrintView] = useState(false);
  
  const currentUser = state.currentUser!;
  const globalFilter = state.globalCategoryFilter;
  const restrictedCat = currentUser.restrictedCategory;
  const isViewer = currentUser.role === 'مشاهد';
  const isCatAdmin = currentUser.role === 'إداري فئة';

  // فلترة الجلسات بحسب الصلاحية
  const sessions = state.sessions
    .filter(s => {
      if (restrictedCat) return s.category === restrictedCat;
      return (globalFilter === 'الكل' || s.category === globalFilter);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeSession = state.sessions.find(s => s.id === selectedSessionId);
  const players = state.people.filter(p => p.role === 'لاعب' && (activeSession ? p.category === activeSession.category : true));
  const savedRecords = state.attendance.filter(r => r.sessionId === selectedSessionId);

  // Auto-lock check: Is session older than 30 minutes?
  const isLockedByTime = activeSession ? (() => {
    const sessionTime = new Date(`${activeSession.date}T${activeSession.time}`);
    const now = new Date();
    const diffInMinutes = (now.getTime() - sessionTime.getTime()) / (1000 * 60);
    return diffInMinutes > 30;
  })() : false;

  const handleSetStatus = (pid: string, status: AttendanceStatus) => {
    if (isLockedByTime || isViewer) return;
    
    // قفل لإداري الفئة: إذا كان السجل موجوداً مسبقاً في قاعدة البيانات، لا يمكن التعديل
    if (isCatAdmin) {
       const alreadySaved = savedRecords.some(r => r.personId === pid);
       if (alreadySaved) {
          alert('نظام الحماية: لا يمكنك تعديل حالة لاعب تم رصد حضوره مسبقاً. يرجى مراجعة مدير المكتب.');
          return;
       }
    }

    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    const dateStr = now.toISOString().split('T')[0];

    setLocalRecords(prev => ({ 
      ...prev, 
      [pid]: { ...prev[pid], status, time: timeStr, date: dateStr } 
    }));
  };

  const handleSetExcuse = (pid: string, excuse: string) => {
    if (isLockedByTime || isViewer) return;
    setLocalRecords(prev => ({
      ...prev,
      [pid]: { ...prev[pid], excuse }
    }));
  };

  const saveAttendance = () => {
    if (isLockedByTime) {
      alert("عذراً، تم قفل رصد الحضور لهذا التمرين بسبب تجاوز المهلة المسموحة (30 دقيقة).");
      return;
    }

    const entries = Object.entries(localRecords) as [string, { status: AttendanceStatus; excuse?: string; time?: string; date?: string }][];
    if (entries.length === 0) return alert('يرجى رصد حالات اللاعبين أولاً قبل التثبيت');

    const newRecords: AttendanceRecord[] = entries.map(([pid, data]) => ({
      id: generateUUID(),
      personId: pid,
      sessionId: selectedSessionId,
      date: data.date || activeSession!.date,
      time: data.time || (new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0')),
      status: data.status,
      excuse: data.excuse,
      isLocked: true
    }));

    setState(p => ({
      ...p,
      attendance: [
        ...p.attendance.filter(a => !(a.sessionId === selectedSessionId && localRecords[a.personId])),
        ...newRecords
      ],
    }));
    
    addLog?.('حفظ الحضور', `تم تثبيت سجل حضور تمرين فئة ${activeSession?.category} - ${activeSession?.objective}`, 'success');
    setLocalRecords({});
    alert('تم حفظ وتثبيت سجل الحضور بنجاح في قاعدة البيانات.');
  };

  // Printable Report Modal for Attendance
  if (showPrintView && activeSession) {
    const reportRecords = players.map(p => {
        const r = savedRecords.find(rec => rec.personId === p.id);
        return { player: p, record: r };
    });

    return (
      <div className="fixed inset-0 bg-white z-[500] overflow-y-auto p-8 dir-rtl text-right">
        <div className="max-w-4xl mx-auto border-4 border-slate-900 p-10 rounded-none shadow-none print:border-2">
           <div className="no-print flex justify-between items-center mb-10 border-b pb-4">
              <button onClick={() => setShowPrintView(false)} className="flex items-center gap-2 font-black text-slate-500"><ChevronRight/> العودة</button>
              <button onClick={() => window.print()} className="bg-[#001F3F] text-white px-8 py-3 rounded-xl font-black flex items-center gap-2"><Printer size={18}/> طباعة PDF</button>
           </div>

           <div className="flex justify-between items-center border-b-4 border-slate-900 pb-6 mb-8">
              <div className="flex items-center gap-4">
                 <ClubLogo size={80} />
                 <div>
                    <h2 className="text-2xl font-black text-[#001F3F]">نادي الكرامة الرياضي</h2>
                    <p className="text-sm font-black text-orange-600">مكتب كرة القدم المركزي</p>
                 </div>
              </div>
              <div className="text-left font-black">
                 <p className="text-xl uppercase">تقرير حضور حصة تدريبية</p>
                 <p className="text-sm text-slate-500">التمرين: {activeSession.objective}</p>
                 <p className="text-[10px] mt-1">الفئة: {activeSession.category} | التاريخ: {activeSession.date}</p>
              </div>
           </div>

           <table className="w-full text-right border-collapse">
              <thead>
                 <tr className="bg-slate-100 border-y-2 border-slate-900 text-[10px] font-black">
                    <th className="p-3 border-l border-slate-300 text-center">ت</th>
                    <th className="p-3 border-l border-slate-300">اسم اللاعب</th>
                    <th className="p-3 border-l border-slate-300 text-center">الرقم</th>
                    <th className="p-3 border-l border-slate-300 text-center">الحالة</th>
                    <th className="p-3 border-l border-slate-300 text-center">وقت الحضور</th>
                    <th className="p-3">الملاحظات / العذر</th>
                 </tr>
              </thead>
              <tbody>
                 {reportRecords.map((item, idx) => (
                    <tr key={item.player.id} className="border-b border-slate-200 text-xs font-black">
                       <td className="p-3 border-l border-slate-200 text-center">{idx + 1}</td>
                       <td className="p-3 border-l border-slate-200">{item.player.name}</td>
                       <td className="p-3 border-l border-slate-200 text-center">{item.player.number || '--'}</td>
                       <td className="p-3 border-l border-slate-200 text-center">
                          <span className={item.record?.status === 'حاضر' ? 'text-emerald-600' : 'text-red-600'}>
                             {item.record?.status || 'لم يرصد'}
                          </span>
                       </td>
                       <td className="p-3 border-l border-slate-200 text-center">{item.record?.time || '--'}</td>
                       <td className="p-3 text-[10px] italic text-slate-500">{item.record?.excuse || '--'}</td>
                    </tr>
                 ))}
              </tbody>
           </table>

           <div className="mt-10 grid grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 border border-slate-200 text-center">
                 <p className="text-[8px] font-black text-slate-400">إجمالي اللاعبين</p>
                 <p className="text-lg font-black">{players.length}</p>
              </div>
              <div className="bg-emerald-50 p-4 border border-emerald-200 text-center">
                 <p className="text-[8px] font-black text-emerald-600">حضور</p>
                 <p className="text-lg font-black">{savedRecords.filter(r => r.status === 'حاضر').length}</p>
              </div>
              <div className="bg-orange-50 p-4 border border-orange-200 text-center">
                 <p className="text-[8px] font-black text-orange-600">تأخير</p>
                 <p className="text-lg font-black">{savedRecords.filter(r => r.status === 'متأخر').length}</p>
              </div>
              <div className="bg-red-50 p-4 border border-red-200 text-center">
                 <p className="text-[8px] font-black text-red-600">غياب</p>
                 <p className="text-lg font-black">{savedRecords.filter(r => r.status === 'غائب' || r.status === 'غياب بعذر').length}</p>
              </div>
           </div>

           <div className="mt-20 flex justify-around items-start opacity-0 print:opacity-100">
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">توقيع مدرب الفئة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">خاتم مكتب كرة القدم</p>
                 <div className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-full mx-auto"></div>
              </div>
              <div className="text-center space-y-12">
                 <p className="font-black text-sm">مدير مكتب كرة القدم</p>
                 <p className="font-black text-xs text-blue-900">عزت عامر الشيخة</p>
                 <p className="text-[10px]">..........................</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-900 flex flex-col md:flex-row gap-6 items-end no-print relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-[#001F3F]"></div>
        <div className="flex-1 space-y-2 w-full">
           <label className="text-[10px] font-black text-slate-900 mr-2 uppercase tracking-widest flex items-center gap-2">
             <ClipboardCheck size={14} className="text-blue-900"/> اختيار جلسة التمرين المستهدفة
           </label>
           <select value={selectedSessionId} onChange={e => { setSelectedSessionId(e.target.value); setLocalRecords({}); }}
            className="w-full bg-slate-100 border-2 border-slate-900 rounded-xl p-4 font-black text-xl text-slate-900 outline-none focus:border-orange-600 transition-all">
             <option value="">-- اختر التمرين من القائمة --</option>
             {sessions.map(s => <option key={s.id} value={s.id}>{s.date} | {s.objective} ({s.category})</option>)}
           </select>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowPrintView(true)}
            disabled={!selectedSessionId}
            className="bg-white text-slate-900 border-2 border-slate-900 px-8 py-5 rounded-2xl font-black text-lg shadow-sm hover:bg-slate-50 disabled:opacity-30 transition-all flex items-center gap-2"
          >
            <Printer size={24} /> طباعة الكشف
          </button>
          {!isViewer && (
            <button 
              onClick={saveAttendance} 
              disabled={!selectedSessionId || isLockedByTime}
              className="bg-[#001F3F] text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-black disabled:opacity-30 transition-all flex items-center gap-2 border-b-4 border-black"
            >
              <Save size={24} /> تثبيت الرصد النهائي
            </button>
          )}
        </div>
      </div>

      {isLockedByTime && (
        <div className="bg-red-50 p-6 rounded-[2.5rem] border-4 border-red-900 flex items-center gap-4 shadow-lg animate-in slide-in-from-top duration-500">
           <div className="p-4 bg-red-900 text-white rounded-2xl"><Lock size={32}/></div>
           <div>
              <h3 className="text-xl font-black text-red-900">نظام الرقابة المركزي: السجل مقفل</h3>
              <p className="text-xs font-black text-red-700 mt-1 uppercase">مضى أكثر من 30 دقيقة على موعد الحصة التدريبية. لا يمكن تعديل أو إضافة رصد جديد حفاظاً على النزاهة.</p>
           </div>
        </div>
      )}

      {activeSession && (
        <div className={`bg-white rounded-[2.5rem] shadow-sm border-2 border-slate-900 overflow-hidden relative transition-all ${isLockedByTime ? 'opacity-70 pointer-events-none grayscale-[0.5]' : ''}`}>
          <div className="p-6 border-b-2 border-slate-900 bg-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-white border-2 border-slate-900 rounded-xl flex items-center justify-center font-black text-2xl text-[#001F3F] shadow-md uppercase">K</div>
               <div>
                 <h3 className="text-xl font-black text-slate-900 uppercase">{activeSession.objective}</h3>
                 <p className="text-[10px] font-black text-[#001F3F] uppercase tracking-widest">{activeSession.category} • {activeSession.date} • {activeSession.time}</p>
               </div>
             </div>
             {!isLockedByTime && !isViewer && (
               <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-200">
                  <ShieldCheck size={18}/>
                  <span className="text-[10px] font-black uppercase tracking-tighter">رصد متاح حالياً</span>
               </div>
             )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[900px]">
              <thead className="bg-slate-200 border-b-2 border-slate-900">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">بيانات اللاعب</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">الحالة الانضباطية</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">التوقيت</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">العذر الإداري / ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200">
                {players.map(p => {
                  const saved = savedRecords.find(r => r.personId === p.id);
                  const local = localRecords[p.id];
                  const currentStatus = local?.status || saved?.status;
                  const currentTime = local?.time || saved?.time;
                  const currentExcuse = local?.excuse !== undefined ? local.excuse : (saved?.excuse || '');
                  
                  // تعطيل الزر إذا كان إداري فئة والسجل موجود مسبقاً
                  const isDisabledForAdmin = isCatAdmin && saved && saved.status;

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-all">
                      <td className="px-6 py-5 border-l-2 border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-md border-2 border-slate-900 ${currentStatus ? 'bg-[#001F3F] text-white shadow-lg' : 'bg-white text-slate-900'}`}>
                            {p.number || '??'}
                          </div>
                          <span className="font-black text-[15px] text-slate-900 block">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
                          {['حاضر', 'متأخر', 'غائب', 'غياب بعذر'].map(st => (
                            <button 
                              key={st} 
                              disabled={isDisabledForAdmin || isViewer}
                              onClick={() => handleSetStatus(p.id, st as AttendanceStatus)}
                              className={`px-4 py-2 rounded-lg text-[9px] font-black border-2 transition-all ${currentStatus === st ? 
                                `bg-slate-900 text-white border-slate-900 scale-105 z-10 shadow-lg` 
                                : 'bg-white text-slate-900 border-slate-300 hover:border-slate-900'} disabled:opacity-50 disabled:grayscale`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="font-black text-[10px] text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{currentTime || '--:--'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <input 
                          disabled={isDisabledForAdmin || isViewer}
                          type="text" 
                          placeholder="اكتب العذر أو الملاحظة هنا..." 
                          value={currentExcuse}
                          onChange={e => handleSetExcuse(p.id, e.target.value)}
                          className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2 text-[10px] font-black w-full outline-none focus:border-[#001F3F] text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed" 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {players.length === 0 && (
            <div className="p-20 text-center">
               <AlertCircle className="mx-auto text-slate-200 mb-4" size={48}/>
               <p className="text-slate-400 font-black italic">لا يوجد لاعبين مسجلين في هذه الفئة حالياً</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;
