import React, { useMemo, useState } from 'react';
import { AppState, Person } from '../types';
import PlayerReport from './PlayerReport';
import ErrorBoundary from './ErrorBoundary';
import ClubLogo from './ClubLogo';
import PlayerWelcomeSplash from './PlayerWelcomeSplash';
import { 
  LogOut, Clock, Calendar, Trophy, ClipboardCheck, ArrowRight, User, 
  CreditCard, FileText, CheckCircle2, Save, Loader2, AlertCircle, FileCheck, ShieldCheck,
  Edit, UserCheck, Heart, Ruler, Scale, Phone, MapPin, Sparkles, Award
} from 'lucide-react';
import DocumentUploadCard from './DocumentUploadCard';
import { supabase } from '../App';
import { safeSavePerson } from '../utils/supabaseSanitizer';

interface PlayerPortalProps {
  player: Person;
  state: AppState;
  onLogout: () => void;
  setState?: (updater: (prev: AppState) => AppState) => void;
}

export const PlayerPortal: React.FC<PlayerPortalProps> = ({ player, state, onLogout, setState }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'edit-profile' | 'documents' | 'schedule'>('profile');
  const [showWelcomeSplash, setShowWelcomeSplash] = useState(true);

  // Personal & Athletic info form state
  const [phone, setPhone] = useState(player.phone || '');
  const [address, setAddress] = useState(player.address || '');
  const [emergencyContact, setEmergencyContact] = useState(player.emergencyContact || '');
  const [fatherName, setFatherName] = useState(player.fatherName || '');
  const [motherName, setMotherName] = useState(player.motherName || '');
  const [birthDate, setBirthDate] = useState(player.birthDate || '');
  const [birthPlace, setBirthPlace] = useState(player.birthPlace || '');
  const [khana, setKhana] = useState(player.khana || '');
  const [position, setPosition] = useState(player.position || '');
  const [preferredFoot, setPreferredFoot] = useState(player.preferredFoot || 'يمنى');
  const [height, setHeight] = useState(player.height ? String(player.height) : '');
  const [weight, setWeight] = useState(player.weight ? String(player.weight) : '');
  const [bloodType, setBloodType] = useState(player.bloodType || '');
  const [shoeSize, setShoeSize] = useState(player.shoeSize || '');
  const [clothesSize, setClothesSize] = useState(player.clothesSize || '');
  const [number, setNumber] = useState(player.number || '');
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalSuccessMsg, setPersonalSuccessMsg] = useState('');

  // Documents form state
  const [passportNumber, setPassportNumber] = useState(player.passportNumber || '');
  const [passportIssueDate, setPassportIssueDate] = useState(player.passportIssueDate || '');
  const [passportExpiryDate, setPassportExpiryDate] = useState(player.passportExpiryDate || '');
  const [idCardImage, setIdCardImage] = useState<string | undefined>(player.idCardImage);
  const [idCardBackImage, setIdCardBackImage] = useState<string | undefined>(player.idCardBackImage);
  const [passportImage, setPassportImage] = useState<string | undefined>(player.passportImage);
  const [isSavingDocs, setIsSavingDocs] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Save personal and athletic information
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPersonal(true);
    setPersonalSuccessMsg('');

    try {
      const updates: any = {
        phone: phone.trim() || null,
        address: address.trim() || null,
        emergencyPhone: emergencyContact.trim() || null,
        fatherName: fatherName.trim() || null,
        motherName: motherName.trim() || null,
        birthDate: birthDate || null,
        birthPlace: birthPlace.trim() || null,
        khana: khana.trim() || null,
        position: position.trim() || null,
        preferredFoot: preferredFoot as any || null,
        height: height ? parseFloat(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        bloodType: bloodType || null,
        shoeSize: shoeSize || null,
        clothesSize: clothesSize || null,
        number: number.trim() || null,
      };

      const saveRes = await safeSavePerson(updates, 'update', player.id);
      if (!saveRes.success) throw saveRes.error;

      // Update local state in parent
      setState?.(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === player.id ? { ...p, ...updates } : p)
      }));

      // Update current player instance props
      Object.assign(player, updates);

      setPersonalSuccessMsg('تم حفظ وتحديث بياناتك الشخصية والرياضية بنجاح في النظام!');
      setTimeout(() => setPersonalSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error(err);
      alert('خطأ أثناء حفظ البيانات: ' + (err.message || 'حدث خطأ في الاتصال'));
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // تطبيع صيغ التواريخ لدقة المقارنة والترتيب
  const normalizeDate = (raw: string | undefined | null): string => {
    if (!raw) return '';
    const str = String(raw).trim();
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return str;
  };

  // المباريات القادمة والمكتملة لفئة اللاعب (تشمل المباريات العادية ومباريات البطولات المضافة من الإداري)
  const { upcomingMatches, completedMatches } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const allMatches: any[] = [];
    const regularIds = new Set<string>();

    // 1. المباريات العادية
    (state.matches || []).forEach(m => {
      const inSquad = Array.isArray(m.squad) && m.squad.includes(player.id);
      const isMyCat = m.category === player.category;
      if (!isMyCat && !inSquad) return;

      const normDate = normalizeDate(m.date);
      const isDone = Boolean(m.isCompleted) || (m.ourScore !== '' && m.ourScore !== undefined && m.opponentScore !== '' && m.opponentScore !== undefined);
      
      let resType: 'win' | 'draw' | 'loss' | 'pending' = 'pending';
      if (isDone && m.ourScore !== undefined && m.opponentScore !== undefined) {
        const our = Number(m.ourScore);
        const opp = Number(m.opponentScore);
        if (our > opp) resType = 'win';
        else if (our === opp) resType = 'draw';
        else resType = 'loss';
      }

      regularIds.add(m.id);
      allMatches.push({
        id: m.id,
        category: m.category,
        opponent: m.opponent,
        ourTeamName: `الكرامة (${m.category})`,
        matchType: m.matchType || 'مباراة ودية',
        date: normDate || m.date,
        rawDate: m.date,
        time: m.time || '15:00',
        pitch: m.pitch,
        isCompleted: isDone,
        scoreText: isDone ? `${m.ourScore} - ${m.opponentScore}` : '',
        resType,
        notes: m.notes
      });
    });

    // 2. مباريات البطولات المضافة من الإداري
    (state.tournamentMatches || []).forEach(tm => {
      if (tm.linkedMatchId && regularIds.has(tm.linkedMatchId)) return;
      const tour = (state.tournaments || []).find(t => t.id === tm.tournamentId);
      const tourCat = tour?.category || '';
      if (tourCat !== player.category) return;

      const t1 = (state.tournamentTeams || []).find(t => t.id === tm.team1Id);
      const t2 = (state.tournamentTeams || []).find(t => t.id === tm.team2Id);
      const isOur1 = Boolean(t1?.isOurTeam || t1?.name?.includes('الكرامة') || t1?.name?.trim() === tourCat);
      const isOur2 = Boolean(t2?.isOurTeam || t2?.name?.includes('الكرامة') || t2?.name?.trim() === tourCat);
      if (!isOur1 && !isOur2) return;

      const opp = isOur1 ? (t2?.name || 'الخصم') : (t1?.name || 'الخصم');
      const ourScore = isOur1 ? tm.team1Score : tm.team2Score;
      const oppScore = isOur1 ? tm.team2Score : tm.team1Score;
      const hasScore = (ourScore !== null && ourScore !== undefined && oppScore !== null && oppScore !== undefined);
      const isDone = tm.status === 'ملعوبة' || hasScore;
      
      let resType: 'win' | 'draw' | 'loss' | 'pending' = 'pending';
      if (isDone && hasScore) {
        if (ourScore! > oppScore!) resType = 'win';
        else if (ourScore! === oppScore!) resType = 'draw';
        else resType = 'loss';
      }

      const normDate = normalizeDate(tm.matchDate);
      allMatches.push({
        id: tm.id,
        category: tourCat,
        opponent: opp,
        ourTeamName: `الكرامة (${tourCat})`,
        matchType: tour?.name ? `بطولة: ${tour.name}` : 'بطولة رسمية',
        date: normDate || tm.matchDate,
        rawDate: tm.matchDate,
        time: tm.matchTime || '15:00',
        pitch: tm.pitch,
        isCompleted: isDone,
        scoreText: hasScore ? `${ourScore} - ${oppScore}` : '',
        resType,
        notes: tm.notes
      });
    });

    const upcoming = allMatches
      .filter(m => !m.isCompleted && m.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    const completed = allMatches
      .filter(m => m.isCompleted)
      .sort((a, b) => b.date.localeCompare(a.date));

    return { upcomingMatches: upcoming, completedMatches: completed };
  }, [state.matches, state.tournamentMatches, state.tournaments, state.tournamentTeams, player.category, player.id]);

  // التمارين القادمة والمنتهية لفئة اللاعب
  const { upcomingSessions, completedSessions } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const catSessions = (state.sessions || [])
      .filter(s => s.category === player.category)
      .map(s => ({
        ...s,
        normDate: normalizeDate(s.date) || s.date
      }));

    const upcoming = catSessions
      .filter(s => !s.isCompleted && s.normDate >= today)
      .sort((a, b) => a.normDate.localeCompare(b.normDate));

    const completed = catSessions
      .filter(s => s.isCompleted || s.normDate < today)
      .sort((a, b) => b.normDate.localeCompare(a.normDate));

    return { upcomingSessions: upcoming, completedSessions: completed };
  }, [state.sessions, player.category]);

  // Handle saving documents from the portal
  const handleSaveDocuments = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDocs(true);
    setSaveSuccessMsg('');

    try {
      const updates = {
        passportNumber: passportNumber.trim() || null,
        passportIssueDate: passportIssueDate || null,
        passportExpiryDate: passportExpiryDate || null,
        idCardImage: idCardImage || null,
        idCardBackImage: idCardBackImage || null,
        passportImage: passportImage || null
      };

      const { error } = await supabase
        .from('people')
        .update(updates)
        .eq('id', player.id);

      if (error) throw error;

      // Update local state in parent
      setState?.(prev => ({
        ...prev,
        people: prev.people.map(p => p.id === player.id ? { ...p, ...updates } : p)
      }));

      // Update current player instance props
      Object.assign(player, updates);

      setSaveSuccessMsg('تم حفظ وتحديث بيانات جواز السفر والمستندات بنجاح في النظام!');
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error(err);
      alert('خطأ أثناء حفظ البيانات: ' + (err.message || 'حدث خطأ في الاتصال'));
    } finally {
      setIsSavingDocs(false);
    }
  };

  // Passport expiry helper
  const getPassportStatus = () => {
    if (!passportExpiryDate) return null;
    const expiry = new Date(passportExpiryDate);
    const now = new Date();
    const diffMonths = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (expiry < now) {
      return { status: 'expired', label: 'منتهي الصلاحية', color: 'bg-red-50 text-red-600 border-red-200' };
    }
    if (diffMonths <= 6) {
      return { status: 'expiring', label: 'ينتهي خلال أقل من 6 أشهر', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { status: 'valid', label: 'ساري المفعول', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  const passportStatus = getPassportStatus();
  const hasDocumentsUploaded = Boolean(idCardImage || idCardBackImage || passportImage || passportNumber);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['IBM_Plex_Sans_Arabic'] flex flex-col relative" dir="rtl">
      {/* Spectacular Champions Welcome for Player */}
      {showWelcomeSplash && (
        <PlayerWelcomeSplash 
          player={player} 
          onComplete={() => setShowWelcomeSplash(false)} 
        />
      )}

      {/* Top Header for Player */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {player.photo ? (
              <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-orange-500 shadow-md shrink-0">
                <img loading="lazy" decoding="async" src={player.photo} alt={player.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white flex items-center justify-center font-black text-xl border-2 border-orange-500/50 shadow-md shrink-0">
                {player.name.charAt(0)}
              </div>
            )}
            <ClubLogo size={36} className="hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-blue-900">{player.name}</h1>
                <span className="bg-orange-50 text-orange-600 border border-orange-200 text-[11px] font-black px-2.5 py-0.5 rounded-full">
                  فئة {player.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold">بوابة اللاعب الإلكترونية • نادي الكرامة</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Champions Welcome Replay Button بألوان النادي */}
            <button
              onClick={() => setShowWelcomeSplash(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-700 via-blue-600 to-orange-500 hover:from-blue-600 hover:to-orange-400 text-white font-black px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all border border-blue-400/40"
              title="عرض شارة وبطولة النادي"
            >
              <Trophy size={14} className="text-orange-300" />
              <span className="hidden sm:inline">ترحيب الأبطال</span>
            </button>

            <div className="hidden sm:flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'profile' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                الملف الشخصي
              </button>
              <button
                onClick={() => setActiveTab('edit-profile')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'edit-profile' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Edit size={14} />
                <span>تعديل بياناتي</span>
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'documents' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <CreditCard size={14} />
                <span>الوثائق وجواز السفر</span>
                {!hasDocumentsUploaded && (
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'schedule' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                المواعيد والجدول
              </button>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Mobile tab switch */}
        <div className="flex sm:hidden border-t border-slate-100 px-4 py-2 bg-slate-50/50 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-center transition-all whitespace-nowrap ${
              activeTab === 'profile' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 bg-white border border-slate-200'
            }`}
          >
            الملف الشخصي
          </button>
          <button
            onClick={() => setActiveTab('edit-profile')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-center transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
              activeTab === 'edit-profile' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 bg-white border border-slate-200'
            }`}
          >
            <Edit size={13} />
            تعديل بياناتي
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-center transition-all whitespace-nowrap flex items-center justify-center gap-1 ${
              activeTab === 'documents' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 bg-white border border-slate-200'
            }`}
          >
            <CreditCard size={13} />
            الوثائق
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-center transition-all whitespace-nowrap ${
              activeTab === 'schedule' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 bg-white border border-slate-200'
            }`}
          >
            المواعيد والجدول
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {activeTab === 'profile' ? (
          <div>
            {/* بطاقة دعوة لتحديث البيانات */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-4 sm:p-6 rounded-3xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-md border border-blue-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-400 shrink-0">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">تحديث وتعديل البيانات الشخصية والرياضية</h3>
                  <p className="text-xs text-blue-200 mt-0.5">يمكنك تعديل رقم هاتفك، عنوانك، أرقام الطوارئ، قياساتك البدنية وبياناتك الشخصية مباشرة</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('edit-profile')}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Edit size={16} /> تعديل بياناتي الآن
              </button>
            </div>

            <ErrorBoundary fallbackTitle="الملف الفني والسجل الرقمي للاعب">
              <PlayerReport
                player={player}
                state={state}
                setState={setState || (() => {})}
                onBack={() => {}}
              />
            </ErrorBoundary>
          </div>
        ) : activeTab === 'edit-profile' ? (
          <div className="space-y-6 animate-in fade-in">
            {/* هيدر تعديل البيانات */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-orange-300 mb-3">
                  <UserCheck size={16} /> تعديل السجل الشخصي للاعب
                </div>
                <h2 className="text-xl sm:text-2xl font-black mb-2">تعديل وتحديث بياناتك الشخصية والرياضية</h2>
                <p className="text-xs sm:text-sm text-blue-100 font-semibold leading-relaxed">
                  تأكد من صحة رقم هاتفك، عنوان سكنك، وجهات الاتصال للطوارئ، وقياساتك البدنية لتحديث ملفك الرسمي في النادي فوراً.
                </p>
              </div>
            </div>

            {/* رسالة نجاح الحفظ */}
            {personalSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center gap-3 text-emerald-800 font-bold text-sm shadow-sm animate-in zoom-in-95">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <span>{personalSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePersonalInfo} className="space-y-6">
              {/* القسم الأول: بيانات التواصل والمعلومات المدنية */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-black text-blue-900 mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
                  <User className="text-orange-500" size={22} />
                  1. بيانات التواصل والمعلومات الشخصية
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block flex items-center gap-1.5">
                      <Phone size={14} className="text-blue-600" /> رقم الهاتف الشخصي
                    </label>
                    <input
                      type="tel"
                      placeholder="09xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block flex items-center gap-1.5">
                      <Phone size={14} className="text-red-500" /> رقم هاتف الطوارئ / ولي الأمر
                    </label>
                    <input
                      type="tel"
                      placeholder="09xxxxxxxx"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-600" /> عنوان السكن
                    </label>
                    <input
                      type="text"
                      placeholder="المدينة، الحي، الشارع..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">اسم الأب</label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">اسم الأم</label>
                    <input
                      type="text"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">تاريخ الميلاد</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">مكان الولادة</label>
                    <input
                      type="text"
                      placeholder="مثال: حمص"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">الخانة (القيد المدني)</label>
                    <input
                      type="text"
                      placeholder="مثال: باب تدمر 42"
                      value={khana}
                      onChange={(e) => setKhana(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* القسم الثاني: القياسات والمعلومات الرياضية والبدنية */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-black text-blue-900 mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
                  <Ruler className="text-orange-500" size={22} />
                  2. القياسات والمعلومات البدنية والرياضية
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">المركز المفضل</label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    >
                      <option value="">اختر المركز...</option>
                      <option value="حارس مرمى">حارس مرمى</option>
                      <option value="مدافع قلب">مدافع قلب</option>
                      <option value="ظهير أيمن">ظهير أيمن</option>
                      <option value="ظهير أيسر">ظهير أيسر</option>
                      <option value="لاعب ارتكاز">لاعب ارتكاز</option>
                      <option value="خط وسط">خط وسط</option>
                      <option value="صانع ألعاب">صانع ألعاب</option>
                      <option value="جناح أيمن">جناح أيمن</option>
                      <option value="جناح أيسر">جناح أيسر</option>
                      <option value="مهاجم">مهاجم</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">القدم المفضلة</label>
                    <select
                      value={preferredFoot}
                      onChange={(e) => setPreferredFoot(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    >
                      <option value="يمنى">يمنى</option>
                      <option value="يسرى">يسرى</option>
                      <option value="كلاهما">كلاهما</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">رقم القميص</label>
                    <input
                      type="text"
                      placeholder="مثال: 10"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">زمرة الدم</label>
                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    >
                      <option value="">اختر زمرة الدم...</option>
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

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">الطول (سم)</label>
                    <input
                      type="number"
                      placeholder="مثال: 178"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">الوزن (كغ)</label>
                    <input
                      type="number"
                      placeholder="مثال: 72"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">مقاس الحذاء</label>
                    <input
                      type="text"
                      placeholder="مثال: 42"
                      value={shoeSize}
                      onChange={(e) => setShoeSize(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">مقاس الملابس الرياضية</label>
                    <select
                      value={clothesSize}
                      onChange={(e) => setClothesSize(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    >
                      <option value="">اختر المقاس...</option>
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="XXL">XXL</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* زر الحفظ */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className="text-xs font-bold text-blue-900 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
                >
                  <CreditCard size={16} />
                  <span>الانتقال لرفع الوثائق وجواز السفر &larr;</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingPersonal}
                  className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 text-base"
                >
                  {isSavingPersonal ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  <span>حفظ وتثبيت البيانات الشخصية</span>
                </button>
              </div>
            </form>
          </div>
        ) : activeTab === 'documents' ? (
          <div className="space-y-6 animate-in fade-in">
            {/* بطاقة مقدمة ومعلومات التوثيق */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-orange-300 mb-3">
                  <ShieldCheck size={16} /> التوثيق الرقمي للاعب
                </div>
                <h2 className="text-xl sm:text-2xl font-black mb-2">وثائق الهوية وجواز السفر</h2>
                <p className="text-xs sm:text-sm text-blue-100 font-semibold leading-relaxed">
                  يمكنك من هنا رفع صورة بطاقتك الشخصية (أو إخراج القيد) وصورة جواز السفر مع إدخال بيانات جواز السفر.
                  يقوم النظام بضغط الصور تلقائياً على جهازك لتوفير مساحة السيرفر مع بقاء كافة التفاصيل واضحة ودقيقة تماماً.
                </p>
              </div>
            </div>

            {/* رسالة نجاح الحفظ */}
            {saveSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl flex items-center gap-3 text-emerald-800 font-bold text-sm shadow-sm animate-in zoom-in-95">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveDocuments} className="space-y-6">
              {/* بيانات جواز السفر */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
                  <h3 className="text-base sm:text-lg font-black text-blue-900 flex items-center gap-2">
                    <CreditCard className="text-orange-500" size={22} />
                    بيانات جواز السفر
                  </h3>
                  {passportStatus && (
                    <span className={`text-xs font-black px-3 py-1 rounded-full border ${passportStatus.color}`}>
                      حالة الجواز: {passportStatus.label}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">رقم جواز السفر</label>
                    <input
                      type="text"
                      placeholder="مثال: N01234567"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">تاريخ الإصدار</label>
                    <input
                      type="date"
                      value={passportIssueDate}
                      onChange={(e) => setPassportIssueDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-600 block">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={passportExpiryDate}
                      onChange={(e) => setPassportExpiryDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-slate-900 focus:border-orange-500 outline-none text-sm font-bold shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* بطاقات رفع المستندات */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
                <h3 className="text-base sm:text-lg font-black text-blue-900 mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
                  <FileText className="text-orange-500" size={22} />
                  صور المستندات الثبوتية (الهوية والجواز)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DocumentUploadCard
                    title="صورة الهوية (الوجه الأول)"
                    description="قم برفع صورة واضحة للوجه الأمامي للبطاقة الشخصية أو إخراج القيد المدني"
                    value={idCardImage}
                    onChange={(b64) => setIdCardImage(b64)}
                    badgeLabel="الوجه الأمامي"
                  />

                  <DocumentUploadCard
                    title="صورة الهوية (الوجه الثاني)"
                    description="قم برفع صورة واضحة للوجه الخلفي للبطاقة الشخصية (اختياري)"
                    value={idCardBackImage}
                    onChange={(b64) => setIdCardBackImage(b64)}
                    badgeLabel="الوجه الخلفي"
                  />

                  <DocumentUploadCard
                    title="صورة جواز السفر"
                    description="قم برفع صورة واضحة لصفحة البيانات والصورة في جواز سفرك"
                    value={passportImage}
                    onChange={(b64) => setPassportImage(b64)}
                    badgeLabel="جواز السفر"
                  />
                </div>
              </div>

              {/* زر الحفظ */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingDocs}
                  className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white font-black px-8 py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 text-base"
                >
                  {isSavingDocs ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  <span>حفظ وتثبيت الوثائق في السجل</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
            {/* التمارين والتدريبات القادمة */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
                <h2 className="text-base sm:text-lg font-black text-blue-950 flex items-center gap-2">
                  <Calendar className="text-teal-600" size={22} />
                  <span>التمارين والتدريبات القادمة (فئة {player.category})</span>
                </h2>
                <span className="bg-teal-50 text-teal-800 text-xs font-black px-2.5 py-1 rounded-full border border-teal-200">
                  {upcomingSessions.length} تمرين مجدول
                </span>
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs sm:text-sm">
                  لا توجد تدريبات مجدولة قادمة حالياً لفريق {player.category}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingSessions.map(session => (
                    <div key={session.id} className="p-4 sm:p-5 rounded-2xl bg-teal-50/40 border border-teal-200/70 hover:border-teal-400 transition-all flex flex-col justify-between gap-3 shadow-xs">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-black text-slate-900 text-sm sm:text-base">{session.objective || 'تمرين فني وبدني'}</span>
                          <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0">
                            {session.duration || '90 دقيقة'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-bold">
                          <span className="flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            <Calendar size={12} className="text-teal-600" /> {session.normDate}
                          </span>
                          <span className="flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            <Clock size={12} className="text-teal-600" /> {session.time}
                          </span>
                          {session.pitch && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <MapPin size={12} className="text-slate-400" /> {session.pitch}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* المباريات القادمة */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
                <h2 className="text-base sm:text-lg font-black text-blue-950 flex items-center gap-2">
                  <Trophy className="text-orange-500" size={22} />
                  <span>المباريات القادمة (فريق {player.category})</span>
                </h2>
                <span className="bg-orange-50 text-orange-800 text-xs font-black px-2.5 py-1 rounded-full border border-orange-200">
                  {upcomingMatches.length} مباراة مرتقبة
                </span>
              </div>

              {upcomingMatches.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs sm:text-sm">
                  لا توجد مباريات رسمية أو ودية معلنة حالياً.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingMatches.map(m => (
                    <div key={m.id} className="p-4 sm:p-5 rounded-2xl bg-orange-50/40 border border-orange-200/80 hover:border-orange-400 transition-all flex flex-col justify-between gap-3 shadow-xs">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-black text-blue-950 text-sm sm:text-base">ضد: {m.opponent}</span>
                          <span className="bg-orange-100 text-orange-800 text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0">
                            {m.matchType}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-bold">
                          <span className="flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            <Calendar size={12} className="text-orange-600" /> {m.date}
                          </span>
                          <span className="flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            <Clock size={12} className="text-orange-600" /> {m.time}
                          </span>
                          {m.pitch && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <MapPin size={12} className="text-slate-400" /> {m.pitch}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* آخر نتائج ومباريات الفريق المعتمدة */}
            {completedMatches.length > 0 && (
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
                  <h2 className="text-base sm:text-lg font-black text-blue-950 flex items-center gap-2">
                    <Trophy className="text-emerald-600" size={22} />
                    <span>آخر نتائج ومباريات الفريق المعتمدة</span>
                  </h2>
                  <span className="bg-emerald-50 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-200">
                    {completedMatches.length} مباراة منتهية
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedMatches.slice(0, 6).map(m => {
                    const isWin = m.resType === 'win';
                    const isDraw = m.resType === 'draw';
                    return (
                      <div key={m.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between gap-4 shadow-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{m.matchType}</span>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">ضد: {m.opponent}</h4>
                          <p className="text-xs text-slate-500 font-bold">{m.date} | {m.pitch || 'ملعب غير محدد'}</p>
                        </div>
                        <div className="text-center shrink-0">
                          <div className={`text-xl sm:text-2xl font-black font-mono tracking-wider ${isWin ? 'text-emerald-700' : isDraw ? 'text-amber-700' : 'text-rose-700'}`}>
                            {m.scoreText}
                          </div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                            isWin ? 'bg-emerald-100 text-emerald-800' : isDraw ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isWin ? 'فوز للكرامة ✓' : isDraw ? 'تعادل' : 'خسارة'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlayerPortal;
