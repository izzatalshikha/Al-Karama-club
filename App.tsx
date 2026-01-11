
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, X, Trophy, Bell, RefreshCw, User, CloudCheck, CloudOff, Cloud
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { AppUser, AppState, Person, AppNotification } from './types';

// Components
import Dashboard from './components/Dashboard';
import SquadManagement from './components/SquadManagement';
import AttendanceTracker from './components/AttendanceTracker';
import TrainingPlanner from './components/TrainingPlanner';
import MatchPlanner from './components/MatchPlanner';
import SettingsView from './components/SettingsView';
import PlayerReport from './components/PlayerReport';
import Login from './components/Login';
import ClubLogo from './components/ClubLogo';

// Helper: Standard UUID v4 Generator for Supabase Compatibility
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Supabase Configuration
const supabaseUrl = 'https://kfwqoigsghlgigjriyxf.supabase.co';
const supabaseAnonKey = 'sb_publishable_O2vR2yKUG-FVeaydD4z6Lg_tjFcKDic';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Person | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'error' | 'syncing'>('synced');
  
  const [state, setState] = useState<AppState>(() => {
    const defaultAdmin: AppUser = { id: generateUUID(), username: 'IZZAT', role: 'مدير', password: 'KSC@2026' };
    const saved = localStorage.getItem('alkarama_cloud_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, currentUser: null }; 
      } catch (e) { console.error(e); }
    }
    return {
      currentUser: null,
      categories: ['الرجال', 'الشباب', 'الناشئين', 'الأشبال'],
      people: [],
      sessions: [],
      matches: [],
      attendance: [],
      users: [defaultAdmin],
      notifications: [],
      globalCategoryFilter: 'الكل'
    };
  });

  useEffect(() => {
    localStorage.setItem('alkarama_cloud_v4', JSON.stringify(state));
  }, [state]);

  const addLog = useCallback((message: string, details?: string, type: AppNotification['type'] = 'info') => {
    const newNotif: AppNotification = {
      id: generateUUID(),
      message, details, type, timestamp: Date.now(), isRead: false
    };
    setState(prev => ({
      ...prev,
      notifications: [newNotif, ...prev.notifications].slice(0, 50)
    }));
  }, []);

  const sanitize = (data: any[]) => {
    return data.map(item => {
      const cleanItem = JSON.parse(JSON.stringify(item));
      // لا يتم حذف الحقول الأساسية هنا لضمان مطابقتها لقاعدة البيانات
      Object.keys(cleanItem).forEach(key => {
        if (cleanItem[key] === undefined || cleanItem[key] === "") {
          cleanItem[key] = null;
        }
      });
      return cleanItem;
    });
  };

  const fetchData = useCallback(async () => {
    if (!state.currentUser) return;
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      const [
        { data: cats },
        { data: ppl },
        { data: sess },
        { data: mtch },
        { data: attn },
        { data: usrs }
      ] = await Promise.all([
        supabase.from('categories').select('name'),
        supabase.from('people').select('*'),
        supabase.from('sessions').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('attendance').select('*'),
        supabase.from('users').select('*'),
      ]);

      // استبدال الحالة المحلية بالكامل ببيانات السحاب لضمان التزامن ومنع عودة المحذوفات
      setState(prev => ({
        ...prev,
        categories: (cats && cats.length > 0) ? cats.map(c => c.name) : prev.categories,
        people: ppl || [],
        sessions: sess || [],
        matches: mtch || [],
        attendance: attn || [],
        users: usrs || prev.users
      }));
      setSyncStatus('synced');
    } catch (error: any) {
      console.error("❌ Fetch Error:", error);
      setSyncStatus('error');
      addLog('خطأ في جلب البيانات', error.message || 'فشل الوصول للسحاب.', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [state.currentUser, addLog]);

  // الاشتراك في المزامنة اللحظية Realtime
  useEffect(() => {
    if (!state.currentUser) return;

    const channels = ['people', 'sessions', 'matches', 'attendance', 'users'].map(table => 
      supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table }, () => {
          fetchData(); // تحديث تلقائي عند حدوث أي تغيير خارجي (إضافة، تعديل، حذف)
        })
        .subscribe()
    );

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [state.currentUser, fetchData]);

  const pushData = useCallback(async (updatedState: AppState) => {
    if (!updatedState.currentUser) return;

    setSyncStatus('syncing');
    try {
      const tables = [
        { name: 'people', data: updatedState.people },
        { name: 'sessions', data: updatedState.sessions },
        { name: 'matches', data: updatedState.matches },
        { name: 'attendance', data: updatedState.attendance },
        { name: 'users', data: updatedState.users }
      ];

      for (const table of tables) {
        if (table.data.length > 0) {
          const { error } = await supabase
            .from(table.name)
            .upsert(sanitize(table.data), { onConflict: 'id' });
          
          if (error) {
            const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
            throw new Error(`${table.name}: ${msg}`);
          }
        }
      }

      setSyncStatus('synced');
    } catch (error: any) {
      setSyncStatus('error');
      const errorMsg = error.message || 'خطأ غير معروف في السحاب';
      addLog('فشل مزامنة الجداول', errorMsg, 'error');
      console.error("❌ Sync Error:", errorMsg);
    }
  }, [addLog]);

  useEffect(() => {
    if (state.currentUser) {
      fetchData();
    }
  }, [state.currentUser, fetchData]);

  const updateStateAndSync = async (updater: (prev: AppState) => AppState) => {
    let nextState: AppState | null = null;
    setState(prev => {
      nextState = updater(prev);
      return nextState;
    });

    if (nextState) {
      await pushData(nextState);
    }
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setActiveTab('dashboard');
  };

  if (!state.currentUser) {
    return <Login onLogin={(user) => setState(prev => ({ ...prev, currentUser: user }))} state={state} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'squad', label: 'إدارة الفريق', icon: Users },
    { id: 'attendance', label: 'نظام الحضور', icon: ClipboardCheck },
    { id: 'training', label: 'التدريبات', icon: Calendar },
    { id: 'matches', label: 'المباريات', icon: Trophy },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const unreadCount = state.notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-right font-['Tajawal'] overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-64 bg-[#001F3F] text-white transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} no-print shadow-2xl`}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <ClubLogo size={40} />
              <span className="font-black text-lg tracking-tight">نادي الكرامة</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2"><X size={24} /></button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                <item.icon size={20} />
                <span className="font-bold">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-colors font-bold">
              <LogOut size={20} /> <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-40 px-4 lg:px-8 py-4 flex items-center justify-between shadow-sm no-print">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 bg-slate-100 rounded-lg"><Menu size={24} /></button>
            <h1 className="text-xl font-black text-slate-800">
              {navItems.find(i => i.id === activeTab)?.label || (activeTab === 'report' ? 'التقرير الفني' : 'تفاصيل')}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all duration-500 ${
              syncStatus === 'synced' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              syncStatus === 'error' ? 'bg-red-50 border-red-200 text-red-700 animate-pulse' :
              'bg-orange-50 border-orange-200 text-orange-700'
            }`}>
               {syncStatus === 'synced' && <CloudCheck size={18} />}
               {syncStatus === 'error' && <CloudOff size={18} />}
               {syncStatus === 'syncing' && <Cloud size={18} className="animate-bounce" />}
               <span className="text-[10px] font-black uppercase whitespace-nowrap hidden sm:inline">
                 {syncStatus === 'synced' ? 'مزامنة كاملة' : syncStatus === 'error' ? 'خطأ بالربط' : 'جاري الرفع...'}
               </span>
            </div>

            <div className="hidden md:flex flex-col items-end px-4 border-r-2 border-orange-500">
              <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">المسؤول الحالي</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#001F3F]">{state.currentUser.username}</span>
                <User size={14} className="text-orange-600" />
              </div>
            </div>

            <button onClick={fetchData} className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
              <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </button>
            
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2.5 rounded-xl relative border ${showNotifications ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Bell size={20} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="absolute left-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border-2 border-slate-900 overflow-hidden z-[100] text-right">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-black text-xs uppercase text-slate-800">تنبيهات النظام</h3>
                    <button onClick={() => setState(p => ({ ...p, notifications: p.notifications.map(n => ({...n, isRead: true})) }))} className="text-[10px] text-blue-600 font-bold">قراءة الكل</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {state.notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs italic opacity-50">لا توجد تنبيهات</div>
                    ) : (
                      state.notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-orange-50/50' : ''}`}>
                          <p className="text-[11px] font-black text-slate-700 leading-tight">{n.message}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">{new Date(n.timestamp).toLocaleTimeString('ar-SY')}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {activeTab === 'dashboard' && <Dashboard state={state} setState={setState} onMatchClick={m => { setActiveTab('matches'); setSelectedMatchId(m); }} onSessionClick={s => { setActiveTab('attendance'); setSelectedSessionId(s); }} />}
            {activeTab === 'squad' && <SquadManagement state={state} setState={updateStateAndSync as any} onOpenReport={p => { setSelectedPlayer(p); setActiveTab('report'); }} addLog={addLog} />}
            {activeTab === 'attendance' && <AttendanceTracker state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'training' && <TrainingPlanner state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'matches' && <MatchPlanner state={state} setState={updateStateAndSync as any} defaultSelectedId={selectedMatchId} addLog={addLog} />}
            {activeTab === 'settings' && <SettingsView state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} onBack={() => setActiveTab('squad')} />}
          </div>
        </section>

        <footer className="bg-white/95 backdrop-blur-md border-t py-1.5 px-5 flex justify-between items-center no-print z-40">
           <p className="text-[7px] font-black text-slate-500 tracking-tighter">نادي الكرامة الرياضي - مكتب كرة القدم المركزي</p>
           <p className="text-[7px] font-black text-[#001F3F] border-r-2 border-orange-500 pr-2">By: Izzat Amer Al-Shikha | النسخة السحابية الموحدة (V4)</p>
        </footer>
      </main>
      
      {showNotifications && (
        <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)}></div>
      )}
    </div>
  );
};

export default App;
