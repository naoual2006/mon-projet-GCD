import {
  Application,
  ThesisSubject,
  UserAccount,
  NotificationItem,
  SentEmailLog,
  AuditLogEntry,
  ConvocationDetails,
  InterviewEvaluation,
} from '../types';
import { checkRoleGuard } from './workflowStorage';

export interface WorkflowResult<T> {
  success: boolean;
  message: string;
  data?: T;
  notification?: NotificationItem;
  email?: SentEmailLog;
  auditLog?: AuditLogEntry;
}

/**
 * Conflict-of-interest check:
 * Prevents a thesis director from convoking or evaluating their own candidates in Commission.
 */
export function isConflictOfInterest(app: Application, user: UserAccount): boolean {
  if (!app || !user) return false;
  const appDirector = (app.directorName || '').trim().toLowerCase();
  const userName = (user.name || '').trim().toLowerCase();
  return appDirector !== '' && appDirector === userName;
}

// =========================================================================
// FLUX 1 : LES SUJETS (Thesis Subject Workflow)
// Brouillon -> Proposé -> Validé par structure -> Validé par CED -> Publié
// =========================================================================

export function proposeSubject(
  subjects: ThesisSubject[],
  subjectId: string,
  user: UserAccount
): WorkflowResult<ThesisSubject[]> {
  const guard = checkRoleGuard(user, ['thesis_director']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Directeur de thèse' };

  const updated = subjects.map((s) => {
    if (s.id === subjectId) {
      return { ...s, status: 'proposed' as const, rejectionReason: undefined };
    }
    return s;
  });

  const subject = subjects.find((s) => s.id === subjectId);
  const notif: NotificationItem = {
    id: `notif-sub-${Date.now()}`,
    recipientUserId: 'usr-struct-dir',
    recipientRole: 'structure_director',
    title: 'Nouveau sujet proposé',
    message: `Le sujet "${subject?.title}" a été proposé par ${user.name}.`,
    date: 'À l\'instant',
    read: false,
    type: 'info',
    applicationId: subjectId,
  };

  return {
    success: true,
    message: 'Sujet proposé avec succès au Directeur de structure.',
    data: updated,
    notification: notif,
  };
}

export function validateSubjectStructure(
  subjects: ThesisSubject[],
  subjectId: string,
  user: UserAccount
): WorkflowResult<ThesisSubject[]> {
  const guard = checkRoleGuard(user, ['structure_director']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Directeur de structure' };

  const updated = subjects.map((s) => {
    if (s.id === subjectId) {
      return { ...s, status: 'structure_validated' as const, structureValidated: true, rejectionReason: undefined };
    }
    return s;
  });

  return {
    success: true,
    message: 'Sujet validé par le Directeur de structure.',
    data: updated,
  };
}

export function rejectSubjectStructure(
  subjects: ThesisSubject[],
  subjectId: string,
  motif: string,
  user: UserAccount
): WorkflowResult<ThesisSubject[]> {
  const guard = checkRoleGuard(user, ['structure_director']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Directeur de structure' };
  if (!motif.trim()) return { success: false, message: 'Le motif de refus est obligatoire.' };

  const updated = subjects.map((s) => {
    if (s.id === subjectId) {
      return { ...s, status: 'draft' as const, rejectionReason: motif.trim() };
    }
    return s;
  });

  return {
    success: true,
    message: 'Sujet refusé et renvoyé en brouillon au Directeur de thèse.',
    data: updated,
  };
}

export function validateSubjectCed(
  subjects: ThesisSubject[],
  subjectId: string,
  user: UserAccount
): WorkflowResult<ThesisSubject[]> {
  const guard = checkRoleGuard(user, ['ced_director']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Directeur du CED' };

  const updated = subjects.map((s) => {
    if (s.id === subjectId) {
      return { ...s, status: 'ced_validated' as const, cedValidated: true, rejectionReason: undefined };
    }
    return s;
  });

  return {
    success: true,
    message: 'Sujet validé par le Directeur du CED.',
    data: updated,
  };
}

export function rejectSubjectCed(
  subjects: ThesisSubject[],
  subjectId: string,
  motif: string,
  user: UserAccount
): WorkflowResult<ThesisSubject[]> {
  const guard = checkRoleGuard(user, ['ced_director']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Directeur du CED' };
  if (!motif.trim()) return { success: false, message: 'Le motif de refus est obligatoire.' };

  const updated = subjects.map((s) => {
    if (s.id === subjectId) {
      return { ...s, status: 'draft' as const, rejectionReason: motif.trim() };
    }
    return s;
  });

  return {
    success: true,
    message: 'Sujet refusé par le CED et renvoyé en brouillon.',
    data: updated,
  };
}

export function publishSubject(
  subjects: ThesisSubject[],
  subjectId: string,
  user: UserAccount
): WorkflowResult<ThesisSubject[]> {
  const guard = checkRoleGuard(user, ['gcd_admin']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle GCD / Administration' };

  const target = subjects.find((s) => s.id === subjectId);
  if (!target || target.status !== 'ced_validated') {
    return { success: false, message: 'Le sujet doit d\'abord être validé par le Directeur du CED.' };
  }

  const updated = subjects.map((s) => {
    if (s.id === subjectId) {
      return { ...s, status: 'published' as const };
    }
    return s;
  });

  return {
    success: true,
    message: 'Sujet publié officiellement.',
    data: updated,
  };
}

export function batchValidateSubjects(
  subjects: ThesisSubject[],
  subjectIds: string[],
  user: UserAccount
): WorkflowResult<ThesisSubject[]> {
  let targetStatus: 'structure_validated' | 'ced_validated' | 'published' = 'structure_validated';
  if (user.roleId === 'structure_director') targetStatus = 'structure_validated';
  else if (user.roleId === 'ced_director') targetStatus = 'ced_validated';
  else if (user.roleId === 'gcd_admin') targetStatus = 'published';
  else return { success: false, message: 'Action réservée au rôle Directeur de structure, Directeur du CED ou GCD / Administration.' };

  const updated = subjects.map((s) => {
    if (subjectIds.includes(s.id)) {
      return {
        ...s,
        status: targetStatus,
        structureValidated: targetStatus === 'structure_validated' ? true : s.structureValidated,
        cedValidated: targetStatus === 'ced_validated' ? true : s.cedValidated,
      };
    }
    return s;
  });

  return {
    success: true,
    message: `${subjectIds.length} sujet(s) validé(s) avec succès.`,
    data: updated,
  };
}

// =========================================================================
// FLUX 2 : LA CANDIDATURE (11 Exclusive States)
// =========================================================================

// 1. Brouillon -> Soumise (Candidat)
export function submitApplication(
  applications: Application[],
  appId: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['candidate']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Candidat' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'submitted' as const,
        submissionDate: new Date().toISOString().split('T')[0],
      };
    }
    return app;
  });

  const app = applications.find((a) => a.id === appId);
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    recipientUserId: app?.candidateId || user.id,
    recipientRole: 'candidate',
    title: 'Candidature soumise',
    message: `Votre candidature ${app?.folderNumber} a été enregistrée. Vérification administrative en cours.`,
    date: 'À l\'instant',
    read: false,
    type: 'validation',
    applicationId: appId,
  };

  return {
    success: true,
    message: 'Candidature soumise avec succès.',
    data: updated,
    notification: notif,
  };
}

// Update only authorized contact fields after submission
export function updateAuthorizedCandidateFields(
  applications: Application[],
  appId: string,
  updates: { phone?: string; email?: string; address?: string },
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['candidate']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Candidat' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        lastUpdateDate: new Date().toISOString().split('T')[0],
        candidate: {
          ...app.candidate,
          phone: updates.phone !== undefined ? updates.phone : app.candidate.phone,
          email: updates.email !== undefined ? updates.email : app.candidate.email,
          address: updates.address !== undefined ? updates.address : app.candidate.address,
        },
      };
    }
    return app;
  });

  return {
    success: true,
    message: 'Coordonnées autorisées mises à jour.',
    data: updated,
  };
}

// 2a. Mark single checklist item valid (GCD / Administration)
export function markChecklistItemValid(
  applications: Application[],
  appId: string,
  itemKey: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['gcd_admin']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle GCD / Administration' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      const updatedChecklist = app.administrativeChecklist.map((item) =>
        item.key === itemKey
          ? { ...item, status: 'valid' as const, rejectionReason: undefined, note: undefined, updatedAt: new Date().toLocaleDateString('fr-FR') }
          : item
      );
      return {
        ...app,
        administrativeChecklist: updatedChecklist,
        lastUpdateDate: new Date().toISOString().split('T')[0],
      };
    }
    return app;
  });

  return {
    success: true,
    message: 'Pièce marquée conforme.',
    data: updated,
  };
}

// 2b. Soumise -> Recevable (GCD / Administration)
export function markReceivable(
  applications: Application[],
  appId: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['gcd_admin']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle GCD / Administration' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      const updatedChecklist = app.administrativeChecklist.map((item) => ({
        ...item,
        status: 'valid' as const,
        rejectionReason: undefined,
      }));
      return {
        ...app,
        status: 'receivable' as const,
        rejectionReason: undefined,
        finalResultDecision: undefined,
        workflowCurrentStep: 3 as const,
        administrativeChecklist: updatedChecklist,
      };
    }
    return app;
  });

  const app = applications.find((a) => a.id === appId);
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    recipientUserId: app?.candidateId || 'usr-candidate',
    recipientRole: 'candidate',
    title: 'Dossier déclaré recevable',
    message: `Votre dossier ${app?.folderNumber} a été validé par l'administration. Examen par le directeur de thèse en cours.`,
    date: 'À l\'instant',
    read: false,
    type: 'validation',
    applicationId: appId,
  };

  return {
    success: true,
    message: 'Dossier déclaré recevable.',
    data: updated,
    notification: notif,
  };
}

// 2c. Demander une correction (GCD / Administration)
export function markIncomplete(
  applications: Application[],
  appId: string,
  itemKey: string,
  motif: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['gcd_admin']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle GCD / Administration' };
  if (!motif.trim()) return { success: false, message: 'Veuillez préciser le motif de la correction demandée.' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      const updatedChecklist = app.administrativeChecklist.map((item) => {
        if (item.key === itemKey) {
          return { ...item, status: 'rejected' as const, rejectionReason: motif.trim(), note: motif.trim() };
        }
        return item;
      });
      return {
        ...app,
        status: 'incomplete' as const,
        rejectionReason: `Correction demandée (${itemKey}) : ${motif.trim()}`,
        administrativeChecklist: updatedChecklist,
      };
    }
    return app;
  });

  const app = applications.find((a) => a.id === appId);
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    recipientUserId: app?.candidateId || 'usr-candidate',
    recipientRole: 'candidate',
    title: 'Correction demandée sur votre dossier',
    message: `Motif : ${motif.trim()}. Veuillez fournir la pièce demandée depuis votre suivi.`,
    date: 'À l\'instant',
    read: false,
    type: 'blocked',
    applicationId: appId,
  };

  return {
    success: true,
    message: 'Demande de correction transmise au candidat.',
    data: updated,
    notification: notif,
  };
}

// 2d. Refus administratif du dossier avec motif obligatoire (GCD / Administration)
export function rejectApplicationAdmin(
  applications: Application[],
  appId: string,
  motif: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['gcd_admin']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle GCD / Administration' };
  if (!motif.trim()) return { success: false, message: 'Le motif de refus est obligatoire.' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        finalResultDecision: 'rejected' as const,
        rejectionReason: motif.trim(),
        lastUpdateDate: new Date().toISOString().split('T')[0],
      };
    }
    return app;
  });

  const app = applications.find((a) => a.id === appId);
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    recipientUserId: app?.candidateId || 'usr-candidate',
    recipientRole: 'candidate',
    title: 'Dossier refusé par l\'administration',
    message: `Motif : ${motif.trim()}`,
    date: 'À l\'instant',
    read: false,
    type: 'blocked',
    applicationId: appId,
  };

  return {
    success: true,
    message: 'Dossier refusé avec motif enregistré.',
    data: updated,
    notification: notif,
  };
}

// Resubmit by candidate (Incomplete -> Submitted)
export function resubmitIncomplete(
  applications: Application[],
  appId: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['candidate']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Candidat' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      const resetChecklist = app.administrativeChecklist.map((item) =>
        item.status === 'rejected' ? { ...item, status: 'pending' as const } : item
      );
      return {
        ...app,
        status: 'submitted' as const,
        rejectionReason: undefined,
        administrativeChecklist: resetChecklist,
        lastUpdateDate: new Date().toISOString().split('T')[0],
      };
    }
    return app;
  });

  return {
    success: true,
    message: 'Pièces transmises. Dossier renvoyé en vérification.',
    data: updated,
  };
}

// 3. Recevable -> Avis rendu (Directeur de thèse)
export function renderTeacherOpinion(
  applications: Application[],
  appId: string,
  opinion: 'favorable' | 'unfavorable',
  motif: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['thesis_director']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Directeur de thèse' };
  if (opinion === 'unfavorable' && !motif.trim()) {
    return { success: false, message: 'Un motif est obligatoire en cas d\'avis défavorable.' };
  }

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'opinions_given' as const,
        thesisDirectorOpinion: opinion,
        thesisDirectorMotif: motif.trim(),
      };
    }
    return app;
  });

  const app = applications.find((a) => a.id === appId);
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    recipientUserId: app?.candidateId || 'usr-candidate',
    recipientRole: 'candidate',
    title: opinion === 'favorable' ? 'Avis favorable du directeur de thèse' : 'Avis défavorable',
    message: opinion === 'favorable'
      ? `Votre candidature a reçu un avis favorable et est transmise à la commission scientifique.`
      : `Avis défavorable : ${motif.trim()}.`,
    date: 'À l\'instant',
    read: false,
    type: opinion === 'favorable' ? 'validation' : 'blocked',
    applicationId: appId,
  };

  return {
    success: true,
    message: opinion === 'favorable' ? 'Avis favorable enregistré.' : 'Avis défavorable enregistré.',
    data: updated,
    notification: notif,
  };
}

// 4. Avis favorable -> Convoqué (Commission uniquement, avec blocage conflit d'intérêt)
export function convokeCandidate(
  applications: Application[],
  appId: string,
  convocation: ConvocationDetails,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['commission']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Commission' };

  const target = applications.find((a) => a.id === appId);
  if (!target) return { success: false, message: 'Dossier introuvable.' };

  if (isConflictOfInterest(target, user)) {
    return {
      success: false,
      message: 'Action bloquée : un directeur de thèse ne peut pas convoquer ses propres candidats en commission.',
    };
  }

  if (!convocation.date || !convocation.time || !convocation.location.trim()) {
    return { success: false, message: 'Veuillez renseigner la date, l\'heure et le lieu de l\'entretien.' };
  }

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'convoked' as const,
        convocationDetails: convocation,
        wasAbsent: false,
      };
    }
    return app;
  });

  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    recipientUserId: target.candidateId || 'usr-candidate',
    recipientRole: 'candidate',
    title: 'Convocation à l\'entretien oral',
    message: `Rendez-vous le ${convocation.date} à ${convocation.time} — ${convocation.location}.`,
    date: 'À l\'instant',
    read: false,
    type: 'info',
    applicationId: appId,
  };

  return {
    success: true,
    message: 'Convocation enregistrée et visible par le candidat.',
    data: updated,
    notification: notif,
  };
}

// Exception: Absence à l'entretien (Commission, avec blocage conflit d'intérêt)
export function markAbsent(
  applications: Application[],
  appId: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['commission']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Commission' };

  const target = applications.find((a) => a.id === appId);
  if (target && isConflictOfInterest(target, user)) {
    return {
      success: false,
      message: 'Action bloquée : un directeur de thèse ne peut pas évaluer ses propres candidats en commission.',
    };
  }

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        wasAbsent: true,
      };
    }
    return app;
  });

  return {
    success: true,
    message: 'Absence enregistrée.',
    data: updated,
  };
}

// Exception: Reprogrammation unique par GCD
export function rescheduleInterview(
  applications: Application[],
  appId: string,
  newConvocation: ConvocationDetails,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['gcd_admin']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle GCD / Administration' };

  const target = applications.find((a) => a.id === appId);
  if (target?.rescheduledOnce) {
    return { success: false, message: 'La convocation a déjà été reprogrammée une fois.' };
  }

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'convoked' as const,
        convocationDetails: newConvocation,
        wasAbsent: false,
        rescheduledOnce: true,
      };
    }
    return app;
  });

  return {
    success: true,
    message: 'Nouvelle convocation enregistrée.',
    data: updated,
  };
}

// 5. Convoqué -> Entretien évalué (Commission, avec blocage conflit d'intérêt)
export function evaluateInterview(
  applications: Application[],
  appId: string,
  evalData: { dossierScore: number; projectScore: number; oralScore: number; notes: string },
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['commission']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Commission' };

  const target = applications.find((a) => a.id === appId);
  if (!target) return { success: false, message: 'Dossier introuvable.' };

  if (isConflictOfInterest(target, user)) {
    return {
      success: false,
      message: 'Action bloquée : un directeur de thèse ne peut pas évaluer ses propres candidats en commission.',
    };
  }

  const total = Math.min(20, Math.round((evalData.dossierScore + evalData.projectScore + evalData.oralScore) * 100) / 100);
  const evaluation: InterviewEvaluation = {
    ...evalData,
    totalScore: total,
    evaluatorName: user.name,
    date: new Date().toLocaleDateString('fr-FR'),
  };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'interviewed' as const,
        interviewEvaluation: evaluation,
        teacherScore: total,
        notesTeacher: evalData.notes,
      };
    }
    return app;
  });

  return {
    success: true,
    message: `Entretien évalué : ${total}/20.`,
    data: updated,
  };
}

// 6. Entretien évalué -> PV de sélection (Commission)
export function generateSubjectSelectionPv(
  applications: Application[],
  appId: string,
  user: UserAccount,
  proposedDecision?: 'admitted' | 'waiting_list' | 'rejected',
  waitingListPos?: number
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['commission']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Commission' };

  const target = applications.find((a) => a.id === appId);
  if (target && isConflictOfInterest(target, user)) {
    return {
      success: false,
      message: 'Action bloquée : un directeur de thèse ne peut pas établir le PV de ses propres candidats.',
    };
  }

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'pv_subject_ready' as const,
        selectionPvSigned: true,
        selectionPvSignatureHash: `SHA256:COMMISSION-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        finalResultDecision: proposedDecision || app.finalResultDecision || ((app.interviewEvaluation?.totalScore || 0) >= 14 ? 'admitted' : 'waiting_list'),
        waitingListPosition: proposedDecision === 'waiting_list' ? (waitingListPos || 1) : app.waitingListPosition,
      };
    }
    return app;
  });

  return {
    success: true,
    message: 'PV de sélection généré et transmis au Directeur de structure.',
    data: updated,
  };
}

// 7. PV de sélection -> PV global validé (Directeur de structure)
export function validateGlobalPvStructure(
  applications: Application[],
  appId: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['structure_director']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Directeur de structure' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'pv_global_validated' as const,
        structureGlobalPvSigned: true,
        signatures: {
          ...app.signatures,
          labHead: {
            ...app.signatures.labHead,
            signerName: user.name,
            isSigned: true,
            signedAt: new Date().toLocaleString('fr-FR'),
          },
        },
      };
    }
    return app;
  });

  return {
    success: true,
    message: 'PV global validé par le Directeur de structure.',
    data: updated,
  };
}

// 8. PV global validé -> Résultats approuvés (Directeur du CED)
export function approveCedResults(
  applications: Application[],
  appId: string,
  user: UserAccount,
  decision?: 'admitted' | 'waiting_list' | 'rejected',
  waitingListPos?: number
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['ced_director']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Directeur du CED' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      const chosenDecision = decision || app.finalResultDecision || 'admitted';
      return {
        ...app,
        status: 'results_approved' as const,
        cedResultsApproved: true,
        finalResultDecision: chosenDecision,
        waitingListPosition: chosenDecision === 'waiting_list' ? (waitingListPos || app.waitingListPosition || 1) : undefined,
        signatures: {
          ...app.signatures,
          cedocHead: {
            ...app.signatures.cedocHead,
            signerName: user.name,
            isSigned: true,
            signedAt: new Date().toLocaleString('fr-FR'),
          },
        },
      };
    }
    return app;
  });

  return {
    success: true,
    message: 'Résultats approuvés par le Directeur du CED.',
    data: updated,
  };
}

// 9. Résultats approuvés -> Résultats publiés (GCD / Administration)
export function publishResults(
  applications: Application[],
  appId: string,
  decision: 'admitted' | 'waiting_list' | 'rejected',
  waitingListPos?: number,
  user?: UserAccount
): WorkflowResult<Application[]> {
  if (user) {
    const guard = checkRoleGuard(user, ['gcd_admin']);
    if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle GCD / Administration' };
  }

  const target = applications.find((a) => a.id === appId);
  if (!target || !target.cedResultsApproved) {
    return {
      success: false,
      message: 'Publication impossible : les résultats doivent d\'abord être approuvés par le Directeur du CED.',
    };
  }

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'results_published' as const,
        finalResultDecision: decision,
        waitingListPosition: decision === 'waiting_list' ? (waitingListPos || 1) : undefined,
      };
    }
    return app;
  });

  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    recipientUserId: target.candidateId || 'usr-candidate',
    recipientRole: 'candidate',
    title: 'Résultats officiels publiés',
    message: decision === 'admitted'
      ? 'Vous êtes admis en doctorat. Veuillez confirmer votre place.'
      : decision === 'waiting_list'
      ? `Vous êtes sur liste d'attente (Rang ${waitingListPos || 1}).`
      : 'Candidature non retenue pour cette session.',
    date: 'À l\'instant',
    read: false,
    type: decision === 'admitted' ? 'validation' : decision === 'waiting_list' ? 'info' : 'blocked',
    applicationId: appId,
  };

  return {
    success: true,
    message: 'Résultats publiés officiellement.',
    data: updated,
    notification: notif,
  };
}

// 10. Admis -> Place confirmée OU Désistement (Candidat) + AUTOMATIC WAITING LIST PROMOTION
export function confirmPlace(
  applications: Application[],
  appId: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['candidate']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Candidat' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'place_confirmed' as const,
        confirmedAt: new Date().toLocaleDateString('fr-FR'),
      };
    }
    return app;
  });

  return {
    success: true,
    message: 'Place confirmée avec succès.',
    data: updated,
  };
}

export function renouncePlace(
  applications: Application[],
  appId: string,
  motif: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['candidate']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle Candidat' };

  const targetApp = applications.find((a) => a.id === appId);
  if (!targetApp) return { success: false, message: 'Dossier introuvable.' };

  let promotedAppId: string | null = null;
  let promotedCandidateName = '';

  let updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'renounced' as const,
        renouncedAt: new Date().toLocaleDateString('fr-FR'),
        renounceReason: motif,
      };
    }
    return app;
  });

  const waitingCandidates = updated.filter(
    (a) => a.subjectId === targetApp.subjectId && a.finalResultDecision === 'waiting_list'
  );

  if (waitingCandidates.length > 0) {
    waitingCandidates.sort((a, b) => (a.waitingListPosition || 1) - (b.waitingListPosition || 1));
    const nextInLine = waitingCandidates[0];
    promotedAppId = nextInLine.id;
    promotedCandidateName = `${nextInLine.candidate.firstName} ${nextInLine.candidate.lastName}`;

    updated = updated.map((app) => {
      if (app.id === nextInLine.id) {
        return {
          ...app,
          status: 'results_published' as const,
          finalResultDecision: 'admitted' as const,
          waitingListPosition: undefined,
        };
      }
      return app;
    });
  }

  const promoNotice = promotedAppId
    ? ` Le candidat en tête de liste d'attente (${promotedCandidateName}) a été automatiquement promu.`
    : '';

  return {
    success: true,
    message: `Désistement enregistré.${promoNotice}`,
    data: updated,
  };
}

// 11. Place confirmée -> Inscrit (GCD / Administration)
export function finalizeRegistration(
  applications: Application[],
  appId: string,
  user: UserAccount
): WorkflowResult<Application[]> {
  const guard = checkRoleGuard(user, ['gcd_admin']);
  if (!guard.allowed) return { success: false, message: guard.message || 'Action réservée au rôle GCD / Administration' };

  const updated = applications.map((app) => {
    if (app.id === appId) {
      return {
        ...app,
        status: 'registered' as const,
        physicalFileReceivedAt: new Date().toLocaleDateString('fr-FR'),
        physicalReceivedBy: user.name,
      };
    }
    return app;
  });

  const app = applications.find((a) => a.id === appId);
  const notif: NotificationItem = {
    id: `notif-${Date.now()}`,
    recipientUserId: app?.candidateId || 'usr-candidate',
    recipientRole: 'candidate',
    title: 'Inscription définitive validée',
    message: `Votre inscription doctorale est finalisée.`,
    date: 'À l\'instant',
    read: false,
    type: 'validation',
    applicationId: appId,
  };

  return {
    success: true,
    message: 'Inscription définitive validée.',
    data: updated,
    notification: notif,
  };
}
