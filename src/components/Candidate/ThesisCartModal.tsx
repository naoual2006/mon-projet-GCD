import React from 'react';
import { 
  Bookmark, 
  Trash2, 
  ArrowRight, 
  X,
  MoveUp, 
  MoveDown,
  AlertCircle
} from 'lucide-react';
import { ThesisSubject } from '../../types';
import { Language, translations } from '../../i18n/translations';

interface ThesisCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartIds: string[];
  subjects: ThesisSubject[];
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onProceedToApply: () => void;
  maxChoices?: number;
  lang: Language;
}

export const ThesisCartModal: React.FC<ThesisCartModalProps> = ({
  isOpen,
  onClose,
  cartIds,
  subjects,
  onRemove,
  onReorder,
  onProceedToApply,
  maxChoices = 3,
  lang,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const cartSubjects = cartIds
    .map((id) => subjects.find((s) => s.id === id))
    .filter((s): s is ThesisSubject => s !== undefined);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900">{t.cart.title}</h2>
              <p className="text-[12px] text-slate-500">
                {cartSubjects.length} / {maxChoices} sujet(s) sélectionné(s)
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

        {/* Limit Warning if max reached */}
        {cartSubjects.length >= maxChoices && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Limite maximale atteinte ({maxChoices} sujets max par candidat).</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {cartSubjects.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-slate-500">
              {t.cart.empty}
            </div>
          ) : (
            <>
              <div className="text-[12px] text-slate-500 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {t.cart.priorityNotice}
              </div>

              <div className="space-y-2">
                {cartSubjects.map((subject, idx) => (
                  <div
                    key={subject.id}
                    className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-[13px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#1E3A8A] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 line-clamp-1 block">
                          {lang === 'ar' ? subject.titleAr : subject.title}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {subject.discipline} · {subject.director}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {idx > 0 && (
                        <button
                          onClick={() => onReorder(idx, idx - 1)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 cursor-pointer"
                          title="Monter la priorité"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {idx < cartSubjects.length - 1 && (
                        <button
                          onClick={() => onReorder(idx, idx + 1)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 cursor-pointer"
                          title="Descendre la priorité"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onRemove(subject.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                        title="Retirer de mes choix"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            {t.cart.close}
          </button>

          {cartSubjects.length > 0 && (
            <button
              onClick={() => {
                onProceedToApply();
                onClose();
              }}
              className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <span>{t.cart.applyAll}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
