
export type Category = string;
export type Role = 'لاعب' | 'مدرب' | 'مساعد مدرب' | 'مدرب حراس' | 'مدرب لياقة' | 'إداري' | 'طبيب' | 'معالج' | 'منسق إعلامي' | 'مرافق';
export type AttendanceStatus = 'حاضر' | 'متأخر' | 'غائب' | 'غياب بعذر';
export type UserRole = 'مدير' | 'إداري فئة' | 'مشاهد';
export type MatchType = 'دوري' | 'كأس' | 'ودية' | 'مباراة دولية';

export interface AppNotification {
  id: string;
  message: string;
  details?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
  isRead?: boolean;
}

export interface Person {
  id: string;
  name: string; // الاسم الثنائي
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
  number?: number; // رقم القميص
  phone?: string;
  joinDate: string;
  
  // Contracts
  contractStart?: string;
  contractEnd?: string;
  contractDuration?: string;
  contractValue?: string;

  // Medical & Discipline
  medicalHistory?: string;
  injuries?: string;
  penalties?: string;
  notes?: string;

  // Academic (for staff)
  coachingCertificate?: string;
  academicDegree?: string;
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
  location: string;
  objective: string;
  isCompleted?: boolean;
}

export interface MatchEvent {
  id: string;
  type: 'goal' | 'assist' | 'yellow' | 'red' | 'injury';
  player: string;
  minute: string;
  note?: string;
}

export interface Match {
  id: string;
  category: Category;
  matchType: MatchType;
  opponent: string;
  location: string;
  date: string;
  time: string;
  advancePayment: string;
  isCompleted: boolean;
  ourScore: string;
  opponentScore: string;
  events: MatchEvent[];
  lineup: {
    starters: { name: string; number: string }[];
    subs: { name: string; number: string }[];
    staff: { role: string; name: string }[];
    captain: string;
  };
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
  users: AppUser[];
  categories: Category[];
  currentUser: AppUser | null;
  notifications: AppNotification[];
  lastSyncTimestamp?: number;
  globalCategoryFilter: Category | 'الكل';
}
