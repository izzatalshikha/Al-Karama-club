import React, { useMemo, useState } from 'react';
import { AppState, AppUser, Person, AttendanceRecord, TrainingSession, TechnicalReport } from '../types';
import { Calendar, CheckCircle, ShieldCheck, FileText, Bell, CreditCard, Clock, MapPin, Activity, MessageSquare, CalendarX2, Car, Stethoscope, AlertCircle, Send, X, Info, Phone } from 'lucide-react';

interface ParentPortalProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  user: AppUser;
  syncToCloud?: (table: string, data: any) => Promise<boolean>;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ state, setState, user, syncToCloud }) => {
  const [activeModal, setActiveModal] = useState<'message' | 'absence' | 'pickup' | 'medical' | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Find child based on relatedPersonId or phone number matching
  const child = useMemo(() => {
    if (user.relatedPersonId) {
      return state.people.find(p => p.id === user.relatedPersonId);
    }
    return state.people.find(p => p.phone === user.username);
  }, [state.people, user]);

  const handleActionSubmit = async (e: React.FormEvent, msg: string, actionType: string) => {
     e.preventDefault();
     const form = e.target as HTMLFormElement;
     const formData = new FormData(form);

     if (!child || !syncToCloud) return;

     if (actionType === 'message') {
        const topic = formData.get('topic') as string;
        const details = formData.get('details') as string;
        const newReport: TechnicalReport = {
          id: (window as any).crypto?.randomUUID ? (window as any).crypto.randomUUID() : Math.random().toString(),
          targetId: child.id,
          type: 'parent_message' as any,
          category: child.category,
          author: `ولي أمر (${child.name})`,
          date: new Date().toISOString().split('T')[0],
          rating: 0,
          content: `الموضوع: ${topic}\n\n${details}`
        };
        setState(prev => ({ ...prev, technicalReports: [...prev.technicalReports, newReport] }));
        await syncToCloud('technical_reports', newReport);
     } else if (actionType === 'absence') {
        const date = formData.get('date') as string;
        const reason = formData.get('reason') as string;
        const newReport: TechnicalReport = {
          id: (window as any).crypto?.randomUUID ? (window as any).crypto.randomUUID() : Math.random().toString(),
          targetId: child.id,
          type: 'absence_request' as any,
          category: child.category,
          author: `ولي أمر (${child.name})`,
          date: new Date().toISOString().split('T')[0],
          rating: 0,
          content: `🚨 طلب إجازة / اعتذار غياب\n\nتاريخ الغياب: ${date}\nالسبب: ${reason}`
        };
        setState(prev => ({ ...prev, technicalReports: [...prev.technicalReports, newReport] }));
        await syncToCloud('technical_reports', newReport);
     } else if (actionType === 'pickup') {
        const name = formData.get('name') as string;
        const relation = formData.get('relation') as string;
        const sessionDate = formData.get('sessionDate') as string;
        const newReport: TechnicalReport = {
          id: (window as any).crypto?.randomUUID ? (window as any).crypto.randomUUID() : Math.random().toString(),
          targetId: child.id,
          type: 'pickup_permission' as any,
          category: child.category,
          author: `ولي أمر (${child.name})`,
          date: sessionDate, // Use session date for easy tracking
          rating: 0,
          content: `🚗 تصريح اصطحاب\n\nالشخص المصرح له: ${name} (${relation})\nلجلسة يوم: ${sessionDate}\nتنبيه: الرجاء التأكد من إثبات الهوية الشخصية.`
        };
        setState(prev => ({ ...prev, technicalReports: [...prev.technicalReports, newReport] }));
        await syncToCloud('technical_reports', newReport);
     } else if (actionType === 'medical') {
        const allergies = formData.get('allergies') as string;
        const emergency = formData.get('emergency') as string;
        const updatedChild = { ...child };
        
        let newNotes = updatedChild.notes || '';
        if (allergies) newNotes += `\n[ملاحظات طبية مستحدثة - الأهل]: ${allergies}`;
        if (emergency) newNotes += `\n[طوارئ بديل]: ${emergency}`;
        
        // Also update actual fields if possible, we'll store in notes for sure visibility and medicalHistory
        if (allergies) updatedChild.medicalHistory = allergies;
        
        updatedChild.notes = newNotes;
        setState(prev => ({ ...prev, people: prev.people.map(p => p.id === updatedChild.id ? updatedChild : p) }));
        await syncToCloud('people', updatedChild);
     }

     setActiveModal(null);
     setNotification(msg);
     setTimeout(() => setNotification(null), 4000);
  };

  if (!child) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <h2 className="text-xl text-red-600 font-bold">لم يتم العثور على بيانات اللاعب الخاص بك.</h2>
      </div>
    );
  }

  // Filter attendance, sessions, and reports for this child
  const childAttendance = state.attendance.filter(a => a.personId === child.id);
  const childReports = state.technicalReports.filter(r => r.targetId === child.id);
  
  // Recent sessions
  const recentSessions = state.sessions
    .filter(s => s.category.includes(child.category))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Financial status logic
  const renderFinancialStatus = () => {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0 is Jan, 5 is June, 6 is July
    const currentDate = today.getDate();

    let title = "الاشتراكات والمالية";
    let statusText = "مكتمل";
    let message = "اشتراك شهر حزيران مسدد بالكامل (1000 ل.س).";
    let statusColor = "bg-green-100 text-green-700 border-green-200";
    let iconColor = "text-green-500";

    // Reminder 1: From June 25 to July 1
    if (currentMonth === 5 && currentDate >= 25) {
      statusText = "استحقاق قريب";
      message = "يرجى العلم أن اشتراك شهر تموز القادم (1000 ل.س) يستحق في 01/07. يرجى المبادرة بتسديده.";
      statusColor = "bg-orange-100 text-orange-700 border-orange-200";
      iconColor = "text-orange-500";
    } else if (currentMonth === 6 && currentDate < 25) {
       // Assume July is paid? Or we can show "بانتظار تسديد شهر تموز"
       statusText = "اشتراك حالي";
       message = "إذا لم تقم بتسديد اشتراك تموز (1000 ل.س) يرجى التسديد في أقرب وقت.";
       statusColor = "bg-blue-100 text-blue-700 border-blue-200";
       iconColor = "text-blue-500";
    } else if (currentMonth === 6 && currentDate >= 25) {
       statusText = "استحقاق قريب";
       message = "اشتراك الدفعة الثالثة على الأبواب. يرجى تسديد الدفعة قبل بداية شهر آب.";
       statusColor = "bg-orange-100 text-orange-700 border-orange-200";
       iconColor = "text-orange-500";
    }

    return (
      <div className={`p-5 rounded-2xl border ${statusColor} flex items-start gap-4 shadow-sm`}>
        <div className="bg-white p-3 rounded-xl shadow-sm">
          <CreditCard className={iconColor} size={24} />
        </div>
        <div>
          <h3 className="font-bold flex items-center gap-2">
            {title}
            <span className={`text-[10px] px-2 py-0.5 rounded-full bg-white opacity-80 uppercase tracking-widest`}>
               {statusText}
            </span>
          </h3>
          <p className="text-sm mt-1 opacity-90">{message}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 font-['IBM_Plex_Sans_Arabic']" dir="rtl">
      
      {/* Header Profile Info */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 bg-gradient-to-tr from-blue-100 to-orange-100 rounded-full flex items-center justify-center shadow-inner border-4 border-white">
          <span className="text-blue-900 font-black text-3xl">
            {child.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </span>
        </div>
        <div className="flex-1 text-center md:text-right">
          <h1 className="text-2xl font-black text-blue-900">{child.name}</h1>
          <p className="text-slate-500 mt-1 flex items-center justify-center md:justify-start gap-2">
            <span>{child.category}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>تاريخ الميلاد: {child.birthDate}</span>
          </p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl flex items-center gap-2 font-bold whitespace-nowrap">
          <ShieldCheck size={18} />
          <span>حساب أهالي موثق</span>
        </div>
      </div>

      {renderFinancialStatus()}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => setActiveModal('message')} className="flex items-center gap-3 p-4 rounded-2xl border border-blue-100 bg-white shadow-sm hover:bg-blue-50 transition-colors text-blue-900 justify-center">
           <MessageSquare size={20} className="text-blue-500" />
           <span className="font-bold">تواصل مع الإدارة</span>
        </button>
        <button onClick={() => setActiveModal('absence')} className="flex items-center gap-3 p-4 rounded-2xl border border-orange-100 bg-white shadow-sm hover:bg-orange-50 transition-colors text-orange-900 justify-center">
           <CalendarX2 size={20} className="text-orange-500" />
           <span className="font-bold">طلب اعتذار/إجازة</span>
        </button>
        <button onClick={() => setActiveModal('pickup')} className="flex items-center gap-3 p-4 rounded-2xl border border-purple-100 bg-white shadow-sm hover:bg-purple-50 transition-colors text-purple-900 justify-center">
           <Car size={20} className="text-purple-500" />
           <span className="font-bold">تصريح اصطحاب</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Summary */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-blue-900 flex items-center justify-between mb-4">
            <span className="flex items-center gap-2">
               <CheckCircle className="text-blue-500" size={20} />
               سجل التتبع والحضور
            </span>
            <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold animate-pulse flex items-center gap-1">
               <div className="w-2 h-2 rounded-full bg-blue-500"></div> مباشر
            </span>
          </h3>
          {childAttendance.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100/50">
              <p className="text-slate-400 font-medium">لا توجد سجلات حالية للدوام.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {childAttendance.slice().reverse().slice(0, 5).map(record => {
                const session = state.sessions.find(s => s.id === record.sessionId);
                return (
                  <div key={record.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-md transition-all border border-slate-50">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{session?.date || record.date}</span>
                      <span className="text-xs text-slate-500">{session?.objective || 'جلسة تدريبية'}</span>
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        record.status === 'حاضر' ? 'bg-green-100 text-green-700' :
                        record.status === 'متأخر' ? 'bg-yellow-100 text-yellow-700' :
                        record.status === 'غياب بعذر' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-blue-900 flex items-center gap-2 mb-4">
            <Calendar className="text-orange-500" size={20} />
            الجدول (جلسات التدريب)
          </h3>
          {recentSessions.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100/50">
              <p className="text-slate-400 font-medium">لا يوجد جلسات مجدولة حالياً.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map(session => (
                <div key={session.id} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                   <div className="flex flex-col items-center justify-center bg-white w-14 h-14 rounded-xl shadow-sm border border-slate-100 shrink-0">
                      <span className="text-xs font-bold text-slate-400 uppercase">{new Date(session.date).toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-lg font-black text-blue-900 leading-none">{new Date(session.date).getDate()}</span>
                   </div>
                   <div className="space-y-1">
                      <p className="font-bold text-slate-800 line-clamp-1">{session.objective}</p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                         <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                           <Clock size={10} /> {session.time} ({session.duration || '-'})
                         </span>
                         {session.pitch && (
                            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                              <MapPin size={10} /> {session.pitch}
                            </span>
                         )}
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Medical Profile & Emergency */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100">
          <div className="flex justify-between items-center mb-4 border-b border-red-50 pb-4">
             <h3 className="text-lg font-black text-red-900 flex items-center gap-2">
               <Stethoscope className="text-red-500" size={20} />
               الملف الطبي والطوارئ
             </h3>
             <button onClick={() => setActiveModal('medical')} className="text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-1.5 rounded-full transition-colors flex items-center gap-1">
               تحديث 
             </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100">
                <span className="text-xs font-bold text-red-400 block mb-1">حساسية / معلومات صحية</span>
                <p className="font-medium text-red-900 whitespace-pre-wrap">{child.medicalHistory || 'لا توجد حالة حساسية أو معلومات مسجلة.'}</p>
             </div>
             <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100">
                <span className="text-xs font-bold text-orange-400 block mb-1">بيانات إضافية / طوارئ</span>
                <p className="font-medium text-orange-900 flex items-center gap-2 whitespace-pre-wrap">{(child.notes?.match(/\[طوارئ بديل\]:(.*)/)?.[1]?.trim() || child.notes) || '-'}</p>
             </div>
          </div>
      </div>

      {/* Reports */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-black text-blue-900 flex items-center gap-2 mb-4">
            <Activity className="text-purple-500" size={20} />
            تقارير المدرب والتقييمات
          </h3>
          {childReports.length === 0 ? (
             <div className="text-center p-12 bg-slate-50 rounded-3xl border border-slate-100/50 border-dashed">
                <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-slate-400 font-medium">لا توجد تقارير أو تقييمات من المدرب بعد.</p>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {childReports.map(report => (
                 <div key={report.id} className="p-4 rounded-2xl border border-slate-200 hover:border-purple-300 transition-colors bg-white shadow-sm">
                   <div className="flex justify-between items-start mb-2">
                     <span className="text-xs font-bold text-slate-400">{report.date}</span>
                     <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-bold">بواسطة: {report.author}</span>
                   </div>
                   <p className="text-sm font-medium text-slate-700 leading-relaxed mb-3">{report.content}</p>
                   {report.radarData && (
                      <div className="flex gap-2 flex-wrap text-xs">
                         <span className="bg-slate-100 px-2 py-1 rounded-md">الفني: {report.radarData.technical}/10</span>
                         <span className="bg-slate-100 px-2 py-1 rounded-md">البدني: {report.radarData.physical}/10</span>
                         <span className="bg-slate-100 px-2 py-1 rounded-md">الانضباط: {report.radarData.discipline}/10</span>
                      </div>
                   )}
                 </div>
               ))}
             </div>
          )}
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 font-bold animate-in slide-in-from-bottom-5">
           <CheckCircle size={20} />
           {notification}
        </div>
      )}

      {/* Modals Implementation */}
      {activeModal && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                     {activeModal === 'message' && <><MessageSquare className="text-blue-500" /> رسالة للإدارة</>}
                     {activeModal === 'absence' && <><CalendarX2 className="text-orange-500" /> طلب اعتذار عن غياب</>}
                     {activeModal === 'pickup' && <><Car className="text-purple-500" /> تصريح اصطحاب جديد</>}
                     {activeModal === 'medical' && <><Stethoscope className="text-red-500" /> تحديث الملف الطبي</>}
                  </h3>
                  <button onClick={() => setActiveModal(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer">
                     <X size={20} />
                  </button>
               </div>
               
               {activeModal === 'message' && (
                  <form onSubmit={(e) => handleActionSubmit(e, 'تم إرسال رسالتك للإدارة بنجاح.', 'message')} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">موضوع الاستفسار/الشكوى</label>
                        <select name="topic" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                           <option>استفسار عام</option>
                           <option>ملاحظة عن التدريب</option>
                           <option>شكوى</option>
                           <option>أخرى</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">تفاصيل الرسالة</label>
                        <textarea name="details" required rows={4} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400" placeholder="اكتب رسالتك هنا للإدارة..."></textarea>
                     </div>
                     <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-medium flex gap-2">
                        <Info size={16} className="shrink-0" />سيتم استلام الرسالة من قبل المشرف الإداري للرد عليها في أقرب وقت.
                     </div>
                     <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
                        <Send size={18} /> إرسال الرسالة
                     </button>
                  </form>
               )}

               {activeModal === 'absence' && (
                  <form onSubmit={(e) => handleActionSubmit(e, 'تم إرسال طلب الاعتذار بنجاح وسيتم إبلاغ المدرب.', 'absence')} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">تاريخ الغياب</label>
                        <input name="date" type="date" required className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">سبب الاعتذار</label>
                        <textarea name="reason" required rows={3} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none placeholder:text-slate-400" placeholder="عذر صحي، سفر، التزام عائلي..."></textarea>
                     </div>
                     <button type="submit" className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors">
                        تقديم الطلب
                     </button>
                  </form>
               )}

               {activeModal === 'pickup' && (
                  <form onSubmit={(e) => handleActionSubmit(e, 'تم تسجيل التصريح بنجاح. سنطلب إثبات الشخصية عند الحضور.', 'pickup')} className="p-6 space-y-4">
                     <div className="p-3 bg-purple-50 rounded-xl text-xs text-purple-700 font-medium flex gap-2 mb-2 border border-purple-100">
                        <AlertCircle size={16} className="shrink-0" />
                        لدواعي أمنية، لن يتم تسليم الطفل لأي شخص غير مسجل في التصريح. يرجى تنبيه الشخص بإحضار إثبات هوية.
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">اسم الشخص المصرح له</label>
                        <input name="name" type="text" required className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="الاسم الكامل" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">القرابة</label>
                        <input name="relation" type="text" required className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none" placeholder="عم، خال، جد..." />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">لجلسة يوم</label>
                        <input name="sessionDate" type="date" required className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none" defaultValue={new Date().toISOString().split('T')[0]} />
                     </div>
                     <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors">
                        تأكيد التصريح
                     </button>
                  </form>
               )}

               {activeModal === 'medical' && (
                  <form onSubmit={(e) => handleActionSubmit(e, 'تم تحديث البيانات الطبية للطفل بنجاح.', 'medical')} className="p-6 space-y-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">هل يعاني الطفل من حساسية لأي أطعمة أو أدوية؟</label>
                        <textarea name="allergies" rows={2} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none" placeholder="اكتب هنا إن وجد..."></textarea>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">رقم هاتف للطوارئ البديل (غير رقمك)</label>
                        <input name="emergency" type="tel" className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none" placeholder="09XX XXX XXX" />
                     </div>
                     <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors">
                        حفظ البيانات الطبية
                     </button>
                  </form>
               )}
            </div>
         </div>
      )}

    </div>
  );
};

export default ParentPortal;
