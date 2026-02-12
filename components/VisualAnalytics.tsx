
import React, { useMemo } from 'react';
import { AppState } from '../types';
import { BarChart3, TrendingUp, Trophy, Calendar, Users, Activity, PieChart } from 'lucide-react';

interface VisualAnalyticsProps {
  state: AppState;
}

const VisualAnalytics: React.FC<VisualAnalyticsProps> = ({ state }) => {
  const analytics = useMemo(() => {
    const matches = state.matches.filter(m => m.isCompleted);
    const wins = matches.filter(m => parseInt(m.ourScore) > parseInt(m.opponentScore)).length;
    const losses = matches.filter(m => parseInt(m.ourScore) < parseInt(m.opponentScore)).length;
    const draws = matches.filter(m => parseInt(m.ourScore) === parseInt(m.opponentScore)).length;
    
    // حساب معدل الحضور الأسبوعي
    const categoryAttendance = state.categories.map(cat => {
      const catPeople = state.people.filter(p => p.category === cat && p.role === 'لاعب').length;
      const catAttendance = state.attendance.filter(a => state.people.find(p => p.id === a.personId)?.category === cat);
      const rate = catPeople > 0 ? Math.round((catAttendance.filter(a => a.status === 'حاضر').length / (catAttendance.length || 1)) * 100) : 0;
      return { cat, rate };
    });

    return { wins, losses, draws, categoryAttendance, totalMatches: matches.length };
  }, [state]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* شبكة الإحصائيات العلوية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
         {[
           { label: 'إجمالي المباريات', value: analytics.totalMatches, color: 'text-blue-500', bg: 'bg-blue-500/10' },
           { label: 'الانتصارات', value: analytics.wins, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
           { label: 'التعادلات', value: analytics.draws, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
           { label: 'الخسائر', value: analytics.losses, color: 'text-red-500', bg: 'bg-red-500/10' }
         ].map((stat, i) => (stat.value > 0 || i === 0) && (
           <div key={stat.label} className={`${stat.bg} p-8 rounded-[2.5rem] border-2 border-white/5 flex flex-col items-center shadow-xl`}>
              <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-2">{stat.label}</p>
              <h3 className={`text-6xl font-black ${stat.color}`}>{stat.value}</h3>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {/* الرسم البياني للنتائج (SVG Custom) */}
         <div className="bg-[#001F3F] p-10 rounded-[3rem] border-2 border-white/10 shadow-2xl">
            <h3 className="text-xl font-black mb-10 flex items-center gap-3 border-r-4 border-orange-500 pr-4">
              <Trophy className="text-orange-500" /> تحليل نتائج الموسم
            </h3>
            <div className="flex items-end justify-around h-64 px-10 relative">
               <div className="absolute left-0 right-0 h-0.5 bg-white/10 bottom-0"></div>
               {[
                 { label: 'فوز', val: analytics.wins, color: 'bg-emerald-500' },
                 { label: 'تعادل', val: analytics.draws, color: 'bg-yellow-500' },
                 { label: 'خسارة', val: analytics.losses, color: 'bg-red-500' }
               ].map(bar => {
                 const height = analytics.totalMatches > 0 ? (bar.val / analytics.totalMatches) * 100 : 0;
                 return (
                   <div key={bar.label} className="flex flex-col items-center gap-4 w-16 group">
                      <div className="w-full relative">
                         <div 
                          className={`${bar.color} rounded-t-xl transition-all duration-1000 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]`} 
                          style={{ height: `${height}%`, minHeight: bar.val > 0 ? '10px' : '0' }}
                         >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 font-black text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              {bar.val}
                            </div>
                         </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tighter">{bar.label}</span>
                   </div>
                 );
               })}
            </div>
         </div>

         {/* الرسم البياني للالتزام */}
         <div className="bg-[#001F3F] p-10 rounded-[3rem] border-2 border-white/10 shadow-2xl">
            <h3 className="text-xl font-black mb-10 flex items-center gap-3 border-r-4 border-blue-500 pr-4">
              <Activity className="text-blue-500" /> معدلات الالتزام بالفئات
            </h3>
            <div className="space-y-6">
               {analytics.categoryAttendance.map(cat => (
                 <div key={cat.cat} className="space-y-2">
                    <div className="flex justify-between items-center px-2">
                       <span className="text-xs font-black">{cat.cat}</span>
                       <span className="text-xs font-black text-orange-500 tabular-nums">%{cat.rate}</span>
                    </div>
                    <div className="h-4 bg-black/40 rounded-full p-1 border border-white/5">
                       <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(37,99,235,0.4)]" 
                        style={{ width: `${cat.rate}%` }}
                       />
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>

      {/* الرؤية الاستراتيجية */}
      <div className="bg-white/5 p-12 rounded-[4rem] border-2 border-dashed border-white/10 flex flex-col md:flex-row items-center gap-10">
         <div className="p-10 bg-[#FF6B00] rounded-[3rem] shadow-2xl animate-pulse">
            <TrendingUp size={60} className="text-white" />
         </div>
         <div className="flex-1 space-y-4">
            <h4 className="text-2xl font-black text-orange-500">الرؤية التحليلية للمدير</h4>
            <p className="text-lg font-bold leading-relaxed opacity-70">
              بناءً على البيانات الحالية، يظهر الفريق استقراراً في {analytics.wins > analytics.losses ? 'النتائج الإيجابية' : 'مرحلة البناء'}. 
              معدل الالتزام المتوسط هو {analytics.categoryAttendance.length > 0 ? Math.round(analytics.categoryAttendance.reduce((a,b)=>a+b.rate, 0)/analytics.categoryAttendance.length) : 0}%.
              يُنصح بالتركيز على رفع معدل اللياقة في الفئات التي يقل التزامها عن 70% لضمان جاهزية الفريق للمنافسات القادمة.
            </p>
         </div>
      </div>
    </div>
  );
};

export default VisualAnalytics;
