
import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { AppUser, AppState } from '../types';
import ClubLogo from './ClubLogo';

interface LoginProps {
  onLogin: (user: AppUser) => void;
  state: AppState;
}

const Login: React.FC<LoginProps> = ({ onLogin, state }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.username.toUpperCase() === username.trim().toUpperCase());
    if (user && user.password === password) {
      onLogin(user);
    } else {
      setError('خطأ في بيانات الدخول. يرجى التثبت والمحاولة مجدداً.');
    }
  };

  return (
    <div className="min-h-screen bg-[#001F3F] flex flex-col items-center justify-center p-6 font-['Tajawal'] relative overflow-hidden" dir="rtl">
      {/* Decorative Elements */}
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-15%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>

      <div className="max-w-md w-full bg-white rounded-[4rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-700 relative z-10">
        <div className="bg-gradient-to-br from-[#001F3F] to-[#000F21] p-12 flex flex-col items-center text-center">
          <div className="bg-white p-6 rounded-[3rem] shadow-2xl mb-8 ring-8 ring-orange-500/10">
            <ClubLogo size={120} />
          </div>
          <h2 className="text-white font-black text-2xl tracking-tight leading-snug">AL-Karama Sport Club</h2>
          <h2 className="text-white font-black text-3xl tracking-tight leading-snug mt-1">نادي الكرامة الرياضي</h2>
          <p className="text-orange-400 font-black mt-4 text-sm uppercase tracking-widest bg-orange-500/10 px-6 py-2 rounded-full border border-orange-500/20">أهلاً بك في أفضل أندية سوريا</p>
        </div>

        <div className="p-12 space-y-8">
          <form onSubmit={handleLogin} className="space-y-8">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black text-center border border-red-100 animate-shake">{error}</div>}
            
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 mr-2 uppercase flex items-center gap-2">
                <User size={14} className="text-[#001F3F]" /> اسم المستخدم
              </label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder=""
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-5 px-8 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-black text-slate-800 transition-all text-xl" 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-500 mr-2 uppercase flex items-center gap-2">
                <Lock size={14} className="text-[#001F3F]" /> كلمة المرور السرية
              </label>
              <div className="relative">
                <input 
                  type={showPass ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-5 pr-8 pl-16 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-black text-slate-800 transition-all text-xl" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-3"
                >
                  {showPass ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
            </div>

            <button type="submit" className="w-full bg-[#001F3F] text-white font-black py-6 rounded-[2.5rem] hover:bg-black transition-all shadow-2xl shadow-blue-900/40 mt-4 text-2xl flex items-center justify-center gap-4 group">
              الدخول لغرفة العمليات 
              <ChevronLeft className="group-hover:-translate-x-2 transition-transform" size={28} />
            </button>
          </form>
          
          <div className="pt-8 border-t border-slate-100 text-center space-y-2">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Football Management Pro System</p>
            <p className="text-[10px] text-slate-400 font-bold">نظام إدارة نادي الكرامة | By: Izzat Amer Al-Shikha</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
