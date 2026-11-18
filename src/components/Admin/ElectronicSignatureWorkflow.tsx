import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Upload, 
  FileText, 
  Check 
} from 'lucide-react';
import { Application } from '../../types';
import { Language, translations } from '../../i18n/translations';

interface ElectronicSignatureWorkflowProps {
  application: Application;
  onSign: (appId: string, roleKey: 'director' | 'labHead' | 'cedocHead') => void;
  lang: Language;
}

export const ElectronicSignatureWorkflow: React.FC<ElectronicSignatureWorkflowProps> = ({
  application,
  onSign,
  lang,
}) => {
  const t = translations[lang];
  const sigs = application.signatures;

  const signatureSteps = [
    { key: 'director', label: '1. Directeur de thèse', data: sigs.director, btn: 'Signer (Directeur de thèse)' },
    { key: 'labHead', label: '2. Directeur de structure', data: sigs.labHead, btn: 'Signer (Structure)' },
    { key: 'cedocHead', label: '3. Directeur du CED', data: sigs.cedocHead, btn: 'Signer (CED)' },
  ] as const;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-5 shadow-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-[18px] font-bold text-slate-900">
            Signatures
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Validation multi-acteurs du procès-verbal officiel
          </p>
        </div>

        <div className="text-[13px] font-mono-folder font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
          Dossier : {application.folderNumber}
        </div>
      </div>

      {/* Steps rendered in a vertical list as requested */}
      <div className="space-y-3.5">
        {signatureSteps.map((step) => {
          const isSigned = step.data.isSigned;

          return (
            <div
              key={step.key}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                isSigned
                  ? 'bg-white border-emerald-200'
                  : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[15px] text-slate-900">
                    {step.label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                      isSigned
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {isSigned ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Validé</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>En attente</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="text-[13px] text-slate-600">
                  Signataire : <strong className="text-slate-800">{step.data.signerName}</strong>
                </div>

                {isSigned && (
                  <div className="text-[11px] text-slate-400 font-mono-folder pt-0.5">
                    Signé le {step.data.signedAt || '2026-10-26 15:40'} · Hash : {step.data.signatureHash || 'SHA256:4b8a9f...'}
                  </div>
                )}
              </div>

              {!isSigned ? (
                <button
                  type="button"
                  onClick={() => onSign(application.id, step.key as any)}
                  className="px-5 py-2.5 bg-[#1E3A8A] text-white rounded-lg font-semibold hover:bg-[#172554] transition-colors cursor-pointer text-[13px] min-h-[44px] flex items-center justify-center shrink-0 shadow-2xs"
                >
                  {step.btn}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[13px] shrink-0">
                  <Check className="w-4 h-4" />
                  <span>Signature apposée</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
