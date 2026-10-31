import React, { useState, useEffect } from 'react';
import { 
  Download, Smartphone, Apple, Share, PlusSquare, CheckCircle2, 
  X, Sparkles, ShieldCheck, ArrowDown, ChevronRight, Zap, Check, AlertCircle, Play
} from 'lucide-react';
import ClubLogo from './ClubLogo';
import { usePWAInstall } from '../utils/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'ios' | 'android';
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose, defaultTab }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, triggerInstall } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('android');
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSPointer, setShowIOSPointer] = useState(false);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    } else if (isIOS) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }
  }, [defaultTab, isIOS, isOpen]);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    setIsInstalling(true);
    const result = await triggerInstall();
    setIsInstalling(false);

    if (result.success || result.outcome === 'accepted') {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
        setInstallSuccess(false);
      }, 2500);
    } else if (result.error === 'no_prompt') {
      // If browser didn't supply prompt event (e.g. Safari or unsupported browser)
      if (isIOS) {
        setShowIOSPointer(true);
      }
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" 
        dir="rtl"
        onClick={onClose}
      >
        <div 
          className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border-2 border-orange-500/20 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-300 max-h-[94vh] flex flex-col font-['IBM_Plex_Sans_Arabic']"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-blue-900 via-blue-950 to-slate-950 p-6 text-white shrink-0">
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
              title="إغلاق"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4">
              <div className="p-1 bg-white rounded-2xl shadow-xl shrink-0 ring-4 ring-orange-500/20">
                <ClubLogo size={56} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-orange-500 text-white rounded-full shadow-sm">
                    تطبيق النادي الرسمي
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                    <ShieldCheck size={14} /> تثبيت فوري
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black mt-1 tracking-tight text-white">تثبيت تطبيق Eagle OS</h2>
                <p className="text-blue-200 text-xs mt-0.5 font-medium">ثبّت التطبيق بنقرة واحدة ليعمل كأي تطبيق أصلي على جهازك</p>
              </div>
            </div>

            {/* Platform Selector Tabs */}
            <div className="mt-5 grid grid-cols-2 gap-2 bg-blue-950/70 p-1.5 rounded-2xl border border-white/10">
              <button
                onClick={() => { setActiveTab('android'); setShowIOSPointer(false); }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'android'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'text-blue-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <Smartphone size={16} />
                <span>أجهزة أندرويد (Android)</span>
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                  activeTab === 'ios'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                    : 'text-blue-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <Apple size={16} />
                <span>أجهزة آيفون (iPhone / iPad)</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

            {installSuccess ? (
              <div className="py-12 text-center animate-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-8 ring-emerald-50">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-2xl font-black text-slate-900">تم التثبيت بنجاح! 🎉</h3>
                <p className="text-slate-600 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                  تمت إضافة تطبيق <strong className="text-blue-900 font-black">Eagle OS</strong> إلى شاشتك الرئيسية. يمكنك الآن فتحه واستخدامه فوراً بشاشة كاملة وبدون متصفح!
                </p>
              </div>
            ) : activeTab === 'android' ? (
              /* Android Section */
              <div className="space-y-5">
                {/* HERO DIRECT INSTALL BUTTON */}
                <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 rounded-2xl p-5 text-white shadow-xl shadow-orange-500/25 relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black uppercase tracking-wider bg-black/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-300 animate-pulse" />
                      <span>تثبيت تلقائي بنقرة واحدة</span>
                    </span>
                    <span className="text-xs text-orange-100 font-bold">لجميع هواتف أندرويد</span>
                  </div>

                  <h3 className="text-lg font-black text-white leading-tight">اضغط على الزر أدناه لتثبيت التطبيق مباشرة</h3>
                  <p className="text-orange-100 text-xs mt-1 leading-relaxed">
                    سيفتح لك المتصفح نافذة تثبيت فورية لإضافة أيقونة النادي إلى شاشتك وقائمتك.
                  </p>

                  <button
                    onClick={handleDirectInstall}
                    disabled={isInstalling}
                    className="w-full mt-4 py-4 px-6 bg-white hover:bg-orange-50 active:scale-[0.98] text-orange-600 hover:text-orange-700 font-black text-base rounded-xl shadow-2xl transition-all flex items-center justify-center gap-2 group"
                  >
                    <Download size={22} className="group-hover:scale-110 transition-transform animate-bounce" />
                    <span>تثبيت التطبيق على جهازي الآن</span>
                  </button>
                </div>

                {/* Quick 2-Step Fallback (in case browser prompt requires manual menu) */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-black text-xs">
                    <Smartphone size={16} className="text-blue-900" />
                    <span>في حال لم يظهر التثبيت التلقائي لديك:</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                      <span className="w-6 h-6 rounded-lg bg-blue-900 text-white font-black text-[11px] flex items-center justify-center shrink-0">1</span>
                      <span className="flex-1">اضغط على زر الخيارات <strong className="text-blue-950 font-black">( ⋮ النقاط الثلاث )</strong> في أعلى المتصفح.</span>
                    </div>
                    <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-xs">
                      <span className="w-6 h-6 rounded-lg bg-orange-500 text-white font-black text-[11px] flex items-center justify-center shrink-0">2</span>
                      <span className="flex-1">اضغط على <strong className="text-orange-600 font-black">"تثبيت التطبيق" (Install App)</strong> أو <strong className="text-blue-900 font-bold">"إضافة للشاشة الرئيسية"</strong>.</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* iOS Section */
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-xl relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <Apple size={20} className="text-orange-400" />
                    <h3 className="text-base font-black">تثبيت التطبيق على آيفون وآيباد (iPhone / iPad)</h3>
                  </div>
                  <p className="text-blue-200 text-xs leading-relaxed">
                    نظام Apple يتيح لك تثبيت التطبيق مباشرة وبكل سهولة من خلال متصفح <strong className="text-white font-bold">Safari</strong> الرسمي بالخطوات البسيطة التالية:
                  </p>

                  <button
                    onClick={() => setShowIOSPointer(true)}
                    className="w-full mt-4 py-3.5 px-5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black text-sm rounded-xl shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Share size={18} />
                    <span>أرني خطوات التثبيت على شاشتي الآن 👇</span>
                  </button>
                </div>

                {/* Clear Illustrated Steps for iPhone */}
                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-blue-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                      1
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-900 text-sm">اضغط على زر المشاركة (Share) 📤</h4>
                        <span className="p-1.5 bg-white border border-slate-200 rounded-lg text-blue-600 shadow-xs">
                          <Share size={16} />
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        اضغط على أيقونة المشاركة (مربع مع سهم للأعلى) الموجودة في <strong>الشريط السفلي لمتصفح Safari</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                      2
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-900 text-sm">اختر "إضافة إلى الشاشة الرئيسية" ➕</h4>
                        <span className="p-1.5 bg-white border border-slate-200 rounded-lg text-orange-600 shadow-xs">
                          <PlusSquare size={16} />
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        مرر القائمة المنسدلة للأسفل قليلاً واضغط على خيار <strong className="text-orange-600">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                      3
                    </div>
                    <div className="flex-1 text-xs">
                      <h4 className="font-black text-slate-900 text-sm">اضغط "إضافة" (Add) بالزاوية العلوية</h4>
                      <p className="text-slate-600 mt-1 leading-relaxed">
                        اضغط على زر <strong>"إضافة" (Add)</strong> في أعلى يمين/يسار الشاشة، وسيظهر لك تطبيق Eagle OS فوراً على شاشة هاتفك مثل أي تطبيق تم تنزيله من App Store!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Why install highlights */}
            <div className="pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700">
                <div className="flex items-center gap-1.5 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>دخول فوري بلمسة واحدة</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>شاشة كاملة بدون متصفح</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>سرعة فائقة بالتحميل</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  <span>حفظ تسجيل الدخول دائماً</span>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-500 font-bold">نظام النسر الرياضي • Eagle OS</span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 rounded-xl font-bold text-xs transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* Floating Safari Pointer for iOS users */}
      {showIOSPointer && (
        <div className="fixed inset-x-0 bottom-0 z-[250] bg-slate-950/90 backdrop-blur-lg text-white p-6 shadow-2xl rounded-t-3xl border-t-2 border-orange-500 animate-in slide-in-from-bottom duration-300" dir="rtl">
          <div className="max-w-md mx-auto text-center space-y-3">
            <div className="inline-flex p-3 bg-orange-500 text-white rounded-full animate-bounce shadow-lg">
              <ArrowDown size={28} />
            </div>
            <h3 className="text-lg font-black text-white">اضغط على زر المشاركة أسفل الشاشة 👇</h3>
            <p className="text-sm text-blue-200">
              اضغط على أيقونة المشاركة <span className="inline-flex items-center px-2 py-0.5 bg-white text-blue-900 rounded font-black">📤</span> في شريط Safari بالأسفل، ثم اختر <strong className="text-orange-400">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.
            </p>
            <button
              onClick={() => setShowIOSPointer(false)}
              className="w-full py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold text-xs transition-colors"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const PWAFloatingPrompt: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => {
  const { isInstalled, isInstallable, isIOS, triggerInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('eagle_os_pwa_dismissed') === 'true';
    if (isDismissed) setDismissed(true);
  }, []);

  if (isInstalled || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('eagle_os_pwa_dismissed', 'true');
  };

  // When clicking the main action button on the banner:
  const handleQuickInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      const res = await triggerInstall();
      setIsInstalling(false);
      if (res.success || res.outcome === 'accepted') {
        setDismissed(true);
        return;
      }
    }
    // If iOS or prompt not directly available, open modal
    onOpenModal();
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-3 left-3 md:left-auto md:right-6 md:max-w-lg z-[130] animate-in slide-in-from-bottom-5 duration-500" dir="rtl">
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white rounded-2xl p-4 shadow-2xl border-2 border-orange-500/80 flex items-center gap-3.5 backdrop-blur-md ring-4 ring-orange-500/10">
        <div className="p-1 bg-white rounded-xl shadow-md shrink-0 ring-2 ring-orange-500/50">
          <ClubLogo size={46} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-black text-white">تثبيت تطبيق Eagle OS</span>
            <span className="px-2 py-0.5 bg-orange-500 text-[10px] font-black rounded-full text-white animate-pulse">
              متاح الآن
            </span>
          </div>
          <p className="text-[11px] text-blue-200 truncate mt-0.5 font-medium">اضغط للتثبيت فوراً على هاتفك دون متصفح</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleQuickInstallClick}
            disabled={isInstalling}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-500/40 transition-all flex items-center gap-1.5"
            title="تثبيت التطبيق الآن"
          >
            <Download size={15} className="animate-bounce" />
            <span>تثبيت الآن</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 text-blue-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
