import React, { useState } from 'react';
import { 
  X, Save, Loader2, User, Phone, MapPin, Ruler, CreditCard, 
  Briefcase, Medal, Plus, Trash2, Upload, FileCheck, CheckCircle2, Calendar
} from 'lucide-react';
import { Person, Role, CoachingCertificate, PreviousExperience } from '../types';
import { supabase, generateUUID } from '../App';
import { safeSavePerson } from '../utils/supabaseSanitizer';
import DocumentUploadCard from './DocumentUploadCard';
import { compressDocumentImage } from '../utils/imageCompressor';

interface EditPersonModalProps {
  person: Person;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updatedPerson: Person) => void;
  isSelf?: boolean;
}

export const EditPersonModal: React.FC<EditPersonModalProps> = ({
  person,
  isOpen,
  onClose,
  onSaved,
  isSelf = false
}) => {
  const isPlayer = person.role === 'لاعب';

  const defaultPersonSeasons = Array.isArray(person.seasons) && person.seasons.length > 0
    ? person.seasons
    : (person.season ? [person.season] : ['2025/2026']);

  const [formData, setFormData] = useState<Partial<Person>>({
    ...person,
    season: person.season || defaultPersonSeasons[0] || '2025/2026',
    seasons: defaultPersonSeasons,
    certificates: person.certificates ? [...person.certificates] : [],
    experiences: person.experiences ? [...person.experiences] : [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const availableClubSeasons = ['2025/2026', '2026/2027', '2027/2028', '2028/2029', '2029/2030'];

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const cleanData: any = {
        ...formData,
        name: formData.name?.trim() || person.name
      };

      const saveRes = await safeSavePerson(cleanData, 'update', person.id);
      if (!saveRes.success) throw saveRes.error;

      const updated = { ...person, ...cleanData };
      onSaved(updated);
      setSuccessMsg('تم حفظ وتحديث البيانات بنجاح!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 print:hidden">
      <div className="absolute inset-0 bg-blue-950/60 backdrop-blur-md" onClick={onClose}></div>
      <div 
        className="relative bg-white w-full max-w-5xl max-h-[92vh] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* هيدر المودال */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-blue-900">
                تعديل بيانات {isPlayer ? 'اللاعب' : 'الكادر'}: {person.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold">
                {isSelf ? 'أنت تقوم بتعديل بيانات ملفك الشخصي الآن' : 'تعديل السجل الرقمي في النظام'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* رسائل التنبيه */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {/* نموذج البيانات */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 custom-scrollbar bg-slate-50">
          
          {/* 1. المعلومات الشخصية والتواصل */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
              <User size={16} /> 1. المعلومات الشخصية وبيانات التواصل
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">الاسم الكامل</label>
                <input
                  required
                  type="text"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">اسم الأب</label>
                <input
                  type="text"
                  value={formData.fatherName || ''}
                  onChange={e => setFormData({ ...formData, fatherName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">اسم الأم</label>
                <input
                  type="text"
                  value={formData.motherName || ''}
                  onChange={e => setFormData({ ...formData, motherName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">تاريخ الميلاد</label>
                <input
                  type="date"
                  value={formData.birthDate || ''}
                  onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">مكان الولادة</label>
                <input
                  type="text"
                  value={formData.birthPlace || ''}
                  onChange={e => setFormData({ ...formData, birthPlace: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">الخانة (القيد)</label>
                <input
                  type="text"
                  value={formData.khana || ''}
                  onChange={e => setFormData({ ...formData, khana: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">الرقم الوطني</label>
                <input
                  type="text"
                  value={formData.nationalId || ''}
                  onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block flex items-center gap-1.5">
                  <Phone size={13} className="text-blue-600" /> رقم الهاتف
                </label>
                <input
                  type="tel"
                  placeholder="09xxxxxxxx"
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block flex items-center gap-1.5">
                  <MapPin size={13} className="text-emerald-600" /> عنوان السكن
                </label>
                <input
                  type="text"
                  value={formData.address || ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>

              {isPlayer && (
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block flex items-center gap-1.5">
                    <Phone size={13} className="text-red-500" /> هاتف الطوارئ / ولي الأمر
                  </label>
                  <input
                    type="tel"
                    placeholder="09xxxxxxxx"
                    value={formData.emergencyContact || ''}
                    onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* سجل المواسم الرياضية والموسم النشط */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
              <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={16} className="text-orange-500" /> مواسم المشاركة في النادي وتحديث الموسم
              </h4>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                يحدد المواسم التي يظهر فيها {isPlayer ? 'اللاعب' : 'الكادر'}
              </span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900">
              <p className="font-bold">
                💡 الموسم الافتراضي الحالي للنظام هو <span className="font-black text-orange-600">2026/2027</span>.
                إذا كان العضو مقيداً في موسم سابق (مثل <span className="font-black">2025/2026</span>)، يمكنك ترفيعه أو تجديد قيده لكي يظهر في الموسم الجديد عبر تحديد موسم 2026/2027 أدناه.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-700 block">
                المواسم التي شارك/يلعب بها العضو (حدد جميع المواسم المعتمدة):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {availableClubSeasons.map(s => {
                  const currentSeasons = formData.seasons || [];
                  const isChecked = currentSeasons.includes(s);
                  return (
                    <label
                      key={s}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-black cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20' 
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-orange-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          const nextSeasons = e.target.checked
                            ? [...currentSeasons, s]
                            : currentSeasons.filter(x => x !== s);
                          setFormData({
                            ...formData,
                            seasons: nextSeasons,
                            season: nextSeasons[nextSeasons.length - 1] || s
                          });
                        }}
                        className="rounded text-orange-500 focus:ring-orange-400 w-4 h-4"
                      />
                      <span>موسم {s}</span>
                    </label>
                  );
                })}
              </div>

              {/* زر ترفيع / ترقية سريع إلى 2026/2027 */}
              {!(formData.seasons || []).includes('2026/2027') && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = formData.seasons || [];
                      const updated = Array.from(new Set([...cur, '2026/2027']));
                      setFormData({
                        ...formData,
                        seasons: updated,
                        season: '2026/2027'
                      });
                    }}
                    className="text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>✓ ترفيع وتثبيت القيد في موسم 2026/2027 فوراً</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 2. بيانات المركز والمقاييس (للاعبين) أو الدور والشهادات (للكوادر) */}
          {isPlayer ? (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                <Ruler size={16} /> 2. المقاييس والبيانات البدنية والرياضية
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">المركز</label>
                  <select
                    value={formData.position || ''}
                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
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

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">القدم المفضلة</label>
                  <select
                    value={formData.preferredFoot || 'يمنى'}
                    onChange={e => setFormData({ ...formData, preferredFoot: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  >
                    <option value="يمنى">يمنى</option>
                    <option value="يسرى">يسرى</option>
                    <option value="كلاهما">كلاهما</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">رقم القميص</label>
                  <input
                    type="text"
                    value={formData.number || ''}
                    onChange={e => setFormData({ ...formData, number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">زمرة الدم</label>
                  <select
                    value={formData.bloodType || ''}
                    onChange={e => setFormData({ ...formData, bloodType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  >
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

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">الطول (سم)</label>
                  <input
                    type="number"
                    value={formData.height || ''}
                    onChange={e => setFormData({ ...formData, height: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">الوزن (كغ)</label>
                  <input
                    type="number"
                    value={formData.weight || ''}
                    onChange={e => setFormData({ ...formData, weight: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">قياس الحذاء</label>
                  <input
                    type="text"
                    value={formData.shoeSize || ''}
                    onChange={e => setFormData({ ...formData, shoeSize: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">قياس الملابس</label>
                  <select
                    value={formData.clothesSize || ''}
                    onChange={e => setFormData({ ...formData, clothesSize: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  >
                    <option value="">اختر...</option>
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
          ) : (
            /* بيانات الكادر والمدربين */
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-orange-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
                <Briefcase size={16} /> 2. بيانات المنصب والمؤهلات الأكاديمية
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">الدور / المنصب</label>
                  <select
                    value={formData.role || 'مدرب'}
                    onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  >
                    <option value="مدرب">مدرب</option>
                    <option value="مساعد مدرب">مساعد مدرب</option>
                    <option value="مدرب حراس">مدرب حراس</option>
                    <option value="مدرب لياقة">مدرب لياقة</option>
                    <option value="إداري">إداري</option>
                    <option value="طبيب">طبيب</option>
                    <option value="معالج">معالج</option>
                    <option value="منسق إعلامي">منسق إعلامي</option>
                    <option value="مرافق">مرافق</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">التحصيل العلمي</label>
                  <input
                    type="text"
                    placeholder="مثال: دبلوم تربية رياضية"
                    value={formData.academicDegree || ''}
                    onChange={e => setFormData({ ...formData, academicDegree: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-600 block">الرقم الاتحادي</label>
                  <input
                    type="text"
                    value={formData.federalNumber || ''}
                    onChange={e => setFormData({ ...formData, federalNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* الشهادات التدريبية مع زر + وإمكانية رفع الصور */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[11px] font-black text-blue-900 flex items-center gap-1.5">
                    <Medal size={15} className="text-orange-500" />
                    الشهادات والدورات التدريبية ({formData.certificates?.length || 0})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const current = formData.certificates || [];
                      setFormData({
                        ...formData,
                        certificates: [...current, { id: generateUUID(), name: '', date: '' }]
                      });
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Plus size={14} /> إضافة شهادة جديدة (+)
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.certificates?.map((cert, cIdx) => (
                    <div key={cert.id || cIdx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          placeholder="اسم الشهادة أو الدورة التدريبية"
                          className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                          value={cert.name}
                          onChange={e => {
                            const arr = [...(formData.certificates || [])];
                            arr[cIdx] = { ...arr[cIdx], name: e.target.value };
                            setFormData({ ...formData, certificates: arr });
                          }}
                        />
                        <input
                          type="date"
                          className="w-36 bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                          value={cert.date}
                          onChange={e => {
                            const arr = [...(formData.certificates || [])];
                            arr[cIdx] = { ...arr[cIdx], date: e.target.value };
                            setFormData({ ...formData, certificates: arr });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const arr = (formData.certificates || []).filter((_, i) => i !== cIdx);
                            setFormData({ ...formData, certificates: arr });
                          }}
                          className="p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* رفع صورة الشهادة */}
                      <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200/80">
                        <label className="cursor-pointer bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border border-slate-200 transition-all shrink-0">
                          <Upload size={13} />
                          <span>{cert.image ? 'تغيير صورة الشهادة' : 'رفع صورة الشهادة'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressDocumentImage(file);
                                  const arr = [...(formData.certificates || [])];
                                  arr[cIdx] = { ...arr[cIdx], image: compressed };
                                  setFormData({ ...formData, certificates: arr });
                                } catch (err: any) {
                                  alert('خطأ أثناء معالجة الصورة: ' + err.message);
                                }
                              }
                            }}
                          />
                        </label>

                        {cert.image && (
                          <div className="flex items-center gap-2">
                            <img
                              src={cert.image}
                              alt="شهادة"
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-xs"
                            />
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <FileCheck size={12} /> مرفقة ومحفوظة
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const arr = [...(formData.certificates || [])];
                                arr[cIdx] = { ...arr[cIdx], image: undefined };
                                setFormData({ ...formData, certificates: arr });
                              }}
                              className="text-[10px] text-red-500 hover:underline font-bold"
                            >
                              إزالة الصورة
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. وثائق جواز السفر والهوية */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard size={16} className="text-orange-500" /> 3. بيانات جواز السفر والمستندات الثبوتية
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">رقم جواز السفر</label>
                <input
                  type="text"
                  placeholder="N01234567"
                  value={formData.passportNumber || ''}
                  onChange={e => setFormData({ ...formData, passportNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">تاريخ الإصدار</label>
                <input
                  type="date"
                  value={formData.passportIssueDate || ''}
                  onChange={e => setFormData({ ...formData, passportIssueDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-600 block">تاريخ الانتهاء</label>
                <input
                  type="date"
                  value={formData.passportExpiryDate || ''}
                  onChange={e => setFormData({ ...formData, passportExpiryDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900 focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            {/* بطاقات رفع الصور الثلاث مع الضغط التلقائي */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <DocumentUploadCard
                title="صورة الهوية (الوجه الأول)"
                description="الوجه الأمامي للبطاقة الشخصية أو إخراج القيد"
                value={formData.idCardImage}
                onChange={b64 => setFormData({ ...formData, idCardImage: b64 })}
                badgeLabel="الوجه الأمامي"
              />

              <DocumentUploadCard
                title="صورة الهوية (الوجه الثاني)"
                description="الوجه الخلفي للبطاقة الشخصية"
                value={formData.idCardBackImage}
                onChange={b64 => setFormData({ ...formData, idCardBackImage: b64 })}
                badgeLabel="الوجه الخلفي"
              />

              <DocumentUploadCard
                title="صورة جواز السفر"
                description="صفحة الصورة والبيانات الرسمية"
                value={formData.passportImage}
                onChange={b64 => setFormData({ ...formData, passportImage: b64 })}
                badgeLabel="جواز السفر"
              />
            </div>
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="sticky bottom-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 transition-all"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>حفظ وتثبيت التعديلات فوراً</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPersonModal;
