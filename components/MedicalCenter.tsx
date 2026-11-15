import React, { useState, useMemo } from 'react';
import { AppState, InjuryRecord, Person, PlayerMedicalCard, RTPStage, InjuryMechanism, TreatmentSession } from '../types';
import { generateUUID, supabase } from '../App';
import { 
  HeartPulse, Plus, ShieldAlert, Activity, Calendar, History, Save, X, User, 
  Upload, FileText, CheckCircle2, AlertTriangle, Clock, Dumbbell, Footprints, 
  Building2, Users, Eye, Search, Filter, Trash2, Stethoscope, AlertCircle, 
  ChevronRight, ArrowRight, ShieldCheck, FileCheck, Loader2, Sparkles, Phone
} from 'lucide-react';
import { 
  RTP_STAGES_CONFIG, COMMON_INJURY_TYPES, ANATOMICAL_BODY_ZONES, 
  getPlayerMedicalCard, preparePlayerWithMedicalCard 
} from '../utils/medicalHelpers';
import { uploadToCloudinary } from '../utils/cloudinaryUploader';
import { compressDocumentImage } from '../utils/imageCompressor';
import { canDeleteRecords, canEditMedicalData, getAllowedCategories, hasCategoryAccess } from '../utils/permissions';
import { recordAuditLog } from '../utils/auditLogger';

interface MedicalCenterProps {
  state: AppState;
  setState: (updater: (prev: AppState) => AppState) => void;
  syncToCloud?: (table: string, data: any) => Promise<boolean>;
}

const MedicalCenter: React.FC<MedicalCenterProps> = ({ state, setState, syncToCloud }) => {
  const [activeMainTab, setActiveMainTab] = useState<'injuries' | 'pcma' | 'analytics'>('injuries');
  const [isInjuryModalOpen, setIsInjuryModalOpen] = useState(false);
  const [editingInjury, setEditingInjury] = useState<InjuryRecord | null>(null);

  // PCMA edit modal state
  const [selectedPlayerForPCMA, setSelectedPlayerForPCMA] = useState<Person | null>(null);
  const [pcmaFormData, setPcmaFormData] = useState<PlayerMedicalCard | null>(null);
  const [isSavingPCMA, setIsSavingPCMA] = useState(false);
  const [isUploadingECG, setIsUploadingECG] = useState(false);

  // Quick Treatment Log modal
  const [selectedInjuryForTreatment, setSelectedInjuryForTreatment] = useState<InjuryRecord | null>(null);
  const [treatmentFormData, setTreatmentFormData] = useState({
    treatment: 'جلسة علاج فيزيائي وتدليك استشفائي',
    medicName: state.currentUser?.name || state.currentUser?.username || 'طبيب الفريق',
    notes: ''
  });
  const [isSavingTreatment, setIsSavingTreatment] = useState(false);

  // Image Lightbox state
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const currentUser = state.currentUser;
  const canEditMedical = canEditMedicalData(currentUser);
  const canDeleteMedical = canDeleteRecords(currentUser);

  // Filters
  const allowedCategories = getAllowedCategories(currentUser).length > 0
    ? getAllowedCategories(currentUser)
    : state.categories;

  const [localCategoryFilter, setLocalCategoryFilter] = useState<string>('الكل');
  const [statusFilter, setStatusFilter] = useState<string>('الكل');
  const [searchPlayerQuery, setSearchPlayerQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Injury Form State
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>('الكل');
  const [injuryFormData, setInjuryFormData] = useState<Partial<InjuryRecord>>({
    status: 'علاج مكثف',
    severity: 'متوسطة',
    rtpStage: 'clinic',
    mechanism: 'non_contact',
    startDate: new Date().toISOString().split('T')[0],
    imagingUrls: []
  });
  const [isUploadingImaging, setIsUploadingImaging] = useState(false);
  const [isSavingInjury, setIsSavingInjury] = useState(false);

  // Filtered Injuries
  const filteredInjuries = useMemo(() => {
    return state.injuries.filter(injury => {
      const player = state.people.find(p => p.id === injury.personId);
      if (!player) return false;
      if (!hasCategoryAccess(currentUser, player.category)) return false;
      if (state.globalCategoryFilter !== 'الكل' && player.category !== state.globalCategoryFilter) return false;
      if (localCategoryFilter !== 'الكل' && player.category !== localCategoryFilter) return false;
      
      if (statusFilter === 'active' && injury.status === 'تعافى') return false;
      if (statusFilter === 'recovered' && injury.status !== 'تعافى') return false;
      if (statusFilter === 'clinic' && injury.rtpStage !== 'clinic') return false;
      if (statusFilter === 'gym' && injury.rtpStage !== 'gym') return false;
      if (statusFilter === 'pitch' && injury.rtpStage !== 'pitch' && injury.rtpStage !== 'partial') return false;

      if (searchPlayerQuery.trim()) {
        const q = searchPlayerQuery.toLowerCase().trim();
        const matchesName = player.name.toLowerCase().includes(q);
        const matchesType = (injury.type || '').toLowerCase().includes(q);
        const matchesLoc = (injury.location || '').toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesLoc) return false;
      }

      return true;
    });
  }, [state.injuries, state.people, currentUser, state.globalCategoryFilter, localCategoryFilter, statusFilter, searchPlayerQuery]);

  // Active / Recovered counts
  const activeInjuries = useMemo(() => state.injuries.filter(i => i.status !== 'تعافى'), [state.injuries]);
  const clinicCount = useMemo(() => activeInjuries.filter(i => (i.rtpStage === 'clinic' || i.status === 'علاج مكثف')).length, [activeInjuries]);
  const gymCount = useMemo(() => activeInjuries.filter(i => i.rtpStage === 'gym').length, [activeInjuries]);
  const pitchCount = useMemo(() => activeInjuries.filter(i => (i.rtpStage === 'pitch' || i.rtpStage === 'partial')).length, [activeInjuries]);
  const recoveredCount = useMemo(() => state.injuries.filter(i => i.status === 'تعافى').length, [state.injuries]);

  // Players with their medical info
  const allSquadPlayers = useMemo(() => {
    return state.people.filter(p => {
      if (p.role !== 'لاعب') return false;
      if (!hasCategoryAccess(currentUser, p.category)) return false;
      if (state.globalCategoryFilter !== 'الكل' && p.category !== state.globalCategoryFilter) return false;
      if (localCategoryFilter !== 'الكل' && p.category !== localCategoryFilter) return false;
      if (searchPlayerQuery.trim()) {
        const q = searchPlayerQuery.toLowerCase().trim();
        return p.name.toLowerCase().includes(q) || (p.number && String(p.number).includes(q));
      }
      return true;
    });
  }, [state.people, currentUser, state.globalCategoryFilter, localCategoryFilter, searchPlayerQuery]);

  // Open Create/Edit Injury Modal
  const openInjuryModal = (injury?: InjuryRecord) => {
    if (!canEditMedical) return;
    if (injury) {
      setEditingInjury(injury);
      setInjuryFormData({ ...injury });
      const player = state.people.find(p => p.id === injury.personId);
      if (player) setModalCategoryFilter(player.category);
    } else {
      setEditingInjury(null);
      setInjuryFormData({
        status: 'علاج مكثف',
        severity: 'متوسطة',
        rtpStage: 'clinic',
        mechanism: 'non_contact',
        startDate: new Date().toISOString().split('T')[0],
        imagingUrls: []
      });
      setModalCategoryFilter(localCategoryFilter !== 'الكل' ? localCategoryFilter : 'الكل');
    }
    setIsInjuryModalOpen(true);
  };

  // Upload Imaging (MRI / Ultrasound / X-Ray)
  const handleUploadImaging = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImaging(true);
    try {
      const newUrls: string[] = [...(injuryFormData.imagingUrls || [])];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const cloudUrl = await uploadToCloudinary(file, 'documents');
          newUrls.push(cloudUrl);
        } else {
          const compressed = await compressDocumentImage(file, { maxWidth: 1600, quality: 0.8 });
          const cloudUrl = await uploadToCloudinary(compressed.base64, 'documents');
          newUrls.push(cloudUrl);
        }
      }
      setInjuryFormData(prev => ({ ...prev, imagingUrls: newUrls }));
    } catch (err: any) {
      alert('خطأ أثناء رفع ملف الأشعة: ' + (err.message || 'فشل الاتصال'));
    } finally {
      setIsUploadingImaging(false);
      e.target.value = '';
    }
  };

  // Save Injury
  const handleSaveInjury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditMedical) return;
    if (!injuryFormData.personId || !injuryFormData.type) {
      return alert('يرجى اختيار اللاعب ونوع الإصابة أولاً.');
    }

    setIsSavingInjury(true);
    try {
      const injuryId = editingInjury ? editingInjury.id : generateUUID();
      const status = (injuryFormData.rtpStage === 'cleared') ? 'تعافى' : (injuryFormData.status || 'تأهيل');

      const injuryRecord: InjuryRecord = {
        id: injuryId,
        personId: injuryFormData.personId!,
        type: injuryFormData.type!,
        location: injuryFormData.location || 'غير محدد',
        severity: injuryFormData.severity as any || 'متوسطة',
        startDate: injuryFormData.startDate || new Date().toISOString().split('T')[0],
        expectedReturn: injuryFormData.expectedReturn || '',
        status: status as any,
        notes: injuryFormData.notes || '',
        rtpStage: injuryFormData.rtpStage || 'clinic',
        mechanism: injuryFormData.mechanism || 'non_contact',
        imagingUrls: injuryFormData.imagingUrls || [],
        imagingType: injuryFormData.imagingType || 'MRI',
        doctorNotesToCoach: injuryFormData.doctorNotesToCoach || '',
        bodyZone: injuryFormData.bodyZone || injuryFormData.location || '',
        treatmentsLog: editingInjury?.treatmentsLog || injuryFormData.treatmentsLog || []
      };

      const success = await syncToCloud?.('injuries', injuryRecord);
      if (success === false) {
        throw new Error('فشلت مزامنة بيانات الإصابة مع السحابة');
      }

      setState(prev => {
        const nextInjuries = editingInjury
          ? prev.injuries.map(i => i.id === injuryId ? injuryRecord : i)
          : [injuryRecord, ...prev.injuries];

        // تحديث حالة جاهزية اللاعب في قائمة الفريق تلقائياً
        const availabilityStatus = (injuryRecord.rtpStage === 'cleared') ? 'available' : 'unavailable';
        const nextPeople = prev.people.map(p => {
          if (p.id === injuryRecord.personId) {
            const currentCard = getPlayerMedicalCard(p);
            const updatedCard: PlayerMedicalCard = {
              ...currentCard,
              availabilityStatus,
              availabilityNotes: injuryRecord.doctorNotesToCoach || currentCard.availabilityNotes
            };
            return {
              ...p,
              availabilityStatus,
              medicalCard: updatedCard,
              injuries: injuryRecord.rtpStage === 'cleared' ? 'تعافى' : `${injuryRecord.type} (${injuryRecord.location})`
            };
          }
          return p;
        });

        return { ...prev, injuries: nextInjuries, people: nextPeople };
      });

      const playerName = state.people.find(p => p.id === injuryRecord.personId)?.name || 'لاعب';
      recordAuditLog({
        user: currentUser,
        actionType: editingInjury ? 'تعديل' : 'إضافة',
        section: 'المركز الطبي',
        targetName: `${playerName} - ${injuryRecord.type}`,
        details: `المرحلة: ${RTP_STAGES_CONFIG[injuryRecord.rtpStage || 'clinic']?.label || injuryRecord.rtpStage}`,
        setState: setState as any
      });

      setIsInjuryModalOpen(false);
      setEditingInjury(null);
    } catch (err: any) {
      console.error(err);
      alert('خطأ أثناء حفظ الإصابة: ' + (err.message || 'حدث خطأ في الاتصال'));
    } finally {
      setIsSavingInjury(false);
    }
  };

  // Quick Change RTP Stage
  const handleQuickChangeRTP = async (injury: InjuryRecord, newStage: RTPStage) => {
    if (!canEditMedical) return;
    const newStatus = (newStage === 'cleared') ? 'تعافى' : (newStage === 'clinic' ? 'علاج مكثف' : 'تأهيل');
    const updated: InjuryRecord = {
      ...injury,
      rtpStage: newStage,
      status: newStatus as any
    };

    const success = await syncToCloud?.('injuries', updated);
    if (success !== false) {
      const playerName = state.people.find(p => p.id === injury.personId)?.name || 'لاعب';
      setState(prev => ({
        ...prev,
        injuries: prev.injuries.map(i => i.id === injury.id ? updated : i),
        people: prev.people.map(p => {
          if (p.id === injury.personId && newStage === 'cleared') {
            return { ...p, availabilityStatus: 'available', injuries: 'تعافى' };
          }
          return p;
        })
      }));
      recordAuditLog({
        user: currentUser,
        actionType: 'تعديل',
        section: 'المركز الطبي',
        targetName: `${playerName} - ${injury.type}`,
        details: `تغيير مرحلة التأهيل (RTP) إلى: ${RTP_STAGES_CONFIG[newStage]?.label || newStage}`,
        setState: setState as any
      });
    }
  };

  // Delete Injury Record
  const handleDeleteInjury = async (injuryId: string) => {
    if (!canDeleteMedical) return;
    if (!confirm('هل أنت متأكد من حذف هذا السجل الطبي نهائياً؟')) return;
    try {
      const { error } = await supabase.from('injuries').delete().eq('id', injuryId);
      if (error) throw error;
      setState(p => ({ ...p, injuries: p.injuries.filter(i => i.id !== injuryId) }));
    } catch (err: any) {
      alert('فشل الحذف: ' + err.message);
    }
  };

  // Open PCMA Edit Modal
  const openPCMAModal = (player: Person) => {
    if (!canEditMedical) return;
    setSelectedPlayerForPCMA(player);
    setPcmaFormData(getPlayerMedicalCard(player));
  };

  // Save PCMA Medical Card
  const handleSavePCMA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditMedical || !selectedPlayerForPCMA || !pcmaFormData) return;

    setIsSavingPCMA(true);
    try {
      const updatedPersonPayload = preparePlayerWithMedicalCard(selectedPlayerForPCMA, pcmaFormData);
      const success = await syncToCloud?.('people', updatedPersonPayload);
      if (success === false) throw new Error('فشل حفظ البيانات الطبية في السحابة');

      recordAuditLog({
        user: currentUser,
        actionType: 'تعديل',
        section: 'الملف الطبي PCMA',
        targetName: selectedPlayerForPCMA.name,
        details: `الحالة: ${pcmaFormData.availabilityStatus === 'available' ? 'جاهز 100%' : pcmaFormData.availabilityStatus === 'modified' ? 'مشاركة مقيدة' : 'غير متاح'}`,
        setState: setState as any
      });

      setState(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === selectedPlayerForPCMA.id ? { ...p, ...updatedPersonPayload } : p)
      }));

      setSelectedPlayerForPCMA(null);
      setPcmaFormData(null);
    } catch (err: any) {
      alert('خطأ أثناء حفظ الملف الطبي: ' + (err.message || 'حدث خطأ غير متوقع'));
    } finally {
      setIsSavingPCMA(false);
    }
  };

  // Upload ECG / Cardio Report
  const handleUploadECG = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingECG(true);
    try {
      let cloudUrl: string;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        cloudUrl = await uploadToCloudinary(file, 'documents');
      } else {
        const compressed = await compressDocumentImage(file, { maxWidth: 1600, quality: 0.8 });
        cloudUrl = await uploadToCloudinary(compressed.base64, 'documents');
      }
      setPcmaFormData(prev => prev ? ({ ...prev, ecgReportUrl: cloudUrl }) : null);
    } catch (err: any) {
      alert('خطأ أثناء رفع تقرير القلب: ' + (err.message || 'فشل الاتصال'));
    } finally {
      setIsUploadingECG(false);
      e.target.value = '';
    }
  };

  // Add Treatment Session
  const handleSaveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditMedical || !selectedInjuryForTreatment || !treatmentFormData.treatment) return;

    setIsSavingTreatment(true);
    try {
      const newSession: TreatmentSession = {
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        treatment: treatmentFormData.treatment,
        medicName: treatmentFormData.medicName,
        notes: treatmentFormData.notes
      };

      const updatedInjury: InjuryRecord = {
        ...selectedInjuryForTreatment,
        treatmentsLog: [newSession, ...(selectedInjuryForTreatment.treatmentsLog || [])]
      };

      const success = await syncToCloud?.('injuries', updatedInjury);
      if (success === false) throw new Error('فشلت المزامنة مع السحابة');

      const playerName = state.people.find(p => p.id === updatedInjury.personId)?.name || 'لاعب';
      recordAuditLog({
        user: currentUser,
        actionType: 'إضافة',
        section: 'جلسة علاج طبية',
        targetName: `${playerName} - ${updatedInjury.type}`,
        details: treatmentFormData.treatment,
        setState: setState as any
      });

      setState(prev => ({
        ...prev,
        injuries: prev.injuries.map(i => i.id === updatedInjury.id ? updatedInjury : i)
      }));

      setSelectedInjuryForTreatment(null);
      setTreatmentFormData({
        treatment: 'جلسة علاج فيزيائي وتدليك استشفائي',
        medicName: state.currentUser?.name || state.currentUser?.username || 'طبيب الفريق',
        notes: ''
      });
    } catch (err: any) {
      alert('خطأ في إضافة الجلسة: ' + err.message);
    } finally {
      setIsSavingTreatment(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20" dir="rtl">
      
      {/* رأس المركز الطبي الرياضي */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-blue-800/40 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black border border-orange-500/30 shadow-inner">
              <Stethoscope size={26} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">المركز الطبي ووحدة التأهيل الرياضي</h2>
              <p className="text-xs text-blue-200/80 font-bold">بروتوكول العودة للعب (RTP)، الفحوصات الدورية، وتتبع جاهزية اللاعبين</p>
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات السريعة */}
        {canEditMedical ? (
          <div className="flex flex-wrap items-center gap-2.5 z-10 w-full md:w-auto">
            <button 
              onClick={() => openInjuryModal()}
              className="flex-1 md:flex-none bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
            >
              <Plus size={18} /> تسجيل إصابة جديدة
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-black bg-white/10 text-blue-100 border border-white/20 px-4 py-2 rounded-xl z-10">
            وضع العرض فقط — تعديل البيانات الطبية متاح للمعالج والمدير حصراً
          </span>
        )}

        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* التبويبات الرئيسية */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 border-b border-slate-200 pb-3">
        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 w-full sm:w-fit overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveMainTab('injuries')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'injuries' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Activity size={16} className="text-orange-500" />
            <span>عيادة الإصابات والتأهيل</span>
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-black">{activeInjuries.length}</span>
          </button>

          <button
            onClick={() => setActiveMainTab('pcma')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'pcma' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <HeartPulse size={16} className="text-rose-500" />
            <span>البطاقات الطبية وفحوصات السلامة (PCMA)</span>
          </button>

          <button
            onClick={() => setActiveMainTab('analytics')}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${
              activeMainTab === 'analytics' ? 'bg-white text-blue-900 shadow-md' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <ShieldAlert size={16} className="text-amber-500" />
            <span>إحصائيات الوقاية وتوزيع الإصابات</span>
          </button>
        </div>

        {/* فلاتر الفئات */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <span className="text-[10px] font-bold text-slate-400 shrink-0">الفئة:</span>
          <button 
            onClick={() => setLocalCategoryFilter('الكل')}
            className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all whitespace-nowrap ${localCategoryFilter === 'الكل' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            الكل
          </button>
          {allowedCategories.map(cat => (
            <button 
              key={cat}
              onClick={() => setLocalCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg font-black text-[10px] transition-all whitespace-nowrap ${localCategoryFilter === cat ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* التبويب 1: عيادة الإصابات ومراحل العودة للعب (RTP) */}
      {/* ========================================================================= */}
      {activeMainTab === 'injuries' && (
        <div className="space-y-6">
          {/* بطاقات الإحصائيات العلوية */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-red-600 uppercase">إجمالي الإصابات النشطة</p>
                <h3 className="text-2xl font-black text-red-700 mt-0.5">{activeInjuries.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                <ShieldAlert size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-rose-600 uppercase">1. مرحلة العيادة</p>
                <h3 className="text-2xl font-black text-rose-700 mt-0.5">{clinicCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <Building2 size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase">2. صالة التقوية والحديد</p>
                <h3 className="text-2xl font-black text-amber-700 mt-0.5">{gymCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                <Dumbbell size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-sky-600 uppercase">3. التأهيل على العشب</p>
                <h3 className="text-2xl font-black text-sky-700 mt-0.5">{pitchCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center">
                <Footprints size={22} />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase">5. جاهزية تامة وتصريح</p>
                <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{recoveredCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={22} />
              </div>
            </div>
          </div>

          {/* شريط الفلاتر والبحث */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute right-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="بحث باسم اللاعب، نوع الإصابة، أو الموقع التشريحي..."
                value={searchPlayerQuery}
                onChange={e => setSearchPlayerQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold text-slate-900 focus:border-blue-900 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">المرحلة:</span>
              <button 
                onClick={() => setStatusFilter('الكل')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all ${statusFilter === 'الكل' ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                الكل
              </button>
              <button 
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all ${statusFilter === 'active' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                المصابين حالياً
              </button>
              <button 
                onClick={() => setStatusFilter('clinic')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all ${statusFilter === 'clinic' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                عيادة
              </button>
              <button 
                onClick={() => setStatusFilter('gym')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all ${statusFilter === 'gym' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                صالة حديد
              </button>
              <button 
                onClick={() => setStatusFilter('pitch')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all ${statusFilter === 'pitch' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                تأهيل بالعشب
              </button>
              <button 
                onClick={() => setStatusFilter('recovered')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap transition-all ${statusFilter === 'recovered' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                المتعافين
              </button>
            </div>
          </div>

          {/* قائمة كروت الإصابات */}
          {filteredInjuries.length === 0 ? (
            <div className="bg-white p-12 rounded-[2rem] border border-slate-200 text-center space-y-3">
              <HeartPulse size={48} className="mx-auto text-slate-300" />
              <h4 className="text-sm font-black text-slate-700">لا توجد سجلات إصابات تطابق الفلتر المحدد</h4>
              <p className="text-xs text-slate-400">جميع اللاعبين في هذه الفئة في حالة صحية ممتازة ومتاحين للتدريبات</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {filteredInjuries.map(injury => {
                const player = state.people.find(p => p.id === injury.personId);
                const rtp = RTP_STAGES_CONFIG[injury.rtpStage || 'clinic'] || RTP_STAGES_CONFIG.clinic;
                const isCleared = injury.rtpStage === 'cleared' || injury.status === 'تعافى';

                return (
                  <div 
                    key={injury.id} 
                    className="bg-white rounded-2xl md:rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between"
                  >
                    {/* رأس الكرت */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {player?.photo ? (
                            <img src={player.photo} alt={player?.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                          ) : (
                            <div className="w-12 h-12 bg-blue-900 text-white font-black rounded-xl flex items-center justify-center text-sm">
                              {player?.number ? `#${player.number}` : <User size={20} />}
                            </div>
                          )}
                          {player?.number && (
                            <span className="absolute -bottom-1 -right-1 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md">
                              #{player.number}
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-blue-950 flex items-center gap-2">
                            <span>{player?.name || 'لاعب غير معروف'}</span>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{player?.category}</span>
                          </h4>
                          <p className="text-xs font-bold text-orange-600 mt-0.5">{injury.type}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {canEditMedical && (
                          <button
                            onClick={() => openInjuryModal(injury)}
                            className="p-2 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-all"
                            title="تعديل السجل"
                          >
                            <History size={16} />
                          </button>
                        )}
                        {canDeleteMedical && (
                          <button
                            onClick={() => handleDeleteInjury(injury.id)}
                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="حذف (للمدير فقط)"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* تفاصيل التشخيص والآلية */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 block mb-0.5">الموقع التشريحي</span>
                        <span className="font-black text-slate-800">{injury.location || 'غير محدد'}</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 block mb-0.5">الشدة والآلية</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                            injury.severity === 'حرجة' ? 'bg-red-100 text-red-700' :
                            injury.severity === 'متوسطة' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {injury.severity}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500">
                            {injury.mechanism === 'contact' ? '⚔️ احتكاك' : '🏃 لا تلامسي'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* شريط مسار العودة للعب (RTP Protocol Bar) */}
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                      <div className="flex justify-between items-center text-[10px] font-black">
                        <span className="text-slate-600 flex items-center gap-1">
                          <Activity size={12} className="text-orange-500" /> مسار التأهيل والعودة (RTP):
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg border font-black ${rtp.badgeClass}`}>
                          {rtp.label}
                        </span>
                      </div>

                      {/* شريط التقدم التفاعلي بخمس خطوات */}
                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {(['clinic', 'gym', 'pitch', 'partial', 'cleared'] as RTPStage[]).map((stageKey, idx) => {
                          const conf = RTP_STAGES_CONFIG[stageKey];
                          const isActive = (rtp.step >= conf.step);
                          const isCurrent = (injury.rtpStage === stageKey);

                          return (
                            <button
                              key={stageKey}
                              type="button"
                              disabled={!canEditMedical}
                              onClick={() => canEditMedical && handleQuickChangeRTP(injury, stageKey)}
                              className={`h-2.5 rounded-full transition-all relative group ${
                                isActive ? conf.barColor : 'bg-slate-200 hover:bg-slate-300'
                              } ${isCurrent ? 'ring-2 ring-blue-900 ring-offset-1' : ''} ${!canEditMedical ? 'cursor-default opacity-80' : ''}`}
                              title={canEditMedical ? `تغيير إلى: ${conf.label}` : conf.label}
                            />
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium italic mt-1">{rtp.description}</p>
                    </div>

                    {/* توصيات الطبيب للمدرب */}
                    {injury.doctorNotesToCoach && (
                      <div className="bg-blue-50 border border-blue-200/70 p-3 rounded-xl text-xs space-y-1">
                        <span className="text-[10px] font-black text-blue-900 flex items-center gap-1">
                          📢 توجيهات الجهاز الطبي للمدرب:
                        </span>
                        <p className="text-[11px] font-bold text-blue-950 leading-relaxed">{injury.doctorNotesToCoach}</p>
                      </div>
                    )}

                    {/* صور الأشعة والرنين المغناطيسي المرفوعة */}
                    {injury.imagingUrls && injury.imagingUrls.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-black text-slate-500 flex items-center gap-1">
                          <Eye size={12} className="text-indigo-600" /> صور وتقارير الرنين والأشعة ({injury.imagingUrls.length}):
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {injury.imagingUrls.map((url, i) => {
                            const isPdf = url.toLowerCase().includes('.pdf');
                            if (isPdf) {
                              return (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-red-200 hover:border-red-500 bg-red-50 flex flex-col items-center justify-center text-red-600 shrink-0 group shadow-sm p-1 text-center transition-all"
                                  title="فتح تقرير PDF الطبي في صفحة جديدة"
                                >
                                  <FileText size={18} />
                                  <span className="text-[8px] font-black mt-0.5">تقرير PDF</span>
                                </a>
                              );
                            }
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setPreviewImageUrl(url)}
                                className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-indigo-200 hover:border-indigo-500 transition-all shrink-0 group shadow-sm"
                                title="معاينة وتكبير صورة الأشعة"
                              >
                                <img src={url} alt="أشعة" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                <div className="absolute inset-0 bg-blue-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
                                  <Eye size={14} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* سجل الجلسات اليومية المنفذة في العيادة */}
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                      <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <Calendar size={12} />
                        <span>البدء: {injury.startDate}</span>
                        {injury.expectedReturn && (
                          <span className="text-orange-600 font-black mr-2">العودة المتوقعة: {injury.expectedReturn}</span>
                        )}
                      </div>

                      {canEditMedical ? (
                        <button
                          type="button"
                          onClick={() => setSelectedInjuryForTreatment(injury)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 rounded-lg text-[10px] font-black transition-all flex items-center gap-1"
                        >
                          <Plus size={12} /> جلسة علاج ({injury.treatmentsLog?.length || 0})
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400">جلسات العلاج: {injury.treatmentsLog?.length || 0}</span>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* التبويب 2: البطاقات الطبية وفحوصات السلامة (PCMA) */}
      {/* ========================================================================= */}
      {activeMainTab === 'pcma' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-sm font-black text-blue-950 flex items-center gap-2">
                <HeartPulse size={18} className="text-rose-600" /> بطاقات الفحص الطبي الدوري الشامل (Pre-Competition Assessment)
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">متابعة فحص القلب والأوعية (ECG)، الحساسية الدوائية، والجاهزية البدنية</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="بحث باسم اللاعب أو الرقم..."
                value={searchPlayerQuery}
                onChange={e => setSearchPlayerQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pr-9 pl-3 text-xs font-bold text-slate-900 focus:border-blue-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allSquadPlayers.map(player => {
              const med = getPlayerMedicalCard(player);
              const isAvailable = med.availabilityStatus === 'available';
              const isModified = med.availabilityStatus === 'modified';
              const isOut = med.availabilityStatus === 'unavailable';

              return (
                <div 
                  key={player.id} 
                  className="bg-white p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      {player.photo ? (
                        <img src={player.photo} alt={player.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                      ) : (
                        <div className="w-12 h-12 bg-blue-900 text-white font-black rounded-xl flex items-center justify-center text-sm">
                          {player.number ? `#${player.number}` : <User size={20} />}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-black text-blue-950">{player.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{player.category}</span>
                          {player.number && <span className="text-[10px] font-black text-orange-600">قميص #{player.number}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black border ${
                        isAvailable ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        isModified ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : isModified ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'}`}></span>
                        {isAvailable ? 'جاهز 100%' : isModified ? 'مشاركة مقيدة' : 'غير متاح'}
                      </span>
                    </div>
                  </div>

                  {/* المؤشرات الطبية الأساسية */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500">فصيلة الدم:</span>
                      <span className="font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md text-xs">
                        🩸 {med.bloodType || player.bloodType || 'غير محددة'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500">فحص القلب والأوعية (ECG):</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          med.cardioStatus === 'سليم' ? 'bg-emerald-100 text-emerald-800' :
                          med.cardioStatus === 'يحتاج متابعة' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {med.cardioStatus || 'سليم'}
                        </span>
                        {med.ecgReportUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(med.ecgReportUrl!)}
                            className="text-blue-600 hover:text-blue-800"
                            title="معاينة تخطيط القلب"
                          >
                            <FileCheck size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* الحساسية الدوائية والغذائية */}
                    {med.allergies ? (
                      <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl text-[10px] text-red-900 font-bold space-y-0.5">
                        <span className="font-black flex items-center gap-1 text-red-700">
                          <AlertTriangle size={12} /> الحساسية الدوائية / الغذائية:
                        </span>
                        <p>{med.allergies}</p>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-2 rounded-xl text-[10px] text-slate-400 font-bold text-center">
                        لا توجد حساسية دوائية مسجلة
                      </div>
                    )}

                    {/* الأمراض المزمنة واستثناء المنشطات */}
                    {med.tueDetails && (
                      <div className="bg-indigo-50 border border-indigo-200 p-2 rounded-xl text-[10px] text-indigo-900 font-bold">
                        <span className="font-black text-indigo-700">استثناء المنشطات (TUE):</span> {med.tueDetails}
                      </div>
                    )}
                  </div>

                  {/* زر تعديل الملف الطبي */}
                  {canEditMedical && (
                    <button
                      type="button"
                      onClick={() => openPCMAModal(player)}
                      className="w-full bg-slate-100 hover:bg-blue-900 hover:text-white text-slate-700 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Stethoscope size={14} /> تعديل الفحوصات الطبية
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* التبويب 3: تحليلات وإحصائيات الوقاية من الإصابات */}
      {/* ========================================================================= */}
      {activeMainTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* توزيع الإصابات حسب المنطقة التشريحية */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-blue-950 flex items-center gap-2">
                <Activity size={18} className="text-orange-500" /> أكثر الإصابات تكراراً في النادي
              </h4>
              <div className="space-y-2.5">
                {(() => {
                  const counts: Record<string, number> = {};
                  state.injuries.forEach(i => {
                    const key = i.location || i.type || 'أخرى';
                    counts[key] = (counts[key] || 0) + 1;
                  });
                  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                  if (sorted.length === 0) return <p className="text-xs text-slate-400">لا توجد إصابات مسجلة بعد.</p>;

                  return sorted.slice(0, 5).map(([name, count]) => {
                    const percent = Math.round((count / state.injuries.length) * 100) || 0;
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-slate-800">{name}</span>
                          <span className="text-slate-500">{count} إصابة ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 rounded-full" style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* توزيع الإصابات حسب الفئات السنية */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-blue-950 flex items-center gap-2">
                <Users size={18} className="text-indigo-500" /> توزيع الإصابات حسب الفئة السنية
              </h4>
              <div className="space-y-2.5">
                {state.categories.map(cat => {
                  const catInjuries = state.injuries.filter(i => {
                    const p = state.people.find(person => person.id === i.personId);
                    return p?.category === cat;
                  });
                  const count = catInjuries.length;
                  const percent = state.injuries.length > 0 ? Math.round((count / state.injuries.length) * 100) : 0;

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-800">{cat}</span>
                        <span className="text-slate-500">{count} حالة</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* توصيات وقائية طبية للفريق */}
            <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-6 rounded-3xl text-white shadow-lg space-y-4">
              <h4 className="text-sm font-black text-orange-400 flex items-center gap-2">
                <Sparkles size={18} /> توصيات الوقاية والاستشفاء
              </h4>
              <ul className="space-y-3 text-xs text-blue-100/90 leading-relaxed font-bold">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>تطبيق تمارين تقوية العضلة الخلفية اللامركزية (Nordic Hamstring) مرتين أسبوعياً لتقليل التمزقات بنسبة 50%.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>مراقبة ترطيب اللاعبين وتوفير أملاح الصوديوم والمغنيسيوم في المباريات الحارة لتفادي الشد العضلي.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>الالتزام التام ببروتوكول العودة للعب (RTP) وعدم إشراك أي لاعب إلا بعد اجتياز المرحلة الخامسة.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* نافذة تسجيل / تعديل الإصابة (Injury Modal) */}
      {/* ========================================================================= */}
      {isInjuryModalOpen && (
        <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-md z-[600] flex items-center justify-center p-2 sm:p-4 no-print overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-100 animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-blue-950">
                    {editingInjury ? 'تعديل السجل الطبي ومرحلة التأهيل' : 'تسجيل حالة طبية جديدة'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold">بروتوكول FIFA الطبي للرعاية الرياضية</p>
                </div>
              </div>
              <button onClick={() => setIsInjuryModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveInjury} className="p-5 md:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              
              {/* اختيار اللاعب */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">فئة اللاعب:</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500" 
                    value={modalCategoryFilter} 
                    onChange={e => {
                      setModalCategoryFilter(e.target.value); 
                      setInjuryFormData({ ...injuryFormData, personId: '' });
                    }}
                  >
                    <option value="الكل">جميع الفئات</option>
                    {allowedCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">اللاعب المصاب *:</label>
                  <select 
                    required 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500" 
                    value={injuryFormData.personId || ''} 
                    onChange={e => setInjuryFormData({ ...injuryFormData, personId: e.target.value })}
                  >
                    <option value="">-- اختر اللاعب --</option>
                    {state.people
                      .filter(p => p.role === 'لاعب' && (modalCategoryFilter === 'الكل' || p.category === modalCategoryFilter))
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.number ? `(#${p.number})` : ''} - {p.category}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* نوع الإصابة والموقع التشريحي */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">نوع الإصابة *:</label>
                  <input
                    list="common-injuries"
                    required
                    placeholder="تمزق عضلي، التواء كاحل..."
                    value={injuryFormData.type || ''}
                    onChange={e => setInjuryFormData({ ...injuryFormData, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                  />
                  <datalist id="common-injuries">
                    {COMMON_INJURY_TYPES.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">الموقع والمنطقة التشريحية:</label>
                  <input
                    list="body-zones"
                    placeholder="العضلة الضامة، الرباط الصليبي، الكاحل..."
                    value={injuryFormData.location || ''}
                    onChange={e => setInjuryFormData({ ...injuryFormData, location: e.target.value, bodyZone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                  />
                  <datalist id="body-zones">
                    {ANATOMICAL_BODY_ZONES.map(z => <option key={z} value={z} />)}
                  </datalist>
                </div>
              </div>

              {/* الشدة، الآلية، ومرحلة العودة للعب */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">درجة الشدة:</label>
                  <select
                    value={injuryFormData.severity || 'متوسطة'}
                    onChange={e => setInjuryFormData({ ...injuryFormData, severity: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                  >
                    <option value="خفيفة">خفيفة (غياب 1-7 أيام)</option>
                    <option value="متوسطة">متوسطة (غياب 1-4 أسابيع)</option>
                    <option value="حرجة">حرجة (غياب أكثر من شهر)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">آلية الإصابة:</label>
                  <select
                    value={injuryFormData.mechanism || 'non_contact'}
                    onChange={e => setInjuryFormData({ ...injuryFormData, mechanism: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                  >
                    <option value="non_contact">🏃 لا تلامسية (إجهاد/التواء)</option>
                    <option value="contact">⚔️ احتكاك مباشر مع الخصم</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">مرحلة العودة للعب (RTP):</label>
                  <select
                    value={injuryFormData.rtpStage || 'clinic'}
                    onChange={e => setInjuryFormData({ ...injuryFormData, rtpStage: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                  >
                    <option value="clinic">1. العيادة والعلاج الفيزيائي</option>
                    <option value="gym">2. صالة التقوية والحديد</option>
                    <option value="pitch">3. التأهيل على العشب</option>
                    <option value="partial">4. تدريب جزئي مع الفريق</option>
                    <option value="cleared">5. تصريح طبي كامل للعب</option>
                  </select>
                </div>
              </div>

              {/* التواريخ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">تاريخ حدوث الإصابة:</label>
                  <input
                    type="date"
                    required
                    value={injuryFormData.startDate || ''}
                    onChange={e => setInjuryFormData({ ...injuryFormData, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">تاريخ العودة المتوقع:</label>
                  <input
                    type="date"
                    value={injuryFormData.expectedReturn || ''}
                    onChange={e => setInjuryFormData({ ...injuryFormData, expectedReturn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* توجيهات الطبيب للمدرب */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-blue-900 block flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-orange-500" />
                  توصيات وتعليمات الطبيب للجهاز الفني والمدرب:
                </label>
                <input
                  type="text"
                  placeholder="مثال: يمنع من تسديد الكرات القوية، مشاركة 30 دقيقة فقط في الشوط الثاني..."
                  value={injuryFormData.doctorNotesToCoach || ''}
                  onChange={e => setInjuryFormData({ ...injuryFormData, doctorNotesToCoach: e.target.value })}
                  className="w-full bg-blue-50/60 border border-blue-200 rounded-xl p-3 text-xs font-bold text-blue-950 outline-none focus:border-blue-900"
                />
              </div>

              {/* رفع صور وتقارير الأشعة عبر Cloudinary */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-indigo-600" />
                    صور وتقارير الرنين المغناطيسي والأشعة (MRI / X-Ray):
                  </label>
                  <label className="cursor-pointer px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black transition-all flex items-center gap-1 shadow-sm">
                    {isUploadingImaging ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    <span>رفع صورة أشعة</span>
                    <input type="file" accept="image/*,application/pdf" multiple onChange={handleUploadImaging} className="hidden" disabled={isUploadingImaging} />
                  </label>
                </div>

                {injuryFormData.imagingUrls && injuryFormData.imagingUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {injuryFormData.imagingUrls.map((url, i) => {
                      const isPdf = url.toLowerCase().includes('.pdf');
                      return (
                        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 flex items-center justify-center">
                          {isPdf ? (
                            <div className="flex flex-col items-center justify-center text-red-600 p-1">
                              <FileText size={20} />
                              <span className="text-[8px] font-black mt-0.5">PDF</span>
                            </div>
                          ) : (
                            <img src={url} alt="أشعة" className="w-full h-full object-cover" />
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const filtered = injuryFormData.imagingUrls?.filter((_, idx) => idx !== i);
                              setInjuryFormData({ ...injuryFormData, imagingUrls: filtered });
                            }}
                            className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="حذف هذا الملف"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* الملاحظات الطبية العامة */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">الملاحظات السريرية وخطة العلاج:</label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات سريرية، استجابة اللاعب، الخطة العلاجية..."
                  value={injuryFormData.notes || ''}
                  onChange={e => setInjuryFormData({ ...injuryFormData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSavingInjury || isUploadingImaging}
                  className="flex-1 bg-gradient-to-r from-blue-950 to-blue-900 hover:from-blue-900 hover:to-blue-800 text-white py-3.5 rounded-xl font-black text-xs shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingInjury ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{editingInjury ? 'حفظ التعديلات' : 'تثبيت السجل الطبي'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInjuryModalOpen(false)}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* نافذة تعديل الملف الطبي للاعب (Player PCMA Modal) */}
      {/* ========================================================================= */}
      {selectedPlayerForPCMA && pcmaFormData && (
        <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-md z-[600] flex items-center justify-center p-2 sm:p-4 no-print overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-100 animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <HeartPulse size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-blue-950">الملف الطبي: {selectedPlayerForPCMA.name}</h3>
                  <p className="text-[10px] text-slate-500 font-bold">{selectedPlayerForPCMA.category} {selectedPlayerForPCMA.number ? `• قميص #${selectedPlayerForPCMA.number}` : ''}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPlayerForPCMA(null)} className="p-2 text-slate-400 hover:text-red-500 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePCMA} className="p-5 md:p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* حالة الجاهزية بنظام إشارة المرور */}
              <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <label className="text-[11px] font-black text-slate-800 block">إشارة المرور للجاهزية الفنية والبدنية:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPcmaFormData({ ...pcmaFormData, availabilityStatus: 'available' })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                      pcmaFormData.availabilityStatus === 'available'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <span>جاهز 100%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPcmaFormData({ ...pcmaFormData, availabilityStatus: 'modified' })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                      pcmaFormData.availabilityStatus === 'modified'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>مشاركة مقيدة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPcmaFormData({ ...pcmaFormData, availabilityStatus: 'unavailable' })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-1.5 ${
                      pcmaFormData.availabilityStatus === 'unavailable'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                    <span>غير متاح / مصاب</span>
                  </button>
                </div>
              </div>

              {/* فصيلة الدم وفحص القلب */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">فصيلة الدم:</label>
                  <select
                    value={pcmaFormData.bloodType || ''}
                    onChange={e => setPcmaFormData({ ...pcmaFormData, bloodType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-rose-500"
                  >
                    <option value="">اختر فصيلة الدم...</option>
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

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">حالة فحص القلب (Cardio / ECG):</label>
                  <select
                    value={pcmaFormData.cardioStatus || 'سليم'}
                    onChange={e => setPcmaFormData({ ...pcmaFormData, cardioStatus: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-rose-500"
                  >
                    <option value="سليم">سليم وموثق ✅</option>
                    <option value="يحتاج متابعة">يحتاج متابعة سريرية ⚠️</option>
                    <option value="غير مفحوص">لم يُفحص بعد ❓</option>
                  </select>
                </div>
              </div>

              {/* تاريخ الفحص القلبي ورفع تقرير التخطيط */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">تاريخ فحص القلب:</label>
                  <input
                    type="date"
                    value={pcmaFormData.cardioScreeningDate || ''}
                    onChange={e => setPcmaFormData({ ...pcmaFormData, cardioScreeningDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">تقرير تخطيط القلب (ECG):</label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all">
                      {isUploadingECG ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>{pcmaFormData.ecgReportUrl ? 'تحديث التقرير' : 'رفع صورة التقرير'}</span>
                      <input type="file" accept="image/*,application/pdf" onChange={handleUploadECG} className="hidden" disabled={isUploadingECG} />
                    </label>
                    {pcmaFormData.ecgReportUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(pcmaFormData.ecgReportUrl!)}
                        className="p-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100"
                        title="معاينة"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* الحساسية الدوائية والغذائية */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-red-600 block flex items-center gap-1.5">
                  <AlertTriangle size={14} /> الحساسية الدوائية والغذائية (Allergies):
                </label>
                <input
                  type="text"
                  placeholder="مثال: حساسية بنسلين، بروفين، أسبرين، مكسرات..."
                  value={pcmaFormData.allergies || ''}
                  onChange={e => setPcmaFormData({ ...pcmaFormData, allergies: e.target.value })}
                  className="w-full bg-red-50/50 border border-red-200 rounded-xl p-3 text-xs font-bold text-red-950 outline-none focus:border-red-500"
                />
              </div>

              {/* الأمراض المزمنة */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">أمراض سابقة أو مزمنة (كالربو والسكري):</label>
                <input
                  type="text"
                  placeholder="ربو تحسسي، بخاخ فينتولين عند الحاجة..."
                  value={pcmaFormData.chronicConditions || ''}
                  onChange={e => setPcmaFormData({ ...pcmaFormData, chronicConditions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-rose-500"
                />
              </div>

              {/* استثناء المنشطات (TUE) */}
              <div className="space-y-1">
                <label className="text-[11px] font-black text-indigo-700 block flex items-center gap-1.5">
                  <ShieldCheck size={14} /> الاستثناءات العلاجية لمكافحة المنشطات (TUE):
                </label>
                <input
                  type="text"
                  placeholder="رقم وتفاصيل إذن المنشطات الرسمي للاعب..."
                  value={pcmaFormData.tueDetails || ''}
                  onChange={e => setPcmaFormData({ ...pcmaFormData, tueDetails: e.target.value })}
                  className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl p-3 text-xs font-bold text-indigo-950 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSavingPCMA || isUploadingECG}
                  className="flex-1 bg-gradient-to-r from-blue-950 to-blue-900 hover:from-blue-900 hover:to-blue-800 text-white py-3.5 rounded-xl font-black text-xs shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSavingPCMA ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>حفظ البطاقة الطبية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPlayerForPCMA(null)}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* نافذة تسجيل جلسة علاج فيزيائي سريعة (Add Treatment Modal) */}
      {/* ========================================================================= */}
      {selectedInjuryForTreatment && (
        <div className="fixed inset-0 bg-blue-950/60 backdrop-blur-md z-[600] flex items-center justify-center p-2 sm:p-4 no-print">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="text-base font-black text-blue-950 flex items-center gap-2">
                <Activity size={18} className="text-orange-500" />
                تسجيل جلسة علاجية للاعب
              </h3>
              <button onClick={() => setSelectedInjuryForTreatment(null)} className="p-2 text-slate-400 hover:text-red-500 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTreatment} className="p-5 space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">الإجراء العلاجي المنفذ:</label>
                <select
                  value={treatmentFormData.treatment}
                  onChange={e => setTreatmentFormData({ ...treatmentFormData, treatment: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-900"
                >
                  <option value="جلسة علاج فيزيائي وتدليك استشفائي">تدليك استشفائي وإرخاء عضلي</option>
                  <option value="علاج بالليزر والموجات التصادمية (Shockwave)">علاج بالليزر والموجات التصادمية</option>
                  <option value="إبر جافة وتحفيز نقاط الزناد (Dry Needling)">إبر جافة وتحفيز نقاط الزناد</option>
                  <option value="جلسة كمادات ثلجية وضغط هوائي (Game Ready)">كمادات ثلجية وضغط هوائي</option>
                  <option value="تمارين استعادة المدى الحركي والاتزان">تمارين المدى الحركي والاتزان</option>
                  <option value="تمارين تقوية عضلية لا مركزية (Eccentric)">تمارين تقوية عضلية لا مركزية</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">اسم المعالج / الطبيب المشرف:</label>
                <input
                  type="text"
                  value={treatmentFormData.medicName}
                  onChange={e => setTreatmentFormData({ ...treatmentFormData, medicName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">ملاحظات الاستجابة للألم والتحسن:</label>
                <textarea
                  rows={2}
                  placeholder="تحسن في مدى الحركة، خف الألم بنسبة 50%..."
                  value={treatmentFormData.notes}
                  onChange={e => setTreatmentFormData({ ...treatmentFormData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-900 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSavingTreatment}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all"
                >
                  {isSavingTreatment ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>تثبيت الجلسة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInjuryForTreatment(null)}
                  className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* نافذة معاينة الأشعة والتقارير المكبرة (Lightbox) */}
      {/* ========================================================================= */}
      {previewImageUrl && (
        <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-md z-[700] flex items-center justify-center p-4" onClick={() => setPreviewImageUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <img src={previewImageUrl} alt="تقرير الأشعة" className="max-w-full max-h-[85vh] object-contain mx-auto" />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 left-3 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MedicalCenter;
