import React, { useMemo, useState } from 'react';
import { History, Search, Filter, Download, UserCheck, PlusCircle, Edit3, Calendar, Clock, ShieldCheck } from 'lucide-react';
import { AppState, AuditLogEntry } from '../types';
import { getMergedAuditLogs } from '../utils/auditLogger';
import { formatAuditDate, formatAuditTime } from '../utils/permissions';

interface AuditLogViewProps {
  state: AppState;
}

const AuditLogView: React.FC<AuditLogViewProps> = ({ state }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'الكل' | 'إضافة' | 'تعديل'>('الكل');
  const [sectionFilter, setSectionFilter] = useState<string>('الكل');
  const [roleFilter, setRoleFilter] = useState<string>('الكل');

  const isManager = state.currentUser?.role === 'مدير';

  const allLogs: AuditLogEntry[] = useMemo(() => {
    return getMergedAuditLogs(state.auditLogs);
  }, [state.auditLogs]);

  const uniqueSections = useMemo(() => {
    return Array.from(new Set(allLogs.map(l => l.section).filter(Boolean)));
  }, [allLogs]);

  const uniqueRoles = useMemo(() => {
    return Array.from(new Set(allLogs.map(l => l.actorRole).filter(Boolean)));
  }, [allLogs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allLogs.filter(log => {
      if (actionFilter !== 'الكل' && log.actionType !== actionFilter) return false;
      if (sectionFilter !== 'الكل' && log.section !== sectionFilter) return false;
      if (roleFilter !== 'الكل' && log.actorRole !== roleFilter) return false;
      if (q) {
        const hay = `${log.actorName} ${log.actorRole} ${log.section} ${log.targetName} ${log.details || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allLogs, searchQuery, actionFilter, sectionFilter, roleFilter]);

  const stats = useMemo(() => {
    const adds = allLogs.filter(l => l.actionType === 'إضافة').length;
    const edits = allLogs.filter(l => l.actionType === 'تعديل').length;
    const uniqueActors = new Set(allLogs.map(l => l.actorName).filter(Boolean)).size;
    return { total: allLogs.length, adds, edits, uniqueActors };
  }, [allLogs]);

  const exportCSV = () => {
    const headers = ['الحساب', 'الدور', 'العملية', 'القسم', 'العنصر', 'التفاصيل', 'التاريخ', 'الوقت'];
    const rows = filteredLogs.map(l => [
      l.actorName,
      l.actorRole,
      l.actionType,
      l.section,
      l.targetName,
      (l.details || '').replace(/,/g, ' - '),
      formatAuditDate(l.createdAt),
      formatAuditTime(l.createdAt)
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isManager) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm" dir="rtl">
        <ShieldCheck size={48} className="mx-auto text-slate-300 mb-3" />
        <h3 className="text-lg font-black text-blue-950">صلاحية حصرية للمدير العام</h3>
        <p className="text-xs font-bold text-slate-500 mt-1">سجل مراقبة التعديلات والحسابات متاح لحساب المدير فقط.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500" dir="rtl">
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-400/30 text-orange-400 flex items-center justify-center shrink-0">
            <History size={26} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight">سجل التعديلات والإضافات والحسابات</h2>
            <p className="text-xs text-blue-200 font-bold mt-0.5">
              توثيق فوري لكل عملية إضافة أو تعديل: الحساب المنفذ، الصلاحية، القسم، التاريخ، والوقت الدقيق
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={exportCSV}
          className="bg-white/10 hover:bg-orange-500 text-white px-5 py-3 rounded-xl font-black text-xs flex items-center gap-2 transition-all border border-white/15 shrink-0"
        >
          <Download size={16} /> تصدير السجل CSV
        </button>
      </div>

      {/* بطاقات ملخص السجل */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500">إجمالي الحركات المسجلة</p>
            <p className="text-2xl font-black text-blue-950 mt-1 font-mono">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center"><History size={20} /></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-700">عمليات الإضافة</p>
            <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">{stats.adds}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><PlusCircle size={20} /></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-amber-700">عمليات التعديل</p>
            <p className="text-2xl font-black text-amber-700 mt-1 font-mono">{stats.edits}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Edit3 size={20} /></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500">الحسابات النشطة بالسجل</p>
            <p className="text-2xl font-black text-orange-600 mt-1 font-mono">{stats.uniqueActors}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><UserCheck size={20} /></div>
        </div>
      </div>

      {/* شريط الفلاتر والبحث */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الحساب، العنصر، التفاصيل..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-3 text-xs font-bold text-slate-900 outline-none focus:border-blue-900"
          />
        </div>

        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-black text-blue-950 outline-none cursor-pointer"
        >
          <option value="الكل">جميع العمليات (إضافة وتعديل)</option>
          <option value="إضافة">عمليات الإضافة فقط</option>
          <option value="تعديل">عمليات التعديل فقط</option>
        </select>

        <select
          value={sectionFilter}
          onChange={e => setSectionFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-black text-blue-950 outline-none cursor-pointer"
        >
          <option value="الكل">جميع الأقسام</option>
          {uniqueSections.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-black text-blue-950 outline-none cursor-pointer"
        >
          <option value="الكل">جميع الصلاحيات / الأدوار</option>
          {uniqueRoles.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* عرض الجدول للشاشات الكبيرة والبطاقات للموبايل */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Filter size={40} className="mx-auto text-slate-300" />
            <p className="text-sm font-black text-slate-500">لا توجد حركات مسجلة مطابقة للبحث</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-600 uppercase">
                  <tr>
                    <th className="p-4">الحساب المنفذ</th>
                    <th className="p-4">الدور</th>
                    <th className="p-4 text-center">العملية</th>
                    <th className="p-4">القسم</th>
                    <th className="p-4">العنصر والتفاصيل</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-black text-blue-950">{log.actorName}</td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200">
                          {log.actorRole}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${
                          log.actionType === 'إضافة'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {log.actionType === 'إضافة' ? <PlusCircle size={12} /> : <Edit3 size={12} />}
                          {log.actionType}
                        </span>
                      </td>
                      <td className="p-4 font-black text-blue-900">{log.section}</td>
                      <td className="p-4 max-w-xs">
                        <div className="font-black text-slate-900 truncate">{log.targetName}</div>
                        {log.details && <div className="text-[11px] text-slate-500 font-medium truncate">{log.details}</div>}
                      </td>
                      <td className="p-4 font-mono text-slate-700 whitespace-nowrap">{formatAuditDate(log.createdAt)}</td>
                      <td className="p-4 font-mono text-orange-600 font-black whitespace-nowrap" dir="ltr">{formatAuditTime(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <div key={log.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-black text-sm text-blue-950 truncate">{log.actorName}</span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black shrink-0">{log.actorRole}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                      log.actionType === 'إضافة' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {log.actionType}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[11px] font-black text-blue-900">{log.section}: {log.targetName}</p>
                    {log.details && <p className="text-[11px] text-slate-600 font-medium">{log.details}</p>}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {formatAuditDate(log.createdAt)}</span>
                    <span className="flex items-center gap-1 text-orange-600 font-black" dir="ltr"><Clock size={12} /> {formatAuditTime(log.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogView;
