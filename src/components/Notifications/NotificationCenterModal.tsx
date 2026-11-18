import React, { useState } from 'react';
import {
  Bell,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Check,
  Send,
  FileText
} from 'lucide-react';
import { NotificationItem, SentEmailLog, WorkflowStepNumber } from '../../types';
import { Language, translations } from '../../i18n/translations';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  sentEmails: SentEmailLog[];
  onMarkAsRead: (notifId: string) => void;
  onMarkAllAsRead: () => void;
  onNavigateToStep?: (appId: string, stepNumber?: WorkflowStepNumber) => void;
  lang: Language;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  sentEmails,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToStep,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'emails'>('notifications');
  const [selectedEmail, setSelectedEmail] = useState<SentEmailLog | null>(null);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifs = filterUnreadOnly
    ? notifications.filter((n) => !n.read)
    : notifications;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl max-w-2xl w-full flex flex-col max-h-[85vh] border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center">
              {activeTab === 'notifications' ? <Bell className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">
                {activeTab === 'notifications' ? 'Notifications' : 'Journal des e-mails'}
              </h2>
              <p className="text-[12px] text-slate-500">
                Communications officielles et traçabilité des alertes
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

        {/* Tab Switcher */}
        <div className="px-4 pt-2 border-b border-slate-100 flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('notifications');
                setSelectedEmail(null);
              }}
              className={`pb-2.5 px-3 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'notifications'
                  ? 'border-[#1E3A8A] text-[#1E3A8A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('emails');
                setSelectedEmail(null);
              }}
              className={`pb-2.5 px-3 font-semibold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'emails'
                  ? 'border-[#1E3A8A] text-[#1E3A8A]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Journal e-mails ({sentEmails.length})</span>
            </button>
          </div>

          {activeTab === 'notifications' && unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-[12px] font-semibold text-[#1E3A8A] hover:underline cursor-pointer pb-2"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {activeTab === 'notifications' && (
            <div className="space-y-2">
              {filteredNotifs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-[13px]">
                  Aucune notification pour le moment.
                </div>
              ) : (
                filteredNotifs.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-lg border transition-all text-[13px] flex items-start justify-between gap-3 ${
                      notif.read
                        ? 'bg-white border-slate-200 text-slate-700'
                        : 'bg-blue-50/40 border-blue-100 text-slate-900 font-medium'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">{notif.title}</div>
                      <p className="text-slate-600 mt-0.5 leading-relaxed text-[12px]">{notif.message}</p>
                      <span className="text-[11px] text-slate-400 mt-1 block">{notif.date}</span>
                    </div>

                    {!notif.read && (
                      <button
                        onClick={() => onMarkAsRead(notif.id)}
                        className="text-[11px] font-semibold text-[#1E3A8A] hover:underline shrink-0"
                      >
                        Marquer lu
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'emails' && (
            <div className="space-y-2 text-[13px]">
              {selectedEmail ? (
                <div className="p-4 rounded-xl border border-slate-200 space-y-3 bg-white">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="text-[12px] font-semibold text-[#1E3A8A] hover:underline"
                  >
                    ← Retour à la liste des e-mails
                  </button>
                  <div className="border-b border-slate-100 pb-2">
                    <div className="font-bold text-[15px] text-slate-900">{selectedEmail.subject}</div>
                    <div className="text-[12px] text-slate-500">Destinataire : {selectedEmail.recipientEmail} · {selectedEmail.sentAt}</div>
                  </div>
                  <div
                    className="text-[13px] text-slate-700"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                  />
                </div>
              ) : (
                sentEmails.map((email) => (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{email.subject}</div>
                      <div className="text-[12px] text-slate-500">À : {email.recipientName} ({email.recipientEmail})</div>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono-folder shrink-0">{email.sentAt}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
