import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ZoomIn,
  ZoomOut,
  X,
  User,
} from 'lucide-react';
import { Application, UserAccount } from '../../types';
import { Language } from '../../i18n/translations';
import { formatData, formatCandidateName, maskCin, maskPhone } from '../../utils/formatData';

interface SmartCandidateDossierViewerProps {
  application: Application;
  onValidate: (appId: string) => void;
  onReject: (appId: string, reason: string, feedback: string) => void;
  onClose: () => void;
  lang: Language;
  currentUser?: UserAccount;
}

export const SmartCandidateDossierViewer: React.FC<SmartCandidateDossierViewerProps> = ({
  application,
  onValidate,
  onReject,
  onClose,
  currentUser,
}) => {
  const [activeDocTab, setActiveDocTab] = useState<'proposal' | 'cv' | 'transcripts'>('proposal');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rejectionModalOpen, setRejectionModalOpen] = useState<boolean>(false);
  const [rejectMotif, setRejectMotif] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const ai = application.aiAnalysis;
  const cand = application.candidate;

  const candName = formatCandidateName(cand);
  const maskedCin = maskCin(cand?.cin);
  const maskedPhone = maskPhone(cand?.phone);

  const statusConfig = {
    green: {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
      label: 'Dossier conforme',
    },
    orange: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: AlertTriangle,
      label: 'À vérifier',
    },
    red: {
      badge: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: XCircle,
      label: 'Incomplet / Refusé',
    },
  }[ai.statusColor] || {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: CheckCircle2,
    label: 'En attente',
  };

  const StatusIcon = statusConfig.icon;
  const isThesisDirector = currentUser?.roleId === 'thesis_director';
  const opinionAlreadyGiven =
    application.thesisDirectorOpinion === 'favorable' ||
    application.thesisDirectorOpinion === 'unfavorable';

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectMotif.trim()) {
      setRejectError('Le motif est obligatoire en cas d\'avis défavorable.');
      return;
    }
    onReject(application.id, rejectMotif.trim(), rejectMotif.trim());
    setRejectionModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-xl border border-slate-200 max-w-6xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-bold text-slate-900">{candName}</h2>
                <span className="font-mono-folder text-[13px] text-slate-500 font-bold">
                  {application.folderNumber}
                </span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 ${statusConfig.badge}`}>
                  <StatusIcon className="w-3 h-3" />
                  <span>{statusConfig.label}</span>
                </span>
              </div>
              <div className="text-[12px] text-slate-500 mt-0.5 truncate max-w-xl">
                Sujet : {application.subjectTitle} · CIN : {maskedCin} · Tél : {maskedPhone}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Split Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column */}
          <div className="lg:col-span-5 p-5 border-r border-slate-200 overflow-y-auto space-y-4 bg-white">
            <div className="p-4 rounded-xl border border-slate-200/90 space-y-2 text-[13px]">
              <div className="text-[14px] font-bold text-slate-900">Cursus universitaire</div>
              <div>Diplôme : <strong className="text-slate-900">{formatData(cand?.masterDegree)}</strong></div>
              <div>Établissement : <span className="text-slate-800">{formatData(cand?.masterUniversity)}</span></div>
              <div>
                Moyenne : <strong className="text-[#1E3A8A] font-mono-folder font-bold">{formatData(cand?.masterGrade)}</strong> ({formatData(cand?.masterMention)})
              </div>
              <div>Mémoire : <span className="text-slate-700">{formatData(cand?.masterThesisTitle)}</span></div>
              <div>Publications : <strong className="font-mono-folder text-slate-800">{cand?.publicationsCount ?? 0}</strong></div>
              <div>Anglais : <span className="font-semibold text-slate-800">{formatData(cand?.englishLevel)}</span></div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/90 space-y-2 text-[13px]">
              <div className="text-[14px] font-bold text-slate-900">Synthèse académique</div>
              <p className="text-slate-600 leading-relaxed text-[13px]">{ai.summary}</p>

              {ai.strengths.length > 0 && (
                <div className="pt-2">
                  <span className="font-semibold text-slate-900 block mb-1">Points forts :</span>
                  <ul className="list-disc list-inside space-y-1 text-emerald-800 text-[12px]">
                    {ai.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {ai.pointsToVerify.length > 0 && (
                <div className="pt-2">
                  <span className="font-semibold text-slate-900 block mb-1">Éléments à vérifier :</span>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 text-[12px]">
                    {ai.pointsToVerify.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Thesis director opinion controls (only when pending) */}
            {isThesisDirector && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="text-[13px] font-bold text-slate-900">Avis du directeur de thèse</div>
                {opinionAlreadyGiven ? (
                  <div
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                      application.thesisDirectorOpinion === 'favorable'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {application.thesisDirectorOpinion === 'favorable' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Avis favorable enregistré</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Avis défavorable : {application.thesisDirectorMotif}</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onValidate(application.id)}
                      className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Avis favorable
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectMotif('');
                        setRejectError(null);
                        setRejectionModalOpen(true);
                      }}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Avis défavorable
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Document Viewer */}
          <div className="lg:col-span-7 flex flex-col bg-slate-50/50 overflow-hidden">
            <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between text-[13px]">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveDocTab('proposal')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeDocTab === 'proposal'
                      ? 'bg-[#1E3A8A] text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Projet de recherche
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocTab('cv')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeDocTab === 'cv'
                      ? 'bg-[#1E3A8A] text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  CV
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocTab('transcripts')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    activeDocTab === 'transcripts'
                      ? 'bg-[#1E3A8A] text-white font-semibold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Relevés de notes
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-slate-500">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(z - 10, 80))}
                  className="p-1.5 rounded hover:bg-slate-100 cursor-pointer"
                  title="Zoom arrière"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono-folder text-[12px]">{zoomLevel}</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(z + 10, 150))}
                  className="p-1.5 rounded hover:bg-slate-100 cursor-pointer"
                  title="Zoom avant"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto flex justify-center">
              <div
                className="w-full max-w-2xl bg-white rounded-lg shadow-sm border border-slate-200 p-8 space-y-4 text-slate-800"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              >
                <div className="border-b border-slate-200 pb-4 text-center">
                  <div className="text-[12px] uppercase font-bold text-slate-400">
                    Université Sidi Mohamed Ben Abdellah · Fès
                  </div>
                  <h3 className="text-[18px] font-bold text-slate-900 mt-1">
                    {activeDocTab === 'proposal' && 'Avant-Projet de Recherche Doctoral'}
                    {activeDocTab === 'cv' && `Curriculum Vitae — ${candName}`}
                    {activeDocTab === 'transcripts' && 'Relevé Officiel des Notes de Master (S1 - S4)'}
                  </h3>
                  <div className="text-[12px] text-slate-500 mt-0.5">
                    Candidat : {candName} · CIN : {maskedCin}
                  </div>
                </div>

                {activeDocTab === 'proposal' && (
                  <div className="space-y-3 text-[13px] leading-relaxed">
                    <h4 className="font-bold text-slate-900">1. Contexte & Problématique Scientifique</h4>
                    <p className="text-slate-600">
                      Ce projet de recherche vise à explorer les méthodologies d'intelligence artificielle appliquées aux problématiques complexes du domaine choisi.
                    </p>
                    <h4 className="font-bold text-slate-900">2. Méthodologie Proposée</h4>
                    <p className="text-slate-600">
                      L'approche combine modélisation formelle, validation expérimentale et publications indexées dans des revues scientifiques reconnues.
                    </p>
                    <h4 className="font-bold text-slate-900">3. Calendrier Prévisionnel</h4>
                    <p className="text-slate-600">
                      Année 1 : État de l'art et formalisation théorique. Année 2 : Expérimentation et publication. Année 3 : Rédaction et soutenance de la thèse.
                    </p>
                  </div>
                )}

                {activeDocTab === 'cv' && (
                  <div className="space-y-3 text-[13px]">
                    <div>
                      <h4 className="font-bold text-slate-900">Formation</h4>
                      <p className="text-slate-600 mt-0.5">
                        2023 - 2025 : {formatData(cand?.masterDegree)}, {formatData(cand?.masterUniversity)}. Mention {formatData(cand?.masterMention)}.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">Compétences Techniques</h4>
                      <p className="text-slate-600 mt-0.5">
                        Python, PyTorch, TensorFlow, Optimisation Mathématique, Git, Linux.
                      </p>
                    </div>
                  </div>
                )}

                {activeDocTab === 'transcripts' && (
                  <div className="space-y-2 text-[13px]">
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div className="p-2 bg-slate-50 rounded">Semestre 1 : <strong>15.80 / 20</strong></div>
                      <div className="p-2 bg-slate-50 rounded">Semestre 2 : <strong>16.20 / 20</strong></div>
                      <div className="p-2 bg-slate-50 rounded">Semestre 3 : <strong>16.10 / 20</strong></div>
                      <div className="p-2 bg-slate-50 rounded">Semestre 4 (PFE) : <strong>16.90 / 20</strong></div>
                    </div>
                    <div className="pt-2 text-[13px] font-bold text-slate-900">
                      Moyenne générale certifiée : {formatData(cand?.masterGrade)} / 20
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Motif Modal */}
      {rejectionModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-3">
            <h3 className="text-[15px] font-bold text-slate-900">Motif de l'avis défavorable *</h3>
            <form onSubmit={handleConfirmReject} className="space-y-3">
              <textarea
                rows={3}
                value={rejectMotif}
                onChange={(e) => {
                  setRejectMotif(e.target.value);
                  if (rejectError) setRejectError(null);
                }}
                placeholder="Saisissez obligatoirement le motif..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
              {rejectError && <p className="text-xs text-rose-600">{rejectError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectionModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!rejectMotif.trim()}
                  className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
