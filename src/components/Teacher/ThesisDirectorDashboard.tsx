import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Application, ThesisSubject, UserAccount, SubjectStatus } from '../../types';
import { Language } from '../../i18n/translations';
import { renderTeacherOpinion, proposeSubject } from '../../utils/workflowEngine';
import { formatData, formatCandidateName, maskCin, maskPhone } from '../../utils/formatData';

interface ThesisDirectorDashboardProps {
  applications: Application[];
  subjects: ThesisSubject[];
  currentUser: UserAccount;
  onUpdateApplications: (apps: Application[], feedback?: string) => void;
  onUpdateSubjects: (subs: ThesisSubject[], feedback?: string) => void;
  onOpenViewer: (app: Application) => void;
  lang: Language;
}

const SUBJECT_STATUS_LABELS: Record<SubjectStatus, { label: string; badge: string }> = {
  draft: { label: 'Brouillon', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  proposed: { label: 'Proposé', badge: 'bg-blue-50 text-[#1E3A8A] border-blue-200' },
  structure_validated: { label: 'Validé structure', badge: 'bg-purple-50 text-purple-800 border-purple-200' },
  ced_validated: { label: 'Validé CED', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  published: { label: 'Publié', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rejected: { label: 'Refusé', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
};

export const ThesisDirectorDashboard: React.FC<ThesisDirectorDashboardProps> = ({
  applications,
  subjects,
  currentUser,
  onUpdateApplications,
  onUpdateSubjects,
  onOpenViewer,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'subjects' | 'candidates'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Unfavorable opinion modal (mandatory motif)
  const [unfavorableApp, setUnfavorableApp] = useState<Application | null>(null);
  const [unfavorableMotif, setUnfavorableMotif] = useState('');
  const [motifError, setMotifError] = useState('');

  // Create new subject modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDiscipline, setNewDiscipline] = useState('Intelligence Artificielle & Data');
  const [newLab, setNewLab] = useState('LISTI - FST Fès');
  const [newSummary, setNewSummary] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [newPrerequisites, setNewPrerequisites] = useState('Master en Informatique ou équivalent');
  const [newDeadline, setNewDeadline] = useState('2026-12-15');
  const [createError, setCreateError] = useState('');

  // Inline alert/feedback
  const [actionError, setActionError] = useState<string | null>(null);

  const mySubjects = subjects.filter(
    (s) =>
      s.director.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
      s.proposedBy === currentUser.id
  );
  const myApps = applications.filter(
    (a) =>
      a.directorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase() &&
      a.status !== 'draft'
  );

  const pendingOpinionApps = myApps.filter(
    (a) =>
      a.status === 'receivable' &&
      (!a.thesisDirectorOpinion || a.thesisDirectorOpinion === 'pending')
  );
  const reviewedApps = myApps.filter(
    (a) => a.thesisDirectorOpinion === 'favorable' || a.thesisDirectorOpinion === 'unfavorable'
  );

  const handleFavorable = (app: Application) => {
    setActionError(null);
    const res = renderTeacherOpinion(
      applications,
      app.id,
      'favorable',
      'Avis favorable pour poursuite devant la commission.',
      currentUser
    );
    if (res.success && res.data) {
      onUpdateApplications(res.data, res.message);
    } else {
      setActionError(res.message);
    }
  };

  const handleOpenUnfavorable = (app: Application) => {
    setUnfavorableApp(app);
    setUnfavorableMotif('');
    setMotifError('');
  };

  const handleConfirmUnfavorable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unfavorableApp) return;
    if (!unfavorableMotif.trim()) {
      setMotifError('Veuillez saisir un motif obligatoire pour un avis défavorable.');
      return;
    }
    const res = renderTeacherOpinion(
      applications,
      unfavorableApp.id,
      'unfavorable',
      unfavorableMotif.trim(),
      currentUser
    );
    if (res.success && res.data) {
      onUpdateApplications(res.data, res.message);
      setUnfavorableApp(null);
    } else {
      setMotifError(res.message);
    }
  };

  const handleProposeExistingSubject = (subjectId: string) => {
    setActionError(null);
    const res = proposeSubject(subjects, subjectId, currentUser);
    if (res.success && res.data) {
      onUpdateSubjects(res.data, res.message);
    } else {
      setActionError(res.message);
    }
  };

  const handleCreateSubject = (e: React.FormEvent, submitDirectly: boolean) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) {
      setCreateError('Le titre et la description du sujet sont obligatoires.');
      return;
    }

    const newSub: ThesisSubject = {
      id: `TH-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: newTitle.trim(),
      titleAr: newTitle.trim(),
      laboratory: newLab,
      laboratoryAr: newLab,
      cedoc: 'CED Sciences et Techniques',
      director: currentUser.name,
      directorEmail: currentUser.email,
      discipline: newDiscipline,
      keywords: newKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      summary: newSummary.trim(),
      summaryAr: newSummary.trim(),
      prerequisites: newPrerequisites.trim(),
      availableSlots: 1,
      applicantsCount: 0,
      deadline: newDeadline || '2026-12-15',
      status: submitDirectly ? 'proposed' : 'draft',
      proposedBy: currentUser.id,
    };

    onUpdateSubjects(
      [newSub, ...subjects],
      submitDirectly
        ? 'Sujet proposé et transmis au Directeur de structure.'
        : 'Sujet enregistré en brouillon.'
    );
    setNewTitle('');
    setNewSummary('');
    setNewKeywords('');
    setCreateError('');
    setIsCreateModalOpen(false);
  };

  const sidebarItems = [
    { id: 'dashboard' as const, label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'subjects' as const, label: 'Mes sujets', icon: BookOpen },
    { id: 'candidates' as const, label: 'Candidats à mes sujets', icon: Users },
  ];

  const renderOpinionCell = (app: Application) => {
    if (app.thesisDirectorOpinion === 'favorable') {
      return (
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Avis favorable
          </span>
        </div>
      );
    }
    if (app.thesisDirectorOpinion === 'unfavorable') {
      return (
        <div className="flex flex-col items-end gap-1 max-w-xs text-right">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Avis défavorable
          </span>
          {app.thesisDirectorMotif && (
            <span className="text-[11px] text-rose-700 leading-tight">
              Motif : {app.thesisDirectorMotif}
            </span>
          )}
        </div>
      );
    }
    if (app.status !== 'receivable') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
          En attente de recevabilité
        </span>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleFavorable(app)}
          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          Avis favorable
        </button>
        <button
          type="button"
          onClick={() => handleOpenUnfavorable(app)}
          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          Avis défavorable
        </button>
      </div>
    );
  };

  return (
    <div className="flex gap-6 items-start pb-20">
      {/* Lateral Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-white rounded-xl border border-slate-200/80 shadow-xs shrink-0 transition-all duration-200 sticky top-20 overflow-hidden ${
          isSidebarCollapsed ? 'w-16 p-2' : 'w-64 p-3'
        }`}
      >
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 px-2">
          {!isSidebarCollapsed && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Espace Directeur de thèse
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 ml-auto cursor-pointer"
            title={isSidebarCollapsed ? 'Agrandir le menu' : 'Replier le menu'}
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
        {/* Mobile Tab Switcher */}
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
                <h1 className="text-xl font-bold text-slate-900">Espace Directeur de thèse</h1>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Proposition de sujets doctoraux et émission d'avis motivé sur vos candidatures
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Proposer un sujet
              </button>
            </div>

            {/* 3-Step Quick Guide */}
            <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl text-[13px]">
              <p className="font-bold text-[#1E3A8A] mb-1">Guide rapide (3 étapes) :</p>
              <ol className="list-decimal list-inside text-slate-700 space-y-0.5">
                <li>Proposez vos sujets de thèse dans « Mes sujets » pour validation par la structure et le CED.</li>
                <li>Consultez les dossiers recevables dans « Candidats à mes sujets ».</li>
                <li>Émettez un avis favorable ou défavorable motivé (sans convocation ni notation).</li>
              </ol>
            </div>

            {/* Simple Integer Count Cards (No percentages) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('subjects')}
                className="p-4 bg-white rounded-xl border border-slate-200/80 text-left hover:border-[#1E3A8A] transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-slate-500">Mes sujets de thèse</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 font-mono-folder">{mySubjects.length}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Proposés / publiés</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('candidates')}
                className="p-4 bg-white rounded-xl border border-slate-200/80 text-left hover:border-amber-500 transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-amber-800">Avis en attente</div>
                <div className="text-2xl font-bold text-amber-900 mt-1 font-mono-folder">{pendingOpinionApps.length}</div>
                <div className="text-[11px] text-amber-700 mt-0.5">Dossiers recevables à examiner</div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('candidates')}
                className="p-4 bg-white rounded-xl border border-slate-200/80 text-left hover:border-emerald-600 transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-emerald-800">Avis rendus</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1 font-mono-folder">{reviewedApps.length}</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Favorables ou défavorables</div>
              </button>
            </div>

            {/* Recent candidates needing opinion */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-slate-900">
                  Candidatures récentes sur mes sujets ({myApps.length})
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('candidates')}
                  className="text-xs font-semibold text-[#1E3A8A] hover:underline cursor-pointer"
                >
                  Voir tout
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {myApps.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    Aucune candidature reçue sur vos sujets pour le moment.
                  </div>
                ) : (
                  myApps.slice(0, 5).map((app) => (
                    <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono-folder text-xs font-bold text-slate-500">{app.folderNumber}</span>
                          <span className="font-bold text-slate-900 text-sm">{formatCandidateName(app.candidate)}</span>
                          <span className="font-mono-folder text-xs text-slate-500">CIN : {maskCin(app.candidate?.cin)}</span>
                        </div>
                        <div className="text-xs text-slate-600">{app.subjectTitle}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {renderOpinionCell(app)}
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
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Mes sujets de thèse ({mySubjects.length})</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Statut du circuit : Brouillon → Proposé → Validé structure → Validé CED → Publié
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Proposer un sujet
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {mySubjects.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Vous n'avez encore créé aucun sujet.
                </div>
              ) : (
                mySubjects.map((sub) => {
                  const st = SUBJECT_STATUS_LABELS[sub.status] || SUBJECT_STATUS_LABELS.draft;
                  return (
                    <div key={sub.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono-folder text-xs font-bold text-slate-500">{sub.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${st.badge}`}>
                            {st.label}
                          </span>
                          <span className="text-[11px] text-slate-500">{sub.discipline}</span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm">{sub.title}</div>
                        <div className="text-xs text-slate-500">
                          {sub.laboratory} · Clôture : {sub.deadline}
                        </div>
                        {sub.rejectionReason && (
                          <div className="text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200 inline-block mt-1">
                            Motif de retour : {sub.rejectionReason}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {sub.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleProposeExistingSubject(sub.id)}
                            className="px-3.5 py-2 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Soumettre à la validation
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                Candidats à mes sujets ({myApps.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Seuls les candidats postulant à vos sujets sont visibles. Les coordonnées sensibles sont partiellement masquées.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {myApps.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Aucun candidat enregistré sur vos sujets.
                </div>
              ) : (
                myApps.map((app) => (
                  <div key={app.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono-folder text-xs font-bold text-[#1E3A8A]">{app.folderNumber}</span>
                        <span className="font-bold text-slate-900 text-sm">{formatCandidateName(app.candidate)}</span>
                        <span className="font-mono-folder text-xs text-slate-500">CIN : {maskCin(app.candidate?.cin)}</span>
                        <span className="font-mono-folder text-xs text-slate-500">Tél : {maskPhone(app.candidate?.phone)}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-700">Sujet : {app.subjectTitle}</div>
                      <div className="text-xs text-slate-500">
                        Diplôme : {formatData(app.candidate?.masterDegree)} · Moyenne : {formatData(app.candidate?.masterGrade)} ({formatData(app.candidate?.masterMention)})
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {renderOpinionCell(app)}
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
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Mandatory Motif for Unfavorable Opinion */}
      {unfavorableApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Avis défavorable motivé</span>
              </div>
              <button
                type="button"
                onClick={() => setUnfavorableApp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmUnfavorable} className="space-y-4">
              <div className="text-xs text-slate-600">
                Candidat : <strong className="text-slate-900">{formatCandidateName(unfavorableApp.candidate)}</strong> ({unfavorableApp.folderNumber})
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motif obligatoire *
                </label>
                <textarea
                  rows={3}
                  value={unfavorableMotif}
                  onChange={(e) => {
                    setUnfavorableMotif(e.target.value);
                    setMotifError('');
                  }}
                  placeholder="Précisez la raison scientifique ou académique de l'avis défavorable..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-600 focus:outline-none"
                />
                {motifError && <p className="text-xs text-rose-600 font-semibold mt-1">{motifError}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUnfavorableApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Confirmer l'avis défavorable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Propose New Subject */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Proposer un nouveau sujet de thèse</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Titre du sujet *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Apprentissage fédéré pour la télémédecine..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discipline</label>
                  <select
                    value={newDiscipline}
                    onChange={(e) => setNewDiscipline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="Intelligence Artificielle & Data">Intelligence Artificielle & Data</option>
                    <option value="Systèmes & Réseaux">Systèmes & Réseaux</option>
                    <option value="Énergies Renouvelables">Énergies Renouvelables</option>
                    <option value="Biotechnologie & Santé">Biotechnologie & Santé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Laboratoire</label>
                  <input
                    type="text"
                    value={newLab}
                    onChange={(e) => setNewLab(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description scientifique *</label>
                <textarea
                  rows={3}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Objectifs scientifiques, méthodologie et résultats attendus..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mots-clés (séparés par virgule)</label>
                  <input
                    type="text"
                    value={newKeywords}
                    onChange={(e) => setNewKeywords(e.target.value)}
                    placeholder="IA, Sécurité, Santé"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date limite du sujet</label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prérequis</label>
                <input
                  type="text"
                  value={newPrerequisites}
                  onChange={(e) => setNewPrerequisites(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              {createError && <p className="text-xs text-rose-600 font-semibold">{createError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={(e) => handleCreateSubject(e, false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Enregistrer en brouillon
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateSubject(e, true)}
                  className="px-4 py-2 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Proposer directement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
