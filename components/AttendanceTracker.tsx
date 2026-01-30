
import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Save, History, Lock, Clock, Calendar as CalendarIcon, Printer, ChevronRight, FileText, Users, Edit3, Shield as ShieldIcon } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);
  const [adminEditOverride, setAdminEditOverride] = useState(false);
  
  const currentUser = state.currentUser!;
  const globalFilter = state.globalCategoryFilter;
  const restrictedCat = currentUser.restrictedCategory;
  const isViewer = currentUser.role === 'مشاهد';
  const isManager = currentUser.role === 'مدير';

  const sessions = state.sessions
    .filter(s => {
      if (restrictedCat) return s.category === restrictedCat;
      return (globalFilter === 'الكل' || s.category === globalFilter);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const activeSession = state.sessions.find(s => s.id === selectedSessionId);
  const categoryMembers = state.people
    .filter(p => (activeSession ? p.category === activeSession.category : true))
    .sort((a, b) => (a.role !== 'لاعب' ? -1 : 1));

  const savedRecords = state.attendance.filter(r => r.sessionId === selectedSessionId);
  
  const isLocked = activeSession?.isCompleted;
  const canEditNow = isManager ? (adminEditOverride || !isLocked) : !isLocked;

  const handleSetStatus = (pid: string, status: AttendanceStatus) => {
    if ((isLocked && !canEditNow) || isViewer) return;
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    setLocalRecords(prev => ({ ...prev, [pid]: { ...prev[pid], status, time: timeStr } }));
  };

  const saveAttendance = async () => {
    if (!selectedSessionId || isSaving) return;
    setIsSaving(true);
    try {
      const newRecords: AttendanceRecord[] = [];
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      categoryMembers.forEach(p => {
        const local = localRecords[p.id];
        const saved = savedRecords.find(r => r.personId === p.id);
        const statusToSave = local?.status || saved?.status || null;
        if (statusToSave) {
          newRecords.push({
            id: saved?.id || generateUUID(), 
            personId: p.id, 
            sessionId: selectedSessionId, 
            date: activeSession!.date,
            time: local?.time || saved?.time || timeStr, 
            status: statusToSave as AttendanceStatus, 
            excuse: local?.excuse || saved?.excuse || "", 
            isLocked: true
          });
        }
      });
      
      const { error: attError } = await supabase.from('attendance').upsert(newRecords.map(r => ({ 
        id: r.id, personId: r.personId, sessionId: r.sessionId, date: r.date, time: r.time, status: r.status, excuse: r.excuse 
      })));
      
      if (attError) throw attError;

      await supabase.from('sessions').update({ isCompleted: true }).eq('id', selectedSessionId);
      
      setState(prev => ({
        ...prev,
        attendance: [...prev.attendance.filter(a => a.sessionId !== selectedSessionId), ...newRecords],
        sessions: prev.sessions.map(s => s.id === selectedSessionId ? { ...s, isCompleted: true } : s)
      }));
      
      setLocalRecords({});
      addLog?.('تثبيت الحضور', `اعتماد كشف حضور: ${activeSession?.category}`, 'success');
      alert('تم الاعتماد النهائي بنجاح.');
    } catch (err: any) { 
      alert('خطأ: ' + err.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500 px-2 md:px-0 pb-20">
      <div className="solid-panel p-4 md:p-10 relative overflow-hidden flex flex-col gap-4 md:gap-8 no-print !border-[#FF6B00] !shadow-none">
        <div className="flex-1 space-y-2">
           <label className="text-[10px] font-black text-[#001F3F] mr-2 uppercase tracking-widest flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full"></div> رصد حضور الحصة الفوري
           </label>
           <select value={selectedSessionId} onChange={e => { setSelectedSessionId(e.target.value); setLocalRecords({}); }}
            className="w-full bg-slate-50 border-2 md:border-4 border-[#001F3F] rounded-2xl p-4 md:p-6 font-black text-sm md:text-2xl text-[#001F3F] outline-none">
             <option value="">-- اختر التمرين من القائمة --</option>
             {sessions.map(s => <option key={s.id} value={s.id}>{s.date} | {s.objective} ({s.category})</option>)}
           </select>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full">
          {!isViewer && (
            <button onClick={saveAttendance} disabled={!selectedSessionId || (isLocked && !canEditNow) || isSaving} className="w-full md:w-auto bg-[#001F3F] text-white px-8 py-5 rounded-xl font-black text-sm md:text-lg flex items-center justify-center gap-3 border-b-8 border-black active:translate-y-1 active:border-b-0 transition-all">
              {isSaving ? <History className="animate-spin" size={20}/> : <Save size={20} />}
              اعتماد الرصد النهائي
            </button>
          )}
          {isManager && selectedSessionId && (
            <button onClick={() => setAdminEditOverride(!adminEditOverride)} className={`w-full md:w-auto px-4 py-3 rounded-xl font-black text-[10px] border-2 transition-all ${adminEditOverride ? 'bg-[#FF6B00] text-white border-black' : 'bg-slate-100 text-[#001F3F] border-[#001F3F]'}`}>
              {adminEditOverride ? 'إيقاف وضع التعديل' : 'تفعيل تعديل السجل المقفل'}
            </button>
          )}
        </div>
      </div>

      {activeSession && (
        <div className={`solid-panel overflow-hidden relative !shadow-none ${isLocked && !canEditNow ? 'opacity-60 grayscale' : ''}`}>
          <div className="p-4 md:p-8 border-b-2 border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-3">
             <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="w-12 h-12 md:w-16 md:h-16 bg-[#001F3F] border-2 border-[#FF6B00] rounded-xl flex items-center justify-center font-black text-xl md:text-3xl text-white uppercase">
                  {activeSession.category.charAt(0)}
               </div>
               <div>
                 <h3 className="text-sm md:text-xl font-black text-[#001F3F] leading-tight">{activeSession.objective}</h3>
                 <p className="text-[8px] md:text-[10px] font-bold text-[#FF6B00] uppercase tracking-widest mt-1">{activeSession.category} • {activeSession.date}</p>
               </div>
             </div>
             {isLocked && <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black flex items-center gap-2 uppercase"><Lock size={12}/> سجل مقفل إدارياً</span>}
          </div>

          <div className="overflow-x-auto -mx-2 md:mx-0">
            <table className="w-full text-right min-w-[750px] md:min-w-[900px]">
              <thead className="bg-[#001F3F] text-white border-b-4 border-slate-900">
                <tr>
                  <th className="px-4 md:px-8 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest">الاسم والصفة</th>
                  <th className="px-4 md:px-8 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center">حالة الحضور</th>
                  <th className="px-4 md:px-8 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center">التوقيت</th>
                  <th className="px-4 md:px-8 py-4 text-[9px] md:text-[10px] font-black uppercase tracking-widest">ملاحظات / عذر</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {categoryMembers.map(p => {
                  const saved = savedRecords.find(r => r.personId === p.id);
                  const local = localRecords[p.id];
                  const currentStatus = local?.status || saved?.status || null;
                  const currentTime = local?.time || saved?.time || "--:--";

                  return (
                    <tr key={p.id} className="transition-all hover:bg-slate-50">
                      <td className="px-4 md:px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-black text-[10px] border-2 transition-all ${currentStatus ? 'bg-[#FF6B00] text-white border-[#001F3F]' : 'bg-slate-100 text-slate-300 border-slate-200'}`}>
                            {p.number || '0'}
                          </div>
                          <div className="flex flex-col">
                             <span className="font-black text-xs md:text-sm text-[#001F3F]">{p.name}</span>
                             <span className="text-[8px] font-black text-[#FF6B00] uppercase">{p.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-4 text-center">
                        <div className="flex justify-center gap-1 md:gap-2">
                          <button onClick={() => handleSetStatus(p.id, 'حاضر')} className={`px-2 md:px-3 py-2 rounded-lg text-[8px] md:text-[9px] font-black border-2 transition-all active:scale-90 ${currentStatus === 'حاضر' ? 'bg-emerald-500 text-white border-emerald-700 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>حاضر</button>
                          <button onClick={() => handleSetStatus(p.id, 'متأخر')} className={`px-2 md:px-3 py-2 rounded-lg text-[8px] md:text-[9px] font-black border-2 transition-all active:scale-90 ${currentStatus === 'متأخر' ? 'bg-yellow-500 text-white border-yellow-700 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>متأخر</button>
                          <button onClick={() => handleSetStatus(p.id, 'غائب')} className={`px-2 md:px-3 py-2 rounded-lg text-[8px] md:text-[9px] font-black border-2 transition-all active:scale-90 ${currentStatus === 'غائب' ? 'bg-red-500 text-white border-red-700 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>غائب</button>
                          <button onClick={() => handleSetStatus(p.id, 'غياب بعذر')} className={`px-2 md:px-3 py-2 rounded-lg text-[8px] md:text-[9px] font-black border-2 transition-all active:scale-90 ${currentStatus === 'غياب بعذر' ? 'bg-blue-600 text-white border-blue-800 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>بعذر</button>
                        </div>
                      </td>
                      <td className="px-4 md:px-8 py-4 text-center">
                         <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded border border-slate-200 text-[#001F3F]">{currentTime}</span>
                      </td>
                      <td className="px-4 md:px-8 py-4">
                        <input type="text" value={local?.excuse || saved?.excuse || ""} onChange={e => setLocalRecords(prev => ({ ...prev, [p.id]: { ...prev[p.id], excuse: e.target.value } }))}
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[10px] font-bold w-full outline-none focus:border-[#FF6B00]" 
                          placeholder="سجل عذراً أو ملاحظة..."
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
