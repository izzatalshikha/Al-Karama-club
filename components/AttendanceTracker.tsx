
import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, Save, History, Lock, Clock, Calendar as CalendarIcon, 
  Printer, ChevronRight, FileText, Users, Edit3, Shield as ShieldIcon,
  Check, UserX, PieChart, LayoutList, AlertCircle
} from 'lucide-react';
import { AppState, AttendanceStatus, AttendanceRecord, TrainingSession, Person } from '../types';
import { generateUUID, supabase } from '../App';

interface AttendanceTrackerProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const statusConfig: Record<AttendanceStatus, { color: string, bgColor: string, icon: any, label: string }> = {
  'حاضر': { color: 'text-emerald-600', bgColor: 'bg-emerald-500', icon: Check, label: 'حاضر' },
  'متأخر': { color: 'text-amber-600', bgColor: 'bg-amber-500', icon: Clock, label: 'متأخر' },
  'غائب': { color: 'text-red-600', bgColor: 'bg-red-500', icon: UserX, label: 'غائب' },
  'غياب بعذر': { color: 'text-blue-600', bgColor: 'bg-blue-500', icon: FileText, label: 'بعذر' }
};

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

  // إحصائيات الجلسة الحالية
  const sessionStats = useMemo(() => {
    const stats = { 'حاضر': 0, 'متأخر': 0, 'غائب': 0, 'غياب بعذر': 0, 'لم يرصد': 0 };
    categoryMembers.forEach(p => {
      const status = localRecords[p.id]?.status || savedRecords.find(r => r.personId === p.id)?.status;
      if (status) stats[status]++;
      else stats['لم يرصد']++;
    });
    return stats;
  }, [categoryMembers, localRecords, savedRecords]);

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
      <div className="bg-white p-6 md:p-10 rounded-[3rem] border-4 border-slate-900 shadow-[10px_10px_0px_0px_rgba(0,31,63,1)] flex flex-col gap-6 no-print">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1 space-y-2 w-full">
            <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-orange-600 rounded-full"></div> رصد حضور الحصة الفوري
            </label>
            <select value={selectedSessionId} onChange={e => { setSelectedSessionId(e.target.value); setLocalRecords({}); }}
              className="w-full bg-slate-50 border-4 border-slate-900 rounded-2xl p-4 md:p-6 font-black text-sm md:text-2xl text-slate-900 outline-none focus:border-orange-600 transition-all">
              <option value="">-- اختر التمرين من القائمة --</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.date} | {s.objective} ({s.category})</option>)}
            </select>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto self-end">
            {!isViewer && (
              <button onClick={saveAttendance} disabled={!selectedSessionId || (isLocked && !canEditNow) || isSaving} className="w-full md:w-auto bg-[#001F3F] text-white px-8 py-5 rounded-[2rem] font-black text-sm md:text-lg flex items-center justify-center gap-3 border-b-8 border-black active:translate-y-1 active:border-b-0 transition-all shadow-xl disabled:opacity-30">
                {isSaving ? <History className="animate-spin" size={20}/> : <Save size={20} />}
                اعتماد الرصد النهائي
              </button>
            )}
          </div>
        </div>

        {activeSession && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t-2 border-slate-100 pt-6">
            {(Object.entries(statusConfig) as [AttendanceStatus, any][]).map(([status, config]) => (
              <div key={status} className={`${config.bgColor.replace('bg-', 'bg-')}/10 border-2 ${config.color.replace('text-', 'border-')}/20 p-4 rounded-2xl flex flex-col items-center justify-center text-center`}>
                <config.icon className={config.color} size={20} />
                <p className={`text-[9px] font-black uppercase mt-1 ${config.color}`}>{status}</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">{sessionStats[status]}</p>
              </div>
            ))}
            <div className="bg-slate-100 border-2 border-slate-200 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <AlertCircle className="text-slate-400" size={20} />
              <p className="text-[9px] font-black text-slate-400 uppercase mt-1">لم يرصد</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{sessionStats['لم يرصد']}</p>
            </div>
          </div>
        )}
      </div>

      {activeSession && (
        <div className={`bg-white rounded-[3.5rem] border-4 border-slate-900 shadow-[15px_15px_0px_0px_rgba(0,31,63,1)] overflow-hidden relative ${isLocked && !canEditNow ? 'opacity-70 grayscale-[0.5]' : ''}`}>
          <div className="p-6 md:p-10 border-b-4 border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-6 w-full md:w-auto">
               <div className="w-16 h-16 md:w-20 md:h-20 bg-[#001F3F] border-4 border-orange-600 rounded-[2rem] flex items-center justify-center font-black text-2xl md:text-4xl text-white uppercase shadow-xl">
                  {activeSession.category.charAt(0)}
               </div>
               <div>
                 <h3 className="text-xl md:text-3xl font-black text-slate-900 leading-tight drop-shadow-sm">{activeSession.objective}</h3>
                 <p className="text-[10px] md:text-xs font-black text-orange-600 uppercase tracking-[0.2em] mt-1">{activeSession.category} • {activeSession.date}</p>
               </div>
             </div>
             <div className="flex gap-3 items-center">
                {isLocked && <span className="bg-red-600 text-white px-6 py-2 rounded-full text-[10px] font-black flex items-center gap-2 uppercase shadow-lg"><Lock size={14}/> سجل مقفل إدارياً</span>}
                {isManager && selectedSessionId && (
                  <button onClick={() => setAdminEditOverride(!adminEditOverride)} className={`px-6 py-2 rounded-full font-black text-[10px] border-2 transition-all shadow-md ${adminEditOverride ? 'bg-orange-600 text-white border-orange-900' : 'bg-white text-slate-900 border-slate-900 hover:bg-slate-100'}`}>
                    {adminEditOverride ? 'إيقاف التعديل الاستثنائي' : 'تعديل السجل المقفل'}
                  </button>
                )}
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[900px]">
              <thead className="bg-[#001F3F] text-white border-b-4 border-slate-950">
                <tr>
                  <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest">اللاعب والمركز</th>
                  <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-center">حالة الحضور</th>
                  <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest text-center">وقت التسجيل</th>
                  <th className="px-8 py-5 text-[11px] font-black uppercase tracking-widest">ملاحظات العذر</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-100">
                {categoryMembers.map(p => {
                  const saved = savedRecords.find(r => r.personId === p.id);
                  const local = localRecords[p.id];
                  const currentStatus = local?.status || saved?.status || null;
                  const currentTime = local?.time || saved?.time || "--:--";
                  const config = currentStatus ? statusConfig[currentStatus] : null;

                  return (
                    <tr key={p.id} className={`transition-all hover:bg-slate-50/80 ${currentStatus === 'غائب' ? 'bg-red-50/30' : currentStatus === 'حاضر' ? 'bg-emerald-50/10' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 transition-all shadow-sm ${config ? `${config.bgColor} text-white border-black/10` : 'bg-white text-slate-300 border-slate-200'}`}>
                            {p.number || '0'}
                          </div>
                          <div className="flex flex-col">
                             <div className="flex items-center gap-2">
                                <span className="font-black text-lg text-slate-900 drop-shadow-sm">{p.name}</span>
                                {config && <config.icon className={`${config.color} shrink-0`} size={16} />}
                             </div>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.role} {p.position ? `| ${p.position}` : ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex justify-center gap-2">
                          {(Object.entries(statusConfig) as [AttendanceStatus, any][]).map(([status, cfg]) => (
                            <button 
                              key={status}
                              onClick={() => handleSetStatus(p.id, status)} 
                              className={`px-5 py-2.5 rounded-xl text-[10px] font-black border-2 transition-all active:scale-95 flex items-center gap-2 ${currentStatus === status ? `${cfg.bgColor} text-white border-black/10 shadow-lg scale-105` : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                            >
                              <cfg.icon size={14} />
                              {cfg.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                         <span className={`text-[11px] font-black px-4 py-2 rounded-xl border-2 tabular-nums ${currentStatus ? 'bg-slate-900 text-white border-black shadow-md' : 'bg-slate-100 text-slate-300 border-slate-200'}`}>
                            {currentTime}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="relative group/input">
                           <Edit3 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/input:text-orange-600 transition-colors" size={16} />
                           <input type="text" value={local?.excuse || saved?.excuse || ""} onChange={e => setLocalRecords(prev => ({ ...prev, [p.id]: { ...prev[p.id], excuse: e.target.value } }))}
                            className="bg-slate-50 border-2 border-slate-200 rounded-xl pr-12 pl-4 py-3 text-xs font-black w-full outline-none focus:border-orange-600 focus:bg-white transition-all shadow-inner" 
                            placeholder="سجل عذراً أو ملاحظة..."
                           />
                        </div>
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
