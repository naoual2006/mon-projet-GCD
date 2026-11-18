import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ThesisCatalog } from './components/Candidate/ThesisCatalog';
import { ThesisCartModal } from './components/Candidate/ThesisCartModal';
import { ApplicationWizard } from './components/Candidate/ApplicationWizard';
import { ApplicationTrackingView } from './components/Candidate/ApplicationTrackingView';
import { DocBotAssistant } from './components/Candidate/DocBotAssistant';
import { ThesisDirectorDashboard } from './components/Teacher/ThesisDirectorDashboard';
import { CommissionDashboard } from './components/Teacher/CommissionDashboard';
import { SmartCandidateDossierViewer } from './components/Teacher/SmartCandidateDossierViewer';
import { CandidateComparisonModal } from './components/Teacher/CandidateComparisonModal';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { QrScannerModal } from './components/Admin/QrScannerModal';
import { PrintableRegistrationSheet } from './components/Admin/PrintableRegistrationSheet';
import { ArchitectureModal } from './components/ArchitectureModal';
import { NotificationCenterModal } from './components/Notifications/NotificationCenterModal';
import {
  mockThesisSubjects,
  mockApplications,
  mockAuditLogs,
  mockMessages,
} from './data/mockData';
import {
  ThesisSubject,
  Application,
  CandidateProfile,
  InternalMessage,
  AuditLogEntry,
  UserAccount,
  RoleDefinition,
  PrivilegeAuditLog,
  NotificationItem,
  SentEmailLog,
  RoleId,
  SystemConfig,
} from './types';
import {
  STORAGE_KEYS,
  getStoredUsers,
  saveStoredUsers,
  getStoredRoles,
  saveStoredRoles,
  getStoredNotifications,
  saveStoredNotifications,
  getStoredSentEmails,
  saveStoredSentEmails,
  getStoredPrivilegeAudit,
  saveStoredPrivilegeAudit,
  getStoredSystemConfig,
  saveStoredSystemConfig,
  createInitialWorkflowSteps,
  createInitialWorkflowHistory,
  canChangeUserRole,
  canSuspendUser,
  DEFAULT_USERS,
} from './utils/workflowStorage';
import {
  markIncomplete,
  resubmitIncomplete,
  renderTeacherOpinion,
  confirmPlace,
  renouncePlace,
  finalizeRegistration,
  updateAuthorizedCandidateFields,
} from './utils/workflowEngine';
import { Language } from './i18n/translations';
import { CheckCircle2, School } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<RoleId>('candidate');
  const [lang, setLang] = useState<Language>('fr');
  const [isOnline] = useState<boolean>(true);

  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => getStoredSystemConfig());
  const [users, setUsers] = useState<UserAccount[]>(() => getStoredUsers());
  const [roles, setRoles] = useState<RoleDefinition[]>(() => getStoredRoles());
  const [privilegeAuditLogs, setPrivilegeAuditLogs] = useState<PrivilegeAuditLog[]>(() => getStoredPrivilegeAudit());

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    const list = getStoredUsers();
    return list[0] || DEFAULT_USERS[0];
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getStoredNotifications());
  const [sentEmails] = useState<SentEmailLog[]>(() => getStoredSentEmails());
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);

  const [activeCandidateTab, setActiveCandidateTab] = useState<'catalog' | 'wizard' | 'tracking'>('catalog');
  const [activeAdminTab, setActiveAdminTab] = useState<string>('registry');

  const [subjects, setSubjects] = useState<ThesisSubject[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error loading subjects', e);
    }
    return mockThesisSubjects;
  });

  const [applications, setApplications] = useState<Application[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error loading applications', e);
    }
    return mockApplications;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error loading audit logs', e);
    }
    return mockAuditLogs;
  });

  const [messages, setMessages] = useState<InternalMessage[]>(mockMessages);
  const [cart, setCart] = useState<string[]>(['TH-2026-001', 'TH-2026-003']);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('TH-2026-001');
  const [selectedTrackingAppId, setSelectedTrackingAppId] = useState<string>('');

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState<boolean>(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [viewingApp, setViewingApp] = useState<Application | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [comparisonCandidates, setComparisonCandidates] = useState<Application[]>([]);
  const [printingApp, setPrintingApp] = useState<Application | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const addAuditLog = (action: string, details: string, actorOverride?: string, roleOverride?: string) => {
    const roleLabels: Record<RoleId, string> = {
      candidate: 'Candidat',
      thesis_director: 'Directeur de thèse',
      structure_director: 'Directeur de structure',
      commission: 'Commission',
      ced_director: 'Directeur du CED',
      gcd_admin: 'GCD / Administration',
    };
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleString('fr-FR'),
      actor: actorOverride || currentUser.name,
      role: roleOverride || roleLabels[currentUser.roleId] || currentUser.roleId,
      action,
      details,
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
    } catch (e) {
      console.error(e);
    }
  }, [applications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    } catch (e) {
      console.error(e);
    }
  }, [subjects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
    } catch (e) {
      console.error(e);
    }
  }, [auditLogs]);

  useEffect(() => { saveStoredUsers(users); }, [users]);
  useEffect(() => { saveStoredRoles(roles); }, [roles]);
  useEffect(() => { saveStoredNotifications(notifications); }, [notifications]);
  useEffect(() => { saveStoredSentEmails(sentEmails); }, [sentEmails]);
  useEffect(() => { saveStoredPrivilegeAudit(privilegeAuditLogs); }, [privilegeAuditLogs]);
  useEffect(() => { saveStoredSystemConfig(systemConfig); }, [systemConfig]);

  const handleSelectPersona = (roleId: RoleId) => {
    const foundUser =
      users.find((u) => u.roleId === roleId) ||
      users.find((u) => u.roles && u.roles.includes(roleId)) ||
      DEFAULT_USERS.find((u) => u.roleId === roleId);
    if (foundUser) {
      setCurrentUser({ ...foundUser, roleId });
    }
    setCurrentRole(roleId);
    setActiveAdminTab('registry');

    const roleLabels: Record<RoleId, string> = {
      candidate: 'Candidat',
      thesis_director: 'Directeur de thèse',
      structure_director: 'Directeur de structure',
      commission: 'Commission',
      ced_director: 'Directeur du CED',
      gcd_admin: 'GCD / Administration',
    };
    showToast(`Mode démonstration — Rôle actif : ${roleLabels[roleId]} (${foundUser?.name || ''})`);
  };

  // Cart operations (Enforces System Config max limit)
  const handleAddToCart = (id: string) => {
    const limit = systemConfig.maxApplicationsPerCandidate || 3;
    if (cart.length >= limit) {
      showToast(`Limitation : Vous avez atteint la limite de ${limit} choix de sujets.`);
      return;
    }
    if (!cart.includes(id)) {
      setCart([...cart, id]);
      showToast(lang === 'fr' ? 'Sujet ajouté à mes choix !' : 'تمت إضافة الموضوع إلى اختياراتك');
    }
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter((itemId) => itemId !== id));
  };

  const handleReorderCart = (fromIndex: number, toIndex: number) => {
    const updated = [...cart];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setCart(updated);
  };

  // Direct application start
  const handleSelectForApplication = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setActiveCandidateTab('wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submission handler
  const handleApplicationSubmitted = (profile: CandidateProfile) => {
    const selectedSub = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
    const newId = `app-${Date.now()}`;
    const newFolderNumber = `DOC-2026-USMBA-${Math.floor(1000 + Math.random() * 9000)}`;

    const newApp: Application = {
      id: newId,
      folderNumber: newFolderNumber,
      subjectId: selectedSub.id,
      candidateId: currentUser.id || 'usr-candidate',
      subjectTitle: selectedSub.title,
      subjectDiscipline: selectedSub.discipline,
      subjectLab: selectedSub.laboratory,
      directorName: selectedSub.director,
      status: 'submitted',
      submissionDate: new Date().toISOString().split('T')[0],
      lastUpdateDate: new Date().toISOString().split('T')[0],
      candidate: profile,
      workflowCurrentStep: 2,
      workflowSteps: createInitialWorkflowSteps(),
      workflowHistory: createInitialWorkflowHistory(),
      aiAnalysis: {
        matchScore: 92,
        statusColor: 'green',
        statusLabel: 'Dossier conforme',
        statusLabelAr: 'ملف مطابق للشروط',
        summary: 'Profil compatible avec les axes de recherche de la structure d\'accueil.',
        summaryAr: 'ملف متوافق مع المحاور البحثية لبنية البحث.',
        reasons: [
          'Diplôme de Master conforme aux prérequis scientifiques',
          'Pièces justificatives jointes',
          'Données d\'état civil vérifiées',
        ],
        strengths: ['Bon socle méthodologique', 'Projet cohérent'],
        pointsToVerify: ['Vérification des relevés originaux lors du dépôt physique'],
      },
      administrativeChecklist: [
        { key: 'cin', label: 'Carte Nationale d\'Identité (CNIE)', required: true, status: 'pending' },
        { key: 'master', label: 'Diplôme de Master', required: true, status: 'pending' },
        { key: 'transcripts', label: 'Relevés de notes Master (S1 à S4)', required: true, status: 'pending' },
        { key: 'cv', label: 'Curriculum Vitae normalisé', required: true, status: 'pending' },
        { key: 'proposal', label: 'Avant-projet de recherche doctoral', required: true, status: 'pending' },
      ],
      trackingTimeline: [
        { id: '1', label: 'Préinscription', labelAr: 'التسجيل الأولي', description: 'Dossier transmis avec CNIE validée', status: 'completed', date: new Date().toLocaleDateString('fr-FR') },
        { id: '2', label: 'Vérification du dossier', labelAr: 'فحص وثائق الملف', description: 'En attente de vérification par GCD / Administration', status: 'current' },
        { id: '3', label: 'Avis et convocation', labelAr: 'رأي المشرف والاستدعاء', description: 'Examen par le directeur de thèse et la commission', status: 'upcoming' },
        { id: '4', label: 'Entretien oral', labelAr: 'المقابلة الشفوية', description: 'Audition par la commission scientifique', status: 'upcoming' },
        { id: '5', label: 'Résultats', labelAr: 'النتائج النهائية', description: 'Approbation du CED et publication', status: 'upcoming' },
        { id: '6', label: 'Inscription administrative', labelAr: 'التسجيل النهائي', description: 'Dépôt physique au guichet', status: 'upcoming' },
      ],
      signatures: {
        director: { role: 'Directeur de thèse', roleAr: 'المشرف على الأطروحة', signerName: selectedSub.director, isSigned: false },
        labHead: { role: 'Directeur de structure', roleAr: 'مدير بنية البحث', signerName: 'Pr. Samir Benjelloun', isSigned: false },
        cedocHead: { role: 'Directeur du CED', roleAr: 'مدير قطب الدكتوراه', signerName: 'Pr. Hassan Alaoui', isSigned: false },
      },
      qrToken: `USMBA-DOC-QR-${newFolderNumber}-${profile.lastName.toUpperCase()}`,
    };

    setApplications([newApp, ...applications]);
    setSelectedTrackingAppId(newId);
    addAuditLog('Dépôt de candidature', `Candidature ${newFolderNumber} déposée sur ${selectedSub.id}.`);

    const welcomeNotif: NotificationItem = {
      id: `notif-app-${Date.now()}`,
      recipientUserId: newApp.candidateId,
      recipientRole: 'candidate',
      title: 'Candidature enregistrée avec succès',
      message: `Votre dossier ${newFolderNumber} a été déposé. Vérification administrative en cours.`,
      date: 'À l\'instant',
      read: false,
      type: 'validation',
      applicationId: newApp.id,
      stepNumber: 1,
    };
    setNotifications([welcomeNotif, ...notifications]);

    setActiveCandidateTab('tracking');
    showToast(lang === 'fr' ? 'Candidature déposée avec succès !' : 'تم إيداع ترشيحكم بنجاح!');
  };

  // Candidate applications for current candidate user
  const candidateApps = applications.filter(
    (a) => a.candidateId === 'usr-candidate' || a.candidateId === currentUser.id
  );
  const appliedSubjectIds = candidateApps.map((a) => a.subjectId);
  const primaryApplication =
    candidateApps.find((a) => a.id === selectedTrackingAppId) ||
    candidateApps[0] ||
    applications[0];

  const handleSendMessage = (content: string) => {
    const activeApp = primaryApplication;
    if (!activeApp) return;
    const newMsg: InternalMessage = {
      id: `msg-${Date.now()}`,
      applicationId: activeApp.id,
      senderName: `${activeApp.candidate.firstName} ${activeApp.candidate.lastName}`,
      senderRole: 'candidate',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content,
    };
    setMessages([...messages, newMsg]);

    setTimeout(() => {
      const autoReply: InternalMessage = {
        id: `msg-${Date.now() + 1}`,
        applicationId: activeApp.id,
        senderName: activeApp.directorName,
        senderRole: 'supervisor',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content:
          lang === 'fr'
            ? 'Bien reçu. Votre message a été transmis pour suivi de votre dossier.'
            : 'تم استلام رسالتكم بنجاح.',
      };
      setMessages((prev) => [...prev, autoReply]);
    }, 1000);
  };

  // Privileges management handlers (records in BOTH privilegeAuditLogs and main auditLogs)
  const handleAssignUserRole = (userId: string, newRoleId: string, scope?: string) => {
    const check = canChangeUserRole(users, currentUser, userId, newRoleId);
    if (!check.allowed) {
      showToast(check.reason || 'Action refusée.');
      return;
    }
    const targetUser = users.find((u) => u.id === userId);
    const formerRoleName = roles.find((r) => r.id === targetUser?.roleId)?.name || targetUser?.roleId || '';
    const newRoleName = roles.find((r) => r.id === newRoleId)?.name || newRoleId;

    const updated = users.map((u) =>
      u.id === userId ? { ...u, roleId: newRoleId as RoleId, roles: [newRoleId as RoleId], scope: scope || u.scope } : u
    );
    setUsers(updated);

    const privEntry: PrivilegeAuditLog = {
      id: `priv-${Date.now()}`,
      timestamp: new Date().toLocaleString('fr-FR'),
      actorName: currentUser.name,
      formerRole: formerRoleName,
      newRole: newRoleName,
      details: `Rôle modifié pour ${targetUser?.name || userId} : ${formerRoleName} → ${newRoleName}.`,
    };
    setPrivilegeAuditLogs((prev) => [privEntry, ...prev]);
    addAuditLog('Modification de rôle', `${targetUser?.name || userId} : ${formerRoleName} → ${newRoleName}.`);
    showToast('Droits mis à jour et journalisés avec succès.');
  };

  const handleToggleUserStatus = (userId: string) => {
    const check = canSuspendUser(users, currentUser, userId);
    if (!check.allowed) {
      showToast(check.reason || 'Action refusée.');
      return;
    }
    const targetUser = users.find((u) => u.id === userId);
    const nextStatus = targetUser?.status === 'active' ? 'suspended' : 'active';
    const updated = users.map((u) => (u.id === userId ? { ...u, status: nextStatus as 'active' | 'suspended' } : u));
    setUsers(updated);
    addAuditLog('Statut utilisateur modifié', `${targetUser?.name || userId} → ${nextStatus === 'active' ? 'Actif' : 'Suspendu'}.`);
    showToast('Statut du compte mis à jour.');
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const canManagePrivileges = currentUser.roleId === 'gcd_admin';

  const isEvaluatorRole = currentRole === 'thesis_director' || currentRole === 'commission';
  const isAdminRole =
    currentRole === 'ced_director' ||
    currentRole === 'gcd_admin' ||
    currentRole === 'structure_director';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans selection:bg-[#1E3A8A] selection:text-white">
      <Navbar
        currentRole={currentRole}
        currentUser={currentUser}
        allUsers={users}
        onSelectPersona={handleSelectPersona}
        lang={lang}
        setLang={setLang}
        cartCount={cart.length}
        openCart={() => setIsCartOpen(true)}
        activeCandidateTab={activeCandidateTab}
        setActiveCandidateTab={setActiveCandidateTab}
        activeAdminTab={activeAdminTab}
        setActiveAdminTab={setActiveAdminTab}
        notifications={notifications}
        onMarkNotificationRead={(id) => {
          setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        }}
        onMarkAllNotificationsRead={() => {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          showToast(
            lang === 'fr'
              ? 'Toutes les notifications ont été marquées comme lues.'
              : 'تم تحديد جميع الإشعارات كمقروءة.'
          );
        }}
        onNavigateToStep={(appId) => {
          const app = applications.find((a) => a.id === appId) || applications[0];
          if (currentRole === 'candidate') {
            setSelectedTrackingAppId(app.id);
            setActiveCandidateTab('tracking');
          } else if (isEvaluatorRole) {
            setViewingApp(app);
          } else {
            setActiveAdminTab('registry');
          }
        }}
        onOpenEmailLogs={() => setIsNotificationsModalOpen(true)}
        openArchModal={() => setIsArchModalOpen(true)}
        canManagePrivileges={canManagePrivileges}
        demoMode={true}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-[76px] pb-24">
        {/* CANDIDATE WORKSPACE */}
        {currentRole === 'candidate' && (
          <div>
            {activeCandidateTab === 'catalog' && (
              <ThesisCatalog
                subjects={subjects}
                cart={cart}
                addToCart={handleAddToCart}
                removeFromCart={handleRemoveFromCart}
                onSelectForApplication={handleSelectForApplication}
                appliedSubjectIds={appliedSubjectIds}
                onViewTracking={() => setActiveCandidateTab('tracking')}
                campaignEndDate={systemConfig.campaignEndDate}
                lang={lang}
              />
            )}

            {activeCandidateTab === 'wizard' && (
              <ApplicationWizard
                selectedSubject={selectedSubject}
                onApplicationSubmitted={handleApplicationSubmitted}
                lang={lang}
                isOnline={isOnline}
                alreadyApplied={appliedSubjectIds.includes(selectedSubject.id)}
              />
            )}

            {activeCandidateTab === 'tracking' && primaryApplication && (
              <div className="space-y-4">
                {candidateApps.length > 1 && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-600">
                      Vos candidatures déposées ({candidateApps.length}) :
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {candidateApps.map((ca) => (
                        <button
                          key={ca.id}
                          type="button"
                          onClick={() => setSelectedTrackingAppId(ca.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            primaryApplication.id === ca.id
                              ? 'bg-[#1E3A8A] text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {ca.folderNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <ApplicationTrackingView
                  application={primaryApplication}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onOpenPrintSheet={() => setPrintingApp(primaryApplication)}
                  lang={lang}
                  currentUser={currentUser}
                  roles={roles}
                  onValidateStep={(_, stepNum) => {
                    showToast(`Étape ${stepNum} validée.`);
                  }}
                  onBlockStep={(_, __, motif) => {
                    showToast(`Blocage : ${motif}`);
                  }}
                  onSubmitMissingDocs={(appId) => {
                    const res = resubmitIncomplete(applications, appId, currentUser);
                    if (res.success && res.data) {
                      setApplications(res.data);
                      addAuditLog('Transmission pièces complémentaires', `Dossier ${appId} renvoyé en vérification.`);
                      showToast(res.message);
                    } else {
                      showToast(res.message);
                    }
                  }}
                  onUpdateAuthorizedContact={(appId, contact) => {
                    const res = updateAuthorizedCandidateFields(applications, appId, contact, currentUser);
                    if (res.success && res.data) {
                      setApplications(res.data);
                      showToast(res.message);
                    } else {
                      showToast(res.message);
                    }
                  }}
                  onConfirmPlace={(appId) => {
                    const res = confirmPlace(applications, appId, currentUser);
                    if (res.success && res.data) {
                      setApplications(res.data);
                      addAuditLog('Confirmation de place', `Place confirmée par le candidat sur ${appId}.`);
                      showToast(res.message);
                    } else {
                      showToast(res.message);
                    }
                  }}
                  onRenouncePlace={(appId, motif) => {
                    const res = renouncePlace(applications, appId, motif, currentUser);
                    if (res.success && res.data) {
                      setApplications(res.data);
                      addAuditLog('Désistement candidat', `Désistement enregistré sur ${appId} : ${motif}`);
                      showToast(res.message);
                    } else {
                      showToast(res.message);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* THESIS DIRECTOR WORKSPACE */}
        {currentRole === 'thesis_director' && (
          <ThesisDirectorDashboard
            applications={applications}
            subjects={subjects}
            currentUser={currentUser}
            onUpdateApplications={(updated, msg) => {
              setApplications(updated);
              showToast(msg || 'Dossiers mis à jour.');
            }}
            onUpdateSubjects={(updatedSubs, msg) => {
              setSubjects(updatedSubs);
              showToast(msg || 'Sujets mis à jour.');
            }}
            onOpenViewer={(app) => setViewingApp(app)}
            lang={lang}
          />
        )}

        {/* COMMISSION WORKSPACE */}
        {currentRole === 'commission' && (
          <CommissionDashboard
            applications={applications}
            currentUser={currentUser}
            onUpdateApplications={(updated, msg) => {
              setApplications(updated);
              showToast(msg || 'Dossiers mis à jour.');
            }}
            onOpenViewer={(app) => setViewingApp(app)}
            onOpenCompare={(apps) => {
              setComparisonCandidates(apps);
              setIsCompareOpen(true);
            }}
            lang={lang}
          />
        )}

        {/* ADMIN & DIRECTORS WORKSPACE */}
        {isAdminRole && (
          <AdminDashboard
            applications={applications}
            subjects={subjects}
            onUpdateApplications={(updated, msg) => {
              setApplications(updated);
              if (msg) showToast(msg);
            }}
            onUpdateSubjects={(updatedSubs, msg) => {
              setSubjects(updatedSubs);
              if (msg) showToast(msg);
            }}
            activeTab={activeAdminTab}
            setActiveTab={setActiveAdminTab}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
            onOpenPrintSheet={(app) => setPrintingApp(app)}
            onTriggerRelance={(appId, itemKey, motif) => {
              const res = markIncomplete(
                applications,
                appId,
                itemKey,
                motif || 'Pièce manquante ou illisible',
                currentUser
              );
              if (res.success && res.data) {
                setApplications(res.data);
                addAuditLog('Demande de correction', `Dossier ${appId} (${itemKey}) : ${motif || ''}`);
                showToast(res.message);
              } else {
                showToast(res.message);
              }
            }}
            onSignWorkflow={(appId, roleKey) => {
              const updated = applications.map((a) => {
                if (a.id !== appId) return a;
                return {
                  ...a,
                  signatures: {
                    ...a.signatures,
                    [roleKey]: {
                      ...a.signatures[roleKey],
                      isSigned: true,
                      signedAt: new Date().toLocaleString('fr-FR'),
                    },
                  },
                };
              });
              setApplications(updated);
              addAuditLog('Signature électronique', `Signature ${roleKey} apposée sur ${appId}.`);
              showToast('Signature électronique enregistrée.');
            }}
            auditLogs={auditLogs}
            onAddAuditLog={addAuditLog}
            lang={lang}
            users={users}
            roles={roles}
            currentActiveUser={currentUser}
            privilegeAuditLogs={privilegeAuditLogs}
            onUpdateRolePermissions={() => {}}
            onAssignUserRole={handleAssignUserRole}
            onToggleUserStatus={handleToggleUserStatus}
            onCreateCustomRole={() => {}}
            onDeleteCustomRole={() => {}}
            onAddUser={() => {}}
            canManagePrivileges={canManagePrivileges}
            systemConfig={systemConfig}
            onUpdateSystemConfig={(newConfig) => {
              setSystemConfig(newConfig);
              showToast(`Paramètres enregistrés (Clôture : ${newConfig.campaignEndDate} · Max ${newConfig.maxApplicationsPerCandidate} choix).`);
            }}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Floating DocBot Assistant — Hidden on Candidate Application Wizard forms so it never overlaps buttons */}
      {!(currentRole === 'candidate' && activeCandidateTab === 'wizard') && (
        <DocBotAssistant lang={lang} />
      )}

      {/* MODALS */}
      <ThesisCartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartIds={cart}
        subjects={subjects}
        onRemove={handleRemoveFromCart}
        onReorder={handleReorderCart}
        onProceedToApply={() => {
          if (cart.length > 0) {
            setSelectedSubjectId(cart[0]);
            setActiveCandidateTab('wizard');
          }
        }}
        lang={lang}
        maxChoices={systemConfig.maxApplicationsPerCandidate || 3}
      />

      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
        lang={lang}
      />

      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        applications={applications}
        onConfirmPhysicalReceipt={(appId) => {
          const res = finalizeRegistration(applications, appId, currentUser);
          if (res.success && res.data) {
            setApplications(res.data);
            addAuditLog('Réception guichet (QR)', `Dossier ${appId} réceptionné et inscrit définitivement.`);
            setIsQrScannerOpen(false);
            showToast(res.message);
          } else {
            showToast(res.message);
          }
        }}
        lang={lang}
      />

      {viewingApp && (
        <SmartCandidateDossierViewer
          application={viewingApp}
          currentUser={currentUser}
          onValidate={(appId) => {
            const res = renderTeacherOpinion(applications, appId, 'favorable', 'Avis favorable.', currentUser);
            if (res.success && res.data) {
              setApplications(res.data);
              showToast(res.message);
            } else {
              showToast(res.message);
            }
            setViewingApp(null);
          }}
          onReject={(appId, reason) => {
            const res = renderTeacherOpinion(applications, appId, 'unfavorable', reason, currentUser);
            if (res.success && res.data) {
              setApplications(res.data);
              showToast(res.message);
            } else {
              showToast(res.message);
            }
            setViewingApp(null);
          }}
          onClose={() => setViewingApp(null)}
          lang={lang}
        />
      )}

      {isCompareOpen && (
        <CandidateComparisonModal
          candidates={comparisonCandidates.length >= 2 ? comparisonCandidates : applications.slice(0, 3)}
          onClose={() => setIsCompareOpen(false)}
          onSelectCandidate={(appId) => {
            const found = applications.find((a) => a.id === appId);
            if (found) setViewingApp(found);
          }}
          lang={lang}
        />
      )}

      {printingApp && (
        <PrintableRegistrationSheet
          application={printingApp}
          onClose={() => setPrintingApp(null)}
          lang={lang}
        />
      )}

      <NotificationCenterModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        sentEmails={sentEmails}
        onMarkAsRead={(id) => {
          setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
        }}
        onMarkAllAsRead={() => {
          setNotifications(notifications.map((n) => ({ ...n, read: true })));
          showToast(
            lang === 'fr'
              ? 'Toutes les notifications ont été marquées comme lues.'
              : 'تم تحديد جميع الإشعارات كمقروءة.'
          );
        }}
        onNavigateToStep={(appId) => {
          const app = applications.find((a) => a.id === appId) || applications[0];
          if (currentRole === 'candidate') {
            setSelectedTrackingAppId(app.id);
            setActiveCandidateTab('tracking');
          } else if (isEvaluatorRole) {
            setViewingApp(app);
          } else {
            setActiveAdminTab('registry');
          }
        }}
        lang={lang}
      />

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1E3A8A] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-semibold border border-white/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <footer className="mt-auto border-t border-slate-200/80 bg-white py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <School className="w-4 h-4 text-[#1E3A8A]" />
          <span className="font-semibold text-slate-700">
            DocCycle · Université Sidi Mohamed Ben Abdellah (USMBA)
          </span>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-slate-400 font-medium">
          <span>Conforme Loi 09-08 (CNDP)</span>
          <span aria-hidden="true">·</span>
          <span>Cycle Doctoral USMBA</span>
        </div>
      </footer>
    </div>
  );
}
