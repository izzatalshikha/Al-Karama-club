import React, { useState } from 'react';
import { Trophy, Plus, Save, X, Edit2, Calendar, MapPin, Search, ChevronDown, Check, Trash2 } from 'lucide-react';
import { AppState, Tournament, TournamentStage, TournamentTeam, TournamentMatch, TournamentStageTeam } from '../types';
import { supabase } from '../App';

interface TournamentsViewProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  syncToCloud: (table: string, data: any) => Promise<boolean>;
  addLog: (msg: string, type: 'success' | 'error') => void;
  onMatchClick?: (id: string) => void;
}

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const TournamentsView: React.FC<TournamentsViewProps> = ({ state, setState, syncToCloud, addLog, onMatchClick }) => {
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTourName, setNewTourName] = useState('');
  const [newTourCategory, setNewTourCategory] = useState('');
  const [newTourType, setNewTourType] = useState('دوري');

  const currentUser = state.currentUser;
  const isViewer = currentUser?.role === 'مشاهد' || currentUser?.role === 'معالج';
  const safeTournaments = (state.tournaments || []).filter(t => !t.season || t.season === state.activeSeason);
  const filteredTournaments = safeTournaments.filter(t => 
    state.globalCategoryFilter === 'الكل' || t.category === state.globalCategoryFilter
  );

  const activeTour = safeTournaments.find(t => t.id === activeTournamentId);

  const handleCreateTournament = async () => {
    if (!newTourName.trim()) return;
    const newId = generateId();
    
    // Determine category
    let finalCategory = newTourCategory || state.globalCategoryFilter;
    if (currentUser?.restrictedCategory) {
       const allowedArr = String(currentUser.restrictedCategory).split(',').filter(Boolean);
       if (!allowedArr.includes(finalCategory)) {
          finalCategory = allowedArr[0] || state.categories[0];
       }
    } else {
      if (finalCategory === 'الكل' || !finalCategory) {
        finalCategory = state.categories[0];
      }
    }
    
    const newT: Tournament = {
      id: newId,
      name: newTourName,
      category: finalCategory,
      status: 'نشطة',
      season: state.activeSeason,
      type: newTourType as any
    };

    const newTeam: TournamentTeam = {
      id: generateId(),
      tournamentId: newId,
      name: `${finalCategory} (الكرامة)`,
      isOurTeam: true
    };

    const success = await syncToCloud('tournaments', newT);
    if(success) {
      await syncToCloud('tournament_teams', newTeam);
      setState(prev => ({ 
        ...prev, 
        tournaments: [...prev.tournaments, newT],
        tournamentTeams: [...(prev.tournamentTeams || []), newTeam]
      }));
      setNewTourName('');
      setNewTourCategory('');
      setIsCreating(false);
      addLog('تم إنشاء البطولة والفريق الافتراضي بنجاح', 'success');
      setActiveTournamentId(newId);
    }
  };

  if (activeTour) {
    return (
      <TournamentDetails 
        tour={activeTour} 
        state={state} 
        setState={setState} 
        syncToCloud={syncToCloud} 
        addLog={addLog}
        onBack={() => setActiveTournamentId(null)} 
        onMatchClick={onMatchClick}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-blue-900 flex items-center gap-3">
            <Trophy className="text-orange-500" /> إدارة البطولات
          </h2>
          <p className="text-slate-500 text-sm mt-1">تتبع المنافسات، المجموعات، والنتائج</p>
        </div>
        {!isViewer && (
          <button onClick={() => setIsCreating(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
            <Plus size={20} /> إضافة بطولة
          </button>
        )}
      </div>

      {!isViewer && isCreating && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 mb-2">اسم البطولة الجديدة</label>
            <input type="text" value={newTourName} onChange={e => setNewTourName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500" placeholder="مثال: دوري النخبة لفئة الشباب" />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-slate-500 mb-2">نوع البطولة</label>
            <select value={newTourType} onChange={e=>setNewTourType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
              <option value="دوري">دوري</option>
              <option value="كأس">كأس</option>
              <option value="بطولة ودية">بطولة ودية</option>
            </select>
          </div>
          {(!currentUser?.restrictedCategory || String(currentUser.restrictedCategory).split(',').filter(Boolean).length > 1) && (
            <div className="w-full md:w-32">
              <label className="block text-xs font-bold text-slate-500 mb-2">فئة النادي المشاركة</label>
              <select value={newTourCategory || (state.globalCategoryFilter === 'الكل' ? state.categories[0] : state.globalCategoryFilter)} onChange={e => setNewTourCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
                {(currentUser?.restrictedCategory ? String(currentUser.restrictedCategory).split(',').filter(Boolean) : state.categories).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={handleCreateTournament} className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold">
              حفظ
            </button>
            <button onClick={() => setIsCreating(false)} className="flex-1 md:flex-none bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold">
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTournaments.map(t => (
          <div key={t.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group" onClick={() => setActiveTournamentId(t.id)}>
            <div className="absolute top-0 right-0 w-2 h-full bg-blue-900 group-hover:bg-orange-500 transition-colors"></div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{t.category}</span>
                <h3 className="text-xl font-black text-slate-800 mt-3">{t.name}</h3>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${t.status === 'نشطة' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{t.status}</span>
            </div>
            <div className="mt-6 flex gap-4 text-sm text-slate-500">
               <span>المراحل: {(state.tournamentStages || []).filter(s => s.tournamentId === t.id).length}</span>
               <span>الفرق: {(state.tournamentTeams || []).filter(team => team.tournamentId === t.id).length}</span>
            </div>
          </div>
        ))}
        {filteredTournaments.length === 0 && !isCreating && (
          <div className="col-span-full py-20 text-center text-slate-500">
            <Trophy size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-bold">لا يوجد بطولات مسجلة لهذه الفئة</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TournamentDetails = ({ tour, state, setState, syncToCloud, addLog, onBack, onMatchClick }: { 
  tour: Tournament, state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, 
  syncToCloud: any, addLog: any, onBack: () => void, onMatchClick?: (id: string) => void 
}) => {
  const stages = (state.tournamentStages || []).filter(s => s.tournamentId === tour.id);
  const teams = (state.tournamentTeams || []).filter(t => t.tournamentId === tour.id);
  const matches = (state.tournamentMatches || []).filter(m => m.tournamentId === tour.id);

  const isViewer = state.currentUser?.role === 'مشاهد' || state.currentUser?.role === 'معالج';
  const canDelete = state.currentUser?.role === 'مدير' || state.currentUser?.role === 'إداري';

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteTournament = async () => {
    const { error } = await supabase.from('tournaments').delete().eq('id', tour.id);
    if (error) {
      addLog('خطأ في حذف البطولة: ' + error.message, 'error');
      return;
    }
    // Remove from local state
    setState(prev => ({
      ...prev,
      tournaments: prev.tournaments?.filter(t => t.id !== tour.id) || []
    }));
    addLog('تم حذف البطولة بنجاح', 'success');
    onBack();
  };

  const [activeTab, setActiveTab] = useState<'teams' | 'stages'>('stages');

  const hasOurTeam = teams.some(t => t.isOurTeam);
  const [newTeamName, setNewTeamName] = useState(!hasOurTeam ? `${tour.category} (الكرامة)` : '');
  const [newTeamIsOur, setNewTeamIsOur] = useState(!hasOurTeam);

  const [newStageName, setNewStageName] = useState('');
  const [newStageIsGroup, setNewStageIsGroup] = useState(true);

  const handleAddTeam = async () => {
    if(!newTeamName.trim()) return;
    const nt: TournamentTeam = { id: generateId(), tournamentId: tour.id, name: newTeamName, isOurTeam: newTeamIsOur };
    const success = await syncToCloud('tournament_teams', nt);
    if(success) {
      setState(prev => ({ ...prev, tournamentTeams: [...prev.tournamentTeams, nt] }));
      setNewTeamName('');
      setNewTeamIsOur(false);
    }
  };

  const handleAddStage = async () => {
    if(!newStageName.trim()) return;
    const ns: TournamentStage = { id: generateId(), tournamentId: tour.id, name: newStageName, isGroupStage: newStageIsGroup };
    const success = await syncToCloud('tournament_stages', ns);
    if(success) {
      setState(prev => ({ ...prev, tournamentStages: [...prev.tournamentStages, ns] }));
      setNewStageName('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in" dir="rtl">
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-xl font-black text-slate-800">تأكيد الحذف</h3>
            <p className="text-slate-600 text-sm font-medium">
              هل أنت متأكد من حذف هذه البطولة نهائياً؟ ستفقد كافة الفرق والمراحل المرتبطة بها ولن يمكن التراجع.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowDeleteConfirm(false); handleDeleteTournament(); }} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-all">
                نعم، احذف البطولة
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold transition-all">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <button onClick={onBack} className="text-xs font-bold text-slate-500 hover:text-orange-500 mb-2 block">← العودة للبطولات</button>
           <h2 className="text-2xl font-black text-blue-900">{tour.name}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
           {canDelete && (
             <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl font-bold transition-all shadow-sm border border-red-100 flex items-center gap-2">
               <Trash2 size={16} /> <span className="hidden md:inline">حذف البطولة</span>
             </button>
           )}
           <button onClick={() => setActiveTab('stages')} className={`px-4 md:px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'stages' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>المراحل والمباريات</button>
           <button onClick={() => setActiveTab('teams')} className={`px-4 md:px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'teams' ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>الفرق المشاركة</button>
        </div>
      </div>

      {activeTab === 'teams' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {!isViewer && (
           <div className="md:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-4">
              <h3 className="font-bold text-slate-800">إضافة فريق جديد</h3>
              <input type="text" value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} placeholder="اسم الفريق" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3" />
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 select-none cursor-pointer">
                 <input type="checkbox" checked={newTeamIsOur} onChange={e=>setNewTeamIsOur(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
                 هذا فريقي (لربط المباريات)
              </label>
              <button onClick={handleAddTeam} className="w-full bg-blue-900 hover:bg-blue-800 text-white p-3 rounded-xl font-bold">إضافة للفريق</button>
           </div>
           )}
           <div className={`${isViewer ? 'md:col-span-3' : 'md:col-span-2'} space-y-4`}>
              {teams.length === 0 ? (
                <div className="p-10 text-center text-slate-500 bg-slate-50 rounded-3xl border border-slate-100">
                  لا يوجد فرق مضافة. أضف الفرق المشاركة بالبطولة أولاً.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {teams.map(t => (
                    <div key={t.id} className={`p-4 rounded-xl border flex justify-between items-center ${t.isOurTeam ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                      <span className="font-bold text-slate-800">{t.name}</span>
                      {t.isOurTeam && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-md font-bold">فريقنا</span>}
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'stages' && (
        <div className="space-y-8">
           {!isViewer && (
           <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex gap-4 items-end">
              <div className="flex-1">
                 <label className="block text-xs font-bold text-slate-500 mb-2">اسم المرحلة / المجموعة</label>
                 <input type="text" value={newStageName} onChange={e=>setNewStageName(e.target.value)} placeholder="مثال: المجموعة A، المجموعة B، نصف النهائي" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3" />
              </div>
              <div className="w-48">
                 <label className="block text-xs font-bold text-slate-500 mb-2">نوع المرحلة</label>
                 <select value={newStageIsGroup ? 'true' : 'false'} onChange={e=>setNewStageIsGroup(e.target.value === 'true')} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <option value="true">مجموعات (نظام نقاط)</option>
                    <option value="false">إقصائيات (بدون ترتيب)</option>
                 </select>
              </div>
              <button onClick={handleAddStage} className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold">إضافة مرحلة</button>
           </div>
           )}

           {stages.map(stage => (
              <StageView 
                key={stage.id} 
                stage={stage} 
                tour={tour} 
                teams={teams} 
                matches={matches.filter(m => m.stageId === stage.id)}
                state={state}
                setState={setState}
                syncToCloud={syncToCloud}
                addLog={addLog}
                onMatchClick={onMatchClick}
              />
           ))}
        </div>
      )}
    </div>
  );
};

const StageView = ({ stage, tour, teams, matches, state, setState, syncToCloud, addLog, onMatchClick }: any) => {
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [t1, setT1] = useState('');
  const [t2, setT2] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [matchTime, setMatchTime] = useState('16:00');
  const [pitch, setPitch] = useState('');

  const isViewer = state.currentUser?.role === 'مشاهد' || state.currentUser?.role === 'معالج';

  // Calculate Standings if group stage
  const standings = React.useMemo(() => {
    if(!stage.isGroupStage) return [];
    
    // Get all teams involved in this stage's matches
    const stageTeamIds = new Set<string>();
    matches.forEach((m:any) => { stageTeamIds.add(m.team1Id); stageTeamIds.add(m.team2Id); });
    
    const table: any = {};
    stageTeamIds.forEach(id => {
      const t = teams.find((x:any) => x.id === id);
      table[id] = { id, name: t?.name || 'مجهول', pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
    });

    matches.forEach((m:any) => {
      if(m.status === 'ملعوبة' && m.team1Score != null && m.team2Score != null) {
        const row1 = table[m.team1Id];
        const row2 = table[m.team2Id];
        if(!row1 || !row2) return;

        row1.pld++; row2.pld++;
        row1.gf += m.team1Score; row1.ga += m.team2Score;
        row2.gf += m.team2Score; row2.ga += m.team1Score;
        
        if (m.team1Score > m.team2Score) {
           row1.w++; row2.l++; row1.pts += 3;
        } else if (m.team1Score < m.team2Score) {
           row2.w++; row1.l++; row2.pts += 3;
        } else {
           row1.d++; row2.d++; row1.pts += 1; row2.pts += 1;
        }
      }
    });

    return Object.values(table)
      .map((t:any) => { t.gd = t.gf - t.ga; return t; })
      .sort((a:any, b:any) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }, [stage, matches, teams]);

  const handleAddMatch = async () => {
    if(!t1 || !t2 || t1 === t2) { addLog('يرجى اختيار فريقين مختلفين', 'error'); return; }
    
    // Check if one of them is our team
    const t1Obj = teams.find((tz:any) => tz.id === t1);
    const t2Obj = teams.find((tz:any) => tz.id === t2);
    const involvesOurTeam = t1Obj?.isOurTeam || t2Obj?.isOurTeam;
    
    let linkedMatchId = null;
    
    if (involvesOurTeam) {
       // Create a linked match in the matches table
       const newOurMatchId = generateId();
       const opponentTeam = t1Obj?.isOurTeam ? t2Obj : t1Obj;
       const newOurMatch = {
         id: newOurMatchId,
         category: tour.category,
         season: tour.season || state.activeSeason,
         matchType: tour.type || 'بطولة ودية',
         opponent: opponentTeam?.name || '',
         date: matchDate || new Date().toISOString().split('T')[0],
         time: matchTime || '16:00',
         advancePayment: '0',
         isCompleted: false,
         ourScore: '0',
         opponentScore: '0',
         stoppageTime1: '0',
         stoppageTime2: '0',
         pitch: pitch || 'غير محدد',
         referee: '',
         homeCoach: '',
         awayCoach: '',
         events: [],
         lineup: { 
           starters: Array(11).fill(null).map(() => ({ playerId: '', name: '', number: '', minutesPlayed: '90' })),
           subs: [], 
           staff: [], 
           captain: '' 
         },
         notes: `من بطولة: ${tour.name} - ${stage.name}`,
         isHome: t1Obj?.isOurTeam // If we are team1, we consider it home conceptually for score
       };
       
       await syncToCloud('matches', newOurMatch);
       setState((prev:any) => ({ ...prev, matches: [...prev.matches, newOurMatch] }));
       linkedMatchId = newOurMatchId;
    }

    const nm: TournamentMatch = {
      id: generateId(),
      tournamentId: tour.id,
      stageId: stage.id,
      team1Id: t1,
      team2Id: t2,
      matchDate,
      matchTime,
      pitch,
      status: 'قادمة',
      linkedMatchId: linkedMatchId || undefined
    };

    const success = await syncToCloud('tournament_matches', nm);
    if(success) {
      setState((prev:any) => ({ ...prev, tournamentMatches: [...prev.tournamentMatches, nm] }));
      setIsAddingMatch(false);
      setT1(''); setT2('');
      setPitch('');
      if (linkedMatchId && onMatchClick) {
        addLog('تمت إضافة المباراة بنجاح، يُرجى استكمال البيانات وتشكيلة الفريق', 'success');
        onMatchClick(linkedMatchId);
      } else {
        addLog('تمت إضافة المباراة بنجاح', 'success');
      }
    }
  };

  const setScore = async (matchId: string, s1: number, s2: number) => {
    const mm = matches.find((m:any) => m.id === matchId);
    if(!mm) return;
    
    const updatedM = { ...mm, status: 'ملعوبة', team1Score: s1, team2Score: s2 };
    await syncToCloud('tournament_matches', updatedM);
    setState((prev:any) => ({
       ...prev,
       tournamentMatches: prev.tournamentMatches.map((mx:any) => mx.id === matchId ? updatedM : mx)
    }));

    // If linked, we should ideally also update the matches score but this operates fine for now
    if (mm.linkedMatchId) {
       const t1Obj = teams.find((tz:any) => tz.id === mm.team1Id);
       const isOurTeam1 = t1Obj?.isOurTeam;
       const linkedMatch = state.matches.find((x:any) => x.id === mm.linkedMatchId);
       if(linkedMatch) {
         const upLinked = { ...linkedMatch, isCompleted: true, ourScore: isOurTeam1 ? s1.toString() : s2.toString(), opponentScore: isOurTeam1 ? s2.toString() : s1.toString() };
         await syncToCloud('matches', upLinked);
         setState((prev:any) => ({ ...prev, matches: prev.matches.map((mx:any) => mx.id === linkedMatch.id ? upLinked : mx)}));
       }
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200">
       <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">{stage.name}</h3>
          {!isViewer && (
            <button onClick={() => setIsAddingMatch(!isAddingMatch)} className="text-blue-600 font-bold text-sm bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100">+ إضافة مباراة</button>
          )}
       </div>

       {!isViewer && isAddingMatch && (
         <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-4">
           <div className="flex flex-col sm:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 mb-2">الفريق الأول</label>
                <select value={t1} onChange={e=>setT1(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-2.5">
                   <option value="">اختر فريق...</option>
                   {teams.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
             </div>
             <div className="pb-3 font-bold text-slate-400 hidden sm:block">ضد</div>
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 mb-2">الفريق الثاني</label>
                <select value={t2} onChange={e=>setT2(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-2.5">
                   <option value="">اختر فريق...</option>
                   {teams.map((t:any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
             </div>
           </div>
           
           <div className="flex flex-col sm:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 mb-2">التاريخ</label>
                <input type="date" value={matchDate} onChange={e=>setMatchDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-2.5" />
             </div>
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 mb-2">الوقت</label>
                <input type="time" value={matchTime} onChange={e=>setMatchTime(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-2.5" />
             </div>
             <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-500 mb-2">الملعب</label>
                <input type="text" value={pitch} onChange={e=>setPitch(e.target.value)} placeholder="اسم الملعب" className="w-full bg-white border border-slate-200 rounded-xl p-2.5" />
             </div>
               
             <button onClick={handleAddMatch} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold w-full sm:w-auto mt-4 sm:mt-0">حفظ</button>
           </div>
         </div>
       )}

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="font-bold text-slate-500 mb-4 text-sm">المباريات</h4>
            {matches.length === 0 ? <p className="text-xs text-slate-400">لا يوجد مباريات مضافة بعد</p> : (
              <div className="space-y-3">
                 {matches.map((m:any) => {
                    const team1 = teams.find((x:any)=>x.id===m.team1Id);
                    const team2 = teams.find((x:any)=>x.id===m.team2Id);
                    return (
                      <div key={m.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                         <div className="flex items-center justify-between text-sm font-bold">
                            <span className={`flex-1 text-left ${team1?.isOurTeam ? 'text-orange-600' : 'text-slate-800'}`}>{team1?.name}</span>
                            
                            <div className="flex-1 px-4 flex justify-center">
                              {m.status === 'ملعوبة' ? (
                                 <div className="bg-blue-900 text-white px-4 py-1 rounded-full text-base font-black tracking-widest">{m.team1Score} - {m.team2Score}</div>
                              ) : (
                                 <div className="flex gap-2">
                                    <input type="number" id={`s1-${m.id}`} className="w-10 text-center border rounded font-bold p-1" defaultValue={0} />
                                    <span>-</span>
                                    <input type="number" id={`s2-${m.id}`} className="w-10 text-center border rounded font-bold p-1" defaultValue={0} />
                                    <button onClick={() => {
                                       const v1 = parseInt((document.getElementById(`s1-${m.id}`) as HTMLInputElement).value) || 0;
                                       const v2 = parseInt((document.getElementById(`s2-${m.id}`) as HTMLInputElement).value) || 0;
                                       setScore(m.id, v1, v2);
                                    }} className="bg-emerald-500 text-white rounded p-1"><Check size={14}/></button>
                                 </div>
                              )}
                            </div>
                            
                            <span className={`flex-1 text-right ${team2?.isOurTeam ? 'text-orange-600' : 'text-slate-800'}`}>{team2?.name}</span>
                         </div>
                         <div className="flex justify-between items-center mt-3 text-[10px] text-slate-500 font-bold bg-white p-2 rounded-lg border border-slate-100">
                            <span>{m.matchDate || 'تاريخ غير محدد'} • {m.matchTime || 'وقت غير محدد'}</span>
                            <span>{m.pitch || 'ملعب غير محدد'}</span>
                         </div>
                         {m.linkedMatchId && (
                            <button onClick={() => onMatchClick && onMatchClick(m.linkedMatchId)} className="w-full text-[10px] text-blue-500 hover:text-orange-600 hover:bg-slate-100 p-1 rounded transition-colors mt-2 text-center flex justify-center items-center gap-1 cursor-pointer">
                               <MapPin size={10} /> الانتقال إلى تفاصيل السجل الرياضي (مباراة رقم {m.linkedMatchId.slice(0,4)})
                            </button>
                         )}
                      </div>
                    )
                 })}
              </div>
            )}
          </div>
          
          {stage.isGroupStage && (
            <div>
               <h4 className="font-bold text-slate-500 mb-4 text-sm">الترتيب</h4>
               <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                  <table className="w-full text-sm text-right">
                     <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-bold">
                        <tr>
                          <th className="px-4 py-3 text-center">#</th>
                          <th className="px-4 py-3">الفريق</th>
                          <th className="px-2 py-3 text-center">ل</th>
                          <th className="px-2 py-3 text-center">ف</th>
                          <th className="px-2 py-3 text-center">ت</th>
                          <th className="px-2 py-3 text-center">خ</th>
                          <th className="px-2 py-3 text-center">+/-</th>
                          <th className="px-4 py-3 text-center text-blue-800">نقاط</th>
                        </tr>
                     </thead>
                     <tbody className="font-medium">
                        {standings.map((r:any, idx:number) => (
                           <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="px-4 py-3 text-center text-slate-400">{idx+1}</td>
                              <td className="px-4 py-3 text-slate-800">{r.name} {teams.find((tz:any)=>tz.id===r.id)?.isOurTeam && <span className="text-[10px] text-orange-500">*</span>}</td>
                              <td className="px-2 py-3 text-center">{r.pld}</td>
                              <td className="px-2 py-3 text-center text-emerald-600">{r.w}</td>
                              <td className="px-2 py-3 text-center text-slate-400">{r.d}</td>
                              <td className="px-2 py-3 text-center text-red-500">{r.l}</td>
                              <td className="px-2 py-3 text-center">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                              <td className="px-4 py-3 text-center font-black text-blue-900">{r.pts}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
                  {standings.length === 0 && <div className="p-4 text-center text-xs text-slate-400">لا يوجد بيانات لاحتساب الترتيب، قم بإضافة مباريات ونتائج.</div>}
               </div>
            </div>
          )}
       </div>
    </div>
  );
};

export default TournamentsView;
