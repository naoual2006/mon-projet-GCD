import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  QrCode,
  CheckCircle2,
  History,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
  XCircle,
  Settings,
  Save,
  Lock,
  BookCheck,
  FileSpreadsheet,
  Award,
  Send,
  GraduationCap,
  X,
  CalendarClock,
} from 'lucide-react';
import {
  Application,
  ThesisSubject,
  AuditLogEntry,
  UserAccount,
  RoleDefinition,
  PermissionKey,
  PrivilegeAuditLog,
  SystemConfig,
} from '../../types';
import { ChecklistTricolor } from './ChecklistTricolor';
import { ElectronicSignatureWorkflow } from './ElectronicSignatureWorkflow';
import { AuditLogViewer } from './AuditLogViewer';
import { PrivilegeManagementView } from './PrivilegeManagementView';
import { Language } from '../../i18n/translations';
import { checkRoleGuard } from '../../utils/workflowStorage';
import {
  validateSubjectStructure,
  rejectSubjectStructure,
  validateSubjectCed,
  rejectSubjectCed,
  publishSubject,
  batchValidateSubjects,
  validateGlobalPvStructure,
  approveCedResults,
  publishResults,
  finalizeRegistration,
  rescheduleInterview,
  markChecklistItemValid,
  markReceivable,
  rejectApplicationAdmin,
} from '../../utils/workflowEngine';
import { formatCandidateName, formatFrenchDate, maskCin, maskPhone } from '../../utils/formatData';

interface AdminDashboardProps {
  applications: Application[];
  subjects?: ThesisSubject[];
  onUpdateApplications?: (apps: Application[], message?: string) => void;
  onUpdateSubjects?: (subjects: ThesisSubject[], message?: string) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenQrScanner: () => void;
  onOpenPrintSheet: (app: Application) => void;
  onTriggerRelance: (appId: string, itemKey: string, motif?: string) => void;
  onSignWorkflow: (appId: string, roleKey: 'director' | 'labHead' | 'cedocHead') => void;
  auditLogs: AuditLogEntry[];
  onAddAuditLog?: (action: string, details: string, actorOverride?: string, roleOverride?: string) => void;
  lang: Language;
  users: UserAccount[];
  roles: RoleDefinition[];
  currentActiveUser: UserAccount;
  privilegeAuditLogs: PrivilegeAuditLog[];
  onUpdateRolePermissions: (roleId: string, permissionKey: PermissionKey, granted: boolean) => void;
  onAssignUserRole: (userId: string, newRoleId: string, scope?: string) => void;
  onToggleUserStatus: (userId: string) => void;
  onCreateCustomRole: (name: string, nameAr: string, description: string, permissions: PermissionKey[]) => void;
  onDeleteCustomRole: (roleId: string) => void;
  onAddUser: (user: Omit<UserAccount, 'id' | 'lastLogin'>) => void;
  canManagePrivileges: boolean;
  systemConfig?: SystemConfig;
  onUpdateSystemConfig?: (config: SystemConfig) => void;
  onShowToast?: (msg: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  applications,
  subjects = [],
  onUpdateApplications,
  onUpdateSubjects,
  activeTab,
  setActiveTab,
  onOpenQrScanner,
  onOpenPrintSheet,
  onTriggerRelance,
  onSignWorkflow,
  auditLogs,
  onAddAuditLog,
  lang,
  users,
  roles,
  currentActiveUser,
  privilegeAuditLogs,
  onAssignUserRole,
  onToggleUserStatus,
  systemConfig = { maxApplicationsPerCandidate: 3, campaignStartDate: '2026-10-15', campaignEndDate: '2026-11-30' },
  onUpdateSystemConfig,
  onShowToast,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'pending' | 'rejected'>('all');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Batch subject selection for Structure Director
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  // Subject rejection modal (Structure / CED)
  const [rejectingSubject, setRejectingSubject] = useState<ThesisSubject | null>(null);
  const [subjectRejectMotif, setSubjectRejectMotif] = useState('');
  const [subjectRejectError, setSubjectRejectError] = useState<string | null>(null);

  // Reschedule modal for GCD
  const [rescheduleApp, setRescheduleApp] = useState<Application | null>(null);
  const [reschedDate, setReschedDate] = useState('2026-12-12');
  const [reschedTime, setReschedTime] = useState('14:00');
  const [reschedLoc, setReschedLoc] = useState('Salle CEDoc · USMBA');

  // Config local form state & confirmation modal
  const [maxChoices, setMaxChoices] = useState<number>(systemConfig.maxApplicationsPerCandidate || 3);
  const [startDate, setStartDate] = useState<string>(systemConfig.campaignStartDate || '2026-10-15');
  const [endDate, setEndDate] = useState<string>(systemConfig.campaignEndDate || '2026-11-30');
  const [configSavedToast, setConfigSavedToast] = useState<boolean>(false);
  const [confirmEndDateModalOpen, setConfirmEndDateModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setMaxChoices(systemConfig.maxApplicationsPerCandidate || 3);
    setStartDate(systemConfig.campaignStartDate || '2026-10-15');
    setEndDate(systemConfig.campaignEndDate || '2026-11-30');
  }, [systemConfig]);

  const isGcd = currentActiveUser.roleId === 'gcd_admin';
  const isStructure = currentActiveUser.roleId === 'structure_director';
  const isCed = currentActiveUser.roleId === 'ced_director';

  const roleSidebarTitle = isStructure
    ? 'Espace Directeur de structure'
    : isCed
    ? 'Espace Directeur du CED'
    : 'Espace GCD / Administration';

  const sidebarNavItems = isStructure
    ? [
        { id: 'registry', label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'validate_subjects', label: 'Sujets à valider', icon: BookCheck },
        { id: 'pv_global', label: 'PV global', icon: FileSpreadsheet },
      ]
    : isCed
    ? [
        { id: 'registry', label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'decisions', label: 'Décisions à prendre', icon: BookCheck },
        { id: 'results', label: 'Résultats', icon: Award },
        { id: 'history', label: 'Historique des décisions', icon: History },
      ]
    : [
        { id: 'registry', label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'checklist', label: 'Dossiers à vérifier', icon: FileText },
        { id: 'publications', label: 'Publications', icon: Send },
        { id: 'inscriptions', label: 'Inscriptions', icon: GraduationCap },
        { id: 'signatures', label: 'Signatures', icon: CheckCircle2 },
        { id: 'privileges', label: 'Droits d\'accès', icon: ShieldCheck },
        { id: 'settings', label: 'Paramètres du concours', icon: Settings },
        { id: 'audit', label: 'Journal d\'audit', icon: History },
      ];

  // Ensure activeTab is valid for current role
  const validTabIds = sidebarNavItems.map((i) => i.id);
  const effectiveTab = validTabIds.includes(activeTab) ? activeTab : 'registry';

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
  };

  // --- Structure Director handlers ---
  const handleValidateSubjectStructure = (subId: string) => {
    setErrorBanner(null);
    const res = validateSubjectStructure(subjects, subId, currentActiveUser);
    if (res.success && res.data && onUpdateSubjects) {
      onUpdateSubjects(res.data, res.message);
      onAddAuditLog?.('Validation sujet (Structure)', `Sujet ${subId} validé par la structure.`);
    } else if (!res.success) setErrorBanner(res.message);
  };

  const handleBatchValidateStructure = () => {
    if (selectedSubjectIds.length === 0) return;
    const res = batchValidateSubjects(subjects, selectedSubjectIds, currentActiveUser);
    if (res.success && res.data && onUpdateSubjects) {
      onUpdateSubjects(res.data, res.message);
      onAddAuditLog?.('Validation groupée (Structure)', `${selectedSubjectIds.length} sujet(s) validés.`);
      setSelectedSubjectIds([]);
    } else if (!res.success) setErrorBanner(res.message);
  };

  const handleValidateGlobalPv = (appId: string) => {
    const res = validateGlobalPvStructure(applications, appId, currentActiveUser);
    if (res.success && res.data && onUpdateApplications) {
      onUpdateApplications(res.data, res.message);
      onAddAuditLog?.('Validation PV global', `PV global validé pour le dossier ${appId}.`);
    } else if (!res.success) setErrorBanner(res.message);
  };

  // --- CED Director handlers ---
  const handleValidateSubjectCed = (subId: string) => {
    const res = validateSubjectCed(subjects, subId, currentActiveUser);
    if (res.success && res.data && onUpdateSubjects) {
      onUpdateSubjects(res.data, res.message);
      onAddAuditLog?.('Validation sujet (CED)', `Sujet ${subId} validé par le Directeur du CED.`);
    } else if (!res.success) setErrorBanner(res.message);
  };

  const handleApproveResultsCed = (appId: string) => {
    const res = approveCedResults(applications, appId, currentActiveUser);
    if (res.success && res.data && onUpdateApplications) {
      onUpdateApplications(res.data, res.message);
      onAddAuditLog?.('Approbation résultats (CED)', `Résultats approuvés pour le dossier ${appId}.`);
    } else if (!res.success) setErrorBanner(res.message);
  };

  const handleConfirmRejectSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingSubject) return;
    if (!subjectRejectMotif.trim()) {
      setSubjectRejectError('Le motif de refus est obligatoire.');
      return;
    }
    const res = isStructure
      ? rejectSubjectStructure(subjects, rejectingSubject.id, subjectRejectMotif.trim(), currentActiveUser)
      : rejectSubjectCed(subjects, rejectingSubject.id, subjectRejectMotif.trim(), currentActiveUser);
    if (res.success && res.data && onUpdateSubjects) {
      onUpdateSubjects(res.data, res.message);
      onAddAuditLog?.('Refus sujet', `Sujet ${rejectingSubject.id} refusé : ${subjectRejectMotif.trim()}`);
      setRejectingSubject(null);
      setSubjectRejectMotif('');
      setSubjectRejectError(null);
    } else {
      setSubjectRejectError(res.message);
    }
  };

  // --- GCD Admin handlers ---
  const handlePublishSubjectGcd = (subId: string) => {
    setErrorBanner(null);
    const res = publishSubject(subjects, subId, currentActiveUser);
    if (res.success && res.data && onUpdateSubjects) {
      onUpdateSubjects(res.data, res.message);
      onAddAuditLog?.('Publication sujet', `Sujet ${subId} publié dans le catalogue.`);
    } else if (!res.success) setErrorBanner(res.message);
  };

  const handlePublishResultsGcd = (app: Application) => {
    setErrorBanner(null);
    const decision = app.finalResultDecision && app.finalResultDecision !== 'pending'
      ? app.finalResultDecision
      : 'admitted';
    const res = publishResults(applications, app.id, decision, app.waitingListPosition, currentActiveUser);
    if (res.success && res.data && onUpdateApplications) {
      onUpdateApplications(res.data, res.message);
      onAddAuditLog?.('Publication résultats', `Résultat publié pour ${app.folderNumber} (${decision}).`);
    } else if (!res.success) setErrorBanner(res.message);
  };

  const handleFinalizeRegistration = (appId: string) => {
    const res = finalizeRegistration(applications, appId, currentActiveUser);
    if (res.success && res.data && onUpdateApplications) {
      onUpdateApplications(res.data, res.message);
      onAddAuditLog?.('Inscription définitive', `Inscription validée pour le dossier ${appId}.`);
    } else if (!res.success) setErrorBanner(res.message);
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleApp) return;
    const res = rescheduleInterview(
      applications,
      rescheduleApp.id,
      { date: reschedDate, time: reschedTime, location: reschedLoc, note: 'Reprogrammation unique exceptionnelle' },
      currentActiveUser
    );
    if (res.success && res.data && onUpdateApplications) {
      onUpdateApplications(res.data, res.message);
      onAddAuditLog?.('Reprogrammation entretien', `Nouvelle convocation unique pour ${rescheduleApp.folderNumber}.`);
      setRescheduleApp(null);
    } else if (!res.success) setErrorBanner(res.message);
  };

  const applySystemConfigSave = () => {
    if (!onUpdateSystemConfig) return;
    const prevEnd = systemConfig.campaignEndDate;
    const prevMax = systemConfig.maxApplicationsPerCandidate;
    onUpdateSystemConfig({
      maxApplicationsPerCandidate: maxChoices,
      campaignStartDate: startDate,
      campaignEndDate: endDate,
    });
    onAddAuditLog?.(
      'Modification paramètres concours',
      `Clôture : ${prevEnd} → ${endDate} · Quota max : ${prevMax} → ${maxChoices} choix.`
    );
    setConfigSavedToast(true);
    setConfirmEndDateModalOpen(false);
    setTimeout(() => setConfigSavedToast(false), 3500);
  };

  const handleSaveConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const guard = checkRoleGuard(currentActiveUser, ['gcd_admin']);
    if (!guard.allowed) {
      setErrorBanner(guard.message || 'Action réservée au rôle GCD / Administration');
      return;
    }
    if (endDate !== systemConfig.campaignEndDate) {
      setConfirmEndDateModalOpen(true);
      return;
    }
    applySystemConfigSave();
  };

  // --- Integer Metrics (NO percentages) ---
  const totalApps = applications.length;
  const physicalReceivedCount = applications.filter(
    (a) => a.status === 'registered' || a.physicalFileReceivedAt !== undefined
  ).length;
  const pendingPiecesCount = applications.filter(
    (a) => a.status === 'submitted' || a.status === 'incomplete'
  ).length;
  const notRetainedCount = applications.filter(
    (a) => a.finalResultDecision === 'rejected' || a.status === 'renounced'
  ).length;

  const filteredApplications = applications.filter((app) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'valid') return app.status === 'registered' || app.physicalFileReceivedAt !== undefined;
    if (statusFilter === 'pending') return app.status === 'submitted' || app.status === 'incomplete';
    if (statusFilter === 'rejected') return app.finalResultDecision === 'rejected' || app.status === 'renounced';
    return true;
  });

  // Structure counts
  const proposedSubjects = subjects.filter((s) => s.status === 'proposed');
  const structureValidatedSubjects = subjects.filter((s) => s.status === 'structure_validated');
  const pvToValidateApps = applications.filter((a) => a.status === 'pv_subject_ready');
  const pvValidatedApps = applications.filter((a) => a.status === 'pv_global_validated');

  // CED counts
  const cedSubjectsToValidate = subjects.filter((s) => s.status === 'structure_validated');
  const cedResultsToApprove = applications.filter((a) => a.status === 'pv_global_validated');
  const cedDecisionsHistoryCount =
    subjects.filter((s) => s.status === 'ced_validated' || s.status === 'published').length +
    applications.filter((a) => a.cedResultsApproved).length;

  const cedRankedResults = [...applications]
    .filter((a) =>
      ['pv_subject_ready', 'pv_global_validated', 'results_approved', 'results_published', 'place_confirmed', 'registered'].includes(a.status)
    )
    .sort((a, b) => (b.interviewEvaluation?.totalScore || 0) - (a.interviewEvaluation?.totalScore || 0));

  return (
    <div className="flex gap-6 items-start pb-24">
      {/* Left Sidebar Navigation */}
      <aside
        className={`hidden md:flex flex-col bg-white rounded-xl border border-slate-200/80 shadow-xs shrink-0 transition-all duration-200 sticky top-20 overflow-hidden ${
          isSidebarCollapsed ? 'w-16 p-2' : 'w-64 p-3'
        }`}
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 px-2">
          {!isSidebarCollapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {roleSidebarTitle}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-auto cursor-pointer"
            title={isSidebarCollapsed ? 'Agrandir le menu' : 'Replier le menu'}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="space-y-1">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = effectiveTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors cursor-pointer text-[14px] ${
                  isActive
                    ? 'bg-[#1E3A8A] text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
                }`}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {isGcd && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenQrScanner}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-[13px] font-medium border border-slate-200 ${
                isSidebarCollapsed ? 'justify-center' : ''
              }`}
              title="Réceptionner un dossier par scan QR Code"
            >
              <QrCode className="w-4 h-4 text-[#1E3A8A] shrink-0" />
              {!isSidebarCollapsed && <span>Réception (QR)</span>}
            </button>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Mobile tabs */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
          {sidebarNavItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                effectiveTab === item.id
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {errorBanner && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-center justify-between">
            <span>{errorBanner}</span>
            <button type="button" onClick={() => setErrorBanner(null)} className="font-bold cursor-pointer">✕</button>
          </div>
        )}

        {/* ================================================================ */}
        {/* STRUCTURE DIRECTOR VIEWS                                          */}
        {/* ================================================================ */}
        {isStructure && effectiveTab === 'registry' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
              <h1 className="text-[22px] font-bold text-slate-900">Espace Directeur de structure</h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Validation des sujets proposés par les équipes et approbation du PV global de sélection
              </p>
            </div>

            <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-xl text-[13px]">
              <p className="font-bold text-purple-900 mb-1">Guide rapide :</p>
              <ol className="list-decimal list-inside text-slate-700 space-y-0.5">
                <li>Examinez les sujets proposés dans « Sujets à valider » (validation individuelle, groupée ou refus motivé).</li>
                <li>Transmettez les sujets conformes au Directeur du CED pour validation institutionnelle.</li>
                <li>Validez le PV global établi par la commission scientifique dans « PV global ».</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('validate_subjects')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white text-left hover:border-purple-500 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-amber-800">Sujets à valider</span>
                  <BookCheck className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-[26px] font-bold text-slate-900 mt-1 font-mono-folder tabular-nums">
                  {proposedSubjects.length}
                </div>
                <span className="text-[11px] text-slate-400">En attente de visa structure</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('validate_subjects')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white text-left hover:border-emerald-500 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-emerald-800">Sujets validés</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-[26px] font-bold text-emerald-900 mt-1 font-mono-folder tabular-nums">
                  {structureValidatedSubjects.length}
                </div>
                <span className="text-[11px] text-emerald-700">Transmis au Directeur du CED</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pv_global')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white text-left hover:border-[#1E3A8A] cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#1E3A8A]">PV à valider</span>
                  <FileSpreadsheet className="w-4 h-4 text-[#1E3A8A]" />
                </div>
                <div className="text-[26px] font-bold text-slate-900 mt-1 font-mono-folder tabular-nums">
                  {pvToValidateApps.length}
                </div>
                <span className="text-[11px] text-slate-400">PV de commission reçus</span>
              </button>
            </div>
          </div>
        )}

        {isStructure && effectiveTab === 'validate_subjects' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-bold text-slate-900">Sujets à valider ({proposedSubjects.length})</h2>
                <p className="text-[12px] text-slate-500">Validez individuellement, par lot ou refusez avec motif obligatoire.</p>
              </div>
              {selectedSubjectIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchValidateStructure}
                  className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg text-xs font-semibold hover:bg-[#172554] cursor-pointer"
                >
                  Valider la sélection ({selectedSubjectIds.length})
                </button>
              )}
            </div>

            {proposedSubjects.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Aucun sujet en attente de validation par la structure.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {proposedSubjects.map((sub) => {
                  const isChecked = selectedSubjectIds.includes(sub.id);
                  return (
                    <div key={sub.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSubjectIds([...selectedSubjectIds, sub.id]);
                            else setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== sub.id));
                          }}
                          className="mt-1 h-4 w-4 accent-[#1E3A8A] cursor-pointer"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono-folder font-bold text-[#1E3A8A]">{sub.id}</span>
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-semibold">Proposé</span>
                            <span className="text-slate-500">{sub.discipline}</span>
                          </div>
                          <h3 className="font-bold text-[15px] text-slate-900">{sub.title}</h3>
                          <p className="text-[12px] text-slate-600">Directeur de thèse : <strong>{sub.director}</strong> · {sub.laboratory}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleValidateSubjectStructure(sub.id)}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingSubject(sub);
                            setSubjectRejectMotif('');
                            setSubjectRejectError(null);
                          }}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {isStructure && effectiveTab === 'pv_global' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-[18px] font-bold text-slate-900">PV global de la structure</h2>
              <p className="text-[12px] text-slate-500">
                Validez les PV transmis par les commissions pour transmission au Directeur du CED.
              </p>
            </div>
            {[...pvToValidateApps, ...pvValidatedApps].length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Aucun PV de sélection en attente pour votre structure.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...pvToValidateApps, ...pvValidatedApps].map((app) => (
                  <div key={app.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-folder text-xs font-bold text-[#1E3A8A]">{app.folderNumber}</span>
                        <span className="font-bold text-slate-900">{formatCandidateName(app.candidate)}</span>
                        <span className="text-xs font-mono-folder text-slate-500">({maskCin(app.candidate?.cin)})</span>
                        {app.interviewEvaluation && (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1E3A8A] border border-blue-200 text-xs font-bold font-mono-folder">
                            {app.interviewEvaluation.totalScore} / 20
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600">{app.subjectTitle} · Directeur : {app.directorName}</div>
                    </div>
                    <div>
                      {app.status === 'pv_subject_ready' ? (
                        <button
                          type="button"
                          onClick={() => handleValidateGlobalPv(app.id)}
                          className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Valider le PV global
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                          ✓ PV global validé
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* CED DIRECTOR VIEWS (No personal candidate documents)              */}
        {/* ================================================================ */}
        {isCed && effectiveTab === 'registry' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
              <h1 className="text-[22px] font-bold text-slate-900">Espace Directeur du CED</h1>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Validation institutionnelle des sujets, approbation des résultats et suivi des délibérations
              </p>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl text-[13px]">
              <p className="font-bold text-amber-900 mb-1">Guide rapide :</p>
              <ol className="list-decimal list-inside text-slate-700 space-y-0.5">
                <li>Validez ou refusez (avec motif) les sujets approuvés par les structures dans « Décisions à prendre ».</li>
                <li>Approuvez les résultats finaux issus des PV globaux pour autoriser leur publication par le GCD.</li>
                <li>Consultez le classement final dans « Résultats » et la traçabilité dans « Historique des décisions ».</li>
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('decisions')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white text-left hover:border-amber-500 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-amber-800">Sujets à valider</span>
                  <BookCheck className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-[26px] font-bold text-slate-900 mt-1 font-mono-folder tabular-nums">
                  {cedSubjectsToValidate.length}
                </div>
                <span className="text-[11px] text-slate-400">Validés par les structures</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('decisions')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white text-left hover:border-[#1E3A8A] cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[#1E3A8A]">Résultats à approuver</span>
                  <Award className="w-4 h-4 text-[#1E3A8A]" />
                </div>
                <div className="text-[26px] font-bold text-slate-900 mt-1 font-mono-folder tabular-nums">
                  {cedResultsToApprove.length}
                </div>
                <span className="text-[11px] text-slate-400">PV globaux en attente</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="p-4 rounded-xl border border-slate-200/80 bg-white text-left hover:border-emerald-600 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-emerald-800">Décisions prises</span>
                  <History className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-[26px] font-bold text-emerald-900 mt-1 font-mono-folder tabular-nums">
                  {cedDecisionsHistoryCount}
                </div>
                <span className="text-[11px] text-emerald-700">Sujets & résultats approuvés</span>
              </button>
            </div>
          </div>
        )}

        {isCed && effectiveTab === 'decisions' && (
          <div className="space-y-6">
            {/* Sujets à valider */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-[17px] font-bold text-slate-900">Sujets validés par les structures ({cedSubjectsToValidate.length})</h2>
              </div>
              {cedSubjectsToValidate.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">Aucun sujet en attente de validation du CED.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cedSubjectsToValidate.map((sub) => (
                    <div key={sub.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-xs font-mono-folder font-bold text-[#1E3A8A]">{sub.id} · {sub.discipline}</div>
                        <div className="font-bold text-slate-900">{sub.title}</div>
                        <div className="text-xs text-slate-500">{sub.laboratory} · Directeur : {sub.director}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleValidateSubjectCed(sub.id)}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Valider le sujet
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingSubject(sub);
                            setSubjectRejectMotif('');
                            setSubjectRejectError(null);
                          }}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Refuser
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Résultats à approuver */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-[17px] font-bold text-slate-900">PV globaux à approuver ({cedResultsToApprove.length})</h2>
              </div>
              {cedResultsToApprove.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">Aucun PV global en attente d'approbation.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cedResultsToApprove.map((app) => (
                    <div key={app.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-folder text-xs font-bold text-[#1E3A8A]">{app.folderNumber}</span>
                          <span className="font-bold text-slate-900">{formatCandidateName(app.candidate)}</span>
                          <span className="text-xs font-mono-folder text-slate-500">({maskCin(app.candidate?.cin)})</span>
                          {app.interviewEvaluation && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1E3A8A] border border-blue-200 text-xs font-bold font-mono-folder">
                              {app.interviewEvaluation.totalScore} / 20
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600">{app.subjectTitle}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApproveResultsCed(app.id)}
                        className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                      >
                        Approuver les résultats
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {isCed && effectiveTab === 'results' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-[18px] font-bold text-slate-900">Résultats et classements du CED</h2>
              <p className="text-[12px] text-slate-500">Vue synthétique des classements scientifiques (sans accès aux pièces justificatives personnelles).</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Dossier</th>
                    <th className="py-3 px-4">Candidat</th>
                    <th className="py-3 px-4">Sujet / Structure</th>
                    <th className="py-3 px-4">Note</th>
                    <th className="py-3 px-4">Décision</th>
                    <th className="py-3 px-4">Statut CED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cedRankedResults.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono-folder font-bold text-[#1E3A8A]">{app.folderNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{formatCandidateName(app.candidate)}</td>
                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">{app.subjectTitle}</td>
                      <td className="py-3 px-4 font-mono-folder font-bold">{app.interviewEvaluation?.totalScore ?? '--'} / 20</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                          app.finalResultDecision === 'admitted'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : app.finalResultDecision === 'waiting_list'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {app.finalResultDecision === 'admitted'
                            ? 'Admis'
                            : app.finalResultDecision === 'waiting_list'
                            ? `Liste d'attente (#${app.waitingListPosition || 1})`
                            : app.finalResultDecision === 'rejected'
                            ? 'Non retenu'
                            : 'En délibération'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {app.cedResultsApproved ? (
                          <span className="text-emerald-700 font-semibold">✓ Approuvé CED</span>
                        ) : (
                          <span className="text-slate-500">En attente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {isCed && effectiveTab === 'history' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-[18px] font-bold text-slate-900">Historique des décisions du CED</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {subjects
                .filter((s) => s.status === 'ced_validated' || s.status === 'published')
                .map((s) => (
                  <div key={s.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono-folder font-bold text-[#1E3A8A] mr-2">{s.id}</span>
                      <span className="font-semibold text-slate-900">{s.title}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                      {s.status === 'published' ? 'Validé CED & Publié' : 'Validé CED'}
                    </span>
                  </div>
                ))}
              {applications
                .filter((a) => a.cedResultsApproved)
                .map((a) => (
                  <div key={a.id} className="p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono-folder font-bold text-[#1E3A8A] mr-2">{a.folderNumber}</span>
                      <span className="font-semibold text-slate-900">{formatCandidateName(a.candidate)}</span>
                      <span className="text-slate-500 ml-2">— {a.subjectTitle}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-blue-50 text-[#1E3A8A] border border-blue-200 font-semibold">
                      {a.status === 'results_published' || a.status === 'place_confirmed' || a.status === 'registered'
                        ? 'Approuvé & Publié'
                        : 'Approuvé CED'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* GCD / ADMINISTRATION VIEWS                                       */}
        {/* ================================================================ */}
        {isGcd && effectiveTab === 'registry' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-slate-900">Tableau de bord — GCD / Administration</h1>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Vérification administrative, publication officielle, inscriptions et gouvernance de la campagne
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenQrScanner}
                className="px-4 py-2 text-[13px] font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-2xs min-h-[44px]"
              >
                <QrCode className="w-4 h-4 text-blue-200" />
                <span>Scanner un dossier (QR)</span>
              </button>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[13px]">
              <p className="font-bold text-emerald-900 mb-1">Guide rapide :</p>
              <ol className="list-decimal list-inside text-slate-700 space-y-0.5">
                <li>Contrôlez les pièces dans « Dossiers à vérifier » (Conforme, Demander une correction ou Refuser avec motif).</li>
                <li>Publiez les sujets et résultats uniquement après validation du Directeur du CED dans « Publications ».</li>
                <li>Validez les inscriptions définitives après confirmation de place et dépôt physique (QR) dans « Inscriptions ».</li>
              </ol>
            </div>

            {/* 4 Clickable Integer Stat Cards (NO percentages) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white border-[#1E3A8A] ring-2 ring-[#1E3A8A]/20 shadow-xs' : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-slate-500">Total dossiers</span>
                  <Users className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-[26px] font-bold text-slate-900 mt-1 font-mono-folder tabular-nums">{totalApps}</div>
                <span className="text-[11px] text-slate-400">Tous les dossiers</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('valid')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  statusFilter === 'valid' ? 'bg-white border-emerald-600 ring-2 ring-emerald-600/20 shadow-xs' : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-emerald-800">Inscrits</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-[26px] font-bold text-emerald-900 mt-1 font-mono-folder tabular-nums">{physicalReceivedCount}</div>
                <span className="text-[11px] text-emerald-700 font-medium">Réceptionnés au guichet</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs' : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-amber-800">À vérifier</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-[26px] font-bold text-amber-900 mt-1 font-mono-folder tabular-nums">{pendingPiecesCount}</div>
                <span className="text-[11px] text-amber-700 font-medium">Soumis ou incomplets</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('rejected')}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  statusFilter === 'rejected' ? 'bg-white border-rose-600 ring-2 ring-rose-600/20 shadow-xs' : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-rose-800">Refusés / Désistés</span>
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-[26px] font-bold text-rose-900 mt-1 font-mono-folder tabular-nums">{notRetainedCount}</div>
                <span className="text-[11px] text-rose-700 font-medium">Clôturés</span>
              </button>
            </div>

            {/* Dossiers Overview Table with Masked CIN */}
            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[15px] font-bold text-slate-900">
                  Dossiers de candidature ({filteredApplications.length})
                </span>
                {statusFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="text-[13px] font-medium text-[#1E3A8A] hover:underline cursor-pointer"
                  >
                    Afficher tout
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-folder font-bold text-slate-900">{app.folderNumber}</span>
                        <span className="font-semibold text-slate-800">{formatCandidateName(app.candidate)}</span>
                        <span className="text-slate-400 font-mono-folder text-[12px]">({maskCin(app.candidate?.cin)})</span>
                      </div>
                      <div className="text-[12px] text-slate-500 mt-0.5 truncate max-w-xl">
                        {app.subjectTitle} · {app.subjectLab}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          app.status === 'registered' || app.physicalFileReceivedAt !== undefined
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : app.finalResultDecision === 'rejected' || app.status === 'renounced'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-[#EFF6FF] text-[#1E3A8A] border-blue-200'
                        }`}
                      >
                        {app.status === 'registered'
                          ? '✓ Inscrit'
                          : app.finalResultDecision === 'rejected'
                          ? '✕ Refusé'
                          : app.status === 'renounced'
                          ? '✕ Désisté'
                          : app.status === 'incomplete'
                          ? 'Correction demandée'
                          : app.status === 'submitted'
                          ? 'À vérifier'
                          : app.status}
                      </span>

                      <button
                        type="button"
                        onClick={() => onOpenPrintSheet(app)}
                        className="px-3 py-1.5 text-[12px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Fiche (QR)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isGcd && effectiveTab === 'checklist' && (
          <ChecklistTricolor
            applications={applications}
            onTriggerRelance={onTriggerRelance}
            onMarkItemValid={(appId, itemKey) => {
              const res = markChecklistItemValid(applications, appId, itemKey, currentActiveUser);
              if (res.success && res.data && onUpdateApplications) {
                onUpdateApplications(res.data, res.message);
              }
            }}
            onMarkReceivable={(appId) => {
              const res = markReceivable(applications, appId, currentActiveUser);
              if (res.success && res.data && onUpdateApplications) {
                onUpdateApplications(res.data, res.message);
                onAddAuditLog?.('Recevabilité administrative', `Dossier ${appId} déclaré recevable.`);
              }
            }}
            onRejectApplication={(appId, motif) => {
              const res = rejectApplicationAdmin(applications, appId, motif, currentActiveUser);
              if (res.success && res.data && onUpdateApplications) {
                onUpdateApplications(res.data, res.message);
                onAddAuditLog?.('Refus administratif', `Dossier ${appId} refusé : ${motif}`);
              }
            }}
            lang={lang}
          />
        )}

        {isGcd && effectiveTab === 'publications' && (
          <div className="space-y-6">
            {/* Sujets à publier */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-[18px] font-bold text-slate-900">Publication des sujets de thèse</h2>
                <p className="text-[12px] text-slate-500">
                  Règle stricte : un sujet ne peut être publié qu'après validation par le Directeur du CED.
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {subjects
                  .filter((s) => s.status !== 'draft' && s.status !== 'rejected')
                  .map((sub) => {
                    const canPublish = sub.status === 'ced_validated';
                    return (
                      <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono-folder font-bold text-[#1E3A8A]">{sub.id}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                              {sub.status === 'published'
                                ? 'Publié'
                                : sub.status === 'ced_validated'
                                ? 'Validé CED (Prêt)'
                                : sub.status === 'structure_validated'
                                ? 'Validé structure (Attente CED)'
                                : 'Proposé'}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 text-[14px] mt-1">{sub.title}</div>
                          <div className="text-xs text-slate-500">{sub.director} · {sub.laboratory}</div>
                        </div>
                        <div className="shrink-0">
                          {sub.status === 'published' ? (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                              ✓ Publié
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePublishSubjectGcd(sub.id)}
                              disabled={!canPublish}
                              title={!canPublish ? 'Le sujet doit d\'abord être validé par le Directeur du CED' : 'Publier le sujet'}
                              className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#172554] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Publier le sujet
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Résultats à publier */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-[18px] font-bold text-slate-900">Publication officielle des résultats</h2>
                <p className="text-[12px] text-slate-500">
                  La publication est bloquée tant que le Directeur du CED n'a pas approuvé les résultats.
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {applications
                  .filter((a) =>
                    ['pv_subject_ready', 'pv_global_validated', 'results_approved', 'results_published', 'place_confirmed', 'registered'].includes(a.status)
                  )
                  .map((app) => {
                    const isAlreadyPublished = ['results_published', 'place_confirmed', 'registered'].includes(app.status);
                    const canPublishResult = Boolean(app.cedResultsApproved) && app.status === 'results_approved';
                    return (
                      <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono-folder font-bold text-[#1E3A8A]">{app.folderNumber}</span>
                            <span className="font-bold text-slate-900">{formatCandidateName(app.candidate)}</span>
                            <span className="text-slate-500 font-mono-folder">({maskCin(app.candidate?.cin)})</span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">{app.subjectTitle}</div>
                        </div>
                        <div className="shrink-0">
                          {isAlreadyPublished ? (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                              ✓ Résultats publiés
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePublishResultsGcd(app)}
                              disabled={!canPublishResult}
                              title={
                                !canPublishResult
                                  ? 'Les résultats doivent d\'abord être approuvés par le Directeur du CED'
                                  : 'Publier officiellement le résultat'
                              }
                              className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#172554] disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Publier les résultats
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {isGcd && effectiveTab === 'inscriptions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-bold text-slate-900">Inscriptions définitives & Guichet</h2>
                  <p className="text-[12px] text-slate-500">
                    Validation des inscriptions après confirmation de place et dépôt du dossier physique.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenQrScanner}
                  className="px-3.5 py-2 bg-[#1E3A8A] text-white rounded-lg text-xs font-semibold hover:bg-[#172554] cursor-pointer flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scanner fiche (QR)</span>
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {applications
                  .filter((a) => ['place_confirmed', 'registered', 'results_published'].includes(a.status) || a.wasAbsent)
                  .map((app) => (
                    <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono-folder font-bold text-[#1E3A8A]">{app.folderNumber}</span>
                          <span className="font-bold text-slate-900">{formatCandidateName(app.candidate)}</span>
                          <span className="font-mono-folder text-slate-500">CIN : {maskCin(app.candidate?.cin)} · Tél : {maskPhone(app.candidate?.phone)}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">{app.subjectTitle}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {app.wasAbsent && !app.rescheduledOnce && (
                          <button
                            type="button"
                            onClick={() => setRescheduleApp(app)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span>Reprogrammation unique</span>
                          </button>
                        )}
                        {app.status === 'place_confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleFinalizeRegistration(app.id)}
                            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Valider l'inscription
                          </button>
                        )}
                        {app.status === 'registered' && (
                          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                            ✓ Inscrit définitivement
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenPrintSheet(app)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Imprimer fiche (QR)
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {isGcd && effectiveTab === 'signatures' && applications[0] && (
          <ElectronicSignatureWorkflow
            application={applications[0]}
            onSign={onSignWorkflow}
            lang={lang}
          />
        )}

        {isGcd && effectiveTab === 'audit' && (
          <AuditLogViewer logs={auditLogs} lang={lang} />
        )}

        {isGcd && effectiveTab === 'privileges' && (
          <PrivilegeManagementView
            users={users}
            roles={roles}
            currentActiveUser={currentActiveUser}
            auditLogs={privilegeAuditLogs}
            onAssignUserRole={(userId, newRoleId) => onAssignUserRole(userId, newRoleId as any)}
            onToggleUserStatus={onToggleUserStatus}
            lang={lang}
          />
        )}

        {isGcd && effectiveTab === 'settings' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#1E3A8A]" />
                  Paramètres de la campagne doctorale
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Configuration générale des choix par candidat et calendrier officiel (enregistré dans le journal d'audit).
                </p>
              </div>
              {currentActiveUser.roleId !== 'gcd_admin' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  <Lock className="w-3.5 h-3.5" /> Lecture seule
                </span>
              )}
            </div>

            <form onSubmit={handleSaveConfigSubmit} className="space-y-5 max-w-xl">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Nombre maximum de choix de sujets par candidat
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={maxChoices}
                    onChange={(e) => setMaxChoices(parseInt(e.target.value, 10) || 1)}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] text-sm font-mono font-bold"
                  />
                  <span className="text-xs text-slate-500">(Par défaut : 3 choix maximum)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Date d'ouverture de la campagne
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Date de clôture globale des dépôts
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1E3A8A] text-white rounded-lg text-xs font-semibold hover:bg-[#172554] transition-colors flex items-center gap-2 cursor-pointer shadow-xs min-h-[44px]"
                >
                  <Save className="w-4 h-4" />
                  Enregistrer la configuration
                </button>
              </div>

              {configSavedToast && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200">
                  ✓ Configuration sauvegardée et journalisée avec succès (Clôture : {formatFrenchDate(endDate)} · Quota : {maxChoices} choix).
                </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Modal: Subject rejection (Structure / CED) with mandatory motif */}
      {rejectingSubject && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-[15px] font-bold text-slate-900">Refuser le sujet</h3>
              <button type="button" onClick={() => setRejectingSubject(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 font-medium">{rejectingSubject.title}</p>
            <form onSubmit={handleConfirmRejectSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Motif de refus *</label>
                <textarea
                  rows={3}
                  value={subjectRejectMotif}
                  onChange={(e) => {
                    setSubjectRejectMotif(e.target.value);
                    if (subjectRejectError) setSubjectRejectError(null);
                  }}
                  placeholder="Précisez les ajustements scientifiques ou administratifs requis..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                {subjectRejectError && <p className="text-rose-600 mt-1">{subjectRejectError}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingSubject(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!subjectRejectMotif.trim()}
                  className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Confirmer le refus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmation before changing campaign closing date */}
      {confirmEndDateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="text-[16px] font-bold text-slate-900">
                Confirmer la modification de la date de clôture
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cette modification mettra à jour la date de clôture globale affichée à titre informatif sur la plateforme et sera enregistrée dans le journal d'audit.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div>Ancienne date : <strong className="font-mono-folder">{formatFrenchDate(systemConfig.campaignEndDate)}</strong></div>
              <div>Nouvelle date : <strong className="font-mono-folder text-[#1E3A8A]">{formatFrenchDate(endDate)}</strong></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEndDateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={applySystemConfigSave}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg cursor-pointer"
              >
                Confirmer la modification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reprogrammation unique GCD */}
      {rescheduleApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-[15px] font-bold text-slate-900">Reprogrammation unique d'entretien</h3>
              <button type="button" onClick={() => setRescheduleApp(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Date</label>
                  <input type="date" value={reschedDate} onChange={(e) => setReschedDate(e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Heure</label>
                  <input type="time" value={reschedTime} onChange={(e) => setReschedTime(e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Lieu</label>
                <input type="text" value={reschedLoc} onChange={(e) => setReschedLoc(e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRescheduleApp(null)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer">Annuler</button>
                <button type="submit" className="px-3.5 py-1.5 bg-[#1E3A8A] text-white rounded-lg font-semibold cursor-pointer">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
