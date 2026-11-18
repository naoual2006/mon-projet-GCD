import React, { useState } from 'react';
import { 
  Printer, 
  Send, 
  CheckCircle2,
  ShieldAlert,
  Lock,
  Calendar,
  Clock,
  MapPin,
  Edit3,
  Upload,
  AlertTriangle,
  Award
} from 'lucide-react';
import { 
  Application, 
  InternalMessage, 
  WorkflowStepNumber, 
  WorkflowFinalDecision,
  UserAccount,
  RoleDefinition
} from '../../types';
import { WorkflowTimeline } from '../Workflow/WorkflowTimeline';
import { Language } from '../../i18n/translations';
import { formatFrenchDate } from '../../utils/formatData';

export const AccesRefuse: React.FC = () => (
  <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3 my-8 max-w-lg mx-auto shadow-sm">
    <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
      <ShieldAlert className="w-6 h-6" />
    </div>
    <h3 className="text-[16px] font-bold text-rose-900">Accès Refusé</h3>
    <p className="text-[13px] text-rose-700 leading-relaxed">
      Action réservée au rôle concerné. Un candidat ne peut consulter ou modifier que son propre dossier.
    </p>
  </div>
);

interface ApplicationTrackingViewProps {
  application: Application;
  messages: InternalMessage[];
  onSendMessage: (content: string) => void;
  onOpenPrintSheet: () => void;
  lang: Language;
  currentUser: UserAccount;
  roles: RoleDefinition[];
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
  onUpdateAuthorizedContact?: (appId: string, contact: { phone: string; email: string; address: string }) => void;
  onConfirmPlace?: (appId: string) => void;
  onRenouncePlace?: (appId: string, motif: string) => void;
}

export const ApplicationTrackingView: React.FC<ApplicationTrackingViewProps> = ({
  application,
  messages,
  onSendMessage,
  onOpenPrintSheet,
  lang,
  currentUser,
  roles,
  onValidateStep,
  onBlockStep,
  onSubmitMissingDocs,
  onUpdateAuthorizedContact,
  onConfirmPlace,
  onRenouncePlace,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'messages'>('timeline');
  const [newMessage, setNewMessage] = useState('');

  // Authorized contact edit modal/panel (for locked dossier)
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [phoneInput, setPhoneInput] = useState(application?.candidate?.phone || '');
  const [emailInput, setEmailInput] = useState(application?.candidate?.email || '');
  const [addressInput, setAddressInput] = useState(application?.candidate?.address || '');

  // Renounce modal
  const [renounceModalOpen, setRenounceModalOpen] = useState(false);
  const [renounceMotif, setRenounceMotif] = useState('');

  const isCandidate = currentUser.roleId === 'candidate';
  const isOwnDossier = application && (
    application.candidateId === currentUser.id ||
    application.candidate?.email === currentUser.email ||
    application.candidate?.cin === currentUser.id
  );

  if (isCandidate && !isOwnDossier) {
    return <AccesRefuse />;
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSendMessage(newMessage.trim());
    setNewMessage('');
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateAuthorizedContact) {
      onUpdateAuthorizedContact(application.id, {
        phone: phoneInput,
        email: emailInput,
        address: addressInput,
      });
    }
    setIsEditingContact(false);
  };

  const isLocked = application.status !== 'draft';

  return (
    <div className="space-y-6 pb-24">

      {/* Dossier Locked Notice */}
      {isLocked && (
        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px]">
          <div className="flex items-center gap-2.5 text-slate-700">
            <Lock className="w-4 h-4 text-[#1E3A8A] shrink-0" />
            <span>
              <strong>Dossier verrouillé après soumission :</strong> les données académiques, l'état civil et le sujet ne sont plus modifiables. Seules vos coordonnées de contact ou les pièces demandées en correction restent modifiables.
            </span>
          </div>
          {onUpdateAuthorizedContact && (
            <button
              type="button"
              onClick={() => {
                setPhoneInput(application.candidate.phone || '');
                setEmailInput(application.candidate.email || '');
                setAddressInput(application.candidate.address || '');
                setIsEditingContact(!isEditingContact);
              }}
              className="px-3 py-1.5 text-[12px] font-semibold text-[#1E3A8A] bg-white border border-blue-200 hover:bg-blue-50 rounded-lg cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifier mes coordonnées</span>
            </button>
          )}
        </div>
      )}

      {/* Authorized Contact Fields Panel */}
      {isEditingContact && (
        <form onSubmit={handleSaveContact} className="bg-white p-5 rounded-xl border border-blue-200 shadow-xs space-y-4">
          <div className="text-[14px] font-bold text-slate-900">
            Champs autorisés · Mise à jour des coordonnées
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+212 6 XX XX XX XX"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Adresse e-mail</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="prenom.nom@exemple.ma"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Adresse</label>
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingContact(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] rounded-lg cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* Incomplete Dossier Correction Banner */}
      {application.status === 'incomplete' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-[13px] text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Correction demandée par GCD / Administration</div>
              <div className="mt-0.5">{application.rejectionReason}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSubmitMissingDocs(application.id, ['Pièce corrigée'])}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Transmettre la correction</span>
          </button>
        </div>
      )}

      {/* Convocation Card (Visible to Candidate once scheduled by Commission) */}
      {application.convocationDetails && (
        <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-[#1E3A8A] font-bold text-[15px]">
            <Calendar className="w-5 h-5" />
            <span>Convocation à l'entretien oral (Commission scientifique)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
            <div className="p-3 bg-white rounded-lg border border-blue-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1E3A8A]" />
              <div>
                <div className="text-[11px] text-slate-500">Date</div>
                <div className="font-bold text-slate-900">{formatFrenchDate(application.convocationDetails.date)}</div>
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1E3A8A]" />
              <div>
                <div className="text-[11px] text-slate-500">Heure</div>
                <div className="font-bold text-slate-900">{application.convocationDetails.time}</div>
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#1E3A8A]" />
              <div>
                <div className="text-[11px] text-slate-500">Lieu</div>
                <div className="font-bold text-slate-900">{application.convocationDetails.location}</div>
              </div>
            </div>
          </div>
          {application.convocationDetails.note && (
            <div className="text-[12px] text-slate-700 bg-white/80 p-2.5 rounded-lg border border-blue-100">
              <strong>Instructions :</strong> {application.convocationDetails.note}
            </div>
          )}
        </div>
      )}

      {/* Official Results Card */}
      {application.status === 'results_published' && (
        <div className={`p-5 rounded-xl border space-y-3 ${
          application.finalResultDecision === 'admitted'
            ? 'bg-emerald-50 border-emerald-200'
            : application.finalResultDecision === 'waiting_list'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-rose-50 border-rose-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-slate-800" />
              <div>
                <div className="font-bold text-[15px] text-slate-900">
                  {application.finalResultDecision === 'admitted' && 'Résultat officiel : Admis en doctorat'}
                  {application.finalResultDecision === 'waiting_list' && `Résultat officiel : Liste d'attente (Rang ${application.waitingListPosition || 1})`}
                  {application.finalResultDecision === 'rejected' && 'Résultat officiel : Candidature non retenue'}
                </div>
                {application.rejectionReason && (
                  <div className="text-[12px] text-rose-800 mt-0.5">Motif : {application.rejectionReason}</div>
                )}
              </div>
            </div>

            {application.finalResultDecision === 'admitted' && onConfirmPlace && onRenouncePlace && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onConfirmPlace(application.id)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Confirmer ma place
                </button>
                <button
                  type="button"
                  onClick={() => setRenounceModalOpen(true)}
                  className="px-3 py-2 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Se désister
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                Dossier
              </span>
              <span className="font-mono-folder font-bold text-[14px] text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                {application.folderNumber}
              </span>
              {application.status === 'registered' && (
                <span className="text-[12px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Inscrit définitivement
                </span>
              )}
            </div>

            <h1 className="text-[20px] sm:text-[24px] font-bold text-slate-900 leading-snug mt-2">
              {application.subjectTitle}
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              {application.subjectLab} · Directeur de thèse : <span className="text-slate-800 font-medium">{application.directorName}</span>
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onOpenPrintSheet}
              className="px-4 py-2.5 text-[13px] font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-2xs min-h-[44px]"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimer la fiche (QR)</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="mt-6 flex items-center gap-6 border-b border-slate-200 text-[14px]">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 font-semibold transition-colors cursor-pointer border-b-2 -mb-[1px] flex items-center gap-2 ${
              activeTab === 'timeline'
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Suivi de candidature</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`pb-3 font-semibold transition-colors cursor-pointer border-b-2 -mb-[1px] flex items-center gap-2 ${
              activeTab === 'messages'
                ? 'border-[#1E3A8A] text-[#1E3A8A]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>Messagerie</span>
            {messages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                {messages.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'timeline' && (
        <WorkflowTimeline
          application={application}
          currentUser={currentUser}
          roles={roles}
          lang={lang}
          onValidateStep={onValidateStep}
          onBlockStep={onBlockStep}
          onSubmitMissingDocs={onSubmitMissingDocs}
        />
      )}

      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
          <div className="text-[16px] font-bold text-slate-900">
            Messagerie interne
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto p-2 border border-slate-100 rounded-lg">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-[13px] text-slate-500">
                Aucun message échangé pour le moment.
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg text-[13px] max-w-xl ${
                    msg.senderRole === 'Candidat' || msg.senderRole === 'candidate'
                      ? 'ml-auto bg-slate-100 text-slate-900'
                      : 'mr-auto bg-blue-50/70 border border-blue-100 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="font-semibold">{msg.senderName} ({msg.senderRole})</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{msg.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-[14px] focus:ring-2 focus:ring-[#1E3A8A] focus:outline-none"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#1E3A8A] text-white rounded-lg text-[13px] font-semibold hover:bg-[#172554] transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span>Envoyer</span>
            </button>
          </form>
        </div>
      )}

      {/* Renounce Modal */}
      {renounceModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Confirmer le désistement</h3>
            <p className="text-xs text-slate-600">
              Votre place sera automatiquement libérée pour le candidat suivant sur la liste d'attente.
            </p>
            <textarea
              rows={3}
              value={renounceMotif}
              onChange={(e) => setRenounceMotif(e.target.value)}
              placeholder="Motif du désistement..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenounceModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!renounceMotif.trim()}
                onClick={() => {
                  onRenouncePlace && onRenouncePlace(application.id, renounceMotif.trim());
                  setRenounceModalOpen(false);
                }}
                className="px-4 py-2 bg-rose-700 text-white rounded-lg text-xs font-semibold hover:bg-rose-800 disabled:opacity-50 cursor-pointer"
              >
                Confirmer le désistement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
