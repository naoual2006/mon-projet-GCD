import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check,
  X,
  ShieldX,
} from 'lucide-react';
import { Application } from '../../types';
import { Language } from '../../i18n/translations';
import { formatCandidateName, formatData, maskCin, maskPhone } from '../../utils/formatData';

interface ChecklistTricolorProps {
  applications: Application[];
  onTriggerRelance: (appId: string, itemKey: string, motif?: string) => void;
  onMarkItemValid?: (appId: string, itemKey: string) => void;
  onMarkReceivable?: (appId: string) => void;
  onRejectApplication?: (appId: string, motif: string) => void;
  lang: Language;
}

export const ChecklistTricolor: React.FC<ChecklistTricolorProps> = ({
  applications,
  onTriggerRelance,
  onMarkItemValid,
  onMarkReceivable,
  onRejectApplication,
}) => {
  const [selectedAppId, setSelectedAppId] = useState<string>(applications[0]?.id || '');
  const [relancedItems, setRelancedItems] = useState<{ [key: string]: boolean }>({});

  // Modal: Demander une correction (motif obligatoire)
  const [correctionItemKey, setCorrectionItemKey] = useState<string | null>(null);
  const [correctionMotif, setCorrectionMotif] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Modal: Refuser le dossier (motif obligatoire)
  const [isRejectDossierOpen, setIsRejectDossierOpen] = useState(false);
  const [rejectMotif, setRejectMotif] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const selectedApp = applications.find((a) => a.id === selectedAppId) || applications[0];

  const handleConfirmCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !correctionItemKey) return;
    if (!correctionMotif.trim()) {
      setCorrectionError('Le motif de la demande de correction est obligatoire.');
      return;
    }
    onTriggerRelance(selectedApp.id, correctionItemKey, correctionMotif.trim());
    setRelancedItems((prev) => ({ ...prev, [`${selectedApp.id}-${correctionItemKey}`]: true }));
    setTimeout(() => {
      setRelancedItems((prev) => ({ ...prev, [`${selectedApp.id}-${correctionItemKey}`]: false }));
    }, 4000);
    setCorrectionItemKey(null);
    setCorrectionMotif('');
    setCorrectionError(null);
  };

  const handleConfirmRejectDossier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !onRejectApplication) return;
    if (!rejectMotif.trim()) {
      setRejectError('Le motif de refus est obligatoire.');
      return;
    }
    onRejectApplication(selectedApp.id, rejectMotif.trim());
    setIsRejectDossierOpen(false);
    setRejectMotif('');
    setRejectError(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-5 shadow-xs">
      {/* Header & Folder Dropdown Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-[18px] font-bold text-slate-900">
            Vérification des dossiers et pièces
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Contrôle de conformité administrative, demande de correction ou refus motivé
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[13px] font-semibold text-slate-600 shrink-0">Dossier :</label>
          <select
            value={selectedApp?.id || ''}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="w-full sm:w-auto min-w-[280px] max-w-md px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-semibold text-slate-900 focus:ring-2 focus:ring-[#1E3A8A] focus:bg-white cursor-pointer"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {formatCandidateName(app.candidate)} — {app.folderNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedApp && (
        <div className="space-y-4">
          {/* Candidate Info Strip with masked CIN & phone */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <div>
              <span className="text-slate-500">Candidat :</span>{' '}
              <strong className="text-slate-900">{formatCandidateName(selectedApp.candidate)}</strong>
              <span className="font-mono-folder text-slate-600 ml-2">({maskCin(selectedApp.candidate?.cin)})</span>
            </div>
            <div>
              <span className="text-slate-500">Email :</span>{' '}
              <span className="text-slate-800 font-medium">{formatData(selectedApp.candidate?.email)}</span>
            </div>
            <div>
              <span className="text-slate-500">Téléphone :</span>{' '}
              <span className="font-mono-folder text-slate-800">{maskPhone(selectedApp.candidate?.phone)}</span>
            </div>
          </div>

          {/* Dossier-level status & actions */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] text-slate-700">
              Statut actuel :{' '}
              <strong className="text-[#1E3A8A]">
                {selectedApp.finalResultDecision === 'rejected'
                  ? 'Refusé'
                  : selectedApp.status === 'incomplete'
                  ? 'Incomplet (correction demandée)'
                  : selectedApp.status === 'submitted'
                  ? 'Soumis (en attente de vérification)'
                  : selectedApp.status === 'receivable'
                  ? 'Recevable'
                  : selectedApp.status}
              </strong>
              {selectedApp.rejectionReason && (
                <span className="block text-[12px] text-rose-700 mt-0.5">
                  Motif : {selectedApp.rejectionReason}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onMarkReceivable && selectedApp.status === 'submitted' && selectedApp.finalResultDecision !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => onMarkReceivable(selectedApp.id)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Déclarer recevable</span>
                </button>
              )}
              {onRejectApplication && selectedApp.finalResultDecision !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => {
                    setRejectMotif('');
                    setRejectError(null);
                    setIsRejectDossierOpen(true);
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldX className="w-3.5 h-3.5" />
                  <span>Refuser le dossier</span>
                </button>
              )}
            </div>
          </div>

          {/* Documents Checklist Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Document requis</th>
                  <th className="py-3 px-4 w-36">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedApp.administrativeChecklist.map((item) => {
                  const statusConfig = {
                    valid: {
                      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      icon: CheckCircle2,
                      label: 'Conforme',
                    },
                    pending: {
                      badge: 'bg-amber-50 text-amber-800 border-amber-200',
                      icon: AlertTriangle,
                      label: 'À vérifier',
                    },
                    rejected: {
                      badge: 'bg-rose-50 text-rose-800 border-rose-200',
                      icon: XCircle,
                      label: 'Correction demandée',
                    },
                  }[item.status];

                  const Icon = statusConfig.icon;
                  const isRecentlyRelanced = relancedItems[`${selectedApp.id}-${item.key}`];
                  const harmonizedLabel = item.label.replace(/Diplôme de Master\s*\/\s*Ingénieur/gi, 'Diplôme de Master');

                  return (
                    <tr key={item.key} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{harmonizedLabel}</div>
                        {(item.note || item.rejectionReason) && (
                          <div className="text-[12px] text-amber-800 mt-0.5">
                            Motif : {item.note || item.rejectionReason}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold border ${statusConfig.badge}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span>{statusConfig.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status !== 'valid' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onMarkItemValid) {
                                  onMarkItemValid(selectedApp.id, item.key);
                                }
                              }}
                              className="px-2.5 py-1.5 bg-emerald-700 text-white rounded text-xs font-semibold hover:bg-emerald-800 transition-colors cursor-pointer"
                            >
                              ✓ Conforme
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setCorrectionItemKey(item.key);
                              setCorrectionMotif('');
                              setCorrectionError(null);
                            }}
                            disabled={isRecentlyRelanced}
                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 ${
                              isRecentlyRelanced
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-[#1E3A8A] text-white hover:bg-[#172554]'
                            }`}
                          >
                            {isRecentlyRelanced ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Demande envoyée</span>
                              </>
                            ) : (
                              <span>Demander une correction</span>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Demander une correction (motif obligatoire) */}
      {correctionItemKey && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-[15px] font-bold text-slate-900">Demander une correction</h3>
              <button type="button" onClick={() => setCorrectionItemKey(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmCorrection} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Précisez la correction attendue *
                </label>
                <textarea
                  rows={3}
                  value={correctionMotif}
                  onChange={(e) => {
                    setCorrectionMotif(e.target.value);
                    if (correctionError) setCorrectionError(null);
                  }}
                  placeholder="Ex : Scan du diplôme illisible, merci de déposer un PDF net..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                {correctionError && <p className="text-rose-600 mt-1">{correctionError}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectionItemKey(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!correctionMotif.trim()}
                  className="px-3.5 py-1.5 bg-[#1E3A8A] text-white rounded-lg font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Envoyer la demande
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Refuser le dossier (motif obligatoire) */}
      {isRejectDossierOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-[15px] font-bold text-slate-900">Refuser le dossier</h3>
              <button type="button" onClick={() => setIsRejectDossierOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmRejectDossier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Motif officiel du refus administratif *
                </label>
                <textarea
                  rows={3}
                  value={rejectMotif}
                  onChange={(e) => {
                    setRejectMotif(e.target.value);
                    if (rejectError) setRejectError(null);
                  }}
                  placeholder="Ex : Diplôme non conforme ou hors délai..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                {rejectError && <p className="text-rose-600 mt-1">{rejectError}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejectDossierOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!rejectMotif.trim()}
                  className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Confirmer le refus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
