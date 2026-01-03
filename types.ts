
export type Category = string;
export type Role = 'لاعب' | 'مدرب' | 'مساعد مدرب' | 'إداري' | 'طبيب';
export type AttendanceStatus = 'حاضر' | 'متأخر' | 'غائب';
export type UserRole = 'مدير' | 'مدرب' | 'مشاهد';

export interface AppNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: number;
  isRead?: boolean;
  persistent?: boolean;
}

export interface Person {
  id: string;
  name: string;
  category: Category;
  role: Role;
  number?: number;
  phone?: string;
  address?: string;
  joinDate: string;
  federalNumber?: string;
  nationalId?: string;
  birthDate?: string;
  birthPlace?: string;
  fatherName?: string;
  motherName?: string;
  nationality?: string;
  khana?: string;
  coachingCertificate?: string;
  academicDegree?: string;
  contractValue?: string;
  contractDuration?: string;
  contractStart?: string;
  contractEnd?: string;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  personId: string;
  sessionId?: string;
  date: string;
  time: string;
  status: AttendanceStatus;
  note?: string;
}

export interface TrainingSession {
  id: string;
  category: Category;
  date: string;
  time: string;
  location: string;
  objective: string;
}

export interface GoalRecord {
  player: string;
  number: string;
  time: string;
}

export interface Match {
  id: string;
  category: Category;
  opponent: string;
  location: string;
  advancePayment: string;
  date: string;
  time: string;
  isCompleted?: boolean;
  ourScore?: string;
  opponentScore?: string;
  goalList: GoalRecord[];
  cardList: any[];
  lineupDetails?: any;
}

export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  password?: string; // كلمة السر المخصصة
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
  // Cloud Sync Status
  driveFileId?: string;
  lastSyncTimestamp?: number;
  isDriveConnected?: boolean;
  googleEmail?: string;
}
