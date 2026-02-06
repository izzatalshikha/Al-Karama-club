
import React, { useState, useMemo } from 'react';
import { FilePieChart, Star, Search, Filter, Plus, User, Trophy, Calendar, CheckCircle, Save, X, Loader2, Sparkles, TrendingUp, Activity, ShieldAlert } from 'lucide-react';
import { AppState, TechnicalReport, Category, Match, Person } from '../types';
import { generateUUID } from '../App';

interface TechnicalReportsProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  addLog?: (m: string, d?: string, t?: any) => void;
}

const TechnicalReports: React.FC<TechnicalReportsProps> = ({ state, setState, addLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeReportType, setActiveReportType] = useState<'match_evaluation' | 'staff_review'>('match_evaluation');
  const [editingReport, setEditingReport] = useState<Partial<TechnicalReport> | null>(null);

  const currentUser = state.currentUser;
  const isManager = currentUser?.role === 'مدير';
  const restrictedCat = currentUser?.restrictedCategory;

  const filteredReports = useMemo(() => {
    return state.technicalReports.filter(r => {
      const matchType = r.type === activeReportType;
      const matchCat = restrictedCat ? r.category === restrictedCat : (state.globalCategoryFilter === 'الكل' || r.category === state.globalCategoryFilter);
      const matchSearch = r.content.includes(searchTerm) || r.author.includes(searchTerm);
      return matchType && matchCat && matchSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [state.technicalReports, activeReportType, state.globalCategoryFilter, restrictedCat, searchTerm]);

  const matchesForEval = useMemo(() => {
    return state.matches.filter(m => m.isCompleted && (restrictedCat ? m.category === restrictedCat : true));
  }, [state.matches, restrictedCat]);

  const staffForReview = useMemo(() => {
    return state.people.filter(p => p.role !== 'لاعب' && (restrictedCat ? p.category === restrictedCat : true));
  }, [state.people, restrictedCat]);

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport?.targetId || !editingReport?.content) return;

    const newReport: TechnicalReport = {
      id: generateUUID(),
      targetId: editingReport.targetId,
      type: activeReportType,
      category: restrictedCat || editingReport.category || state.categories[0],
      rating: editingReport.rating || 5,
      content: editingReport.content,
      author: currentUser?.username || 'مدير النظام',
      date: new Date().toISOString().split('T')[0],
      radarData: editingReport.radarData
    };

    setState(prev => ({
      ...prev,
      technicalReports: [newReport, ...prev.technicalReports]
    }));

    addLog?.('إضافة تقرير فني', `تم تسجيل تقييم جديد بنجاح`, 'success');
    setIsModalOpen(false);
    setEditingReport(null);
  };

  const renderStars = (rating: number, onRate?: (r: number) => void) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={onRate ? 24 : 16}
          className={`${star <= rating ? 'fill-orange-500 text-orange-500' : 'text-slate-300'} ${onRate ? 'cursor-pointer hover:scale-110' : ''} transition-all`}
          onClick={() => onRate?.(star)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center no-print gap-4">
        <div className="flex items-center gap-4">
           <div className="bg-[#001F3F] p-3 rounded-2xl text-white">
             <FilePieChart size={28} />
           </div>
           <div>
             <h2 className="text-xl font-black text-slate-900">المكتب الفني والتقييمات</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">تقارير المباريات ومراجعات أداء الكوادر واللاعبين</p>
           </div>
        </div>
        
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
           <button 
            onClick={() => setActiveReportType('match_evaluation')} 
            className={`px-6 py-2 rounded-xl font-black text-[10px] transition-all ${activeReportType === 'match_evaluation' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-500'}`}
           >
             تقييمات المباريات
           </button>
           <button 
            onClick={() => setActiveReportType('staff_review')} 
            className={`px-6 py-2 rounded-xl font-black text-[10px] transition-all ${activeReportType === 'staff_review' ? 'bg-[#001F3F] text-white shadow-md' : 'text-slate-500'}`}
           >
             مراجعات الكوادر
           </button>
        </div>

        <button 
          onClick={() => { setEditingReport({ type: activeReportType, rating: 5, category: restrictedCat || state.categories[0] }); setIsModalOpen(true); }}
          className="bg-orange-600 text-white px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 shadow-lg border-b-4 border-black hover:bg-black transition-all"
        >
          <Plus size={20} /> إضافة تقرير جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map(report => {
          const target = activeReportType === 'match_evaluation' 
            ? state.matches.find(m => m.id === report.targetId)
            : state.people.find(p => p.id === report.targetId);

          return (
            <div key={report.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-900 shadow-sm relative overflow-hidden group border-b-[12px] hover:border-orange-600 transition-all">
               <div className="flex justify-between items-start mb-4">
                  <span className="bg-slate-100 text-slate-900 text-[8px] font-black px-2 py-1 rounded uppercase tracking-tighter">{report.date}</span>
                  {renderStars(report.rating)}
               </div>

               <h4 className="text-lg font-black text-[#001F3F] mb-2">
                 {activeReportType === 'match_evaluation' ? `مباراة ضد ${target?.opponent || 'خصم غير معروف'}` : target?.name}
               </h4>
               
               <p className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-3 mb-6">
                 {report.content}
               </p>

               <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center font-black text-[10px] uppercase">
                       {report.author.charAt(0)}
                     </div>
                     <span className="text-[10px] font-black text-slate-400">كتبه: {report.author}</span>
                  </div>
                  <span className="text-[10px] font-black text-orange-600">{report.category}</span>
               </div>
            </div>
          );
        })}

        {filteredReports.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
             <Activity className="mx-auto text-slate-200 mb-4" size={48} />
             <p className="text-slate-400 font-black italic">لا توجد تقارير مسجلة لهذا التصنيف حالياً.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex items-center justify-center z-[500] p-4 text-right" dir="rtl">
           <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl border-[6px] border-slate-900 overflow-hidden">
              <div className="p-6 bg-slate-100 border-b-2 border-slate-900 flex justify-between items-center">
                 <h3 className="font-black text-slate-900 uppercase">
                   {activeReportType === 'match_evaluation' ? 'تقييم مواجهة رسمية' : 'مراجعة أداء كادر'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="bg-white p-2 rounded-lg border-2 border-slate-900"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleSaveReport} className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-900 mr-1 uppercase">الهدف من التقرير</label>
                       <select 
                        required 
                        className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl py-3 px-4 font-black text-sm"
                        value={editingReport?.targetId || ''}
                        onChange={e => setEditingReport({...editingReport, targetId: e.target.value})}
                       >
                          <option value="">-- اختر من القائمة --</option>
                          {activeReportType === 'match_evaluation' 
                            ? matchesForEval.map(m => <option key={m.id} value={m.id}>{m.date} - ضد {m.opponent}</option>)
                            : staffForReview.map(p => <option key={p.id} value={p.id}>{p.name} ({p.role})</option>)
                          }
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-900 mr-1 uppercase text-center block">التقييم العام</label>
                       <div className="flex justify-center h-[52px] items-center bg-slate-50 border-2 border-slate-900 rounded-xl">
                          {renderStars(editingReport?.rating || 0, r => setEditingReport({...editingReport, rating: r}))}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-900 mr-1 uppercase">المحتوى التحليلي للتقرير</label>
                    <textarea 
                      required
                      className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl py-4 px-4 font-black text-xs h-40 resize-none"
                      placeholder="اكتب تحليل الأداء بدقة، نقاط القوة والضعف..."
                      value={editingReport?.content || ''}
                      onChange={e => setEditingReport({...editingReport, content: e.target.value})}
                    ></textarea>
                 </div>

                 <button type="submit" className="w-full bg-[#001F3F] text-white py-5 rounded-2xl font-black shadow-xl hover:bg-black transition-all uppercase border-b-4 border-black">
                    اعتماد ونشر التقرير الفني
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalReports;
