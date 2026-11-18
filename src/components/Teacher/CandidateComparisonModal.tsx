import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Scale, 
  X 
} from 'lucide-react';
import { Application } from '../../types';
import { Language, translations } from '../../i18n/translations';
import { formatData, formatCandidateName, maskCin } from '../../utils/formatData';

interface CandidateComparisonModalProps {
  candidates: Application[];
  onClose: () => void;
  onSelectCandidate: (appId: string) => void;
  lang: Language;
}

export const CandidateComparisonModal: React.FC<CandidateComparisonModalProps> = ({
  candidates,
  onClose,
  onSelectCandidate,
  lang,
}) => {
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">
                Comparer les candidatures
              </h2>
              <p className="text-[12px] text-slate-500">
                Évaluation comparative des profils sélectionnés ({candidates.length})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Grid with overflow-y-auto so buttons are never cut off */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30 max-h-[calc(90vh-70px)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {candidates.map((app) => {
              const cand = app.candidate;
              const ai = app.aiAnalysis;
              const candName = formatCandidateName(cand);
              const candCin = maskCin(cand?.cin);

              const badgeConfig = {
                green: {
                  style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  icon: CheckCircle2,
                  label: 'Validé',
                },
                orange: {
                  style: 'bg-amber-50 text-amber-800 border-amber-200',
                  icon: AlertTriangle,
                  label: 'À vérifier',
                },
                red: {
                  style: 'bg-rose-50 text-rose-800 border-rose-200',
                  icon: XCircle,
                  label: 'Refusé',
                },
              }[ai.statusColor] || {
                style: 'bg-slate-100 text-slate-700 border-slate-200',
                icon: CheckCircle2,
                label: 'En attente',
              };

              const StatusIcon = badgeConfig.icon;

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono-folder text-[12px] text-slate-500 font-bold">
                          {app.folderNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border flex items-center gap-1 ${badgeConfig.style}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span>{badgeConfig.label}</span>
                        </span>
                      </div>
                      <h3 className={`font-bold text-[16px] mt-2 ${candName === 'Non renseigné' ? 'text-slate-400 italic font-normal' : 'text-slate-900'}`}>
                        {candName}
                      </h3>
                      <div className="text-[12px] text-slate-500 font-mono-folder">
                        CIN : {candCin}
                      </div>
                    </div>

                    {/* Academic Profile */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[13px] space-y-1 text-slate-700">
                      <div>Diplôme : <strong className={formatData(cand?.masterDegree) === 'Non renseigné' ? 'text-slate-400 italic font-normal' : 'text-slate-900'}>{formatData(cand?.masterDegree)}</strong></div>
                      <div>Université : <span className={formatData(cand?.masterUniversity) === 'Non renseigné' ? 'text-slate-400 italic font-normal' : 'text-slate-800'}>{formatData(cand?.masterUniversity)}</span></div>
                      <div>
                        Moyenne : <strong className="text-[#1E3A8A] font-mono-folder font-bold">{formatData(cand?.masterGrade)}</strong> · {formatData(cand?.masterMention)}
                      </div>
                      <div>Publications : <strong className="font-mono-folder text-slate-800">{cand?.publicationsCount ?? 0}</strong></div>
                      <div>Anglais : <span className="font-semibold text-slate-800">{formatData(cand?.englishLevel)}</span></div>
                    </div>

                    {/* Summary */}
                    <div className="text-[12px] text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                      {ai.summary}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectCandidate(app.id)}
                    className="w-full py-2.5 text-[13px] font-semibold rounded-lg bg-[#1E3A8A] text-white hover:bg-[#172554] transition-colors cursor-pointer min-h-[44px] shrink-0"
                  >
                    Examiner le dossier
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
