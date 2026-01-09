
import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { AppUser, AppState } from '../types';
import ClubLogo from './ClubLogo';

interface LoginProps {
  onLogin: (user: AppUser) => void;
  state: AppState;
}

const Login: React.FC<LoginProps> = ({ onLogin, state }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = state.users.find(u => u.username === username);
    if (user && user.password === password) {
      onLogin(user);
      return;
    }
    setError('خطأ في اسم المستخدم أو كلمة المرور.');
  };

  return (
    <div className="min-h-screen bg-[#001F3F] flex flex-col items-center justify-center p-4 font-['Tajawal']" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-[3.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 border border-slate-100 flex flex-col relative">
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-10 flex flex-col items-center text-center">
          <div className="bg-white p-4 rounded-[3rem] shadow-2xl mb-6 border border-white/20">
            <ClubLogo size={90} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">نادي الكرامة الرياضي</h1>
          <p className="text-orange-400 font-black mt-1 text-xs uppercase tracking-[0.1em]">مكتب كرة القدم</p>
          <p className="text-blue-100 font-black mt-4 text-sm opacity-90 italic">أهلاً بك في أعظم نادي في الكون</p>
        </div>

        <div className="p-10 space-y-6 flex-1">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[11px] font-black text-center border border-red-100">{error}</div>}
            
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 mr-2">اسم المستخدم المعتمد</label>
              <div className="relative">
                <User className="absolute right-4 top-4 text-slate-400" size={20} />
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 font-black text-black"
                  placeholder="اسم المستخدم" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 mr-2">كلمة مرور النظام</label>
              <div className="relative">
                <Lock className="absolute right-4 top-4 text-slate-400" size={20} />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 font-black text-black"
                  placeholder="كلمة المرور" 
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-blue-200 mt-2 text-lg">دخول للنظام</button>
          </form>
          
          <div className="pt-8 border-t border-slate-100 text-center space-y-1">
            <p className="text-xs font-black text-slate-700">نادي الكرامة الرياضي - مكتب كرة القدم</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Izzat Amer Alshikha 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
