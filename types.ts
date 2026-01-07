
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
  persistent?: boolean; // إذا كان التنبيه يجب أن يبقى في القائمة للمدير
}

export interface Person {
  id: string;
  name: string; // الاسم الثنائي
  category: Category;
  role: Role;
  number?: number;
  phone?: string;
  address?: string; // العنوان لجميع الأعضاء
  joinDate: string;
  federalNumber?: string;
  nationalId?: string;
  birthDate?: string;
  birthPlace?: string; // مكان الميلاد
  fatherName?: string;
  motherName?: string;
  nationality?: string; // الجنسية
  khana?: string; // الخانة (القيد المدني)
  
  // حقول خاصة بالكوادر التدريبية
  coachingCertificate?: string; // الشهادة التدريبية
  academicDegree?: string; // الشهادة العلمية

  // حقول العقد
  contractValue?: string;
  contractDuration?: string;
  contractStart?: string;
  contractEnd?: string;
  
  notes?: string; // ملاحظات عامة
}

export interface AttendanceRecord {
  id: string;
  personId: string;
  sessionId?: string; // ربط الحضور بتمرين معين
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

export interface CardRecord {
  player: string;
  number: string;
  time: string;
  type: 'صفراء' | 'حمراء';
}

export interface SubstitutionRecord {
  playerIn: string;
  numberIn: string;
  playerOut: string;
  numberOut: string;
  time: string;
}

export interface LineupPlayer {
  name: string;
  number: string;
}

export interface MatchLineup {
  starters: LineupPlayer[];
  subs: LineupPlayer[];
  captain: string;
  substitutionList: SubstitutionRecord[];
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
  cardList: CardRecord[];
  lineupDetails?: MatchLineup;
}

export interface AppUser {
  id: string;
  username: string;
  role: UserRole;
  restrictedCategory?: Category;
}

export interface AppState {
  people: Person[];
  attendance: AttendanceRecord[];
  sessions: TrainingSession[];
  matches: Match[];
  users: AppUser[];
  categories: Category[]; // قائمة الفئات الديناميكية
  currentUser: AppUser | null;
  notifications: AppNotification[];
}
