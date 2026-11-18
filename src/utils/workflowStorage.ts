import {
  Application,
  WorkflowStepDetail,
  WorkflowHistoryEntry,
  NotificationItem,
  SentEmailLog,
  PermissionKey,
  RoleDefinition,
  UserAccount,
  PrivilegeAuditLog,
  RoleId,
  SystemConfig,
} from '../types';

const STORAGE_KEYS = {
  APPLICATIONS: 'doccycle_applications_v5',
  SUBJECTS: 'doccycle_subjects_v5',
  NOTIFICATIONS: 'doccycle_notifications_v5',
  EMAILS: 'doccycle_sent_emails_v5',
  USERS: 'doccycle_users_v5',
  ROLES: 'doccycle_roles_v5',
  PRIVILEGE_AUDIT: 'doccycle_privilege_audit_v5',
  SYSTEM_CONFIG: 'doccycle_system_config_v5',
  AUDIT_LOGS: 'doccycle_audit_logs_v5',
};

export { STORAGE_KEYS };

// =========================================================================
// 1. SYSTEM CONFIGURATION (DEFAULT MAX 3 APPLICATIONS PER CANDIDATE)
// =========================================================================

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  maxApplicationsPerCandidate: 3,
  campaignStartDate: '2026-10-15',
  campaignEndDate: '2026-11-30',
};

export function getStoredSystemConfig(): SystemConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SYSTEM_CONFIG);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading system config from localStorage', e);
  }
  return DEFAULT_SYSTEM_CONFIG;
}

export function saveStoredSystemConfig(config: SystemConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving system config', e);
  }
}

// =========================================================================
// 2. THE 6 OFFICIAL SYSTEM ROLES & LEAST PRIVILEGE MATRIX
// =========================================================================

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'candidate',
    name: 'Candidat',
    nameAr: 'مترشح للدكتوراه',
    description: 'Consulter les sujets publiés, choix de sujets (max 3), préinscription et suivi de son dossier.',
    isSystem: true,
    badgeColor: 'bg-blue-100 text-[#1E3A8A] border-blue-300',
    permissions: ['view_subjects', 'use_cart', 'apply_subject', 'track_own'],
  },
  {
    id: 'thesis_director',
    name: 'Directeur de thèse',
    nameAr: 'المشرف على الأطروحة',
    description: 'Proposer ses sujets et émettre un avis motivé (Favorable / Défavorable) sur les candidats de ses sujets.',
    isSystem: true,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    permissions: ['view_subjects', 'propose_subjects', 'evaluate_own_subjects'],
  },
  {
    id: 'structure_director',
    name: 'Directeur de structure',
    nameAr: 'مدير بنية البحث',
    description: 'Valider ou refuser les sujets de sa structure de recherche et valider le PV global de sélection.',
    isSystem: true,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    permissions: ['view_subjects', 'validate_structure_subjects', 'evaluate_structure_apps'],
  },
  {
    id: 'commission',
    name: 'Commission',
    nameAr: 'اللجنة العلمية',
    description: 'Convoquer les candidats retenus, évaluer les entretiens (note sur 20) et établir le PV de sélection.',
    isSystem: true,
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    permissions: ['view_subjects', 'examine_assigned_apps', 'schedule_interview', 'rank_candidates'],
  },
  {
    id: 'ced_director',
    name: 'Directeur du CED',
    nameAr: 'مدير قطب دراسات الدكتوراه',
    description: 'Valider les sujets au niveau du CED, approuver les résultats et consulter l\'historique des décisions.',
    isSystem: true,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    permissions: ['view_subjects', 'publish_subjects', 'render_final_decision', 'view_global_stats'],
  },
  {
    id: 'gcd_admin',
    name: 'GCD / Administration',
    nameAr: 'إدارة GCD / الشؤون الطلابية',
    description: 'Vérifier les pièces, publier sujets et résultats approuvés, gérer le concours et valider les inscriptions.',
    isSystem: true,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    permissions: [
      'view_subjects',
      'check_admin_completeness',
      'flag_incomplete',
      'manage_campaign_dates',
      'finalize_registration',
      'manage_users',
      'manage_privileges',
    ],
  },
];

// =========================================================================
// 3. INITIAL USERS (SYNTHETIC EXAMPLE EMAILS ONLY)
// =========================================================================

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr-candidate',
    name: 'Amine Tazi',
    email: 'candidat.demo@exemple.ma',
    roleId: 'candidate',
    roles: ['candidate'],
    status: 'active',
    lastLogin: 'Aujourd\'hui',
    scope: 'Candidat individuel',
  },
  {
    id: 'usr-thesis-dir',
    name: 'Pr. Karim El Mansouri',
    email: 'directeur.these1@exemple.ma',
    roleId: 'thesis_director',
    roles: ['thesis_director', 'commission'],
    status: 'active',
    lastLogin: 'Aujourd\'hui',
    scope: 'Directeur de thèse & Membre Commission · LISTI',
  },
  {
    id: 'usr-struct-dir',
    name: 'Pr. Samir Benjelloun',
    email: 'directeur.structure1@exemple.ma',
    roleId: 'structure_director',
    roles: ['structure_director'],
    status: 'active',
    lastLogin: 'Hier',
    scope: 'Directeur de structure · LISTI',
  },
  {
    id: 'usr-struct-dir-2',
    name: 'Pr. Nadia Touzani',
    email: 'directeur.structure2@exemple.ma',
    roleId: 'structure_director',
    roles: ['structure_director'],
    status: 'active',
    lastLogin: 'Hier',
    scope: 'Directrice de structure · LSI',
  },
  {
    id: 'usr-commission',
    name: 'Pr. Rachid Chami',
    email: 'commission.membre@exemple.ma',
    roleId: 'commission',
    roles: ['commission', 'thesis_director'],
    status: 'active',
    lastLogin: 'Hier',
    scope: 'Commission scientifique · TALN',
  },
  {
    id: 'usr-ced-dir',
    name: 'Pr. Hassan Alaoui',
    email: 'directeur.ced@exemple.ma',
    roleId: 'ced_director',
    roles: ['ced_director'],
    status: 'active',
    lastLogin: 'Hier',
    scope: 'Directeur du CED',
  },
  {
    id: 'usr-gcd-admin',
    name: 'Dr. Naoual Chifa',
    email: 'gcd.admin@exemple.ma',
    roleId: 'gcd_admin',
    roles: ['gcd_admin'],
    status: 'active',
    lastLogin: 'En ligne',
    scope: 'GCD / Administration',
  },
];

// =========================================================================
// 4. STORAGE ACCESSORS
// =========================================================================

export function getStoredRoles(): RoleDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROLES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading roles', e);
  }
  return DEFAULT_ROLES;
}

export function saveStoredRoles(roles: RoleDefinition[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
  } catch (e) {
    console.error('Error saving roles', e);
  }
}

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading users', e);
  }
  return DEFAULT_USERS;
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users', e);
  }
}

export function getStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading notifications', e);
  }
  return [
    {
      id: 'notif-welcome',
      recipientUserId: 'usr-candidate',
      recipientRole: 'candidate',
      title: 'Bienvenue sur DocCycle USMBA',
      titleAr: 'مرحباً بكم في منصة DocCycle',
      message: 'Votre candidature DOC-2026-USMBA-1092 a reçu un avis favorable de votre directeur de thèse.',
      date: 'Aujourd\'hui',
      read: false,
      type: 'info',
      applicationId: 'app-001',
    },
  ];
}

export function saveStoredNotifications(notifs: NotificationItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  } catch (e) {
    console.error('Error saving notifications', e);
  }
}

export function getStoredSentEmails(): SentEmailLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EMAILS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading emails', e);
  }
  return [];
}

export function saveStoredSentEmails(emails: SentEmailLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EMAILS, JSON.stringify(emails));
  } catch (e) {
    console.error('Error saving emails', e);
  }
}

export function getStoredPrivilegeAudit(): PrivilegeAuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRIVILEGE_AUDIT);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading privilege audit', e);
  }
  return [];
}

export function saveStoredPrivilegeAudit(audit: PrivilegeAuditLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRIVILEGE_AUDIT, JSON.stringify(audit));
  } catch (e) {
    console.error('Error saving privilege audit', e);
  }
}

// =========================================================================
// 5. AUTHORIZATION & ROLE GUARD CHECKS
// =========================================================================

export function hasPermission(
  user: UserAccount | null | undefined,
  roles: RoleDefinition[],
  perm: PermissionKey
): boolean {
  if (!user || user.status === 'suspended') return false;
  const role = roles.find((r) => r.id === user.roleId);
  if (!role) return false;
  return role.permissions.includes(perm);
}

export function checkRoleGuard(
  user: UserAccount | null | undefined,
  allowedRoles: RoleId[]
): { allowed: boolean; message?: string } {
  if (!user || user.status === 'suspended') {
    return { allowed: false, message: 'Session invalide ou compte suspendu' };
  }
  // Strictly enforce the ACTIVE role (user.roleId)
  const userHasActiveRole = allowedRoles.includes(user.roleId);
  if (!userHasActiveRole) {
    const roleLabels: Record<RoleId, string> = {
      candidate: 'Candidat',
      thesis_director: 'Directeur de thèse',
      structure_director: 'Directeur de structure',
      commission: 'Commission',
      ced_director: 'Directeur du CED',
      gcd_admin: 'GCD / Administration',
    };
    const expected = allowedRoles.map((r) => roleLabels[r] || r).join(' ou ');
    return { allowed: false, message: `Action réservée au rôle ${expected}` };
  }
  return { allowed: true };
}

export function canChangeUserRole(
  users: UserAccount[],
  currentUser: UserAccount,
  targetUserId: string,
  newRoleId: string
): { allowed: boolean; reason?: string } {
  if (currentUser.roleId !== 'gcd_admin') {
    return { allowed: false, reason: 'Action réservée au rôle GCD / Administration' };
  }
  if (currentUser.id === targetUserId && newRoleId !== 'gcd_admin') {
    return { allowed: false, reason: 'Vous ne pouvez pas vous retirer votre propre rôle GCD / Administration' };
  }
  const targetUser = users.find((u) => u.id === targetUserId);
  if (targetUser && targetUser.roleId === 'gcd_admin' && newRoleId !== 'gcd_admin') {
    const activeGcdAdmins = users.filter((u) => u.roleId === 'gcd_admin' && u.status === 'active');
    if (activeGcdAdmins.length <= 1) {
      return { allowed: false, reason: 'Impossible de supprimer le dernier compte GCD / Administration' };
    }
  }
  return { allowed: true };
}

export function canSuspendUser(
  users: UserAccount[],
  currentUser: UserAccount,
  targetUserId: string
): { allowed: boolean; reason?: string } {
  if (currentUser.roleId !== 'gcd_admin') {
    return { allowed: false, reason: 'Action réservée au rôle GCD / Administration' };
  }
  if (currentUser.id === targetUserId) {
    return { allowed: false, reason: 'Vous ne pouvez pas suspendre votre propre compte' };
  }
  const targetUser = users.find((u) => u.id === targetUserId);
  if (targetUser && targetUser.roleId === 'gcd_admin') {
    const activeAdmins = users.filter((u) => u.roleId === 'gcd_admin' && u.status === 'active');
    if (activeAdmins.length <= 1) {
      return { allowed: false, reason: 'Impossible de suspendre le dernier compte GCD / Administration' };
    }
  }
  return { allowed: true };
}

// =========================================================================
// 6. CANDIDATE 6-LINE TIMELINE HELPER
// =========================================================================

export interface Candidate6LineTimelineItem {
  id: string;
  stepNumber: number;
  label: string;
  labelAr: string;
  status: 'completed' | 'current' | 'upcoming' | 'blocked';
  description: string;
  motif?: string;
  date?: string;
}

export function get6LineTimeline(app: Application): Candidate6LineTimelineItem[] {
  const status = app.status;
  const isAdminRejected = app.finalResultDecision === 'rejected' && status === 'submitted' || (app.finalResultDecision === 'rejected' && Boolean(app.rejectionReason) && !['results_published', 'interviewed', 'pv_subject_ready', 'pv_global_validated', 'results_approved'].includes(status));

  // Line 1: Préinscription
  const isLine1Done = status !== 'draft';
  const line1Status: 'completed' | 'current' = isLine1Done ? 'completed' : 'current';

  // Line 2: Vérification du dossier
  let line2Status: 'completed' | 'current' | 'upcoming' | 'blocked' = 'upcoming';
  let line2Motif: string | undefined = undefined;
  if (status === 'draft') {
    line2Status = 'upcoming';
  } else if (isAdminRejected) {
    line2Status = 'blocked';
    line2Motif = app.rejectionReason || 'Dossier refusé par l\'administration.';
  } else if (status === 'incomplete') {
    line2Status = 'blocked';
    line2Motif = app.rejectionReason || 'Correction demandée sur une pièce du dossier.';
  } else if (status === 'submitted') {
    line2Status = 'current';
  } else {
    line2Status = 'completed';
  }

  // Line 3: Avis et convocation
  let line3Status: 'completed' | 'current' | 'upcoming' | 'blocked' = 'upcoming';
  let line3Motif: string | undefined = undefined;
  if (!isAdminRejected) {
    if (status === 'receivable') {
      line3Status = 'current';
    } else if (status === 'opinions_given') {
      if (app.thesisDirectorOpinion === 'unfavorable') {
        line3Status = 'blocked';
        line3Motif = app.thesisDirectorMotif || 'Avis défavorable du directeur de thèse.';
      } else {
        line3Status = 'current';
      }
    } else if (['convoked', 'interviewed', 'pv_subject_ready', 'pv_global_validated', 'results_approved', 'results_published', 'place_confirmed', 'renounced', 'registered'].includes(status)) {
      line3Status = 'completed';
    }
  }

  // Line 4: Entretien (Commission)
  let line4Status: 'completed' | 'current' | 'upcoming' | 'blocked' = 'upcoming';
  let line4Motif: string | undefined = undefined;
  if (!isAdminRejected) {
    if (status === 'convoked') {
      if (app.wasAbsent) {
        line4Status = 'blocked';
        line4Motif = 'Absence constatée à l\'entretien. En attente d\'une reprogrammation unique.';
      } else {
        line4Status = 'current';
      }
    } else if (['interviewed', 'pv_subject_ready', 'pv_global_validated', 'results_approved', 'results_published', 'place_confirmed', 'renounced', 'registered'].includes(status)) {
      line4Status = 'completed';
    }
  }

  // Line 5: Résultats
  let line5Status: 'completed' | 'current' | 'upcoming' | 'blocked' = 'upcoming';
  let line5Motif: string | undefined = undefined;
  if (!isAdminRejected) {
    if (['pv_subject_ready', 'pv_global_validated', 'results_approved'].includes(status)) {
      line5Status = 'current';
    } else if (['results_published', 'place_confirmed', 'renounced', 'registered'].includes(status)) {
      if (app.finalResultDecision === 'rejected') {
        line5Status = 'blocked';
        line5Motif = 'Candidature non retenue par la commission scientifique.';
      } else if (app.finalResultDecision === 'waiting_list') {
        line5Status = 'blocked';
        line5Motif = `Placé sur liste d'attente (Rang ${app.waitingListPosition || 1}).`;
      } else {
        line5Status = 'completed';
      }
    }
  }

  // Line 6: Inscription
  let line6Status: 'completed' | 'current' | 'upcoming' | 'blocked' = 'upcoming';
  if (status === 'place_confirmed') {
    line6Status = 'current';
  } else if (status === 'registered') {
    line6Status = 'completed';
  } else if (status === 'renounced') {
    line6Status = 'blocked';
  }

  return [
    {
      id: 'l1',
      stepNumber: 1,
      label: 'Préinscription',
      labelAr: 'التسجيل الأولي',
      status: line1Status,
      description: 'Dépôt du dossier numérique et validation CNIE.',
      date: app.submissionDate,
    },
    {
      id: 'l2',
      stepNumber: 2,
      label: 'Vérification du dossier',
      labelAr: 'فحص وثائق الملف',
      status: line2Status,
      description: 'Contrôle des pièces par le service GCD / Administration.',
      motif: line2Motif,
    },
    {
      id: 'l3',
      stepNumber: 3,
      label: 'Avis et convocation',
      labelAr: 'رأي المشرف والاستدعاء',
      status: line3Status,
      description: 'Examen du directeur de thèse et convocation par la commission.',
      motif: line3Motif,
      date: app.convocationDetails ? `${app.convocationDetails.date} à ${app.convocationDetails.time} (${app.convocationDetails.location})` : undefined,
    },
    {
      id: 'l4',
      stepNumber: 4,
      label: 'Entretien oral',
      labelAr: 'المقابلة الشفوية',
      status: line4Status,
      description: 'Audition par la commission scientifique (note sur 20).',
      motif: line4Motif,
      date: app.interviewEvaluation ? `Note : ${app.interviewEvaluation.totalScore}/20` : undefined,
    },
    {
      id: 'l5',
      stepNumber: 5,
      label: 'Résultats',
      labelAr: 'النتائج النهائية',
      status: line5Status,
      description: 'Approbation du CED et publication officielle.',
      motif: line5Motif,
    },
    {
      id: 'l6',
      stepNumber: 6,
      label: 'Inscription administrative',
      labelAr: 'التسجيل النهائي',
      status: line6Status,
      description: 'Dépôt des originaux au guichet et délivrance de la carte.',
      date: app.physicalFileReceivedAt,
    },
  ];
}

export const createInitialWorkflowSteps = (): WorkflowStepDetail[] => [
  {
    stepNumber: 1,
    label: 'Préinscription',
    labelAr: 'التسجيل الأولي',
    responsibleRole: 'Candidat',
    description: 'Saisie et transmission initiale des pièces.',
    status: 'completed',
  },
  {
    stepNumber: 2,
    label: 'Vérification du dossier',
    labelAr: 'فحص وثائق الملف',
    responsibleRole: 'GCD / Administration',
    description: 'Contrôle de complétude et conformité.',
    status: 'current',
  },
  {
    stepNumber: 3,
    label: 'Avis et convocation',
    labelAr: 'رأي المشرف والاستدعاء',
    responsibleRole: 'Directeur de thèse & Commission',
    description: 'Avis du directeur de thèse et convocation à l\'entretien.',
    status: 'upcoming',
  },
  {
    stepNumber: 4,
    label: 'Entretien',
    labelAr: 'المقابلة الشفوية',
    responsibleRole: 'Commission',
    description: 'Évaluation orale et note sur 20 par le jury.',
    status: 'upcoming',
  },
  {
    stepNumber: 5,
    label: 'Résultats',
    labelAr: 'النتائج الرسمية',
    responsibleRole: 'Directeur du CED',
    description: 'Approbation des délibérations et publication des listes.',
    status: 'upcoming',
  },
  {
    stepNumber: 6,
    label: 'Inscription',
    labelAr: 'التسجيل النهائي',
    responsibleRole: 'GCD / Administration',
    description: 'Dépôt physique des originaux et carte d\'étudiant.',
    status: 'upcoming',
  },
];

export const createInitialWorkflowHistory = (): WorkflowHistoryEntry[] => [
  {
    id: 'hist-init-1',
    timestamp: 'Aujourd\'hui',
    actorName: 'Candidat',
    actorRole: 'Candidat',
    stepNumber: 1,
    stepLabel: 'Préinscription',
    action: 'created',
    actionLabel: 'Dépôt de la candidature',
    comment: 'Candidature enregistrée avec succès.',
  },
];
