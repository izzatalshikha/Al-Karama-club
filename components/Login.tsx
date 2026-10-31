import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Loader2, ShieldCheck, ChevronLeft, Award, Sparkles, Smartphone, Download } from 'lucide-react';
import { AppUser } from '../types';
import ClubLogo from './ClubLogo';
import { PWAInstallModal, PWAFloatingPrompt } from './PWAInstallModal';

interface LoginProps {
  onLoginAttempt: (username: string, password: string, isPlayerLogin?: boolean) => Promise<AppUser | null>;
}

const Login: React.FC<LoginProps> = ({ onLoginAttempt }) => {
  const [loginMode, setLoginMode] = useState<'admin' | 'player'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError(loginMode === 'player' ? 'يرجى إدخال اسم اللاعب وآخر 6 أرقام من الرقم الوطني.' : 'يرجى إدخال المعرف ورمز الوصول.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const user = await onLoginAttempt(username, password, loginMode === 'player');
      if (user) {
        setLoginSuccess(true);
      } else {
        setError(loginMode === 'player' 
          ? 'تعذر التحقق من بيانات اللاعب. يرجى التأكد من كتابة الاسم وآخر 6 أرقام من الرقم الوطني بشكل صحيح.' 
          : 'بيانات الدخول غير صحيحة أو الحساب غير مسجل.');
        setLoading(false);
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء الاتصال بالسحابة.');
      setLoading(false);
    }
  };

  if (loginSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-['IBM_Plex_Sans_Arabic'] overflow-hidden" dir="rtl">
        <div className="relative flex flex-col items-center animate-in zoom-in duration-700">
          <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center border-4 border-orange-500/20 relative shadow-2xl">
             <div className="absolute inset-0 bg-orange-500 rounded-full blur-[80px] opacity-10 animate-pulse"></div>
             <ClubLogo size={120} />
             <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-3 rounded-full shadow-2xl animate-bounce">
                <ShieldCheck size={32} />
             </div>
          </div>
          <h2 className="text-blue-900 text-3xl sm:text-4xl font-black mt-12 tracking-tight">
            {loginMode === 'player' ? 'مرحباً بك يا بطل' : 'Eagle OS: Access Granted'}
          </h2>
          <p className="text-orange-600 font-bold mt-4 uppercase tracking-[0.2em] animate-pulse">
            {loginMode === 'player' ? 'جاري فتح بطاقتك الرياضية...' : 'جاري تحميل بروتوكولات الإدارة...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-['IBM_Plex_Sans_Arabic'] relative overflow-hidden" dir="rtl">
      {/* Background Tech Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#000000 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>

      <div className="max-w-md w-full bg-white backdrop-blur-xl rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header Section */}
        <div className="pt-10 pb-6 px-8 text-center border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-transparent">
          <div className="bg-white p-4 rounded-[2rem] shadow-xl mb-4 inline-block transform hover:scale-105 transition-all border border-slate-100">
            <ClubLogo size={80} />
          </div>
          <h2 className="text-blue-900 font-black text-2xl sm:text-3xl tracking-tight">Eagle OS</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-1">نظام إدارة نادي الكرامة الرياضي</p>

          {/* Toggle between Admin/Staff and Player Portal */}
          <div className="mt-6 flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => { setLoginMode('admin'); setError(''); setUsername(''); setPassword(''); }}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                loginMode === 'admin' 
                  ? 'bg-blue-900 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User size={15} />
              <span>الإدارة والكادر</span>
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('player'); setError(''); setUsername(''); setPassword(''); }}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${
                loginMode === 'player' 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award size={15} />
              <span>بوابة اللاعبين</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8 sm:p-10 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black text-center border border-red-100 animate-shake leading-relaxed">
              {error}
            </div>
          )}

          {loginMode === 'player' ? (
            <div className="bg-orange-50/70 border border-orange-200/60 p-3.5 rounded-2xl text-center mb-2">
              <p className="text-[11px] font-black text-orange-900">
                ⭐ مرحباً بك في بوابتك الرياضية الخاصة!
              </p>
              <p className="text-[10px] text-orange-700 mt-1 font-semibold">
                أدخل اسمك المسجل وآخر 6 أرقام من رقمك الوطني للدخول لملفك مباشرة.
              </p>
            </div>
          ) : null}
          
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-600 mr-1 flex items-center gap-2">
              <User size={13} className="text-orange-500" />
              {loginMode === 'player' ? 'اسم اللاعب (كما هو مسجل بالنادي)' : 'المعرف الرقمي / اسم المستخدم'}
            </label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              placeholder={loginMode === 'player' ? 'مثال: محمد أحمد' : 'Username'} 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-slate-900 font-bold text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-slate-400 placeholder:font-normal" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-600 mr-1 flex items-center gap-2">
              <Lock size={13} className="text-orange-500" />
              {loginMode === 'player' ? 'الرمز السري (آخر 6 أرقام من الرقم الوطني)' : 'رمز الوصول أو آخر 6 أرقام من الرقم الوطني'}
            </label>
            <div className="relative">
              <input 
                type={showPass ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                placeholder={loginMode === 'player' ? '••••••' : 'رمز المرور أو آخر 6 أرقام من الرقم الوطني'} 
                maxLength={loginMode === 'player' ? 6 : undefined}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-5 pl-12 text-slate-900 font-bold text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder:text-slate-400" 
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)} 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {loginMode === 'player' ? (
              <p className="text-[10px] text-slate-400 mr-2 font-medium">
                * الرمز السري هو آخر 6 خانات من الرقم الوطني المدون في هويتك
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 mr-2 font-medium">
                * يمكن للكادر أيضاً الدخول بكتابة اسمه وآخر 6 أرقام من رقمه الوطني
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 mt-6 text-white ${
              loginMode === 'player'
                ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'
                : 'bg-blue-900 hover:bg-blue-800 shadow-blue-900/10'
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={22} />
            ) : (
              <>
                <span className="text-base">
                  {loginMode === 'player' ? 'دخول لملف اللاعب' : 'تفعيل الدخول الذكي'}
                </span>
                <ChevronLeft size={18} />
              </>
            )}
          </button>
          
          {loginMode === 'admin' ? (
            <div className="flex justify-center mt-3">
               <button type="button" className="text-orange-600 text-[10px] font-black uppercase tracking-widest hover:underline">
                  طلب استعادة رمز الوصول
               </button>
            </div>
          ) : (
            <div className="text-center mt-3">
              <span className="text-[10px] text-slate-400 font-bold">
                في حال واجهتك مشكلة في الدخول، يرجى مراجعة إداري فئتك
              </span>
            </div>
          )}
        </form>
        
        {/* PWA Install Shortcut Banner */}
        <div className="px-6 sm:px-8 pb-4">
          <button
            type="button"
            onClick={() => setShowInstallModal(true)}
            className="w-full p-3.5 bg-gradient-to-r from-blue-50 via-slate-50 to-orange-50/70 hover:from-blue-100/80 hover:to-orange-100/80 border border-blue-200/80 rounded-2xl flex items-center justify-between text-right transition-all group shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                <Smartphone size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                  <span>تثبيت التطبيق على هاتفك</span>
                  <span className="text-[9px] bg-blue-900 text-white px-1.5 py-0.5 rounded-md font-bold">آيفون وأندرويد</span>
                </p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">افتح التطبيق مباشرة من الشاشة الرئيسية بدون متصفح</p>
              </div>
            </div>
            <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 group-hover:text-orange-600 group-hover:border-orange-300 transition-colors shrink-0 mr-2">
              <Download size={16} />
            </div>
          </button>
        </div>

        <div className="pb-6 text-center">
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Eagle Operating System v3.2</p>
        </div>
      </div>

      <PWAFloatingPrompt onOpenModal={() => setShowInstallModal(true)} />
      <PWAInstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </div>
  );
};

export default Login;
