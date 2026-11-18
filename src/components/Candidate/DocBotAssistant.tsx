import React, { useState } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { Language } from '../../i18n/translations';

interface DocBotAssistantProps {
  lang: Language;
}

interface BotMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
}

export const DocBotAssistant: React.FC<DocBotAssistantProps> = ({ lang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text:
        lang === 'fr'
          ? 'Bonjour, je suis l\'assistant d\'orientation doctorale USMBA. Posez vos questions sur la procédure ou les prérequis.'
          : 'مرحباً، أنا المساعد الذكي للتوجيه في سلك الدكتوراه. تفضل بطرح أسئلتك حول المسطرة أو الشروط.',
    },
  ]);

  const presetQuestions = [
    {
      qFr: 'Quels sont les diplômes requis ?',
      aFr: 'Un Diplôme de Master ou Master Spécialisé (Bac+5) reconnu, avec mention Bien ou Assez Bien selon les pôles.',
    },
    {
      qFr: 'Comment fonctionne le scan CNIE ?',
      aFr: 'Le scan lit la zone MRZ (3 lignes au verso de votre carte) localement dans votre navigateur, sans conserver l\'image (Loi 09-08).',
    },
    {
      qFr: 'À quoi sert la fiche imprimée (QR) ?',
      aFr: 'Elle permet à l\'agent du guichet CEDoc de valider instantanément la réception de vos pièces physiques par scan du code QR.',
    },
    {
      qFr: 'Que faire en cas de notification "Incomplet" ?',
      aFr: 'Déposez simplement les pièces demandées dans votre espace de suivi pour débloquer automatiquement votre dossier.',
    },
  ];

  const handleSend = (userText: string) => {
    if (!userText.trim()) return;

    const newMsgs: BotMessage[] = [
      ...messages,
      { id: Date.now().toString(), sender: 'user', text: userText },
    ];
    setMessages(newMsgs);
    setInput('');

    setTimeout(() => {
      const found = presetQuestions.find(
        (p) =>
          userText.toLowerCase().includes('diplôme') ||
          userText.toLowerCase().includes('cnie') ||
          userText.toLowerCase().includes('qr') ||
          userText.toLowerCase().includes('incomplet') ||
          userText.toLowerCase().includes('refus')
      );

      const botReply =
        lang === 'fr'
          ? 'Votre question est prise en compte. Consultez la messagerie interne de votre dossier pour échanger avec votre encadrant.'
          : 'شكراً لاستفساركم. يمكنكم التواصل مباشرة مع المشرف عبر المراسلة الداخلية.';

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: found ? found.aFr : botReply,
        },
      ]);
    }, 400);
  };

  return (
    <div className="print:hidden">
      
      {/* 48px Round Floating Trigger Button (Bottom-Right, Hidden during print) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 group">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Assistant d'orientation"
            className="w-12 h-12 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center shadow-lg hover:bg-[#172554] transition-all hover:scale-105 cursor-pointer border border-white/20"
          >
            <Bot className="w-5 h-5 text-white" />
          </button>
          
          {/* Tooltip */}
          <div className="hidden group-hover:block absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-900 text-white text-[12px] font-medium py-1 px-2.5 rounded-md shadow-md pointer-events-none">
            Assistant d'orientation
          </div>
        </div>
      )}

      {/* Assistant Modal Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-2xl flex flex-col max-h-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#1E3A8A] text-white flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="text-[14px] font-bold text-slate-900 leading-tight">
                DocBot USMBA
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-72 text-[13px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-2.5 rounded-lg leading-relaxed ${
                  m.sender === 'user'
                    ? 'ml-auto bg-[#1E3A8A] text-white max-w-[85%]'
                    : 'mr-auto bg-slate-100 text-slate-800 max-w-[90%]'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          {/* Quick FAQ Questions */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5 text-[11px]">
            {presetQuestions.slice(0, 2).map((pq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(pq.qFr)}
                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors truncate max-w-full cursor-pointer text-left"
              >
                {pq.qFr}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="p-2.5 border-t border-slate-100 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question..."
              className="flex-1 px-3 py-1.5 rounded-md border border-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
            <button
              type="submit"
              className="p-2 bg-[#1E3A8A] text-white rounded-md hover:bg-[#172554] transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
};
