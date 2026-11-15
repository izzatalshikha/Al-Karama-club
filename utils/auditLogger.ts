import React from 'react';
import { AppState, AppUser, AuditLogEntry } from '../types';
import { supabase, generateUUID } from '../App';

const LOCAL_AUDIT_LOGS_KEY = 'eagle_os_audit_logs';
const LOCAL_WAREHOUSE_EDITORS_KEY = 'eagle_os_warehouse_editors';

export const getLocalAuditLogs = (): AuditLogEntry[] => {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getMergedAuditLogs = (cloudLogs?: AuditLogEntry[]): AuditLogEntry[] => {
  const localLogs = getLocalAuditLogs();
  const combined = [...(Array.isArray(cloudLogs) ? cloudLogs : []), ...localLogs];
  const map = new Map<string, AuditLogEntry>();
  combined.forEach(item => {
    if (item && item.id) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 500);
};

export const getLocalWarehouseEditors = (): Record<string, { lastModifiedBy: string; lastUpdated: string }> => {
  try {
    const raw = localStorage.getItem(LOCAL_WAREHOUSE_EDITORS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const saveLocalWarehouseEditor = (itemId: string, lastModifiedBy: string, lastUpdated: string) => {
  try {
    const current = getLocalWarehouseEditors();
    current[itemId] = { lastModifiedBy, lastUpdated };
    localStorage.setItem(LOCAL_WAREHOUSE_EDITORS_KEY, JSON.stringify(current));
  } catch {}
};

interface RecordAuditLogParams {
  user?: AppUser | null;
  actionType: 'إضافة' | 'تعديل';
  section: string;
  targetName: string;
  details?: string;
  setState?: React.Dispatch<React.SetStateAction<AppState>> | ((updater: (prev: AppState) => AppState) => void);
}

export const recordAuditLog = async ({
  user,
  actionType,
  section,
  targetName,
  details,
  setState
}: RecordAuditLogParams): Promise<AuditLogEntry> => {
  const entry: AuditLogEntry = {
    id: generateUUID(),
    actorId: user?.id || 'system',
    actorName: user?.username || 'غير معروف',
    actorRole: user?.role || 'غير محدد',
    actionType,
    section,
    targetName: targetName || '---',
    details: details || '',
    createdAt: new Date().toISOString()
  };

  try {
    const updatedLocal = [entry, ...getLocalAuditLogs().filter(x => x.id !== entry.id)].slice(0, 500);
    localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(updatedLocal));
  } catch {}

  if (setState) {
    try {
      setState(prev => ({
        ...prev,
        auditLogs: [entry, ...(prev.auditLogs || []).filter(x => x.id !== entry.id)].slice(0, 500)
      }));
    } catch {}
  }

  try {
    await supabase.from('audit_logs').upsert(entry);
  } catch {
    // Silent fallback if audit_logs table is not yet created in Supabase
  }

  return entry;
};
