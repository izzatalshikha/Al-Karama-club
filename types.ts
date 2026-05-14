
export type Category = string;
export type Role = 'لاعب' | 'مدير' | 'مدرب' | 'مساعد مدرب' | 'مدرب حراس' | 'مدرب لياقة' | 'إداري' | 'طبيب' | 'معالج' | 'منسق إعلامي' | 'مرافق';
export type AttendanceStatus = 'حاضر' | 'متأخر' | 'غائب' | 'غياب بعذر';
export type UserRole = 'مدير' | 'إداري فئة' | 'مشاهد' | 'أمين مستودع' | 'مسؤول تجهيزات' | 'معالج';
export type MatchType = 'دوري' | 'كأس' | 'ودية' | 'بطولة ودية' | 'مباراة دولية' | 'مباراة بطولة';

export interface Tournament {
  id: string;
  name: string;
  category: Category;
  status: 'نشطة' | 'منتهية';
}

export interface TournamentStage {
  id: string;
  tournamentId: string;
  name: string;
  isGroupStage: boolean;
}

export interface TournamentTeam {
  id: string;
  tournamentId: string;
  name: string;
  isOurTeam: boolean;
}

export interface TournamentStageTeam {
  id: string;
  stageId: string;
  teamId: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  stageId: string;
  team1Id: string; // references TournamentTeam
  team2Id: string;
  team1Score?: number;
  team2Score?: number;
  matchDate?: string;
  matchTime?: string;
  pitch?: string;
  status: 'قادمة' | 'ملعوبة';
  linkedMatchId?: string; // links to existing Match.id if it's our match
}

export interface InjuryRecord {
  id: string;
  personId: string;
  type: string;
  location: string;
  severity: 'خفيفة' | 'متوسطة' | 'حرجة';
  startDate: string;
  expectedReturn: string;
  status: 'تأهيل' | 'علاج مكثف' | 'تعافى';
  notes: string;
}

export interface TacticalPlan {
  id: string;
  name: string;
  category: Category;
  formation: string;
  positions: { playerId: string; x: number; y: number; team: 'home' | 'away'; label?: string }[];
  notes: string;
}

export interface AppNotification {
  id: string;
  message: string;
  details?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  isRead?: boolean;
}

export interface TechnicalReport {
  id: string;
  targetId: string;
  type: 'match_evaluation' | 'staff_review' | 'player_radar';
  category: Category;
  rating: number;
  content: string;
  author: string;
  date: string;
  radarData?: {
    technical: number;
    physical: number;
    tactical: number;
    mental: number;
    discipline: number;
  };
}

export interface CoachingCertificate {
  id: string;
  name: string;
  date: string;
}

export interface PreviousExperience {
  id: string;
  employer: string;
  position: string;
}

export interface Person {
  id: string;
  name: string;
  fatherName: string;
  motherName: string;
  birthDate: string;
  birthPlace: string;
  khana: string;
  nationalId: string;
  federalNumber: string;
  internationalId: string;
  address: string;
  category: Category;
  role: Role;
  number?: number;
  phone?: string;
  joinDate: string;
  height?: string;
  weight?: string;
  position?: string;
  contractStart?: string;
  contractEnd?: string;
  contractValue?: string;
  medicalHistory?: string;
  injuries?: string;
  penalties?: string;
  notes?: string;
  coachingCertificate?: string;
  academicDegree?: string;
  monthlyReports?: { [key: string]: string };
  certificates?: CoachingCertificate[];
  experiences?: PreviousExperience[];
}

export interface AttendanceRecord {
  id: string;
  personId: string;
  sessionId: string;
  date: string;
  time: string;
  status: AttendanceStatus;
  excuse?: string;
  fine?: string;
  isLocked?: boolean;
}

export interface TrainingSession {
  id: string;
  category: Category;
  date: string;
  time: string;
  duration?: string;
  pitch?: string;
  objective: string;
  isCompleted?: boolean;
  isLocked?: boolean;
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'assist' | 'yellow' | 'red' | 'injury' | 'substitution';
  player: string; 
  minute: string;
  note?: string;
}

export interface Match {
  id: string;
  category: Category;
  matchType: MatchType;
  isFinal?: boolean;
  hasExtraTimeAndPenalties?: boolean;
  ourPenaltiesScore?: string;
  opponentPenaltiesScore?: string;
  matchDuration?: string;
  squadSize?: string;
  squad?: string[];
  opponent: string;
  pitch?: string;
  date: string;
  time: string;
  advancePayment: string;
  isCompleted: boolean;
  ourScore: string;
  opponentScore: string;
  stoppageTime1?: string; 
  stoppageTime2?: string; 
  referee?: string;
  homeCoach?: string;
  awayCoach?: string;
  isHome?: boolean;
  events: MatchEvent[];
  lineup: {
    starters: { playerId: string; name: string; number: string; minutesPlayed?: string }[];
    half2Starters?: { playerId: string; name: string; number: string; minutesPlayed?: string }[];
    half3Starters?: { playerId: string; name: string; number: string; minutesPlayed?: string }[];
    durationHalf1?: string;
    durationHalf2?: string;
    durationHalf3?: string;
    halvesCount?: string;
    subs: { 
      playerId: string; 
      name: string; 
      number: string; 
      minutesPlayed?: string;
      substitutionMinute?: string;
      replacedPlayerId?: string;
    }[];
    staff: { role: string; name: string }[];
    captain: string;
  };
  notes?: string;
}

export interface WarehouseItem {
  id: string;
  name: string;
  category: Category | 'المخزن العام';
  quantity: number;
  unit: 'قطعة' | 'طقم' | 'كرة' | 'حذاء' | 'أخرى';
  condition: 'جديد' | 'مستعمل' | 'تالف';
  lastUpdated: string;
  notes?: string;
}

export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  password?: string;
  restrictedCategory?: Category;
}

export type ServiceCategory = 'فنادق' | 'مطاعم' | 'مشافي';

export interface DirectoryService {
  id: string;
  category: ServiceCategory;
  governorate: string;
  name: string;
  address: string;
  phone: string;
  description: string;
  features: string;
}

export interface AppState {
  appMode?: 'club' | 'academy';
  people: Person[];
  attendance: AttendanceRecord[];
  sessions: TrainingSession[];
  matches: Match[];
  warehouse: WarehouseItem[];
  technicalReports: TechnicalReport[];
  users: AppUser[];
  categories: Category[];
  currentUser: AppUser | null;
  notifications: AppNotification[];
  globalCategoryFilter: Category | 'الكل';
  injuries: InjuryRecord[];
  tacticalPlans: TacticalPlan[];
  tournaments: Tournament[];
  tournamentStages: TournamentStage[];
  tournamentTeams: TournamentTeam[];
  tournamentStageTeams: TournamentStageTeam[];
  tournamentMatches: TournamentMatch[];
  servicesDirectory: DirectoryService[];
}
