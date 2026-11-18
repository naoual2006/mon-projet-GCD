import React, { useState } from 'react';
import {
  Search,
  Calendar,
  Check,
  Plus,
  X,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { ThesisSubject } from '../../types';
import { Language, translations } from '../../i18n/translations';

interface ThesisCatalogProps {
  subjects: ThesisSubject[];
  cart: string[];
  addToCart: (subjectId: string) => void;
  removeFromCart: (subjectId: string) => void;
  onSelectForApplication: (subjectId: string) => void;
  appliedSubjectIds?: string[];
  onViewTracking?: () => void;
  campaignEndDate?: string;
  lang: Language;
}

function formatFrenchDate(rawDate: string): string {
  if (!rawDate) return 'Non définie';
  try {
    const parts = rawDate.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
      return `${day} ${months[monthNum - 1] || ''} ${year}`;
    }
  } catch (e) {
    // fallback
  }
  return rawDate;
}

function getDaysUntil(deadlineStr?: string): number | null {
  if (!deadlineStr) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = deadlineStr.split('-');
    if (parts.length === 3) {
      const deadline = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      deadline.setHours(0, 0, 0, 0);
      const diffTime = deadline.getTime() - today.getTime();
      return Math.round(diffTime / (1000 * 60 * 60 * 24));
    }
  } catch (e) {
    return null;
  }
  return null;
}

export const ThesisCatalog: React.FC<ThesisCatalogProps> = ({
  subjects,
  cart,
  addToCart,
  removeFromCart,
  onSelectForApplication,
  appliedSubjectIds = [],
  onViewTracking,
  campaignEndDate = '2026-11-30',
  lang,
}) => {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('all');
  const [modalSubject, setModalSubject] = useState<ThesisSubject | null>(null);

  const disciplines = Array.from(new Set(subjects.filter((s) => s.status === 'published').map((s) => s.discipline)));

  const campaignDaysLeft = getDaysUntil(campaignEndDate);

  const filteredSubjects = subjects.filter((s) => {
    const isPublished = s.status === 'published';

    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.laboratory.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDiscipline =
      selectedDiscipline === 'all' || s.discipline === selectedDiscipline;

    return isPublished && matchesSearch && matchesDiscipline;
  });

  return (
    <div className="space-y-6">

      {/* Global Campaign Closing Date Banner (Informational Only) */}
      <div className="rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] bg-white border-slate-200/90 text-slate-700 shadow-2xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 shrink-0 text-[#1E3A8A]" />
          <span>
            <strong>Clôture globale de la campagne :</strong>{' '}
            <span className="font-semibold text-slate-900">{formatFrenchDate(campaignEndDate)}</span>
            <span className="text-slate-500 ml-2">(à titre informatif · chaque sujet indique aussi sa propre date)</span>
          </span>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {campaignDaysLeft !== null && campaignDaysLeft >= 0 && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border font-bold text-[12px] ${
              campaignDaysLeft <= 3
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : campaignDaysLeft <= 7
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-blue-50 text-[#1E3A8A] border-blue-200'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              Campagne : J-{campaignDaysLeft}
            </span>
          )}
        </div>
      </div>

      {/* Search & Discipline Filter Bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.catalog.searchPlaceholder}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/90 rounded-xl text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedDiscipline('all')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors shrink-0 cursor-pointer ${
              selectedDiscipline === 'all'
                ? 'bg-[#1E3A8A] text-white font-semibold shadow-2xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {t.catalog.allDisciplines}
          </button>
          {disciplines.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDiscipline(d)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors shrink-0 cursor-pointer ${
                selectedDiscipline === d
                  ? 'bg-[#1E3A8A] text-white font-semibold shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {filteredSubjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <p className="text-[15px] text-slate-600">
            Aucun sujet de thèse ne correspond à votre recherche.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDiscipline('all');
            }}
            className="px-4 py-2 text-[13px] font-semibold text-[#1E3A8A] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((subject) => {
            const inCart = cart.includes(subject.id);
            const alreadyApplied = appliedSubjectIds.includes(subject.id);
            const subjDays = getDaysUntil(subject.deadline);
            const showCountdownBadge = subjDays !== null && subjDays >= 0;
            const isCritical = subjDays !== null && subjDays <= 3;

            return (
              <div
                key={subject.id}
                className="bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-sm transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[#1E3A8A] bg-blue-50 px-2.5 py-0.5 rounded-md inline-block truncate">
                      {subject.discipline}
                    </span>
                    {alreadyApplied && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Candidature en cours
                      </span>
                    )}
                  </div>

                  {/* Title (2 lines max) */}
                  <h3
                    onClick={() => setModalSubject(subject)}
                    className="line-clamp-2 text-[16px] font-bold text-slate-900 leading-snug mt-2 hover:text-[#1E3A8A] cursor-pointer transition-colors"
                  >
                    {lang === 'ar' ? subject.titleAr : subject.title}
                  </h3>
                </div>

                {/* Bottom Section: Deadline (info only) & Action Buttons (always active) */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[12px] mb-3 gap-2">
                    <div className="flex items-center gap-1.5 text-slate-500 font-medium min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Clôture sujet : {formatFrenchDate(subject.deadline)}</span>
                    </div>

                    {showCountdownBadge && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                        isCritical
                          ? 'text-rose-800 bg-rose-50 border-rose-200'
                          : subjDays <= 7
                          ? 'text-amber-800 bg-amber-50 border-amber-200'
                          : 'text-slate-700 bg-slate-50 border-slate-200'
                      }`}>
                        J-{subjDays}
                      </span>
                    )}
                  </div>

                  {/* Primary & Secondary Buttons (never disabled, never grayed out) */}
                  <div className="flex items-center gap-2">
                    {alreadyApplied ? (
                      <button
                        type="button"
                        onClick={() => onViewTracking?.()}
                        className="flex-1 py-2.5 px-3 text-[13px] font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Candidature en cours</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectForApplication(subject.id)}
                        className="flex-1 py-2.5 px-3 text-[13px] font-semibold rounded-lg transition-colors min-h-[44px] flex items-center justify-center shadow-2xs text-white bg-[#1E3A8A] hover:bg-[#172554] cursor-pointer"
                      >
                        Postuler
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (inCart) {
                          removeFromCart(subject.id);
                        } else {
                          addToCart(subject.id);
                        }
                      }}
                      className={`py-2.5 px-3 text-[12px] rounded-lg border transition-colors min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer ${
                        inCart
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold hover:bg-emerald-100'
                          : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 border-slate-200 font-medium'
                      }`}
                    >
                      {inCart ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Dans mes choix</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 text-slate-500" />
                          <span>Ajouter à mes choix</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Link: Voir la fiche */}
                  <button
                    type="button"
                    onClick={() => setModalSubject(subject)}
                    className="w-full text-center text-[13px] font-semibold text-[#1E3A8A] hover:underline mt-2 block cursor-pointer"
                  >
                    Voir la fiche
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Thesis Modal (Fiche du sujet) */}
      {modalSubject && (() => {
        const subjDays = getDaysUntil(modalSubject.deadline);
        const alreadyApplied = appliedSubjectIds.includes(modalSubject.id);
        const inCart = cart.includes(modalSubject.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[12px] font-semibold text-[#1E3A8A] bg-blue-50 px-2.5 py-0.5 rounded-md inline-block">
                    {modalSubject.discipline}
                  </span>
                  <h2 className="text-[18px] font-bold text-slate-900 leading-snug mt-2">
                    {lang === 'ar' ? modalSubject.titleAr : modalSubject.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setModalSubject(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-[13px] text-slate-600 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>Laboratoire : <strong className="text-slate-900">{modalSubject.laboratory}</strong></div>
                <div>Directeur de thèse : <strong className="text-slate-900">{modalSubject.director}</strong></div>
                {modalSubject.coDirector && <div>Co-directeur : <strong className="text-slate-900">{modalSubject.coDirector}</strong></div>}
                <div>
                  Clôture du sujet : <strong className="text-slate-900">{formatFrenchDate(modalSubject.deadline)}</strong>
                  {subjDays !== null && subjDays >= 0 && (
                    <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#1E3A8A] border border-blue-200">
                      J-{subjDays}
                    </span>
                  )}
                </div>
                <div>Clôture globale de la campagne : <strong className="text-slate-900">{formatFrenchDate(campaignEndDate)}</strong></div>
              </div>

              <div className="pt-1">
                <h4 className="text-[14px] font-semibold text-slate-900 mb-1">Description scientifique</h4>
                <p className="text-[13px] text-slate-700 leading-relaxed">
                  {lang === 'ar' ? modalSubject.summaryAr : modalSubject.summary}
                </p>
              </div>

              <div>
                <h4 className="text-[14px] font-semibold text-slate-900 mb-1">Prérequis & Profil recherché</h4>
                <p className="text-[13px] text-slate-700 leading-relaxed">
                  {modalSubject.prerequisites}
                </p>
              </div>

              <div>
                <h4 className="text-[13px] font-semibold text-slate-900 mb-1">Mots-clés</h4>
                <div className="flex flex-wrap gap-1.5">
                  {modalSubject.keywords.map((kw, i) => (
                    <span key={i} className="text-[12px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                      {kw.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalSubject(null)}
                  className="px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Fermer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (inCart) {
                      removeFromCart(modalSubject.id);
                    } else {
                      addToCart(modalSubject.id);
                    }
                  }}
                  className={`px-4 py-2.5 text-[13px] rounded-lg border transition-colors min-h-[44px] flex items-center gap-1.5 cursor-pointer ${
                    inCart
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold hover:bg-emerald-100'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200 font-medium'
                  }`}
                >
                  {inCart ? 'Dans mes choix' : 'Ajouter à mes choix'}
                </button>

                {alreadyApplied ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModalSubject(null);
                      onViewTracking?.();
                    }}
                    className="px-5 py-2.5 text-[13px] font-semibold text-emerald-900 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-lg min-h-[44px] cursor-pointer"
                  >
                    Candidature en cours
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectForApplication(modalSubject.id);
                      setModalSubject(null);
                    }}
                    className="px-5 py-2.5 text-[13px] font-semibold rounded-lg transition-colors min-h-[44px] text-white bg-[#1E3A8A] hover:bg-[#172554] cursor-pointer"
                  >
                    Postuler
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
