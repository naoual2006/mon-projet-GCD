import React, { useState } from 'react';
import { 
  Layers, 
  Cpu, 
  Workflow, 
  QrCode, 
  Database, 
  Sparkles, 
  Check, 
  X
} from 'lucide-react';
import { Language } from '../i18n/translations';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'tech' | 'workflow' | 'hybrid' | 'ai' | 'ux'>('tech');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">
                Spécifications d'Architecture
              </h2>
              <p className="text-[12px] text-slate-500">
                Architecture technique & conception UX de la plateforme DocCycle
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

        {/* Tab Buttons */}
        <div className="px-5 pt-2 border-b border-slate-100 flex items-center gap-4 overflow-x-auto bg-white text-[13px]">
          {[
            { id: 'tech', label: 'Architecture Système', icon: Cpu },
            { id: 'workflow', label: 'Cycle & Workflow', icon: Workflow },
            { id: 'hybrid', label: 'Hybridation Papier-Numérique', icon: QrCode },
            { id: 'ai', label: 'OCR & Assistance IA', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 px-1 font-semibold transition-colors cursor-pointer border-b-2 -mb-[1px] flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'border-[#1E3A8A] text-[#1E3A8A]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-[13px] text-slate-700">
          {activeTab === 'tech' && (
            <div className="space-y-3">
              <h3 className="text-[15px] font-bold text-slate-900">Couches Techniques Modernes</h3>
              <p className="leading-relaxed text-slate-600">
                L'application repose sur React 19, TypeScript et Tailwind CSS v4. La persistance locale (localStorage) permet une résilience totale aux coupures réseau avec synchronisation transparente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-lg border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block">Frontend & Composants</strong>
                  <span className="text-slate-600 text-[12px]">Architecture modulaire découpée en espaces (Candidat, Évaluateur, Scolarité, Admin).</span>
                </div>
                <div className="p-3.5 rounded-lg border border-slate-200 space-y-1">
                  <strong className="text-slate-900 block">Moteur OCR & MRZ</strong>
                  <span className="text-slate-600 text-[12px]">Tesseract.js exécuté côté client pour extraire la zone MRZ ICAO TD1 des CNIE marocaines.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-3">
              <h3 className="text-[15px] font-bold text-slate-900">Timeline & Workflow en 5 Jalons</h3>
              <p className="leading-relaxed text-slate-600">
                Du dépôt numérique initial jusqu'à la signature finale du PV d'admission, chaque étape est tracée et horodatée dans un journal d'audit institutionnel immuable.
              </p>
            </div>
          )}

          {activeTab === 'hybrid' && (
            <div className="space-y-3">
              <h3 className="text-[15px] font-bold text-slate-900">Passerelle Papier - Numérique (QR Code)</h3>
              <p className="leading-relaxed text-slate-600">
                Les candidats admissibles impriment une fiche normalisée contenant un QR code chiffré. Lors de la remise physique au guichet CEDoc, l'agent scanne le code pour valider la réception instantanément.
              </p>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-3">
              <h3 className="text-[15px] font-bold text-slate-900">IA & Respect de la Vie Privée</h3>
              <p className="leading-relaxed text-slate-600">
                Traitement optique 100% navigateur respectant la loi CNDP 09-08 (aucune image stockée). Aide à la décision pédagogique basée sur la cohérence Master/Projet et le volume de publications.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
