import React, { useState } from 'react';
import { History, Download, Search } from 'lucide-react';
import { AuditLogEntry } from '../../types';
import { Language, translations } from '../../i18n/translations';

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
  lang: Language;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs, lang }) => {
  const t = translations[lang];
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'all' || log.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleExportCsv = () => {
    const headers = ['ID', 'Date et heure', 'Acteur', 'Rôle', 'Action', 'Détails'];
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.actor.replace(/"/g, '""')}"`,
      `"${l.role}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `doccycle-audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
      
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-[18px] font-bold text-slate-900">
            Journal d'audit
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Historique horodaté des actions et traçabilité des opérations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Export Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-[13px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[44px]"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exporter en CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par acteur, action ou mot-clé..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none cursor-pointer"
        >
          <option value="all">Tous les rôles</option>
          <option value="Candidat">Candidat</option>
          <option value="Directeur de thèse">Directeur de thèse</option>
          <option value="Directeur de structure">Directeur de structure</option>
          <option value="Commission">Commission</option>
          <option value="Directeur du CED">Directeur du CED</option>
          <option value="GCD / Administration">GCD / Administration</option>
          <option value="Administration">Administration</option>
          <option value="Système">Système</option>
        </select>
      </div>

      {/* Table with Fixed Header and Spacious Rows */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 w-40">Date & heure</th>
              <th className="py-3 px-4 w-32">Rôle</th>
              <th className="py-3 px-4 w-48">Acteur</th>
              <th className="py-3 px-4 w-48">Action</th>
              <th className="py-3 px-4">Détails</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Aucun enregistrement ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono-folder text-slate-500 text-[12px] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {log.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {log.actor}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 text-slate-600 leading-relaxed text-[12px]">
                    {log.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
