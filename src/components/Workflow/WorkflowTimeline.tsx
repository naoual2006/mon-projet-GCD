import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Plus,
  Trash2,
  Lock,
  FileCheck
} from 'lucide-react';
import {
  Application,
  WorkflowStepNumber,
  WorkflowFinalDecision,
  UserAccount,
  RoleDefinition,
  RoleId,
} from '../../types';
import { hasPermission } from '../../utils/workflowStorage';
import { Language, translations } from '../../i18n/translations';

interface WorkflowTimelineProps {
  application: Application;
  currentUser: UserAccount;
  roles: RoleDefinition[];
  lang: Language;
  onValidateStep: (
    appId: string,
    stepNumber: WorkflowStepNumber,
    comment?: string,
    finalDecision?: WorkflowFinalDecision
  ) => void;
  onBlockStep: (
    appId: string,
    stepNumber: WorkflowStepNumber,
    motif: string,
    missingDocs?: string[],
    deadlineDays?: number
  ) => void;
  onSubmitMissingDocs: (appId: string, docNames: string[]) => void;
}

const COMMON_PIECES_LIST = [
  'Carte Nationale d\'Identité (CNIE recto-verso)',
  'Diplôme de Master ou Attestation de réussite',
  'Relevés de notes officiels de Master (S1 à S4)',
  'Diplôme de Licence & Relevés de notes L1-L3',
  'Curriculum Vitae normalisé (CV)',
  'Avant-projet de recherche doctoral rédigé',
  'Baccalauréat original avec relevé de notes',
];

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  application,
  currentUser,
  roles,
  lang,
  onValidateStep,
  onBlockStep,
  onSubmitMissingDocs,
}) => {
  const t = translations[lang];

  const [selectedStepNum, setSelectedStepNum] = useState<WorkflowStepNumber>(
    application.workflowCurrentStep || 1
  );

  const [isRulesExpanded, setIsRulesExpanded] = useState<boolean>(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isMissingDocsModalOpen, setIsMissingDocsModalOpen] = useState(false);

  const [validationComment, setValidationComment] = useState('');
  const [finalDecisionChoice, setFinalDecisionChoice] = useState<WorkflowFinalDecision>('admitted');
  const [blockMotif, setBlockMotif] = useState('');
  const [selectedMissingPieces, setSelectedMissingPieces] = useState<string[]>([]);
  const [deadlineDays, setDeadlineDays] = useState<number>(5);
  const [providedDocsInput, setProvidedDocsInput] = useState<string[]>([]);
  const [newProvidedDocName, setNewProvidedDocName] = useState('');

  // Strict Least-Privilege Checks
  const isCandidate = currentUser.roleId === 'candidate';
  
  function isRoleAuthorizedForStep(roleId: RoleId, stepNum: number): boolean {
    if (roleId === 'gcd_admin') return stepNum === 2 || stepNum === 6;
    if (roleId === 'thesis_director' || roleId === 'structure_director') return stepNum === 3;
    if (roleId === 'commission') return stepNum === 4;
    if (roleId === 'ced_director') return stepNum === 5;
    return false;
  }

  const canValidate = !isCandidate && hasPermission(currentUser, roles, 'check_admin_completeness' as any) || hasPermission(currentUser, roles, 'evaluate_own_subjects' as any) || hasPermission(currentUser, roles, 'rank_candidates' as any) || hasPermission(currentUser, roles, 'render_final_decision' as any);
  const isAuthorizedForCurrentStep = !isCandidate && isRoleAuthorizedForStep(currentUser.roleId, selectedStepNum);

  const steps = application.workflowSteps || [];
  const currentStepDetail = steps.find((s) => s.stepNumber === selectedStepNum) || steps[0];

  const handleOpenValidate = () => {
    setValidationComment('');
    setFinalDecisionChoice('admitted');
    setIsValidateModalOpen(true);
  };

  const handleConfirmValidate = () => {
    onValidateStep(
      application.id,
      selectedStepNum,
      validationComment,
      selectedStepNum === 5 ? finalDecisionChoice : undefined
    );
    setIsValidateModalOpen(false);
  };

  const handleOpenBlock = () => {
    setBlockMotif('');
    setSelectedMissingPieces(
      selectedStepNum === 2
        ? ['Relevés de notes officiels de Master (S1 à S4)']
        : []
    );
    setDeadlineDays(5);
    setIsBlockModalOpen(true);
  };

  const handleConfirmBlock = () => {
    if (!blockMotif.trim()) return;
    onBlockStep(
      application.id,
      selectedStepNum,
      blockMotif.trim(),
      selectedMissingPieces.length > 0 ? selectedMissingPieces : undefined,
      deadlineDays
    );
    setIsBlockModalOpen(false);
  };

  const handleOpenSubmitDocs = () => {
    setProvidedDocsInput(currentStepDetail.missingDocuments || []);
    setNewProvidedDocName('');
    setIsMissingDocsModalOpen(true);
  };

  const handleConfirmSubmitDocs = () => {
    if (providedDocsInput.length === 0) return;
    onSubmitMissingDocs(application.id, providedDocsInput);
    setIsMissingDocsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 6-Step Workflow Progression Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          Progression du dossier en 6 étapes :
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {steps.map((step) => {
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isBlocked = step.status === 'blocked';
            const isSelected = selectedStepNum === step.stepNumber;

            return (
              <button
                key={step.stepNumber}
                type="button"
                onClick={() => setSelectedStepNum(step.stepNumber)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'border-[#1E3A8A] ring-1 ring-[#1E3A8A] bg-blue-50/30'
                    : 'border-slate-200/80 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Étape {step.stepNumber}
                  </span>

                  {isCompleted && (
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      ✓
                    </span>
                  )}
                  {isCurrent && (
                    <span className="w-4 h-4 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center text-[10px] animate-pulse">
                      ●
                    </span>
                  )}
                  {isBlocked && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                      !
                    </span>
                  )}
                  {!isCompleted && !isCurrent && !isBlocked && (
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-[10px]">
                      ○
                    </span>
                  )}
                </div>

                <div className="text-[12px] font-bold text-slate-900 mt-1 line-clamp-1">
                  {step.label}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {step.responsibleRole}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Step Detail Panel */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-[#1E3A8A] bg-blue-50 px-2.5 py-0.5 rounded-md">
                Étape {currentStepDetail.stepNumber} / 6
              </span>
              <span className="text-[12px] font-semibold text-slate-500">
                Responsable : <strong className="text-slate-800">{currentStepDetail.responsibleRole}</strong>
              </span>
            </div>

            <h2 className="text-[18px] font-bold text-slate-900 mt-1">
              {currentStepDetail.label}
            </h2>
            <p className="text-[13px] text-slate-600 mt-0.5">
              {currentStepDetail.description}
            </p>
          </div>

          {/* Action Buttons: Visible strictly for non-candidates with exact role authorization */}
          {!isCandidate && isAuthorizedForCurrentStep && (
            <div className="flex items-center gap-2">
              {currentStepDetail.status !== 'completed' && (
                <button
                  type="button"
                  onClick={handleOpenValidate}
                  className="px-4 py-2.5 text-[13px] font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>
                    {currentStepDetail.stepNumber === 5 ? 'Prononcer la décision' : 'Valider l\'étape'}
                  </span>
                </button>
              )}

              {currentStepDetail.status !== 'completed' && currentStepDetail.status !== 'blocked' && currentUser.roleId === 'gcd_admin' && (
                <button
                  type="button"
                  onClick={handleOpenBlock}
                  className="px-4 py-2.5 text-[13px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Dossier incomplet</span>
                </button>
              )}
            </div>
          )}

          {/* Candidate Action: Upload missing docs when Step 2 is blocked */}
          {isCandidate && currentStepDetail.stepNumber === 2 && currentStepDetail.status === 'blocked' && (
            <button
              type="button"
              onClick={handleOpenSubmitDocs}
              className="px-4 py-2.5 text-[13px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-2xs min-h-[44px]"
            >
              <Upload className="w-4 h-4" />
              <span>Compléter les pièces demandées</span>
            </button>
          )}
        </div>

        {/* Observation or Block Reason */}
        {currentStepDetail.comment && (
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-[13px] text-slate-700">
            <span className="font-semibold text-slate-900 block mb-0.5">Observation :</span>
            {currentStepDetail.comment}
          </div>
        )}

        {currentStepDetail.status === 'blocked' && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2 text-[13px] text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Signalement : Dossier incomplet.</strong> {currentStepDetail.blockReason}
              </div>
            </div>

            {currentStepDetail.missingDocuments && currentStepDetail.missingDocuments.length > 0 && (
              <div className="pt-2">
                <span className="font-semibold block mb-1">Pièce(s) à corriger ou fournir :</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-800">
                  {currentStepDetail.missingDocuments.map((doc, i) => (
                    <li key={i}>{doc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Action Modals */}
      {isValidateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-[16px] font-bold text-slate-900">
              Valider l'étape {selectedStepNum} — {currentStepDetail.label}
            </h3>

            {selectedStepNum === 5 && (
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-slate-700">
                  Décision finale du CED :
                </label>
                <select
                  value={finalDecisionChoice}
                  onChange={(e) => setFinalDecisionChoice(e.target.value as WorkflowFinalDecision)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px]"
                >
                  <option value="admitted">Admis (Liste principale)</option>
                  <option value="waiting_list">Liste d'attente</option>
                  <option value="rejected">Refusé</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                Avis ou commentaire :
              </label>
              <textarea
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
                placeholder="Précisez votre avis ou décision..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] h-24"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsValidateModalOpen(false)}
                className="px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmValidate}
                className="px-5 py-2 text-[13px] font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg cursor-pointer"
              >
                Confirmer la validation
              </button>
            </div>
          </div>
        </div>
      )}

      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-[16px] font-bold text-slate-900">
              Signaler un dossier incomplet
            </h3>

            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1">
                Motif du signalement :
              </label>
              <textarea
                value={blockMotif}
                onChange={(e) => setBlockMotif(e.target.value)}
                placeholder="Indiquez pourquoi le dossier est incomplet..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmBlock}
                className="px-5 py-2 text-[13px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer"
              >
                Signaler et notifier
              </button>
            </div>
          </div>
        </div>
      )}

      {isMissingDocsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-[16px] font-bold text-slate-900">
              Compléter votre dossier
            </h3>
            <p className="text-[12px] text-slate-500">
              Téléversez et confirmez les pièces manquantes demandées par l'administration.
            </p>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[13px] text-blue-900">
              Toutes les pièces complémentaires seront re-transmises à la scolarité.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMissingDocsModalOpen(false)}
                className="px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitDocs}
                className="px-5 py-2 text-[13px] font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg cursor-pointer"
              >
                Transmettre les pièces
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
