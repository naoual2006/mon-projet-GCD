import React, { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { Application } from '../../types';
import { generateQrDataUrl } from '../../utils/qrHelper';
import { Language } from '../../i18n/translations';

interface PrintableRegistrationSheetProps {
  application: Application;
  onClose: () => void;
  lang: Language;
}

export const PrintableRegistrationSheet: React.FC<PrintableRegistrationSheetProps> = ({
  application,
  onClose,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const cand = application.candidate;

  useEffect(() => {
    generateQrDataUrl(application.qrToken || application.folderNumber).then((url) => {
      setQrCodeUrl(url);
    });
  }, [application]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Controls (Hidden in print) */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-slate-700" />
            <span className="text-[13px] font-bold text-slate-900">
              Fiche d'inscription (QR Code)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-[13px] font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-[13px] text-slate-700 hover:text-slate-900 font-medium bg-white border border-slate-200 rounded-lg cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 space-y-6 print:p-0">
          
          {/* Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-slate-600">
                Royaume du Maroc · Ministère de l'Enseignement Supérieur
              </div>
              <h1 className="text-[18px] font-bold tracking-tight text-slate-900 mt-1">
                Université Sidi Mohamed Ben Abdellah · Fès
              </h1>
              <div className="text-[13px] font-medium text-slate-700 mt-0.5">
                Pôle des Études Doctorales (CEDoc) · Campagne 2026-2027
              </div>
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="p-1 border border-slate-300 rounded-lg shrink-0 text-center">
                <img src={qrCodeUrl} alt="QR Code Dossier" className="w-20 h-20 object-contain mx-auto" />
                <span className="text-[9px] font-mono-folder font-bold text-slate-600 block mt-0.5">
                  SCAN GUICHET
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <h2 className="text-[16px] font-bold text-slate-900 uppercase tracking-wide">
              Fiche Officielle de Pré-Inscription au Cycle Doctoral
            </h2>
            <div className="font-mono-folder font-bold text-[#1E3A8A] text-[13px] mt-0.5">
              N° DOSSIER : {application.folderNumber}
            </div>
          </div>

          {/* Section 1: État Civil */}
          <div className="space-y-2 text-[13px]">
            <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1">
              1. Renseignements Personnels
            </h3>
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div>Nom et Prénom : <strong className="text-slate-900">{cand.lastName} {cand.firstName}</strong></div>
              <div>N° CIN : <strong className="font-mono-folder">{cand.cin}</strong></div>
              <div>CNE / Massar : <strong className="font-mono-folder">{cand.cne}</strong></div>
              <div>Date de naissance : {cand.birthDate}</div>
              <div>E-mail : {cand.email}</div>
              <div>Téléphone : <span className="font-mono-folder">{cand.phone}</span></div>
            </div>
          </div>

          {/* Section 2: Sujet & Laboratoire */}
          <div className="space-y-2 text-[13px]">
            <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1">
              2. Projet de Recherche Doctoral
            </h3>
            <div className="space-y-1 text-slate-700">
              <div>Sujet : <strong className="text-slate-900">{application.subjectTitle}</strong></div>
              <div>Laboratoire : {application.subjectLab}</div>
              <div>Directeur de thèse : <strong className="text-slate-900">{application.directorName}</strong></div>
            </div>
          </div>

          {/* Section 3: Signature Boxes */}
          <div className="pt-4 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-4 text-center text-[12px]">
              <div className="border border-slate-300 rounded p-3 h-28 flex flex-col justify-between">
                <span className="font-semibold text-slate-700">Le Candidat</span>
                <span className="text-[10px] text-slate-400">Signature</span>
              </div>
              <div className="border border-slate-300 rounded p-3 h-28 flex flex-col justify-between">
                <span className="font-semibold text-slate-700">Le Directeur de Thèse</span>
                <span className="text-[10px] text-slate-400">Avis & Signature</span>
              </div>
              <div className="border border-slate-300 rounded p-3 h-28 flex flex-col justify-between">
                <span className="font-semibold text-slate-700">Guichet CEDoc</span>
                <span className="text-[10px] text-slate-400">Cachet & Date de réception</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
