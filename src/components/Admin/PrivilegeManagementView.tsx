import React, { useState } from 'react';
import {
  Users,
  Key,
  Search,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  History
} from 'lucide-react';
import {
  UserAccount,
  RoleDefinition,
  PermissionKey,
  PrivilegeAuditLog,
  RoleId,
} from '../../types';
import {
  canChangeUserRole,
  canSuspendUser,
} from '../../utils/workflowStorage';
import { Language, translations } from '../../i18n/translations';

interface PrivilegeManagementViewProps {
  users: UserAccount[];
  roles: RoleDefinition[];
  currentActiveUser: UserAccount;
  auditLogs: PrivilegeAuditLog[];
  onAssignUserRole: (userId: string, newRoleId: RoleId) => void;
  onToggleUserStatus: (userId: string) => void;
  lang: Language;
}

export const PrivilegeManagementView: React.FC<PrivilegeManagementViewProps> = ({
  users,
  roles,
  currentActiveUser,
  auditLogs,
  onAssignUserRole,
  onToggleUserStatus,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'rights_summary' | 'audit'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [securityError, setSecurityError] = useState<string | null>(null);

  const isGcdAdmin = currentActiveUser.roleId === 'gcd_admin';

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoleFilter === 'all' || u.roleId === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleSelectChange = (userId: string, newRoleId: RoleId) => {
    setSecurityError(null);
    const check = canChangeUserRole(users, currentActiveUser, userId, newRoleId);
    if (!check.allowed) {
      setSecurityError(check.reason || 'Action réservée au rôle GCD / Administration');
      return;
    }
    onAssignUserRole(userId, newRoleId);
  };

  const handleToggleStatus = (userId: string) => {
    setSecurityError(null);
    const check = canSuspendUser(users, currentActiveUser, userId);
    if (!check.allowed) {
      setSecurityError(check.reason || 'Action réservée au rôle GCD / Administration');
      return;
    }
    onToggleUserStatus(userId);
  };

  return (
    <div className="space-y-6 pb-24">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-white flex items-center justify-center font-bold">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-slate-900">
                Rôles & Privilèges
              </h1>
              <p className="text-[13px] text-slate-500">
                Gestion des comptes, attribution des 6 rôles et journal des modifications
              </p>
            </div>
          </div>
        </div>

        {securityError && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-[13px] text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{securityError}</span>
            </div>
            <button onClick={() => setSecurityError(null)} className="text-rose-500 hover:text-rose-800 font-bold p-1 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mt-6 flex items-center gap-6 border-b border-slate-200 text-[14px]">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`pb-3 font-semibold transition-colors cursor-pointer border-b-2 -mb-[1px] flex items-center gap-2 ${
              activeTab === 'users'
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestion des utilisateurs ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rights_summary')}
            className={`pb-3 font-semibold transition-colors cursor-pointer border-b-2 -mb-[1px] flex items-center gap-2 ${
              activeTab === 'rights_summary'
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Résumé des droits par rôle</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`pb-3 font-semibold transition-colors cursor-pointer border-b-2 -mb-[1px] flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Journal des modifications ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: USERS TABLE WITH ROLE DROPDOWN */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-9 pr-3 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#1E3A8A] text-slate-900"
              />
            </div>

            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 bg-white cursor-pointer"
            >
              <option value="all">Tous les 6 rôles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Rôle attribué</th>
                  <th className="py-3 px-4">Périmètre / Structure</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isCurrent = currentActiveUser.id === u.id;
                  const currentRoleDef = roles.find((r) => r.id === u.roleId);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-blue-100 text-[#1E3A8A] font-bold px-1.5 py-0.2 rounded">
                              Vous
                            </span>
                          )}
                        </div>
                        <div className="text-[12px] text-slate-500 font-mono-folder">{u.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isGcdAdmin ? (
                          <select
                            value={u.roleId}
                            onChange={(e) => handleRoleSelectChange(u.id, e.target.value as RoleId)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[12px] font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-[#1E3A8A] cursor-pointer"
                          >
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={`px-2.5 py-1 rounded text-[11px] font-bold border ${currentRoleDef?.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                            {currentRoleDef?.name || u.roleId}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {u.scope || 'Tous les dossiers'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}>
                          {u.status === 'active' ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isGcdAdmin && !isCurrent && (
                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${
                              u.status === 'active'
                                ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspendre' : 'Réactiver'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: READ-ONLY RIGHTS SUMMARY BY ROLE */}
      {activeTab === 'rights_summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className={`px-2.5 py-1 rounded text-[12px] font-bold border ${r.badgeColor}`}>
                  {r.name}
                </span>
                <span className="text-[11px] text-slate-400 font-mono-folder">{r.id}</span>
              </div>

              <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                {r.description}
              </p>

              <div className="pt-2 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Droits accordés :
                </div>
                <div className="space-y-1">
                  {r.id === 'candidate' && (
                    <div className="p-2 bg-blue-50/60 border border-blue-100 rounded text-[12px] text-blue-900 font-medium">
                      ✓ Consultation des sujets sans compte<br />
                      ✓ Panier / Choix de sujets sans compte<br />
                      ✓ Postuler (max 3 sujets par candidat)<br />
                      ✓ Suivi en 6 étapes de son propre dossier<br />
                      <span className="text-amber-800 font-bold block mt-1">
                        ⓘ Restreint à son propre dossier (accès strict)
                      </span>
                    </div>
                  )}

                  {r.id === 'thesis_director' && (
                    <div className="p-2 bg-indigo-50/60 border border-indigo-100 rounded text-[12px] text-indigo-900 font-medium">
                      ✓ Proposer et modifier ses sujets<br />
                      ✓ Voir uniquement les candidatures sur ses sujets<br />
                      ✓ Donner un avis (Favorable / Défavorable + motif)
                    </div>
                  )}

                  {r.id === 'structure_director' && (
                    <div className="p-2 bg-purple-50/60 border border-purple-100 rounded text-[12px] text-purple-900 font-medium">
                      ✓ Valider / refuser les sujets de sa structure<br />
                      ✓ Donner un avis sur les candidatures de sa structure
                    </div>
                  )}

                  {r.id === 'commission' && (
                    <div className="p-2 bg-teal-50/60 border border-teal-100 rounded text-[12px] text-teal-900 font-medium">
                      ✓ Examiner les dossiers recevables affectés<br />
                      ✓ Programmer les entretiens de sélection<br />
                      ✓ Proposer un classement (Principale / Attente)
                    </div>
                  )}

                  {r.id === 'ced_director' && (
                    <div className="p-2 bg-amber-50/60 border border-amber-100 rounded text-[12px] text-amber-900 font-medium">
                      ✓ Valider la publication des sujets<br />
                      ✓ Décision finale d'admission (Admis / Attente / Refusé)<br />
                      ✓ Consulter les chiffres globaux du CEDoc
                    </div>
                  )}

                  {r.id === 'gcd_admin' && (
                    <div className="p-2 bg-emerald-50/60 border border-emerald-100 rounded text-[12px] text-emerald-900 font-medium">
                      ✓ Contrôle de la complétude administrative<br />
                      ✓ Signaler « Dossier incomplet » avec motif<br />
                      ✓ Gérer les dates de campagne et max 3 sujets<br />
                      ✓ Finaliser l'inscription administrative<br />
                      ✓ Gérer les comptes et les 6 rôles
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: PRIVILEGE AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
          <div className="text-[15px] font-bold text-slate-900">
            Journal d'audit des modifications de rôles
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Heure</th>
                  <th className="py-3 px-4">Auteur</th>
                  <th className="py-3 px-4">Ancien rôle</th>
                  <th className="py-3 px-4">Nouveau rôle</th>
                  <th className="py-3 px-4">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Aucune modification enregistrée dans le journal.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono-folder text-slate-500 text-[12px]">{log.timestamp}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{log.actorName}</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">{log.formerRole}</span></td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-blue-100 text-[#1E3A8A] text-[11px] font-bold">{log.newRole}</span></td>
                      <td className="py-3 px-4 text-slate-600">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
