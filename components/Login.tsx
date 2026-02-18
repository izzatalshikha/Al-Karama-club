
import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ChevronLeft, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { AppUser } from '../types';
import ClubLogo from './ClubLogo';

interface LoginProps {
  onLoginAttempt: (username: string, password: string) => Promise<AppUser | null>;
}

const Login: React.FC<LoginProps> = ({ onLoginAttempt }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const techPattern = {
    backgroundImage: `
      radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0),
      linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)
    `,
    backgroundSize: '24px 24px, 40px 40px, 40px 40px'
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const user = await onLoginAttempt(username, password);
      if (user) {
        setLoginSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول. يرجى المحاولة لاحقاً.');
      setLoading(false);
    }
  };

  if (loginSuccess) {
    return (
      <div className="min-h-screen bg-[#001F3F] flex flex-col items-center justify-center p-6 font-['Tajawal'] relative overflow-hidden" dir="rtl" style={techPattern}>
        <div className="relative z-10 flex flex-col items-center animate-in zoom-in duration-700">
          <div className="relative">
             <div className="absolute inset-0 bg-orange-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
             <div className="bg-white p-10 rounded-full shadow-[0_0_100px_rgba(255,107,0,0.4)] border-8 border-orange-500/20 animate-bounce">
                <ClubLogo size={180} />
             </div>
             <div className="absolute -top-4 -right-4 bg-emerald-500 text-white p-4 rounded-full shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                <CheckCircle2 size={48} />
             </div>
          </div>
          <h2 className="text-white text-5xl font-black mt-12 tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-1000">Eagle OS: Authorized</h2>
          <p className="text-orange-400 text-xl font-bold mt-4 opacity-80 uppercase tracking-widest animate-pulse">جاري تحميل بروتوكولات الإدارة الذكية...</p>
          <div className="mt-12 flex gap-2">
             <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
             <div className="w-3 h-3 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
             <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#001F3F] flex flex-col items-center justify-center p-6 font-['Tajawal'] relative overflow-hidden" dir="rtl" style={techPattern}>
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-15%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>

      <div className="max-w-md w-full bg-white rounded-[4rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-700 relative z-10">
        <div className="bg-gradient-to-br from-[#001F3F] to-[#000F21] p-12 flex flex-col items-center text-center">
          <div className="bg-white p-6 rounded-[3rem] shadow-2xl mb-8 ring-8 ring-orange-500/10 transition-transform hover:scale-105 duration-500">
            <ClubLogo size={120} />
          </div>
          <h2 className="text-white font-black text-4xl tracking-tight leading-snug uppercase bg-gradient-to-r from-orange-400 to-white bg-clip-text text-transparent">Eagle OS</h2>
          <p className="text-white font-black mt-2 text-xs uppercase tracking-[0.4em] opacity-60">Football Management Intelligence</p>
          <p className="text-orange-400 font-black mt-5 text-sm uppercase tracking-widest bg-orange-500/10 px-6 py-2 rounded-full border border-orange-500/20">مكتب كرة القدم - نادي الكرامة</p>
        </div>

        <div className="p-12 space-y-8">
          <form onSubmit={handleLogin} className="space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[12px] font-black text-center border-2 border-red-200 animate-bounce">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 mr-2 uppercase flex items-center gap-2">
                <User size={14} className="text-[#001F3F]" /> المعرف الرقمي
              </label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
                placeholder="Username" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-5 px-8 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 font-black text-slate-800 transition-all text-xl disabled:opacity-50" 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 mr-2 uppercase flex items-center gap-2">
                <Lock size={14} className="text-[#001F3F]" /> رمز الوصول
              </label>
              <div className="relative">
                <input 
                  type={showPass ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Password"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-5 pr-8 pl-16 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 font-black text-slate-800 transition-all text-xl disabled:opacity-50" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-600 transition-colors p-3"
                >
                  {showPass ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#001F3F] text-white font-black py-6 rounded-[2.5rem] hover:bg-black transition-all shadow-2xl shadow-blue-900/40 mt-4 text-2xl flex items-center justify-center gap-4 group disabled:opacity-70 overflow-hidden relative"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={28} />
                  Eagle OS: Authenticating...
                </>
              ) : (
                <>
                  تفعيل الدخول الذكي
                  <ChevronLeft className="group-hover:-translate-x-2 transition-transform" size={28} />
                </>
              )}
            </button>
          </form>
          
          <div className="pt-8 border-t border-slate-100 text-center space-y-2">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Eagle Operating System v3.1</p>
            <p className="text-[10px] text-slate-400 font-bold">AL-KARAMAH SC | Official Management Unit</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;