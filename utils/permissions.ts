import { AppUser, UserRole } from '../types';

export const getAllowedCategories = (user?: AppUser | null): string[] => {
  if (!user?.restrictedCategory) return [];
  return String(user.restrictedCategory)
    .split(',')
    .map(c => c.trim())
    .filter(Boolean);
};

export const hasCategoryAccess = (user?: AppUser | null, category?: string): boolean => {
  if (!user) return false;
  if (user.role === 'مدير') return true;
  const allowed = getAllowedCategories(user);
  if (allowed.length === 0) return true;
  if (!category) return true;
  return String(category)
    .split(',')
    .map(c => c.trim())
    .some(c => allowed.includes(c));
};

export const isManagerRole = (userOrRole?: AppUser | UserRole | null): boolean => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return role === 'مدير';
};

export const isCategoryAdminRole = (userOrRole?: AppUser | UserRole | null): boolean => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return role === 'إداري فئة';
};

export const isViewerRole = (userOrRole?: AppUser | UserRole | null): boolean => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return role === 'مشاهد';
};

export const isWarehouseKeeperRole = (userOrRole?: AppUser | UserRole | null): boolean => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return role === 'أمين مستودع';
};

export const isEquipmentOfficerRole = (userOrRole?: AppUser | UserRole | null): boolean => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return role === 'مسؤول تجهيزات';
};

export const isAnyWarehouseRole = (userOrRole?: AppUser | UserRole | null): boolean => {
  return isWarehouseKeeperRole(userOrRole) || isEquipmentOfficerRole(userOrRole);
};

export const isMedicRole = (userOrRole?: AppUser | UserRole | null): boolean => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return role === 'معالج';
};

export const isCoachingRole = (userOrRole?: AppUser | UserRole | null): boolean => {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole?.role;
  return role === 'مدرب' || role === 'مساعد مدرب' || role === 'مدرب حراس';
};

/** الحذف مسموح حصراً للمدير في كافة الأقسام، وممنوع نهائياً لأمين المستودع ومسؤول التجهيزات */
export const canDeleteRecords = (user?: AppUser | null): boolean => {
  return isManagerRole(user);
};

/** صلاحية تعديل وإضافة البيانات والتقارير الطبية */
export const canEditMedicalData = (user?: AppUser | null, category?: string): boolean => {
  if (!user) return false;
  if (!isManagerRole(user) && !isMedicRole(user)) return false;
  return hasCategoryAccess(user, category);
};

/** صلاحية تعديل الوزن والطول للاعبين */
export const canEditWeightOrHeight = (user?: AppUser | null, category?: string): boolean => {
  if (!user) return false;
  const allowedRole = isManagerRole(user) || isMedicRole(user) || isCategoryAdminRole(user) || isCoachingRole(user);
  if (!allowedRole) return false;
  return hasCategoryAccess(user, category);
};

/** صلاحية تعديل/إضافة البيانات الرياضية غير الطبية (الهوية، المباريات، التمارين، الكوادر...) */
export const canEditSportsData = (user?: AppUser | null, category?: string): boolean => {
  if (!user) return false;
  const allowedRole = isManagerRole(user) || isCategoryAdminRole(user) || isCoachingRole(user);
  if (!allowedRole) return false;
  return hasCategoryAccess(user, category);
};

/** صلاحية رؤية/تعديل/إضافة صنف في المستودع (بدون حذف لغير المدير) */
export const canEditWarehouseItem = (user?: AppUser | null, itemCategory?: string): boolean => {
  if (!user) return false;
  if (isManagerRole(user) || isWarehouseKeeperRole(user)) return true;
  if (isViewerRole(user) || isMedicRole(user) || user.role === 'لاعب' || user.role === 'ولي أمر') return false;
  const allowed = getAllowedCategories(user);
  if (isEquipmentOfficerRole(user)) {
    if (allowed.length === 0) return true;
    return Boolean(itemCategory && allowed.includes(itemCategory));
  }
  if (allowed.length === 0) return true;
  return Boolean(itemCategory && (allowed.includes(itemCategory) || itemCategory === 'المخزن العام'));
};

export const canAddWarehouseItem = (user?: AppUser | null): boolean => {
  if (!user) return false;
  return (
    isManagerRole(user) ||
    isWarehouseKeeperRole(user) ||
    isEquipmentOfficerRole(user) ||
    isCategoryAdminRole(user) ||
    isCoachingRole(user)
  );
};

export const canEditSelfProfile = (user?: AppUser | null): boolean => {
  if (!user) return false;
  return !isViewerRole(user) && !isAnyWarehouseRole(user) && !isMedicRole(user) && user.role !== 'لاعب' && user.role !== 'ولي أمر';
};

export const formatActorLabel = (user?: AppUser | null): string => {
  if (!user) return 'غير معروف';
  return `${user.username} (${user.role})`;
};

export const formatAuditDate = (iso?: string): string => {
  if (!iso) return '---';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const formatAuditTime = (iso?: string): string => {
  if (!iso) return '---';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
};

export const formatAuditDateTime = (iso?: string): string => {
  if (!iso) return '---';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${formatAuditDate(iso)} • ${formatAuditTime(iso)}`;
};
