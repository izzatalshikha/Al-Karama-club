
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, Trophy, 
  Activity, HeartPulse, QrCode, PenTool, Sparkles, Package, Printer, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, AppState, Person, AppNotification } from './types';
import html2pdf from 'html2pdf.js';

// Components
import Dashboard from './components/Dashboard';
import SquadManagement from './components/SquadManagement';
import AttendanceTracker from './components/AttendanceTracker';
import TrainingPlanner from './components/TrainingPlanner';
import MatchPlanner from './components/MatchPlanner';
import SettingsView from './components/SettingsView';
import PlayerReport from './components/PlayerReport';
import WarehouseManagement from './components/WarehouseManagement';
import Login from './components/Login';
import ClubLogo from './components/ClubLogo';
import AIAssistant from './components/AIAssistant';
import ChatBot from './components/ChatBot';
import TacticalBoard from './components/TacticalBoard';
import MedicalCenter from './components/MedicalCenter';
import QRManager from './components/QRManager';
import VisualAnalytics from './components/VisualAnalytics';

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const supabase = createClient(
  'https://kfwqoigsghlgigjriyxf.supabase.co',
  'sb_publishable_O2vR2yKUG-FVeaydD4z6Lg_tjFcKDic'
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing'>('synced');
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Person | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('alkarama_final_v1_fixed');
    if (saved) { try { return JSON.parse(saved); } catch (e) { console.error("Parse Error", e); } }
    return {
      currentUser: null, categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال'],
      people: [], sessions: [], matches: [], warehouse: [], technicalReports: [],
      attendance: [], users: [], notifications: [], globalCategoryFilter: 'الكل',
      injuries: [], tacticalPlans: []
    };
  });

  const addNotify = useCallback((message: string, type: AppNotification['type'] = 'info') => {
    const id = generateUUID();
    setNotifications(prev => [{ id, message, type, timestamp: Date.now() }, ...prev].slice(0, 3));
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  }, []);

  // المزامنة التلقائية المحسنة
  useEffect(() => {
    if (state.currentUser) {
      localStorage.setItem('alkarama_final_v1_fixed', JSON.stringify(state));
      setSyncStatus('syncing');
      const timer = setTimeout(async () => {
        try {
          await Promise.all([
            state.people.length > 0 && supabase.from('people').upsert(state.people),
            state.matches.length > 0 && supabase.from('matches').upsert(state.matches),
            state.attendance.length > 0 && supabase.from('attendance').upsert(state.attendance),
            state.warehouse.length > 0 && supabase.from('warehouse').upsert(state.warehouse),
            state.users.length > 0 && supabase.from('app_users').upsert(state.users),
            state.sessions.length > 0 && supabase.from('sessions').upsert(state.sessions)
          ]);
          setSyncStatus('synced');
        } catch (e) {
          console.error("Sync Error", e);
          setSyncStatus('error');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const fetchAllData = useCallback(async (user: AppUser) => {
    setIsInitialLoading(true);
    setSyncStatus('syncing');
    try {
      const [ppl, mtch, usrs, cats, sess, att] = await Promise.all([
        supabase.from('people').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('app_users').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('attendance').select('*')
      ]);

      setState(prev => ({
        ...prev,
        currentUser: user,
        people: ppl.data || [],
        matches: mtch.data || [],
        users: usrs.data || [],
        sessions: sess.data || [],
        attendance: att.data || [],
        categories: cats.data?.length ? cats.data.map(c => c.name) : prev.categories
      }));
      setSyncStatus('synced');
    } catch (e) {
      setSyncStatus('error');
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => updater(prev));
  };

  const onLoginAttempt = async (u: string, p: string) => {
    if ((u === 'عزت' || u.toUpperCase() === 'IZZAT') && p === '123') {
      const user: AppUser = { id: 'root', username: 'عزت عامر الشيخة', role: 'مدير' };
      await fetchAllData(user);
      return user;
    }
    const { data } = await supabase.from('app_users').select('*').eq('username', u).eq('password', p).maybeSingle();
    if (!data) return null;
    await fetchAllData(data);
    return data;
  };

  if (!state.currentUser) return <Login onLoginAttempt={onLoginAttempt} />;
  
  if (isInitialLoading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white font-['IBM_Plex_Sans_Arabic']">
       <Loader2 className="animate-spin text-orange-500 mb-4" size={50} />
       <h2 className="text-xl font-bold">جاري تحميل سجلات النادي المركزية...</h2>
    </div>
  );

  const navItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'squad', label: 'الفريق', icon: Users },
    { id: 'training', label: 'التدريبات', icon: Calendar },
    { id: 'attendance', label: 'الحضور', icon: ClipboardCheck },
    { id: 'tactics', label: 'التكتيك', icon: PenTool },
    { id: 'medical', label: 'الطبابة', icon: HeartPulse },
    { id: 'matches', label: 'المباريات', icon: Trophy },
    { id: 'warehouse', label: 'المستودع', icon: Package },
    { id: 'qr', label: 'نظام QR', icon: QrCode },
    { id: 'analytics', label: 'التحليلات', icon: Activity },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#020617] text-[#f8fafc] font-['IBM_Plex_Sans_Arabic'] overflow-hidden" dir="rtl">
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-[#0f172a] border-l border-white/5 transition-all duration-300 flex flex-col z-50 shadow-2xl`}>
        <div className="p-8 flex items-center justify-center gap-4">
           <ClubLogo size={isSidebarOpen ? 50 : 35} />
           {isSidebarOpen && <span className="text-lg font-bold text-white tracking-tight">الكرامة SC</span>}
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200
              ${activeTab === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}>
              <item.icon size={20} />
              {isSidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <button onClick={() => setState(prev => ({ ...prev, currentUser: null }))} 
            className="w-full p-3 rounded-xl text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition-all flex items-center justify-center gap-3">
            <LogOut size={18} /> {isSidebarOpen && <span className="text-sm font-semibold">خروج</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-20 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 px-8 flex items-center justify-between z-40">
          <div className="flex items-center gap-6">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-white/5 rounded-xl hover:bg-orange-500 transition-all">
                <Menu size={20} />
             </button>
             <h1 className="text-xl font-bold tracking-tight">{navItems.find(n => n.id === activeTab)?.label}</h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className={`px-4 py-2 rounded-full border border-white/5 text-[10px] font-bold ${syncStatus === 'synced' ? 'text-emerald-500' : 'text-orange-500'}`}>
                {syncStatus === 'synced' ? 'متصل ومزامن' : 'جاري المزامنة...'}
             </div>
             <button onClick={() => html2pdf().from(document.getElementById('report-section')).save()} 
                className="bg-white text-slate-900 px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-orange-500 hover:text-white transition-all shadow-xl flex items-center gap-2">
                <Printer size={16} /> تصدير PDF
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div id="report-section" className="max-w-6xl mx-auto space-y-8">
            {activeTab === 'dashboard' && <Dashboard state={state} setState={updateState} onMatchClick={(id) => { setSelectedMatchId(id); setActiveTab('matches'); }} onSessionClick={() => setActiveTab('attendance')} />}
            {activeTab === 'squad' && <SquadManagement state={state} setState={updateState} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addNotify} />}
            {activeTab === 'training' && <TrainingPlanner state={state} setState={updateState} addLog={addNotify} />}
            {activeTab === 'attendance' && <AttendanceTracker state={state} setState={updateState} addLog={addNotify} />}
            {activeTab === 'tactics' && <TacticalBoard state={state} setState={updateState} />}
            {activeTab === 'medical' && <MedicalCenter state={state} setState={updateState} />}
            {activeTab === 'matches' && <MatchPlanner state={state} setState={updateState} defaultSelectedId={selectedMatchId} getSuspension={() => ({isSuspended:false,currentYellows:0,hasActiveRed:false})} />}
            {activeTab === 'warehouse' && <WarehouseManagement state={state} setState={updateState} addLog={addNotify} />}
            {activeTab === 'qr' && <QRManager state={state} setState={updateState} />}
            {activeTab === 'analytics' && <VisualAnalytics state={state} />}
            {activeTab === 'settings' && <SettingsView state={state} setState={updateState} addLog={addNotify} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} onBack={() => setActiveTab('squad')} />}
          </div>
        </div>

        <div className="fixed bottom-8 left-8 z-[999] space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`p-4 rounded-xl shadow-2xl border-r-4 min-w-[200px] flex items-center gap-3 bg-[#1e293b] text-white ${n.type === 'success' ? 'border-emerald-500' : 'border-red-500'}`}>
              {n.type === 'success' ? <CheckCircle2 className="text-emerald-500" /> : <AlertCircle className="text-red-500" />}
              <span className="text-xs font-bold">{n.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
