
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
    
    // البحث عن المستخدم في قاعدة البيانات الحالية
    const user = state.users.find(u => u.username === username);

    if (user) {
      if (user.role === 'مدير') {
        // كلمة سر المديرين الموحدة
        if (password === 'KSC@2026') {
          onLogin(user);
          return;
        }
      } else {
        // كلمة سر المدربين والمشاهدين الافتراضية
        if (password === 'KSC2026') {
          onLogin(user);
          return;
        }
      }
    }

    setError('خطأ في اسم المستخدم أو كلمة المرور.');
  };

  return (
    <div className="min-h-screen bg-[#001F3F] flex flex-col items-center justify-center p-4 font-['Tajawal']" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-[3.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 border border-slate-100">
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-12 flex flex-col items-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl"></div>
          
          <div className="bg-white p-4 rounded-[3rem] shadow-2xl mb-6 border border-white/20 transform hover:scale-105 transition-transform duration-500">
            <ClubLogo size={100} />
          </div>
          <h1 className="text-3xl font-black text-white text-center tracking-tight">نادي الكرامة الرياضي</h1>
          <p className="text-orange-400 font-black mt-1 text-sm uppercase tracking-[0.2em]">AL-KARAMAH SC</p>
        </div>

        <div className="p-10 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-black text-center border border-red-100">{error}</div>}
            
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 mr-2">اسم المستخدم</label>
              <div className="relative">
                <User className="absolute right-4 top-4 text-slate-400" size={20} />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-black"
                  placeholder="Izzat أو اسم الفئة" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 mr-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-4 text-slate-400" size={20} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-12 pl-4 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-black"
                  placeholder="كلمة المرور" />
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-2xl shadow-blue-200 mt-2 text-lg">دخول للنظام</button>
          </form>
          
          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-black leading-relaxed">
              نظام إدارة مكتب كرة القدم - نادي الكرامة الرياضي
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              Izzat Amer Alshikha 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
