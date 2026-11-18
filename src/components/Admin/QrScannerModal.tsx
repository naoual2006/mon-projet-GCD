import React, { useState } from 'react';
import { QrCode, CheckCircle2, X } from 'lucide-react';
import { Application } from '../../types';
import { Language, translations } from '../../i18n/translations';
import { maskCin, formatCandidateName } from '../../utils/formatData';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: Application[];
  onConfirmPhysicalReceipt: (appId: string, agentName: string) => void;
  lang: Language;
}

const isDev = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || Boolean((import.meta as any)?.env?.DEV);

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  applications,
  onConfirmPhysicalReceipt,
  lang,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const [scannedApp, setScannedApp] = useState<Application | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [receiptSuccess, setReceiptSuccess] = useState<boolean>(false);
  const [agentName] = useState<string>('Scolarité CEDoc');

  const pendingPhysical = applications.filter(
    (a) => a.status !== 'registered' && a.finalResultDecision !== 'rejected'
  );

  const handleSimulateScan = (app: Application) => {
    setIsScanning(true);
    setScannedApp(null);
    setReceiptSuccess(false);

    setTimeout(() => {
      setIsScanning(false);
      setScannedApp(app);
    }, 1000);
  };

  const handleConfirm = () => {
    if (!scannedApp) return;
    onConfirmPhysicalReceipt(scannedApp.id, agentName);
    setReceiptSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">
                Réception guichet
              </h2>
              <p className="text-[12px] text-slate-500">
                Scan du QR Code sur la fiche papier du candidat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!scannedApp && !receiptSuccess && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3 bg-slate-50/50">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center mx-auto shadow-2xs">
                <QrCode className={`w-6 h-6 text-[#1E3A8A] ${isScanning ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-slate-900 block">
                  {isScanning ? 'Lecture optique du QR Code...' : 'Présentez la fiche imprimée devant le lecteur'}
                </span>
                <span className="text-[12px] text-slate-500 mt-0.5 block">
                  Scanner optique actif.
                </span>
              </div>
            </div>

            {/* Quick Demo Selector: Hidden unless in dev mode */}
            {isDev && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  [MODE DÉV] Simuler scan pour un dossier ({pendingPhysical.length}) :
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {pendingPhysical.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => handleSimulateScan(app)}
                      className="w-full p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-left transition-colors flex items-center justify-between text-[13px] cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-slate-900 block">
                          {app.candidate.firstName || 'Candidat'} {app.candidate.lastName || ''}
                        </span>
                        <span className="font-mono-folder text-[11px] text-slate-500">
                          {app.folderNumber}
                        </span>
                      </div>
                      <span className="text-[12px] text-[#1E3A8A] font-semibold">
                        Simuler scan
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Scanned Candidate Result Confirmation */}
        {scannedApp && !receiptSuccess && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 space-y-2 text-[13px]">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>QR Code authentifié avec succès</span>
              </div>
              <div className="space-y-1 pt-1 text-slate-700">
                <div>Candidat : <strong className="text-slate-900">{scannedApp.candidate.firstName} {scannedApp.candidate.lastName}</strong></div>
                <div>CIN : <strong className="font-mono-folder">{maskCin(scannedApp.candidate.cin)}</strong></div>
                <div>Dossier : <strong className="font-mono-folder text-[#1E3A8A]">{scannedApp.folderNumber}</strong></div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setScannedApp(null)}
                className="px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Recommencer
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2.5 text-[13px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer min-h-[44px]"
              >
                Valider la réception physique
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Success State */}
        {receiptSuccess && (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-[16px] font-bold text-slate-900">
              Dossier physique réceptionné
            </h3>
            <p className="text-[13px] text-slate-500">
              Le statut du dossier a été mis à jour et l'inscription validée.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-[#1E3A8A] text-white rounded-lg font-semibold hover:bg-[#172554] transition-colors cursor-pointer min-h-[44px]"
              >
                Terminer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
