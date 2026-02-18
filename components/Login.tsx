
import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Loader2, ShieldCheck, ChevronLeft } from 'lucide-react';
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('يرجى إدخال المعرف ورمز الوصول.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const user = await onLoginAttempt(username, password);
      if (user) {
        setLoginSuccess(true);
      } else {
        setError('بيانات الدخول غير صحيحة أو الحساب غير مسجل.');
        setLoading(false);
      }
    } catch (err: any) {
      setError('حدث خطأ أثناء الاتصال بالسحابة.');
      setLoading(false);
    }
  };

  if (loginSuccess) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 font-['IBM_Plex_Sans_Arabic'] overflow-hidden">
        <div className="relative flex flex-col items-center animate-in zoom-in duration-700">
          <div className="w-48 h-48 bg-white/5 rounded-full flex items-center justify-center border-4 border-orange-500/20 relative">
             <div className="absolute inset-0 bg-orange-500 rounded-full blur-[80px] opacity-10 animate-pulse"></div>
             <ClubLogo size={120} />
             <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-3 rounded-full shadow-2xl animate-bounce">
                <ShieldCheck size={32} />
             </div>
          </div>
          <h2 className="text-white text-4xl font-black mt-12 tracking-tighter">Eagle OS: Access Granted</h2>
          <p className="text-orange-500 font-bold mt-4 uppercase tracking-[0.3em] animate-pulse">جاري تحميل بروتوكولات الإدارة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 font-['IBM_Plex_Sans_Arabic'] relative overflow-hidden">
      {/* Background Tech Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-500/5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/5 rounded-full blur-[120px]"></div>
      <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px'}}></div>

      <div className="max-w-md w-full bg-[#0f172a]/80 backdrop-blur-xl rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="p-12 text-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
          <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl mb-8 inline-block transform hover:scale-105 transition-all">
            <ClubLogo size={90} />
          </div>
          <h2 className="text-white font-black text-3xl tracking-tight uppercase">Eagle OS</h2>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">Intelligence Unit Management</p>
        </div>

        <form onSubmit={handleLogin} className="p-12 space-y-6">
          {error && (
            <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[10px] font-black text-center border border-red-500/20 animate-shake">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
              <User size={12} className="text-orange-500" /> المعرف الرقمي
            </label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              placeholder="Username" 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 px-6 text-white font-bold outline-none focus:border-orange-500 transition-all" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} className="text-orange-500" /> رمز الوصول
            </label>
            <div className="relative">
              <input 
                type={showPass ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                placeholder="Password"
                className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pr-6 pl-14 text-white font-bold outline-none focus:border-orange-500 transition-all" 
              />
              <button 
                type="button" 
                onClick={() => setShowPass(!showPass)} 
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-orange-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-orange-500/10 hover:bg-orange-600 transition-all active:scale-95 flex items-center justify-center gap-3 mt-8 group"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <span className="text-lg">تفعيل الدخول الذكي</span>
                <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
        
        <div className="pb-10 text-center">
          <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">Eagle Operating System v3.2</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
