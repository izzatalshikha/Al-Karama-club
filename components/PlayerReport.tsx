
import React from 'react';
import { 
  ChevronRight, Printer, Target, AlertTriangle, Clock, Calendar, 
  TrendingUp, Users, Shield, MapPin, Activity, Globe, Trophy, 
  CheckCircle, Award, GraduationCap, Home, StickyNote, CreditCard 
} from 'lucide-react';
import { AppState, Person, Match, AttendanceRecord } from '../types';
import ClubLogo from './ClubLogo';

interface PlayerReportProps {
  state: AppState;
  player: Person | null;
  onBack: () => void;
}

const PlayerReport: React.FC<PlayerReportProps> = ({ state, player, onBack }) => {
  if (!player) return null;

  const isStaff = player.role !== 'لاعب';

  // حساب العمر
  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // إحصائيات المباريات وحساب الدقائق بدقة (للاعبين فقط)
  const playerMatchesStats = !isStaff ? state.matches.filter(m => m.isCompleted).map(match => {
    let minutesPlayed = 0;
    const isStarter = match.lineupDetails?.starters.some(p => p.name === player.name);
    
    const subOut = match.lineupDetails?.substitutionList.find(s => s.playerOut === player.name);
    const subIn = match.lineupDetails?.substitutionList.find(s => s.playerIn === player.name);

    if (isStarter) {
      minutesPlayed = subOut ? parseInt(subOut.time) || 0 : 90;
    } else if (subIn) {
      minutesPlayed = 90 - (parseInt(subIn.time) || 0);
    }

    const goals = match.goalList.filter(g => g.player === player.name).length;
    const cards = match.cardList.filter(c => c.player === player.name);
    const yellowCards = cards.filter(c => c.type === 'صفراء').length;
    const redCards = cards.filter(c => c.type === 'حمراء').length;

    return {
      match,
      minutes: minutesPlayed,
      goals,
      yellowCards,
      redCards,
      played: minutesPlayed > 0
    };
  }).filter(s => s.played) : [];

  const totalMinutes = playerMatchesStats.reduce((sum, s) => sum + s.minutes, 0);
  const totalGoals = playerMatchesStats.reduce((sum, s) => sum + s.goals, 0);
  const totalYellows = playerMatchesStats.reduce((sum, s) => sum + s.yellowCards, 0);
  const totalReds = playerMatchesStats.reduce((sum, s) => sum + s.redCards, 0);

  // إحصائيات التمارين
  const playerAttendance = state.attendance.filter(a => a.personId === player.id);
  const categorySessionsCount = state.sessions.filter(s => s.category === player.category).length;
  const presentCount = playerAttendance.filter(a => a.status === 'حاضر').length;
  const lateCount = playerAttendance.filter(a => a.status === 'متأخر').length;
  const attendanceRate = categorySessionsCount ? Math.round(((presentCount + lateCount * 0.5) / categorySessionsCount) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center no-print">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-blue-900 font-black transition-all">
          <ChevronRight size={20} /> العودة للقائمة
        </button>
        <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-black shadow-lg">
          <Printer size={18} /> طباعة التقرير الشامل
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-l from-blue-900 to-blue-800 h-40 relative">
          <div className="absolute -bottom-16 right-12 flex items-end gap-6">
            <div className="w-40 h-40 bg-white rounded-[3rem] shadow-2xl border-8 border-white flex items-center justify-center overflow-hidden">
               <div className="text-6xl font-black text-blue-900 uppercase">{player.name.charAt(0)}</div>
            </div>
            <div className="mb-4 space-y-1">
              <h1 className="text-4xl font-black text-white drop-shadow-md">{player.name}</h1>
              <div className="flex gap-2">
                <span className="bg-orange-500 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase shadow-lg shadow-orange-500/20">{player.role} - فئة {player.category}</span>
                {player.number && <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-4 py-1 rounded-full">الرقم: {player.number}</span>}
              </div>
            </div>
          </div>
        </div>
        <div className="h-20"></div>
        
        {/* بيانات القيد والعائلة */}
        <div className="px-12 pb-10 grid grid-cols-1 md:grid-cols-4 gap-8">
           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users size={14}/> اسم الأب والأم</p>
             <p className="text-base font-bold text-slate-800">{player.fatherName || '-'} / {player.motherName || '-'}</p>
           </div>
           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14}/> مكان وسنة الولادة</p>
             <p className="text-base font-bold text-slate-800">{player.birthPlace || '-'} ({calculateAge(player.birthDate)} سنة)</p>
           </div>
           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Home size={14}/> العنوان</p>
             <p className="text-base font-bold text-slate-800">{player.address || 'غير مسجل'}</p>
           </div>
           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><CreditCard size={14}/> الرقم الوطني</p>
             <p className="text-base font-bold text-slate-800 font-mono">{player.nationalId || '-'}</p>
           </div>
        </div>

        {/* مؤهلات المدربين */}
        {(player.role === 'مدرب' || player.role === 'مساعد مدرب') && (
          <div className="px-12 pb-8 pt-6 border-t border-slate-50 bg-blue-50/30 flex flex-col md:flex-row gap-8">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-blue-900 text-white rounded-2xl"><Award size={24}/></div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase">الشهادة التدريبية</p>
                 <p className="text-lg font-black text-blue-900">{player.coachingCertificate || 'لا يوجد'}</p>
               </div>
             </div>
             <div className="flex items-center gap-4">
               <div className="p-3 bg-white border-2 border-blue-900 text-blue-900 rounded-2xl"><GraduationCap size={24}/></div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase">المؤهل العلمي</p>
                 <p className="text-lg font-black text-slate-800">{player.academicDegree || 'لا يوجد'}</p>
               </div>
             </div>
          </div>
        )}
      </div>

      {/* تفاصيل العقد والملاحظات */}
      <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-10">
         <div className="space-y-6">
            <h4 className="text-sm font-black text-blue-900 flex items-center gap-2">
               <Shield size={18}/> تفاصيل العقد الرسمي
            </h4>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">بداية العقد</p>
                  <p className="font-bold text-slate-800">{player.contractStart || '-'}</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">نهاية العقد</p>
                  <p className="font-bold text-slate-800">{player.contractEnd || '-'}</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">مدة العقد</p>
                  <p className="font-bold text-slate-800">{player.contractDuration || '-'}</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">قيمة العقد / الراتب</p>
                  <p className="font-black text-emerald-600">{player.contractValue || '-'}</p>
               </div>
            </div>
         </div>
         <div className="space-y-6">
            <h4 className="text-sm font-black text-orange-600 flex items-center gap-2">
               <StickyNote size={18}/> ملاحظات إدارية وفنية
            </h4>
            <div className="bg-orange-50/50 p-6 rounded-[2rem] border-2 border-dashed border-orange-100 min-h-[140px]">
               <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                  {player.notes || "لا توجد ملاحظات مسجلة لهذا العضو حالياً."}
               </p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto"><Clock size={32}/></div>
          <p className="text-4xl font-black text-slate-900">{!isStaff ? totalMinutes : playerAttendance.length}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase">{!isStaff ? 'دقائق اللعب' : 'عدد التمارين'}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-2">
          <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-3xl flex items-center justify-center mx-auto"><Target size={32}/></div>
          <p className="text-4xl font-black text-slate-900">{!isStaff ? totalGoals : '-'}</p>
          <p className="text-[10px] font-black text-slate-400 uppercase">{!isStaff ? 'الأهداف المسجلة' : 'الرؤية الفنية'}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-2">
          <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-3xl flex items-center justify-center mx-auto"><AlertTriangle size={32}/></div>
          <div className="flex justify-center gap-4">
             <span className="text-2xl font-black text-yellow-600">{totalYellows}Y</span>
             <span className="text-2xl font-black text-red-600">{totalReds}R</span>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase">سجل العقوبات</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto"><TrendingUp size={32}/></div>
          <p className="text-4xl font-black text-slate-900">{attendanceRate}%</p>
          <p className="text-[10px] font-black text-slate-400 uppercase">معدل الانضباط</p>
        </div>
      </div>
    </div>
  );
};

export default PlayerReport;
