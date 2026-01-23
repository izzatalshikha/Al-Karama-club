
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, Calendar, ClipboardCheck, LayoutDashboard, Settings, LogOut, Menu, X, Trophy, Bell, RefreshCw, User, CloudCheck, CloudOff, Cloud, Map, Sparkles
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
import LocationAssistant from './components/LocationAssistant';
import AIAssistant from './components/AIAssistant';

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
  
  const syncLockRef = useRef(false);

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

  // تحديث فلتر الفئة العالمي تلقائياً عند تسجيل الدخول إذا كان المستخدم مقيداً بفئة معينة
  useEffect(() => {
    if (state.currentUser?.restrictedCategory) {
      setState(prev => ({ ...prev, globalCategoryFilter: state.currentUser!.restrictedCategory! }));
    }
  }, [state.currentUser]);

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
      Object.keys(cleanItem).forEach(key => {
        if (cleanItem[key] === undefined || cleanItem[key] === "") {
          cleanItem[key] = null;
        }
      });
      return cleanItem;
    });
  };

  const fetchData = useCallback(async (force = false) => {
    if (!state.currentUser || (syncLockRef.current && !force)) return;
    
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      // بناء استعلامات مفلترة بحسب الفئة لضمان الخصوصية التامة
      let pplQuery = supabase.from('people').select('*');
      let sessQuery = supabase.from('sessions').select('*');
      let mtchQuery = supabase.from('matches').select('*');
      let usrsQuery = supabase.from('users').select('*');

      if (state.currentUser.restrictedCategory) {
        pplQuery = pplQuery.eq('category', state.currentUser.restrictedCategory);
        sessQuery = sessQuery.eq('category', state.currentUser.restrictedCategory);
        mtchQuery = mtchQuery.eq('category', state.currentUser.restrictedCategory);
      }

      // إذا لم يكن مديراً، يرى فقط بياناته في جدول المستخدمين
      if (state.currentUser.role !== 'مدير') {
        usrsQuery = usrsQuery.eq('id', state.currentUser.id);
      }

      const [
        { data: cats },
        { data: ppl },
        { data: sess },
        { data: mtch },
        { data: attn },
        { data: usrs }
      ] = await Promise.all([
        supabase.from('categories').select('name'),
        pplQuery,
        sessQuery,
        mtchQuery,
        supabase.from('attendance').select('*'),
        usrsQuery,
      ]);

      // فلترة سجلات الحضور في الذاكرة لتشمل فقط من هم متاحين للمستخدم
      const filteredAttn = attn ? attn.filter(a => (ppl || []).some(p => p.id === a.personId)) : [];

      setState(prev => ({
        ...prev,
        categories: (cats && cats.length > 0) ? cats.map(c => c.name) : prev.categories,
        people: ppl || [],
        sessions: sess || [],
        matches: mtch || [],
        attendance: filteredAttn,
        users: usrs || prev.users
      }));
      setSyncStatus('synced');
    } catch (error: any) {
      setSyncStatus('error');
      addLog('خطأ في جلب البيانات', error.message || 'فشل الوصول للسحاب.', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [state.currentUser, addLog]);

  useEffect(() => {
    if (!state.currentUser) return;

    const channels = ['people', 'sessions', 'matches', 'attendance', 'users'].map(table => 
      supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table }, () => {
          if (!syncLockRef.current) fetchData();
        })
        .subscribe()
    );

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [state.currentUser, fetchData]);

  const pushData = useCallback(async (updatedState: AppState) => {
    if (!updatedState.currentUser) return;

    syncLockRef.current = true;
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
          
          if (error) throw new Error(`${table.name}: ${error.message}`);
        }
      }

      setSyncStatus('synced');
    } catch (error: any) {
      setSyncStatus('error');
      addLog('فشل مزامنة الجداول', error.message || 'خطأ غير معروف', 'error');
    } finally {
      setTimeout(() => {
        syncLockRef.current = false;
      }, 500);
    }
  }, [addLog]);

  useEffect(() => {
    if (state.currentUser) fetchData(true);
  }, [state.currentUser, fetchData]);

  const updateStateAndSync = async (updater: (prev: AppState) => AppState) => {
    let nextState: AppState | null = null;
    setState(prev => {
      nextState = updater(prev);
      return nextState;
    });

    if (nextState) await pushData(nextState);
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
    { id: 'ai', label: 'المحلل الذكي (AI)', icon: Sparkles },
    { id: 'logistics', label: 'المساعد اللوجستي', icon: Map },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const unreadCount = state.notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-right font-['Tajawal'] overflow-hidden" dir="rtl">
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
                <item.icon size={20} className={item.id === 'ai' ? 'animate-pulse text-orange-400' : ''} />
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
            {/* عرض اسم المستخدم والرتبة بجانب الإشعارات والمزامنة */}
            <div className="hidden sm:flex items-center gap-4 ml-6 border-l pl-6 border-slate-200">
               <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-900 leading-none">{state.currentUser.username}</p>
                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mt-1">{state.currentUser.role}</p>
                  </div>
                  <div className="w-10 h-10 bg-[#001F3F] text-white rounded-xl flex items-center justify-center font-black shadow-lg border-2 border-white ring-2 ring-slate-100">
                    <User size={20} />
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2.5 rounded-xl transition-all relative ${unreadCount > 0 ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-400'}`}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-bounce">{unreadCount}</span>}
                </button>
                {showNotifications && (
                  <div className="absolute left-0 mt-3 w-80 bg-white border-2 border-slate-900 rounded-[2rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 bg-slate-100 border-b-2 border-slate-900 font-black text-xs flex justify-between">
                       <span>آخر التنبيهات والعمليات</span>
                       <button onClick={() => setState(p => ({...p, notifications: []}))} className="text-red-600">مسح الكل</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar p-2 space-y-2">
                       {state.notifications.length === 0 ? (
                         <p className="py-8 text-center text-[10px] font-black text-slate-400 italic">لا يوجد إشعارات حالياً</p>
                       ) : state.notifications.map(n => (
                         <div key={n.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <p className="text-[11px] font-black text-slate-900">{n.message}</p>
                            <p className="text-[9px] font-medium text-slate-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>

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
              <button onClick={() => fetchData(true)} className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all shadow-sm">
                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
              </button>
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
            {activeTab === 'ai' && <AIAssistant state={state} />}
            {activeTab === 'logistics' && <LocationAssistant />}
            {activeTab === 'settings' && <SettingsView state={state} setState={updateStateAndSync as any} addLog={addLog} />}
            {activeTab === 'report' && <PlayerReport player={selectedPlayer} state={state} onBack={() => setActiveTab('squad')} />}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
