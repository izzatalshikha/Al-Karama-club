
export type Category = string;
export type Role = 'لاعب' | 'مدرب' | 'مساعد مدرب' | 'مدرب حراس' | 'مدرب لياقة' | 'إداري' | 'طبيب' | 'معالج' | 'منسق إعلامي' | 'مرافق';
export type AttendanceStatus = 'حاضر' | 'متأخر' | 'غائب' | 'غياب بعذر';
export type UserRole = 'مدير' | 'إداري فئة' | 'مشاهد';
export type MatchType = 'دوري' | 'كأس' | 'ودية' | 'بطولة ودية' | 'مباراة دولية';

export interface AppNotification {
  id: string;
  message: string;
  details?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  isRead?: boolean;
}

export interface PlayerEvaluation {
  id: string;
  playerId: string;
  date: string;
  physical: number; // 1-10
  tactical: number;
  technical: number;
  mental: number;
  speed: number;
  coachNote?: string;
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
  contractStart?: string;
  contractEnd?: string;
  contractValue?: string;
  medicalHistory?: string;
  injuries?: string;
  penalties?: string;
  notes?: string;
  coachingCertificate?: string;
  academicDegree?: string;
  evaluations?: PlayerEvaluation[];
  monthlyReports?: { [key: string]: string }; // ميزة التقارير الشهرية الجديدة
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
  opponent: string;
  pitch?: string;
  date: string;
  time: string;
  advancePayment: string;
  isCompleted: boolean;
  ourScore: string;
  opponentScore: string;
  stoppageTime?: string; 
  stoppageTime1?: string; 
  stoppageTime2?: string; 
  events: MatchEvent[];
  lineup: {
    starters: { playerId: string; name: string; number: string; minutesPlayed?: string }[];
    subs: { 
      playerId: string; 
      name: string; 
      number: string; 
      minutesPlayed?: string;
      substitutionMinute?: string;
      replacedPlayerId?: string;
    }[];
    reserves?: { playerId: string; name: string; number: string }[];
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

export interface AppState {
  people: Person[];
  attendance: AttendanceRecord[];
  sessions: TrainingSession[];
  matches: Match[];
  warehouse: WarehouseItem[];
  users: AppUser[];
  categories: Category[];
  currentUser: AppUser | null;
  notifications: AppNotification[];
  globalCategoryFilter: Category | 'الكل';
}
