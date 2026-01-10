
import React, { useState } from 'react';
import { ClipboardCheck, Save, ShieldAlert, History, Search, ShieldCheck, Lock, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { AppState, AttendanceStatus, AttendanceRecord } from '../types';

interface AttendanceTrackerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ state, setState, addLog }) => {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [localRecords, setLocalRecords] = useState<Record<string, { status: AttendanceStatus; excuse?: string; fine?: string; time?: string; date?: string }>>({});
  
  const currentUser = state.currentUser!;
  const globalFilter = state.globalCategoryFilter;

  const sessions = state.sessions
    .filter(s => (globalFilter === 'الكل' || s.category === globalFilter))
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeSession = state.sessions.find(s => s.id === selectedSessionId);
  const players = state.people.filter(p => p.role === 'لاعب' && (activeSession ? p.category === activeSession.category : true));
  const savedRecords = state.attendance.filter(r => r.sessionId === selectedSessionId);

  const handleSetStatus = (pid: string, status: AttendanceStatus) => {
    // تسجيل الوقت والتاريخ فوراً عند اختيار الحالة
    const now = new Date();
    // تنسيق الوقت (الساعة:الدقيقة)
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    // تنسيق التاريخ (السنة-الشهر-اليوم)
    const dateStr = now.toISOString().split('T')[0];

    setLocalRecords(prev => ({ 
      ...prev, 
      [pid]: { ...prev[pid], status, time: timeStr, date: dateStr } 
    }));
  };

  const saveAttendance = () => {
    const entries = Object.entries(localRecords);
    if (entries.length === 0) return alert('يرجى رصد حالات اللاعبين أولاً');

    const newRecords: AttendanceRecord[] = entries.map(([pid, data]) => ({
      id: Math.random().toString(36).substr(2, 9),
      personId: pid,
      sessionId: selectedSessionId,
      date: data.date || activeSession!.date,
      time: data.time || (new Date().getHours().toString().padStart(2, '0') + ':' + new Date().getMinutes().toString().padStart(2, '0')),
      status: data.status,
      excuse: data.excuse,
      fine: data.fine,
      isLocked: true
    }));

    setState(p => ({
      ...p,
      attendance: [
        ...p.attendance.filter(a => !(a.sessionId === selectedSessionId && localRecords[a.personId])),
        ...newRecords
      ],
    }));
    
    addLog?.('حفظ الحضور', `تم تثبيت سجل حضور تمرين ${activeSession?.objective}`, 'success');
    setLocalRecords({});
    alert('تم حفظ السجل بنجاح وقفل البيانات');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-slate-900 flex flex-col md:flex-row gap-6 items-end no-print relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-[#001F3F]"></div>
        <div className="flex-1 space-y-2 w-full">
           <label className="text-[10px] font-black text-slate-900 mr-2 uppercase tracking-widest">اختيار جلسة التمرين للرصد</label>
           <select value={selectedSessionId} onChange={e => { setSelectedSessionId(e.target.value); setLocalRecords({}); }}
            className="w-full bg-slate-100 border-2 border-slate-900 rounded-xl p-4 font-black text-xl text-slate-900 outline-none focus:border-orange-600 transition-all">
             <option value="">-- اختر التمرين من القائمة --</option>
             {sessions.map(s => <option key={s.id} value={s.id}>{s.date} | {s.objective} ({s.category})</option>)}
           </select>
        </div>
        <button 
          onClick={saveAttendance} 
          disabled={!selectedSessionId}
          className="bg-[#001F3F] text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-black disabled:opacity-30 transition-all flex items-center gap-2 border-b-4 border-black"
        >
          <Save size={24} /> تثبيت السجل النهائي
        </button>
      </div>

      {activeSession && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-slate-900 overflow-hidden relative">
          <div className="p-6 border-b-2 border-slate-900 bg-slate-100 flex justify-between items-center">
             <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-white border-2 border-slate-900 rounded-xl flex items-center justify-center font-black text-2xl text-[#001F3F] shadow-md">K</div>
               <div>
                 <h3 className="text-xl font-black text-slate-900">{activeSession.objective}</h3>
                 <p className="text-[10px] font-black text-[#001F3F] uppercase tracking-widest">{activeSession.category} • {activeSession.date}</p>
               </div>
             </div>
             <div className="flex gap-3">
               <div className="bg-white border-2 border-slate-900 px-5 py-2 rounded-xl text-center">
                 <p className="text-[8px] font-black uppercase text-slate-400">إجمالي الحضور</p>
                 <p className="text-lg font-black text-emerald-600">
                    {state.attendance.filter(r => r.sessionId === selectedSessionId && (r.status === 'حاضر' || r.status === 'متأخر')).length}
                 </p>
               </div>
               <div className="bg-[#001F3F] text-white px-5 py-2 rounded-xl text-center border-2 border-slate-900">
                 <p className="text-[8px] font-black uppercase text-blue-200">اللاعبين</p>
                 <p className="text-lg font-black">{players.length}</p>
               </div>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[800px]">
              <thead className="bg-slate-200 border-b-2 border-slate-900">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">بيانات اللاعب</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest text-center">رصد الحالة الفوري</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">التوقيت المسجل</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">ملاحظات إضافية</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200">
                {players.map(p => {
                  const saved = savedRecords.find(r => r.personId === p.id);
                  const local = localRecords[p.id];
                  const currentStatus = local?.status || saved?.status;
                  const currentTime = local?.time || saved?.time;
                  
                  // منع إداري الفئة من التعديل بعد الحفظ - التنبيه الصارم
                  const isLockedForUser = saved && currentUser.role === 'إداري فئة';

                  return (
                    <tr key={p.id} className={`transition-all ${isLockedForUser ? 'bg-slate-50 opacity-90' : 'hover:bg-blue-50/30'}`}>
                      <td className="px-6 py-5 border-l-2 border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-md border-2 border-slate-900 ${currentStatus ? 'bg-[#001F3F] text-white shadow-lg' : 'bg-white text-slate-900'}`}>
                            {p.number || '??'}
                          </div>
                          <div>
                            <span className="font-black text-[15px] text-slate-900 block leading-none mb-1">{p.name}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
                               {isLockedForUser ? (
                                 <><Lock size={10} className="text-red-500" /> مغلق (إدارة)</>
                               ) : saved ? (
                                 <><ShieldCheck size={10} className="text-emerald-500" /> مسجل مسبقاً</>
                               ) : (
                                 "لم يتم الرصد"
                               )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
                          {['حاضر', 'متأخر', 'غائب', 'غياب بعذر'].map(st => (
                            <button 
                              key={st} 
                              disabled={isLockedForUser}
                              onClick={() => handleSetStatus(p.id, st as AttendanceStatus)}
                              className={`px-4 py-2 rounded-lg text-[9px] font-black border-2 transition-all ${currentStatus === st ? 
                                `bg-slate-900 text-white border-slate-900 scale-105 z-10 shadow-lg` 
                                : 'bg-white text-slate-900 border-slate-300 hover:border-slate-900 disabled:opacity-50'}`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex flex-col gap-1">
                            <div className="font-black text-[10px] text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 inline-flex items-center gap-2">
                               <Clock size={12} className="text-orange-600"/> {currentTime || '--:--'}
                            </div>
                            { (local?.date || saved?.date) && (
                              <div className="font-black text-[10px] text-slate-500 inline-flex items-center gap-2 px-1">
                                 <CalendarIcon size={10}/> {local?.date || saved?.date}
                              </div>
                            )}
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        <input 
                          type="text" 
                          disabled={isLockedForUser}
                          placeholder="أدخل ملاحظات..." 
                          value={local?.excuse || saved?.excuse || ''}
                          onChange={e => setLocalRecords(prev => ({ ...prev, [p.id]: { ...prev[p.id], excuse: e.target.value } }))}
                          className="bg-white border-2 border-slate-200 rounded-lg px-4 py-2 text-[10px] font-black w-full outline-none focus:border-[#001F3F] text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100" 
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
