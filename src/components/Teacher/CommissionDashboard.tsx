import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileCheck,
  Calendar,
  FileSpreadsheet,
  Eye,
  Lock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Scale,
} from 'lucide-react';
import { Application, UserAccount, ConvocationDetails } from '../../types';
import { Language } from '../../i18n/translations';
import {
  convokeCandidate,
  evaluateInterview,
  markAbsent,
  generateSubjectSelectionPv,
  isConflictOfInterest,
} from '../../utils/workflowEngine';
import { formatCandidateName, formatData, maskCin, maskPhone } from '../../utils/formatData';

interface CommissionDashboardProps {
  applications: Application[];
  currentUser: UserAccount;
  onUpdateApplications: (apps: Application[], feedback?: string) => void;
  onOpenViewer: (app: Application) => void;
  onOpenCompare?: (apps: Application[]) => void;
  lang: Language;
}

export const CommissionDashboard: React.FC<CommissionDashboardProps> = ({
  applications,
  currentUser,
  onUpdateApplications,
  onOpenViewer,
  onOpenCompare,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dossiers' | 'interviews' | 'pv'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Convocation modal state
  const [convokeModalApp, setConvokeModalApp] = useState<Application | null>(null);
  const [convDate, setConvDate] = useState('2026-12-05');
  const [convTime, setConvTime] = useState('10:00');
  const [convLocation, setConvLocation] = useState('Salle de réunion LISTI · FST Fès');
  const [convNote, setConvNote] = useState('Merci de vous présenter 15 minutes avant l\'heure avec votre CNIE.');
  const [convError, setConvError] = useState('');

  // Evaluation (/20) modal state
  const [evalModalApp, setEvalModalApp] = useState<Application | null>(null);
  const [dossierScore, setDossierScore] = useState<number>(5);
  const [projectScore, setProjectScore] = useState<number>(5.5);
  const [oralScore, setOralScore] = useState<number>(5.5);
  const [evalNotes, setEvalNotes] = useState('');
  const [evalError, setEvalError] = useState('');

  // Inline feedback banner
  const [actionError, setActionError] = useState<string | null>(null);

  // Candidates visible to commission (favorable opinion or already beyond)
  const commissionApps = applications.filter(
    (a) =>
      a.thesisDirectorOpinion === 'favorable' ||
      ['convoked', 'interviewed', 'pv_subject_ready', 'pv_global_validated', 'results_approved', 'results_published', 'place_confirmed', 'registered'].includes(a.status)
  );

  const toConvokeApps = commissionApps.filter((a) => a.status === 'opinions_given' || (a.status === 'receivable' && a.thesisDirectorOpinion === 'favorable'));
  const interviewApps = commissionApps.filter((a) => a.status === 'convoked');
  const pvEligibleApps = commissionApps.filter((a) => ['interviewed', 'pv_subject_ready'].includes(a.status));

  const openConvokeModal = (app: Application) => {
    setConvokeModalApp(app);
    setConvDate(app.convocationDetails?.date || '2026-12-05');
    setConvTime(app.convocationDetails?.time || '10:00');
    setConvLocation(app.convocationDetails?.location || 'Salle de réunion LISTI · FST Fès');
    setConvNote(app.convocationDetails?.note || '');
    setConvError('');
  };

  const handleConfirmConvoke = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convokeModalApp) return;
    const details: ConvocationDetails = {
      date: convDate,
      time: convTime,
      location: convLocation.trim(),
      note: convNote.trim() || undefined,
    };
    const res = convokeCandidate(applications, convokeModalApp.id, details, currentUser);
    if (res.success && res.data) {
      onUpdateApplications(res.data, res.message);
      setConvokeModalApp(null);
    } else {
      setConvError(res.message);
    }
  };

  const openEvalModal = (app: Application) => {
    setEvalModalApp(app);
    setDossierScore(app.interviewEvaluation?.dossierScore ?? 5);
    setProjectScore(app.interviewEvaluation?.projectScore ?? 5.5);
    setOralScore(app.interviewEvaluation?.oralScore ?? 5.5);
    setEvalNotes(app.interviewEvaluation?.notes || '');
    setEvalError('');
  };

  const handleConfirmEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalModalApp) return;
    if (!evalNotes.trim()) {
      setEvalError('Veuillez saisir une appréciation de jury.');
      return;
    }
    const res = evaluateInterview(
      applications,
      evalModalApp.id,
      {
        dossierScore,
        projectScore,
        oralScore,
        notes: evalNotes.trim(),
      },
      currentUser
    );
    if (res.success && res.data) {
      onUpdateApplications(res.data, res.message);
      setEvalModalApp(null);
    } else {
      setEvalError(res.message);
    }
  };

  const handleMarkAbsent = (app: Application) => {
    setActionError(null);
    const res = markAbsent(applications, app.id, currentUser);
    if (res.success && res.data) {
      onUpdateApplications(res.data, res.message);
    } else {
      setActionError(res.message);
    }
  };

  const handleGeneratePv = (app: Application, decision: 'admitted' | 'waiting_list' | 'rejected') => {
    setActionError(null);
    const res = generateSubjectSelectionPv(applications, app.id, currentUser, decision, 1);
    if (res.success && res.data) {
      onUpdateApplications(res.data, res.message);
    } else {
      setActionError(res.message);
    }
  };

  const sidebarItems = [
    { id: 'dashboard' as const, label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'dossiers' as const, label: 'Dossiers à évaluer', icon: FileCheck },
    { id: 'interviews' as const, label: 'Entretiens', icon: Calendar },
    { id: 'pv' as const, label: 'PV de sélection', icon: FileSpreadsheet },
  ];

  const totalPreviewScore = Math.min(20, Math.round((dossierScore + projectScore + oralScore) * 100) / 100);

  return (
    <div className="flex gap-6 items-start pb-20">
      {/* Lateral Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-white rounded-xl border border-slate-200/80 shadow-xs shrink-0 transition-all duration-200 sticky top-20 overflow-hidden ${
          isSidebarCollapsed ? 'w-16 p-2' : 'w-60 p-3'
        }`}
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 px-2">
          {!isSidebarCollapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Espace Commission
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 ml-auto cursor-pointer"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
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
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Mobile Tabs */}
        <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer ${
                activeTab === item.id
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {actionError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-rose-600 hover:underline cursor-pointer">
              Fermer
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">Espace Commission scientifique</h1>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Convocation aux entretiens, notation sur 20 et établissement du PV de sélection
                </p>
              </div>
              {onOpenCompare && commissionApps.length >= 2 && (
                <button
                  type="button"
                  onClick={() => onOpenCompare(commissionApps.slice(0, 3))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Scale className="w-4 h-4 text-[#1E3A8A]" />
                  Comparer les dossiers
                </button>
              )}
            </div>

            {/* 3-step guide */}
            <div className="p-4 bg-teal-50/70 border border-teal-100 rounded-xl text-[13px]">
              <p className="font-bold text-teal-800 mb-1">Guide rapide (3 étapes) :</p>
              <ol className="list-decimal list-inside text-slate-700 space-y-0.5">
                <li>Programmez les entretiens (date, heure, lieu) dans « Dossiers à évaluer ».</li>
                <li>Saisissez les notes (/20) ou signalez les absences dans « Entretiens ».</li>
                <li>Établissez le PV de sélection pour transmission au Directeur de structure.</li>
              </ol>
            </div>

            {/* Integer Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('dossiers')}
                className="p-4 bg-white rounded-xl border border-slate-200/80 text-left hover:border-[#1E3A8A] transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-slate-500">À convoquer</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 font-mono-folder">{toConvokeApps.length}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Avis favorables reçus</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('interviews')}
                className="p-4 bg-white rounded-xl border border-slate-200/80 text-left hover:border-amber-500 transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-amber-800">Entretiens programmés</div>
                <div className="text-2xl font-bold text-amber-900 mt-1 font-mono-folder">{interviewApps.length}</div>
                <div className="text-[11px] text-amber-700 mt-0.5">À noter ou marquer absent</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pv')}
                className="p-4 bg-white rounded-xl border border-slate-200/80 text-left hover:border-emerald-600 transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-emerald-800">Évalués / PV prêt</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1 font-mono-folder">{pvEligibleApps.length}</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Prêts pour PV de sélection</div>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'dossiers' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Dossiers à évaluer ({commissionApps.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Candidatures ayant reçu un avis favorable. Un encadrant ne peut jamais convoquer ni évaluer son propre candidat.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {commissionApps.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Aucun dossier transmis à la commission pour le moment.
                </div>
              ) : (
                commissionApps.map((app) => {
                  const conflict = isConflictOfInterest(app, currentUser);
                  return (
                    <div key={app.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono-folder text-xs font-bold text-[#1E3A8A]">{app.folderNumber}</span>
                          <span className="font-bold text-slate-900 text-sm">{formatCandidateName(app.candidate)}</span>
                          <span className="font-mono-folder text-xs text-slate-500">CIN : {maskCin(app.candidate?.cin)}</span>
                          <span className="font-mono-folder text-xs text-slate-500">Tél : {maskPhone(app.candidate?.phone)}</span>
                        </div>
                        <div className="text-xs text-slate-700">
                          Sujet : <strong>{app.subjectTitle}</strong> · Directeur : {app.directorName}
                        </div>
                        <div className="text-xs text-slate-500">
                          Master : {formatData(app.candidate?.masterDegree)} ({formatData(app.candidate?.masterGrade)})
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {conflict ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                            <Lock className="w-3.5 h-3.5" />
                            Votre propre candidat (bloqué)
                          </span>
                        ) : app.convocationDetails ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#1E3A8A] text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            Convoqué le {app.convocationDetails.date} à {app.convocationDetails.time}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openConvokeModal(app)}
                            className="px-3.5 py-1.5 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Convoquer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenViewer(app)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Dossier
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'interviews' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Entretiens programmés ({interviewApps.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saisissez la note d'entretien (/20) ou signalez une absence.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {interviewApps.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Aucun entretien en attente d'évaluation.
                </div>
              ) : (
                interviewApps.map((app) => {
                  const conflict = isConflictOfInterest(app, currentUser);
                  return (
                    <div key={app.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono-folder text-xs font-bold text-[#1E3A8A]">{app.folderNumber}</span>
                          <span className="font-bold text-slate-900 text-sm">{formatCandidateName(app.candidate)}</span>
                          <span className="font-mono-folder text-xs text-slate-500">CIN : {maskCin(app.candidate?.cin)}</span>
                          {app.wasAbsent && (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-semibold">
                              Absent
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-700">{app.subjectTitle}</div>
                        {app.convocationDetails && (
                          <div className="text-xs text-slate-500">
                            RDV : {app.convocationDetails.date} à {app.convocationDetails.time} — {app.convocationDetails.location}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {conflict ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                            <Lock className="w-3.5 h-3.5" />
                            Conflit d'intérêt — Évaluation bloquée
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openEvalModal(app)}
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Noter (/20)
                            </button>
                            {!app.wasAbsent && (
                              <button
                                type="button"
                                onClick={() => handleMarkAbsent(app)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Marquer absent
                              </button>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenViewer(app)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Dossier
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'pv' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">PV de sélection par sujet ({pvEligibleApps.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Générez et signez le procès-verbal de sélection après notation pour transmission au Directeur de structure.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {pvEligibleApps.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Aucun candidat noté en attente de PV.
                </div>
              ) : (
                pvEligibleApps
                  .slice()
                  .sort((a, b) => (b.interviewEvaluation?.totalScore || 0) - (a.interviewEvaluation?.totalScore || 0))
                  .map((app) => {
                    const conflict = isConflictOfInterest(app, currentUser);
                    const total = app.interviewEvaluation?.totalScore ?? app.teacherScore ?? 0;
                    return (
                      <div key={app.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono-folder text-xs font-bold text-[#1E3A8A]">{app.folderNumber}</span>
                            <span className="font-bold text-slate-900 text-sm">{formatCandidateName(app.candidate)}</span>
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1E3A8A] border border-blue-200 font-mono-folder text-xs font-bold">
                              Note : {total} / 20
                            </span>
                          </div>
                          <div className="text-xs text-slate-700">{app.subjectTitle}</div>
                          {app.interviewEvaluation && (
                            <div className="text-[11px] text-slate-500">
                              Dossier : {app.interviewEvaluation.dossierScore}/6 · Projet : {app.interviewEvaluation.projectScore}/7 · Oral : {app.interviewEvaluation.oralScore}/7
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {app.selectionPvSigned ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              PV signé ({app.finalResultDecision === 'admitted' ? 'Admis' : app.finalResultDecision === 'waiting_list' ? 'Liste d\'attente' : 'Non retenu'})
                            </span>
                          ) : conflict ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                              <Lock className="w-3.5 h-3.5" />
                              Conflit d'intérêt
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleGeneratePv(app, 'admitted')}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                PV : Admis
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGeneratePv(app, 'waiting_list')}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                PV : Liste d'attente
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGeneratePv(app, 'rejected')}
                                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                PV : Non retenu
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Convocation Form */}
      {convokeModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Calendar className="w-5 h-5 text-[#1E3A8A]" />
                <span>Convoquer à l'entretien</span>
              </div>
              <button
                type="button"
                onClick={() => setConvokeModalApp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmConvoke} className="space-y-3 text-sm">
              <div className="text-xs text-slate-600">
                Candidat : <strong className="text-slate-900">{formatCandidateName(convokeModalApp.candidate)}</strong> ({convokeModalApp.folderNumber})
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={convDate}
                    onChange={(e) => setConvDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Heure *</label>
                  <input
                    type="time"
                    value={convTime}
                    onChange={(e) => setConvTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lieu / Salle *</label>
                <input
                  type="text"
                  value={convLocation}
                  onChange={(e) => setConvLocation(e.target.value)}
                  placeholder="Ex: Salle des thèses, FST Fès"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Instructions complémentaires</label>
                <textarea
                  rows={2}
                  value={convNote}
                  onChange={(e) => setConvNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {convError && <p className="text-xs text-rose-600 font-semibold">{convError}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConvokeModalApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#172554] text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Envoyer la convocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Interview Grading (/20) */}
      {evalModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <AlertTriangle className="w-5 h-5 text-emerald-700" />
                <span>Grille de notation d'entretien (/20)</span>
              </div>
              <button
                type="button"
                onClick={() => setEvalModalApp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmEvaluation} className="space-y-3 text-sm">
              <div className="text-xs text-slate-600">
                Candidat : <strong className="text-slate-900">{formatCandidateName(evalModalApp.candidate)}</strong>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dossier (/6)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="6"
                    value={dossierScore}
                    onChange={(e) => setDossierScore(Math.min(6, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm font-mono-folder font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Projet (/7)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="7"
                    value={projectScore}
                    onChange={(e) => setProjectScore(Math.min(7, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm font-mono-folder font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Oral (/7)</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="7"
                    value={oralScore}
                    onChange={(e) => setOralScore(Math.min(7, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm font-mono-folder font-bold"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1E3A8A]">Note globale calculée :</span>
                <span className="font-mono-folder text-base font-bold text-[#1E3A8A]">{totalPreviewScore} / 20</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Appréciation du jury *</label>
                <textarea
                  rows={3}
                  value={evalNotes}
                  onChange={(e) => {
                    setEvalNotes(e.target.value);
                    setEvalError('');
                  }}
                  placeholder="Observations sur la maîtrise scientifique, la clarté de l'exposé..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {evalError && <p className="text-xs text-rose-600 font-semibold">{evalError}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEvalModalApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Enregistrer la note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
