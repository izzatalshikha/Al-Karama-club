
import React, { useState, useMemo } from 'react';
import { 
  UserPlus, Trash2, Search, Edit2, MapPin, Calendar, ChevronRight, 
  X, Save, Target, Phone, Ruler, Weight, Home, Fingerprint, 
  BadgeCheck, Edit3, Wallet, HeartPulse, ShieldAlert, 
  GraduationCap, Award, Activity, Loader2, Filter, Gavel, FileText, Hash, Globe, Briefcase, Bot, CreditCard, FileCheck,
  PhoneCall, Footprints, Shirt, Droplet
} from 'lucide-react';
import { AppState, Person, Role } from '../types';
import { generateUUID, supabase } from '../App';
import { safeSavePerson } from '../utils/supabaseSanitizer';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import html2pdf from 'html2pdf.js';
import DocumentUploadCard from './DocumentUploadCard';

interface SquadManagementProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  onOpenReport?: (player: Person) => void;
  addLog?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const SquadManagement: React.FC<SquadManagementProps> = ({ state, setState, onOpenReport, addLog }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [localCategoryFilter, setLocalCategoryFilter] = useState('الكل');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [player1Id, setPlayer1Id] = useState<string>('');
  const [player2Id, setPlayer2Id] = useState<string>('');
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [isFetchingAI, setIsFetchingAI] = useState(false);

  const [visibleCompareCategories, setVisibleCompareCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('eagle_os_compare_categories');
      return saved ? JSON.parse(saved) : ['basic', 'physical', 'medical', 'contract', 'personal'];
    } catch {
      return ['basic', 'physical', 'medical', 'contract', 'personal'];
    }
  });

  const toggleCompareCategory = (cat: string) => {
    const newCats = visibleCompareCategories.includes(cat)
      ? visibleCompareCategories.filter(c => c !== cat)
      : [...visibleCompareCategories, cat];
    setVisibleCompareCategories(newCats);
    localStorage.setItem('eagle_os_compare_categories', JSON.stringify(newCats));
  };


  const currentUser = state.currentUser!;
  const isManager = currentUser.role === 'مدير';
  const isMedic = currentUser.role === 'معالج';
  const isViewer = currentUser.role === 'مشاهد';
  const canAddOrDelete = isManager || (!isViewer && !isMedic);
  const canEdit = !isViewer;
  const restrictedCat = currentUser.restrictedCategory;
  const allowedCategories = restrictedCat ? String(restrictedCat).split(',').filter(Boolean) : null;
  const hasRestriction = allowedCategories !== null && allowedCategories.length > 0;
  const defaultCategory = hasRestriction ? allowedCategories[0] : (state.categories[0] || 'الرجال');

  const initialFormState: Partial<Person> = {
    name: '', fatherName: '', motherName: '', birthDate: '', birthPlace: '', khana: '',
    nationalId: '', federalNumber: '', internationalId: '', address: '',
    category: defaultCategory,
    role: 'لاعب', number: undefined, phone: '', joinDate: new Date().toISOString().split('T')[0],
    height: '', weight: '', position: '', contractStart: '', contractEnd: '', contractValue: '',
    subscriptionAmount: '', subscriptionMonth: '', registrationDate: new Date().toISOString().split('T')[0], receivedKit: false, kitAmount: '', isAcademyPlayer: false,
    medicalHistory: '', injuries: '', penalties: '', notes: '', coachingCertificate: '', academicDegree: '',
    passportNumber: '', passportIssueDate: '', passportExpiryDate: '', idCardImage: '', idCardBackImage: '', passportImage: '',
    season: state.activeSeason || '2025/2026',
    seasons: [state.activeSeason || '2025/2026'],
    bloodType: '', shoeSize: '', clothesSize: '', preferredFoot: 'يمنى', emergencyPhone: ''
  };

  const [formData, setFormData] = useState<Partial<Person>>(initialFormState);

  const filteredMembers = useMemo(() => {
    return state.people.filter(p => {
      const personCategories = p.category ? p.category.split(',') : [];
      if (hasRestriction && !personCategories.some(c => allowedCategories.includes(c))) return false;
      const matchCat = localCategoryFilter === 'الكل' || personCategories.includes(localCategoryFilter);
      const matchSearch = p.name.includes(searchTerm) || (p.number?.toString() === searchTerm);
      const matchSubTab = p.role === 'لاعب'; // Only show players
      return matchCat && matchSearch && matchSubTab;
    });
  }, [state.people, restrictedCat, localCategoryFilter, searchTerm]);

  const allowedPlayersForCompare = useMemo(() => {
    return state.people.filter(p => p.role === 'لاعب' && (!hasRestriction || allowedCategories.includes(p.category)));
  }, [state.people, hasRestriction, allowedCategories]);

  const player1 = useMemo(() => state.people.find(p => p.id === player1Id), [state.people, player1Id]);
  const player2 = useMemo(() => state.people.find(p => p.id === player2Id), [state.people, player2Id]);

  const getAge = (birthDate: string) => {
    if (!birthDate) return '-';
    const diff = new Date().getTime() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' سنة';
  };

  const getAttendanceStat = (personId: string, status: string) => {
    return state.attendance.filter(a => a.personId === personId && a.status === status).length;
  };

  const getInjuryCount = (personId: string) => {
    return state.injuries.filter(i => i.personId === personId).length;
  };

  const getLatestRadar = (personId: string) => {
    const reports = state.technicalReports
      .filter(r => r.targetId === personId && r.type === 'player_radar' && r.radarData)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return reports.length > 0 ? reports[0].radarData : null;
  };

  const progressionData = useMemo(() => {
    if (!player1 || !player2) return [];
    const getProgression = (pid: string) => {
      return state.technicalReports
        .filter(r => r.targetId === pid && r.type === 'player_radar' && r.radarData)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(r => ({ date: r.date, value: r.radarData?.physical || 0 }));
    };

    const p1Prog = getProgression(player1.id);
    const p2Prog = getProgression(player2.id);

    // Merge dates
    const allDates = Array.from(new Set([...p1Prog.map(p => p.date), ...p2Prog.map(p => p.date)])).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    return allDates.map(date => {
      const p1Match = p1Prog.find(p => p.date === date);
      const p2Match = p2Prog.find(p => p.date === date);
      return {
        date,
        [player1.name]: p1Match ? p1Match.value : undefined,
        [player2.name]: p2Match ? p2Match.value : undefined,
      };
    });
  }, [player1, player2, state.technicalReports]);

  const radarData = useMemo(() => {
    if (!player1 || !player2) return [];
    const r1 = getLatestRadar(player1.id) || { technical: 50, physical: 50, tactical: 50, mental: 50, discipline: 50 };
    const r2 = getLatestRadar(player2.id) || { technical: 50, physical: 50, tactical: 50, mental: 50, discipline: 50 };
    
    return [
      { subject: 'المهارة الفنية', player1: r1.technical, player2: r2.technical, fullMark: 100 },
      { subject: 'اللياقة البدنية', player1: r1.physical, player2: r2.physical, fullMark: 100 },
      { subject: 'الوعي التكتيكي', player1: r1.tactical, player2: r2.tactical, fullMark: 100 },
      { subject: 'الصلابة الذهنية', player1: r1.mental, player2: r2.mental, fullMark: 100 },
      { subject: 'الانضباط', player1: r1.discipline, player2: r2.discipline, fullMark: 100 },
    ];
  }, [player1, player2, state.technicalReports]);

  const fetchAIRecommendation = async () => {
    if (!player1 || !player2) return;
    setIsFetchingAI(true);
    setAiRecommendation('');
    try {
      const p1Stats = {
        name: player1.name,
        category: player1.category,
        position: player1.position,
        height: player1.height,
        weight: player1.weight,
        age: getAge(player1.birthDate),
        attendance: getAttendanceStat(player1.id, 'حاضر'),
        absences: getAttendanceStat(player1.id, 'غائب'),
        injuries: getInjuryCount(player1.id),
        radar: getLatestRadar(player1.id)
      };
      const p2Stats = {
        name: player2.name,
        category: player2.category,
        position: player2.position,
        height: player2.height,
        weight: player2.weight,
        age: getAge(player2.birthDate),
        attendance: getAttendanceStat(player2.id, 'حاضر'),
        absences: getAttendanceStat(player2.id, 'غائب'),
        injuries: getInjuryCount(player2.id),
        radar: getLatestRadar(player2.id)
      };

      const res = await fetch('/api/compare-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player1: p1Stats, player2: p2Stats })
      });
      if (!res.ok) throw new Error('فشل في جلب التوصية');
      const data = await res.json();
      setAiRecommendation(data.text);
    } catch (err) {
      console.error(err);
      setAiRecommendation('حدث خطأ أثناء محاولة جلب التوصية من الذكاء الاصطناعي.');
    } finally {
      setIsFetchingAI(false);
    }
  };

  const exportComparisonPDF = () => {
    const element = document.getElementById('comparison-print-area');
    if (!element) return;
    const opt = {
      margin: 1,
      filename: `مقارنة_${player1?.name || 'لاعب1'}_${player2?.name || 'لاعب2'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || isSaving || !canEdit) return;

    setIsSaving(true);
    const rawSeasons: string[] = [
      ...(Array.isArray(formData.seasons) ? formData.seasons : []),
      ...(typeof formData.season === 'string' ? formData.season.split(',') : [])
    ].map(s => String(s || '').trim()).filter(Boolean);
    const finalSeasons = Array.from(new Set(rawSeasons));
    const validSeasons = finalSeasons.length > 0 ? finalSeasons : [state.activeSeason || '2025/2026'];

    const updatedPerson = {
      ...initialFormState,
      ...formData,
      isAcademyPlayer: false, // دائماً لاعب نادي
      seasons: validSeasons,
      season: validSeasons[validSeasons.length - 1] || state.activeSeason || '2025/2026',
      id: editingId || generateUUID(),
      name: formData.name!.trim(),
    } as any;

    try {
      const saveRes = await safeSavePerson(updatedPerson, 'upsert');
      if (!saveRes.success) throw saveRes.error;

      setState(prev => ({
        ...prev,
        people: editingId 
          ? prev.people.map(p => p.id === editingId ? updatedPerson : p)
          : [updatedPerson, ...prev.people]
      }));

      addLog?.(editingId ? 'تم تحديث البيانات بنجاح' : 'تمت إضافة العضو بنجاح', 'success');
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(initialFormState);
    } catch (err: any) {
      alert("خطأ في السحابة: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف سجل ${name} نهائياً؟`) || !canAddOrDelete) return;
    try {
      const { error } = await supabase.from('people').delete().eq('id', id);
      if (error) throw error;
      setState(p => ({ ...p, people: p.people.filter(x => x.id !== id) }));
      addLog?.('تم حذف السجل', 'error');
    } catch (err: any) {
      alert('خطأ في الحذف: ' + err.message);
    }
  };

  const exportToCSV = () => {
    const headers = ['الاسم', 'الفئة', 'الدور', 'الرقم', 'تاريخ الميلاد', 'تاريخ الانضمام', 'الهاتف'];
    const rows = filteredMembers.map(p => [
      p.name, p.category || '', p.role, p.number || '', p.birthDate || '', p.joinDate || '', p.phone || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `squad_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEdit = (p: Person) => {
    if (!canEdit) return;
    const rawSeasons: string[] = [
      ...(Array.isArray(p.seasons) ? p.seasons : []),
      ...(typeof p.season === 'string' ? p.season.split(',') : [])
    ].map(x => String(x || '').trim()).filter(Boolean);
    const pSeasons = Array.from(new Set(rawSeasons));
    const finalSeasons = pSeasons.length > 0 ? pSeasons : ['2025/2026'];

    setEditingId(p.id);
    setFormData({
      ...p,
      isAcademyPlayer: false, // نادي دائماً
      receivedKit: Boolean(p.receivedKit === true || String(p.receivedKit) === 'true'),
      season: finalSeasons[finalSeasons.length - 1],
      seasons: finalSeasons
    });
    setIsModalOpen(true);
  };

  const inputClass = "w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-950 focus:border-orange-500 outline-none transition-all placeholder:text-slate-500 text-sm font-bold shadow-sm";
  const labelClass = "text-[11px] font-black text-slate-600 uppercase mb-1.5 block flex items-center gap-2 tracking-widest";
  const sectionHeader = "text-orange-700 font-black text-[11px] uppercase tracking-[0.2em] border-r-4 border-orange-500 pr-3 mb-6 mt-8 flex items-center gap-2 bg-orange-50 py-2 rounded-l-lg";

  return (
    <div className="space-y-8 relative font-['IBM_Plex_Sans_Arabic']" dir="rtl">
      {/* شريط البحث والفلترة */}
      <div className="modern-card p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center">
         <div className="flex-1 relative w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="text" placeholder="البحث بالاسم أو الرقم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 md:py-4 pr-12 pl-6 text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/10 transition-all font-bold shadow-sm text-sm" />
         </div>

         {!hasRestriction ? (
           <div className="relative w-full md:w-64">
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <select 
                value={localCategoryFilter} 
                onChange={e => setLocalCategoryFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 md:py-4 pr-12 pl-6 text-blue-900 outline-none focus:ring-2 focus:ring-orange-500/10 transition-all font-black text-xs cursor-pointer appearance-none shadow-sm"
              >
                 <option value="الكل">جميع الفئات</option>
                 {state.categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>
         ) : allowedCategories.length > 1 ? (
           <div className="relative w-full md:w-64">
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <select value={localCategoryFilter} onChange={e => setLocalCategoryFilter(e.target.value)} className="w-full bg-orange-50 border border-orange-200 rounded-xl py-3 md:py-4 pr-12 pl-6 text-orange-600 outline-none font-black text-xs cursor-pointer appearance-none shadow-sm">
                 <option value="الكل">كل فئات الصلاحية</option>
                 {allowedCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>
         ) : (
           <div className="bg-orange-50 border border-orange-200 px-6 py-4 rounded-xl text-orange-600 font-black text-[10px] md:text-xs uppercase tracking-widest shadow-sm w-full md:w-auto text-center">
              فئة: {allowedCategories[0]}
           </div>
         )}

         {/* محدد الموسم الرياضي في إدارة الفريق */}
         <div className="relative w-full md:w-56">
            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500" size={16} />
            <select 
              value={state.activeSeason || '2025/2026'} 
              onChange={e => setState(prev => ({ ...prev, activeSeason: e.target.value }))}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 md:py-4 pr-12 pl-6 text-blue-900 outline-none focus:ring-2 focus:ring-orange-500/10 transition-all font-black text-xs cursor-pointer appearance-none shadow-sm"
              title="اختيار الموسم المعروض"
            >
               {['2025/2026', '2026/2027', '2027/2028', '2028/2029', '2029/2030'].map(s => (
                 <option key={s} value={s}>موسم {s}</option>
               ))}
            </select>
         </div>

         <button onClick={() => setIsCompareModalOpen(true)} className="bg-blue-100 text-blue-700 px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center gap-3 hover:bg-blue-200 transition-all whitespace-nowrap w-full md:w-auto justify-center shadow-sm">
           <Activity size={20}/> مقارنة لاعبين
         </button>

         <button onClick={exportToCSV} className="bg-slate-100 text-slate-700 px-6 py-3 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center gap-3 hover:bg-slate-200 transition-all whitespace-nowrap w-full md:w-auto justify-center">
           <FileText size={20}/> تصدير CSV
         </button>



         {canAddOrDelete && (
           <button onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
             className="bg-orange-500 text-white px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black flex items-center gap-3 shadow-lg shadow-orange-500/10 hover:bg-orange-600 transition-all whitespace-nowrap w-full md:w-auto justify-center">
              <UserPlus size={20}/> إضافة جديد
           </button>
         )}
      </div>

      {/* العنوان والموسم النشط */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100 border border-slate-200 rounded-xl w-full sm:w-fit shadow-inner">
          <div className="px-4 md:px-8 py-2.5 rounded-lg font-black text-[10px] md:text-xs bg-white text-blue-950 shadow-md flex items-center gap-2.5">
            <span>اللاعبين ({filteredMembers.length})</span>
            <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-md text-[10px] font-black">
              الموسم النشط: {state.activeSeason || '2025/2026'}
            </span>
          </div>
      </div>

      {/* قائمة البطاقات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-4">
        {filteredMembers.map(person => (
          <div key={person.id} className="modern-card p-4 md:p-5 group hover:border-orange-500 transition-all flex flex-col border-b-4 border-b-orange-500/20">
             <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center font-black text-xl text-blue-900 border border-blue-100 shadow-sm group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-400 transition-all">
                   {person.name.charAt(0)}
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[8px] md:text-[9px] font-black text-orange-700 uppercase tracking-widest">{person.category}</span>
                   <span className="text-[10px] text-slate-600 font-bold">{person.role}</span>
                </div>
             </div>
             <h3 className="text-sm md:text-base font-black text-blue-950 mb-1 group-hover:text-orange-700 transition-colors uppercase tracking-tight truncate">{person.name} {person.number && <span className="text-orange-600 text-xs">#{person.number}</span>}</h3>
             <p className="text-[8px] md:text-[9px] text-slate-600 font-bold mb-2 italic">{person.position || 'بدون مركز محدد'}</p>
             <div className="flex flex-wrap gap-1 mb-3">
                {(person.nationalId || '').trim() !== '' && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">وطني: {person.nationalId}</span>}
                {(person.federalNumber || '').trim() !== '' && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">اتحادي: {person.federalNumber}</span>}
                {(person.internationalId || '').trim() !== '' && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">دولي: {person.internationalId}</span>}
                {(person.passportNumber || '').trim() !== '' && <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">جواز: {person.passportNumber}</span>}
                {Boolean(person.bloodType) && <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[8px] font-black whitespace-nowrap">🩸 {person.bloodType}</span>}
                {Boolean(person.shoeSize) && <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">👟 حذاء: {person.shoeSize}</span>}
                {Boolean(person.clothesSize) && <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">👕 {person.clothesSize}</span>}
                {Boolean(person.preferredFoot) && <span className="bg-slate-50 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">قدم: {person.preferredFoot}</span>}
                {(Boolean(person.height) || Boolean(person.weight)) && (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">
                    📏 {person.height ? `${person.height}سم` : ''}{person.height && person.weight ? ' • ' : ''}{person.weight ? `${person.weight}كغ` : ''}
                  </span>
                )}
                {Boolean(person.phone) && <span className="bg-slate-50 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">📞 {person.phone}</span>}
                {Boolean(person.emergencyPhone) && <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">🚨 طوارئ: {person.emergencyPhone}</span>}
                {Boolean(person.birthDate) && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">🎂 {getAge(person.birthDate)}</span>}
                {Boolean(person.khana) && <span className="bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">قيد: {person.khana}</span>}
                <span className="bg-blue-50 text-blue-800 border border-blue-200 px-1.5 py-0.5 rounded text-[8px] font-black whitespace-nowrap">⚽ لاعب نادي</span>
                {Boolean(person.receivedKit) && <span className="bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap">🎽 استلم لباس</span>}
                {Array.from(new Set([
                  ...(Array.isArray(person.seasons) ? person.seasons : []),
                  ...(typeof person.season === 'string' ? person.season.split(',') : [])
                ].map(s => String(s || '').trim()).filter(Boolean))).map(s => (
                  <span key={s} className={`border px-1.5 py-0.5 rounded text-[8px] font-black whitespace-nowrap ${s === state.activeSeason ? 'bg-orange-500 text-white border-orange-600 shadow-xs' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                    موسم {s}
                  </span>
                ))}
                {(person.idCardImage || person.passportImage) && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-1">
                    <FileCheck size={10} /> الوثائق مرفوعة
                  </span>
                )}
             </div>
             <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center gap-2">
                <button onClick={() => onOpenReport?.(person)} className="text-[10px] font-black text-slate-700 hover:text-orange-600 flex items-center gap-1 transition-colors uppercase tracking-widest whitespace-nowrap">الملف <ChevronRight size={12}/></button>
                <div className="flex gap-1.5">
                   {canEdit && (
                     <>
                       <button onClick={() => openEdit(person)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Edit2 size={12}/></button>
                       {canAddOrDelete && (
                         <button onClick={() => handleDelete(person.id, person.name)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={12}/></button>
                       )}
                     </>
                   )}
                </div>
             </div>
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <div className="col-span-full py-16 md:py-20 text-center border-4 border-dashed border-slate-200 rounded-[2rem] md:rounded-[3rem]">
            <Search size={48} className="mx-auto mb-4 text-slate-200 md:w-16 md:h-16" />
            <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] md:text-sm">لا بيانات لعرضها حالياً</p>
          </div>
        )}
      </div>

      {/* المودال: نموذج الإضافة والتعديل الشامل (26 حقل) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center lg:p-4">
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full h-full lg:h-auto lg:max-w-5xl lg:max-h-[90vh] lg:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-5 md:p-6 border-b border-slate-100 bg-white flex justify-between items-center">
              <h3 className="text-base md:text-xl font-black text-blue-900 flex items-center gap-2 md:gap-3 italic uppercase"><UserPlus className="text-orange-500 w-5 h-5 md:w-6 md:h-6" /> {editingId ? 'تعديل السجل' : 'إضافة سجل جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-slate-100 hover:bg-red-500 text-slate-600 hover:text-white rounded-xl transition-all shadow-sm"><X size={20}/></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-2 custom-scrollbar bg-slate-50 text-right pb-32 lg:pb-10" dir="rtl">
              
              {/* القسم 1: الهوية */}
              <h4 className={sectionHeader}><Fingerprint size={16}/> 1. معلومات الهوية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="space-y-1"><label className={labelClass}>الاسم الثلاثي</label><input required disabled={isMedic} className={inputClass} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>اسم الأب</label><input disabled={isMedic} className={inputClass} value={formData.fatherName || ''} onChange={e => setFormData({...formData, fatherName: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>اسم الأم</label><input disabled={isMedic} className={inputClass} value={formData.motherName || ''} onChange={e => setFormData({...formData, motherName: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>تاريخ الميلاد</label><input type="date" disabled={isMedic} className={inputClass} value={formData.birthDate || ''} onChange={e => setFormData({...formData, birthDate: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>مكان الولادة</label><input disabled={isMedic} className={inputClass} value={formData.birthPlace || ''} onChange={e => setFormData({...formData, birthPlace: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الخانة</label><input disabled={isMedic} className={inputClass} value={formData.khana || ''} onChange={e => setFormData({...formData, khana: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الوطني</label><input disabled={isMedic} className={inputClass} value={formData.nationalId || ''} onChange={e => setFormData({...formData, nationalId: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الاتحادي</label><input disabled={isMedic} className={inputClass} value={formData.federalNumber || ''} onChange={e => setFormData({...formData, federalNumber: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الرقم الدولي</label><input disabled={isMedic} className={inputClass} value={formData.internationalId || ''} onChange={e => setFormData({...formData, internationalId: e.target.value})} /></div>
              </div>

              {/* وثائق الهوية وجواز السفر */}
              <h4 className={sectionHeader}><CreditCard size={16}/> 2. جواز السفر ووثائق الهوية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-4">
                <div className="space-y-1">
                  <label className={labelClass}>رقم جواز السفر</label>
                  <input
                    disabled={isMedic}
                    className={inputClass}
                    placeholder="مثال: N01234567"
                    value={formData.passportNumber || ''}
                    onChange={e => setFormData({...formData, passportNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>تاريخ إصدار الجواز</label>
                  <input
                    type="date"
                    disabled={isMedic}
                    className={inputClass}
                    value={formData.passportIssueDate || ''}
                    onChange={e => setFormData({...formData, passportIssueDate: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>تاريخ انتهاء الجواز</label>
                  <input
                    type="date"
                    disabled={isMedic}
                    className={inputClass}
                    value={formData.passportExpiryDate || ''}
                    onChange={e => setFormData({...formData, passportExpiryDate: e.target.value})}
                  />
                </div>
              </div>

              {/* بطاقات رفع الصور مع الضغط الذكي والحفاظ على دقة المستند */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                <DocumentUploadCard
                  title="صورة الهوية (الوجه الأول)"
                  description="صورة الوجه الأمامي للبطاقة الشخصية أو إخراج القيد المدني الرسمي"
                  value={formData.idCardImage}
                  onChange={(b64) => setFormData(prev => ({ ...prev, idCardImage: b64 }))}
                  disabled={isMedic}
                  badgeLabel="الوجه الأمامي"
                />
                <DocumentUploadCard
                  title="صورة الهوية (الوجه الثاني)"
                  description="صورة الوجه الخلفي للبطاقة الشخصية (اختياري في حال وجود وجه خلفي)"
                  value={formData.idCardBackImage}
                  onChange={(b64) => setFormData(prev => ({ ...prev, idCardBackImage: b64 }))}
                  disabled={isMedic}
                  badgeLabel="الوجه الخلفي"
                />
                <DocumentUploadCard
                  title="صورة جواز السفر"
                  description="صورة صفحة البيانات الشخصية في جواز السفر (واضحة تماماً وبحجم خفيف جداً)"
                  value={formData.passportImage}
                  onChange={(b64) => setFormData(prev => ({ ...prev, passportImage: b64 }))}
                  disabled={isMedic}
                  badgeLabel="جواز سفر"
                />
              </div>

              {/* القسم 3: الرياضة */}
              <h4 className={sectionHeader}><Activity size={16}/> 3. البيانات الرياضية</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="space-y-1"><label className={labelClass}>الدور الوظيفي</label><select disabled={isMedic} className={inputClass} value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value as Role})}><option value="لاعب">لاعب</option></select></div>
                <div className="space-y-1"><label className={labelClass}>الفئة</label><select disabled={isMedic} className={inputClass} value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})}><option value="">اختر الفئة</option>{(hasRestriction ? allowedCategories : state.categories).map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                
                <div className="space-y-1 sm:col-span-2 flex flex-col justify-center">
                  <label className={labelClass}>تصنيف اللاعب والانتماء</label>
                  <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl flex items-center justify-between mt-1">
                    <span className="font-black text-xs text-blue-900 flex items-center gap-1.5">
                      ⚽ لاعب نادي رسمي (فريق النادي)
                    </span>
                    <span className="text-[10px] bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-black">
                      نادي رسمي ✓
                    </span>
                  </div>
                </div>

                {/* مواسم المشاركة في النادي */}
                <div className="sm:col-span-4 bg-orange-50/70 border border-orange-200 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-blue-900 flex items-center gap-2">
                      <Calendar size={14} className="text-orange-600" />
                      مواسم المشاركة والتقييد في النادي (الموسم النشط: {state.activeSeason || '2025/2026'}):
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['2025/2026', '2026/2027', '2027/2028', '2028/2029', '2029/2030'].map(s => {
                      const cur = Array.from(new Set(formData.seasons || []));
                      const isChecked = cur.includes(s);
                      return (
                        <label key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${isChecked ? 'bg-orange-500 text-white border-orange-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const next = e.target.checked 
                                ? Array.from(new Set([...cur, s])) 
                                : cur.filter(x => x !== s);
                              const validNext = next.length > 0 ? next : [s];
                              setFormData({
                                ...formData,
                                seasons: validNext,
                                season: validNext[validNext.length - 1] || s
                              });
                            }}
                            className="w-3.5 h-3.5 rounded text-orange-500"
                          />
                          <span>موسم {s}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1"><label className={labelClass}>رقم القميص</label><input disabled={isMedic} type="number" className={inputClass} value={formData.number || ''} onChange={e => setFormData({...formData, number: e.target.value ? parseInt(e.target.value) : undefined})} /></div>
                <div className="space-y-1"><label className={labelClass}>المركز الأساسي</label><input disabled={isMedic} className={inputClass} value={formData.position || ''} onChange={e => setFormData({...formData, position: e.target.value})} /></div>
                <div className="space-y-1">
                  <label className={labelClass}>القدم المفضلة</label>
                  <select disabled={isMedic} className={inputClass} value={formData.preferredFoot || 'يمنى'} onChange={e => setFormData({...formData, preferredFoot: e.target.value as any})}>
                    <option value="يمنى">يمنى</option>
                    <option value="يسرى">يسرى</option>
                    <option value="كلاهما">كلاهما</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>زمرة الدم</label>
                  <select disabled={isMedic} className={inputClass} value={formData.bloodType || ''} onChange={e => setFormData({...formData, bloodType: e.target.value})}>
                    <option value="">اختر...</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="space-y-1"><label className={labelClass}>قياس الحذاء</label><input disabled={isMedic} type="text" placeholder="مثال: 42" className={inputClass} value={formData.shoeSize || ''} onChange={e => setFormData({...formData, shoeSize: e.target.value})} /></div>
                <div className="space-y-1">
                  <label className={labelClass}>قياس الملابس</label>
                  <select disabled={isMedic} className={inputClass} value={formData.clothesSize || ''} onChange={e => setFormData({...formData, clothesSize: e.target.value})}>
                    <option value="">اختر...</option>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>
                <div className="space-y-1"><label className={labelClass}>تاريخ الانضمام</label><input disabled={isMedic} type="date" className={inputClass} value={formData.joinDate || ''} onChange={e => setFormData({...formData, joinDate: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الطول (سم)</label><input disabled={isMedic} className={inputClass} value={formData.height || ''} onChange={e => setFormData({...formData, height: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الوزن (كغ)</label><input disabled={isMedic} className={inputClass} value={formData.weight || ''} onChange={e => setFormData({...formData, weight: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الشهادة التدريبية</label><input disabled={isMedic} className={inputClass} value={formData.coachingCertificate || ''} onChange={e => setFormData({...formData, coachingCertificate: e.target.value})} /></div>
                <div className="sm:col-span-2 space-y-1"><label className={labelClass}>التحصيل العلمي</label><input disabled={isMedic} className={inputClass} value={formData.academicDegree || ''} onChange={e => setFormData({...formData, academicDegree: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>رقم الهاتف</label><input disabled={isMedic} className={inputClass} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>هاتف الطوارئ / ولي الأمر</label><input disabled={isMedic} className={inputClass} value={formData.emergencyPhone || ''} onChange={e => setFormData({...formData, emergencyPhone: e.target.value})} /></div>
                <div className="sm:col-span-full space-y-1"><label className={labelClass}>عنوان السكن التفصيلي</label><input disabled={isMedic} className={inputClass} value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              </div>

              {/* القسم 3: السجل المالي والاشتراكات */}
              {formData.isAcademyPlayer && (
                <>
                  <h4 className={sectionHeader}><Wallet size={16}/> 3. السجل المالي والاشتراكات (للأكاديمية)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-1"><label className={labelClass}>مبلغ الاشتراك / القسط</label><input type="number" className={inputClass} value={formData.subscriptionAmount || ''} onChange={e => setFormData({...formData, subscriptionAmount: e.target.value})} /></div>
                    <div className="space-y-1"><label className={labelClass}>شهر الاشتراك</label><input type="month" className={inputClass} value={formData.subscriptionMonth || ''} onChange={e => setFormData({...formData, subscriptionMonth: e.target.value})} /></div>
                    <div className="space-y-1"><label className={labelClass}>تاريخ التسجيل</label><input type="date" disabled className={`${inputClass} opacity-70`} value={formData.registrationDate || ''} /></div>
                    
                    <div className="space-y-1 flex items-center mt-6">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300" checked={Boolean(formData.receivedKit === true || String(formData.receivedKit) === 'true')} onChange={e => setFormData({...formData, receivedKit: e.target.checked})} />
                        <span className="font-black text-sm text-slate-800">استلم لباس</span>
                      </label>
                    </div>
                    {formData.receivedKit && (
                      <div className="space-y-1 sm:col-span-1 md:col-span-2"><label className={labelClass}>مبلغ اللباس</label><input type="number" className={inputClass} value={formData.kitAmount || ''} onChange={e => setFormData({...formData, kitAmount: e.target.value})} /></div>
                    )}
                  </div>
                </>
              )}

              {/* القسم 4: العقود الاحترافية */}
              {!formData.isAcademyPlayer && (
                <>
                  <h4 className={sectionHeader}><Wallet size={16}/> 4. العقود الاحترافية (إن وجدت)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-1"><label className={labelClass}>بداية العقد</label><input type="date" className={inputClass} value={formData.contractStart || ''} onChange={e => setFormData({...formData, contractStart: e.target.value})} /></div>
                    <div className="space-y-1"><label className={labelClass}>نهاية العقد</label><input type="date" className={inputClass} value={formData.contractEnd || ''} onChange={e => setFormData({...formData, contractEnd: e.target.value})} /></div>
                    <div className="space-y-1"><label className={labelClass}>القيمة / الراتب</label><input className={inputClass} value={formData.contractValue || ''} onChange={e => setFormData({...formData, contractValue: e.target.value})} /></div>
                  </div>
                </>
              )}

              {/* القسم 5: الطبي والانضباط */}
              <h4 className={sectionHeader}><ShieldAlert size={16}/> 5. الحالة الطبية والسلوك</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-1"><label className={labelClass}>السجل الطبي</label><textarea className={`${inputClass} h-20 md:h-24 resize-none`} value={formData.medicalHistory || ''} onChange={e => setFormData({...formData, medicalHistory: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>الإصابات الحالية</label><textarea className={`${inputClass} h-20 md:h-24 resize-none`} value={formData.injuries || ''} onChange={e => setFormData({...formData, injuries: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>العقوبات السابقة</label><textarea className={`${inputClass} h-20 md:h-24 resize-none`} value={formData.penalties || ''} onChange={e => setFormData({...formData, penalties: e.target.value})} /></div>
                <div className="space-y-1"><label className={labelClass}>ملاحظات للمدرب</label><textarea className={`${inputClass} h-20 md:h-24 resize-none`} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} /></div>
              </div>

              <div className="pt-8 md:pt-10">
                <button type="submit" disabled={isSaving} className="w-full bg-blue-900 text-white py-5 md:py-6 rounded-xl md:rounded-2xl font-black text-lg md:text-xl shadow-xl shadow-blue-900/10 hover:bg-blue-800 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                  {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24}/>} 
                  تثبيت السجل المركزي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة مقارنة اللاعبين */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center lg:p-4">
          <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md" onClick={() => setIsCompareModalOpen(false)}></div>
          <div className="relative bg-white w-full h-full lg:h-auto lg:max-w-6xl lg:max-h-[95vh] lg:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-5 md:p-6 border-b border-slate-100 bg-white flex justify-between items-center">
              <h3 className="text-base md:text-xl font-black text-blue-900 flex items-center gap-2 md:gap-3 italic uppercase">
                <Activity className="text-orange-500 w-5 h-5 md:w-6 md:h-6" /> 
                مقارنة اللاعبين
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={exportComparisonPDF} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all text-sm">
                  <FileText size={16}/> تصدير PDF
                </button>
                <button onClick={() => setIsCompareModalOpen(false)} className="p-2.5 bg-slate-100 hover:bg-red-500 text-slate-600 hover:text-white rounded-xl transition-all shadow-sm">
                  <X size={20}/>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-50 text-right pb-32 lg:pb-10 custom-scrollbar" dir="rtl" id="comparison-print-area">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اللاعب الأول</label>
                  <select 
                    value={player1Id} 
                    onChange={(e) => setPlayer1Id(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-blue-900 outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm"
                  >
                    <option value="">اختر لاعباً...</option>
                    {allowedPlayersForCompare.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">اللاعب الثاني</label>
                  <select 
                    value={player2Id} 
                    onChange={(e) => setPlayer2Id(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-blue-900 outline-none focus:ring-2 focus:ring-orange-500/10 shadow-sm"
                  >
                    <option value="">اختر لاعباً...</option>
                    {allowedPlayersForCompare.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {player1 && player2 && (
                <div className="space-y-8">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-8 items-center justify-between">
                    <div className="flex-1 w-full h-[350px] relative">
                      <h4 className="text-center font-bold text-slate-700 mb-4">المقارنة الفنية والبدنية (Radar)</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12, fontWeight: 'bold' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                          <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Radar name={player1.name} dataKey="player1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                          <Radar name={player2.name} dataKey="player2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex-1 w-full bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col h-full min-h-[350px]">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-blue-900 flex items-center gap-2">
                          <Bot className="text-emerald-500" />
                          توصية الذكاء الاصطناعي
                        </h4>
                        <button 
                          onClick={fetchAIRecommendation} 
                          disabled={isFetchingAI}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isFetchingAI ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                          {aiRecommendation ? 'تحديث التوصية' : 'توليد توصية الآن'}
                        </button>
                      </div>
                      <div className="flex-1 bg-white rounded-xl p-4 text-sm text-slate-700 leading-relaxed border border-slate-200 overflow-y-auto">
                        {isFetchingAI ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Loader2 size={32} className="animate-spin text-emerald-500" />
                            <p className="animate-pulse">جاري تحليل بيانات اللاعبين...</p>
                          </div>
                        ) : aiRecommendation ? (
                          <div className="whitespace-pre-wrap font-medium">{aiRecommendation}</div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                            <Bot size={40} />
                            <p>اضغط على "توليد توصية الآن" للحصول على تحليل فني.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                                    <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-wrap mt-8 mb-4">
                    <span className="text-sm font-bold text-slate-700">إظهار البيانات:</span>
                    {[
                      { id: 'basic', label: 'الأساسية' },
                      { id: 'personal', label: 'الشخصية' },
                      { id: 'physical', label: 'البدنية' },
                      { id: 'contract', label: 'التعاقدية' },
                      { id: 'medical', label: 'الطبية والانضباط' }
                    ].map(cat => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all">
                        <input 
                          type="checkbox" 
                          checked={visibleCompareCategories.includes(cat.id)} 
                          onChange={() => toggleCompareCategory(cat.id)}
                          className="rounded text-orange-500 focus:ring-orange-500/20"
                        />
                        {cat.label}
                      </label>
                    ))}
                  </div>

                  <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-center text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="p-4 w-[40%] border-b border-l border-slate-200 text-lg text-blue-900">{player1.name}</th>
                        <th className="p-4 w-[20%] border-b border-l border-slate-200 text-sm">المقارنة</th>
                        <th className="p-4 w-[40%] border-b border-slate-200 text-lg text-blue-900">{player2.name}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCompareCategories.includes('basic') && (
                        <>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.category}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">الفئة</td>
                        <td className="p-3 font-semibold">{player2.category}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.position || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">المركز</td>
                        <td className="p-3 font-semibold">{player2.position || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.number || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">رقم القميص</td>
                        <td className="p-3 font-semibold">{player2.number || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{getAge(player1.birthDate)}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">العمر</td>
                        <td className="p-3 font-semibold">{getAge(player2.birthDate)}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.role || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">الدور الوظيفي</td>
                        <td className="p-3 font-semibold">{player2.role || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.isAcademyPlayer ? 'لاعب أكاديمية' : 'لاعب نادي'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">تصنيف اللاعب</td>
                        <td className="p-3 font-semibold">{player2.isAcademyPlayer ? 'لاعب أكاديمية' : 'لاعب نادي'}</td>
                      </tr>
                        </>
                      )}

                      {visibleCompareCategories.includes('personal') && (
                        <>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.birthDate || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">تاريخ الميلاد</td>
                        <td className="p-3 font-semibold">{player2.birthDate || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.birthPlace || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">مكان الولادة</td>
                        <td className="p-3 font-semibold">{player2.birthPlace || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.fatherName || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">اسم الأب</td>
                        <td className="p-3 font-semibold">{player2.fatherName || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.motherName || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">اسم الأم</td>
                        <td className="p-3 font-semibold">{player2.motherName || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.khana || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">الخانة</td>
                        <td className="p-3 font-semibold">{player2.khana || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.nationalId || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">الرقم الوطني</td>
                        <td className="p-3 font-semibold">{player2.nationalId || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.federalNumber || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">الرقم الاتحادي</td>
                        <td className="p-3 font-semibold">{player2.federalNumber || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.internationalId || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">الرقم الدولي</td>
                        <td className="p-3 font-semibold">{player2.internationalId || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.address || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">عنوان السكن</td>
                        <td className="p-3 font-semibold">{player2.address || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.phone || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">رقم الهاتف</td>
                        <td className="p-3 font-semibold">{player2.phone || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.emergencyPhone || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">هاتف الطوارئ / الولي</td>
                        <td className="p-3 font-semibold">{player2.emergencyPhone || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.academicDegree || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">التحصيل العلمي</td>
                        <td className="p-3 font-semibold">{player2.academicDegree || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.coachingCertificate || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">الشهادة التدريبية</td>
                        <td className="p-3 font-semibold">{player2.coachingCertificate || '-'}</td>
                      </tr>
                        </>
                      )}

                      {visibleCompareCategories.includes('physical') && (
                        <>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.height ? `${player1.height} سم` : '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">الطول</td>
                        <td className="p-3 font-semibold">{player2.height ? `${player2.height} سم` : '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.weight ? `${player1.weight} كغ` : '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">الوزن</td>
                        <td className="p-3 font-semibold">{player2.weight ? `${player2.weight} كغ` : '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-black text-rose-600">{player1.bloodType || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">زمرة الدم</td>
                        <td className="p-3 font-black text-rose-600">{player2.bloodType || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.preferredFoot || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">القدم المفضلة</td>
                        <td className="p-3 font-semibold">{player2.preferredFoot || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.shoeSize || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">قياس الحذاء</td>
                        <td className="p-3 font-semibold">{player2.shoeSize || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.clothesSize || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">قياس الملابس</td>
                        <td className="p-3 font-semibold">{player2.clothesSize || '-'}</td>
                      </tr>
{progressionData.length > 0 && (
                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-6 border-l border-slate-100" colSpan={3}>
                            <h4 className="text-center font-bold text-slate-700 mb-4">التطور البدني خلال الموسم</h4>
                            <div className="h-48 w-full" dir="ltr">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={progressionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', textAlign: 'right' }} />
                                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                                  <Line type="monotone" name={player1.name} dataKey={player1.name} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
                                  <Line type="monotone" name={player2.name} dataKey={player2.name} stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </td>
                        </tr>
                      )}
                        </>
                      )}

                      {visibleCompareCategories.includes('contract') && (
                        <>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.joinDate || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">تاريخ الانضمام</td>
                        <td className="p-3 font-semibold">{player2.joinDate || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.contractStart || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">بداية العقد</td>
                        <td className="p-3 font-semibold">{player2.contractStart || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.contractEnd || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">نهاية العقد</td>
                        <td className="p-3 font-semibold">{player2.contractEnd || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.contractValue || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">قيمة العقد</td>
                        <td className="p-3 font-semibold">{player2.contractValue || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.subscriptionAmount || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">مبلغ الاشتراك</td>
                        <td className="p-3 font-semibold">{player2.subscriptionAmount || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.subscriptionMonth || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">شهر الاشتراك</td>
                        <td className="p-3 font-semibold">{player2.subscriptionMonth || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.registrationDate || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">تاريخ التسجيل</td>
                        <td className="p-3 font-semibold">{player2.registrationDate || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.receivedKit ? 'نعم' : 'لا'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">استلم لباس</td>
                        <td className="p-3 font-semibold">{player2.receivedKit ? 'نعم' : 'لا'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.kitAmount || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">مبلغ اللباس</td>
                        <td className="p-3 font-semibold">{player2.kitAmount || '-'}</td>
                      </tr>
                        </>
                      )}

                      {visibleCompareCategories.includes('medical') && (
                        <>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 text-emerald-600 font-black">{getAttendanceStat(player1.id, 'حاضر')}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">مرات الحضور</td>
                        <td className="p-3 text-emerald-600 font-black">{getAttendanceStat(player2.id, 'حاضر')}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 text-rose-500 font-black">{getAttendanceStat(player1.id, 'غائب')}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">مرات الغياب</td>
                        <td className="p-3 text-rose-500 font-black">{getAttendanceStat(player2.id, 'غائب')}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.medicalHistory || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">السجل الطبي</td>
                        <td className="p-3 font-semibold">{player2.medicalHistory || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{getInjuryCount(player1.id)}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">سجل الإصابات (الحالي)</td>
                        <td className="p-3 font-semibold">{getInjuryCount(player2.id)}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.injuries || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">الإصابات السابقة</td>
                        <td className="p-3 font-semibold">{player2.injuries || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.penalties || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">العقوبات</td>
                        <td className="p-3 font-semibold">{player2.penalties || '-'}</td>
                      </tr>
<tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 border-l border-slate-100 font-semibold">{player1.notes || '-'}</td>
                        <td className="p-3 border-l border-slate-100 font-bold text-slate-500 bg-slate-50">ملاحظات</td>
                        <td className="p-3 font-semibold">{player2.notes || '-'}</td>
                      </tr>
                        </>
                      )}
</tbody>
                  </table>
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SquadManagement;
