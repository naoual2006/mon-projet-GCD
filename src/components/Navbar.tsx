import React, { useState, useRef, useEffect } from 'react';
import {
  Bookmark,
  Globe,
  Bell,
  Check,
  ChevronDown,
  Menu,
  X,
  GraduationCap,
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { UserAccount, NotificationItem, RoleId } from '../types';

interface NavbarProps {
  currentRole: RoleId;
  currentUser: UserAccount;
  allUsers: UserAccount[];
  onSelectPersona: (roleId: RoleId) => void;
  lang: Language;
  setLang: (lang: Language) => void;
  cartCount: number;
  openCart: () => void;
  activeCandidateTab: 'catalog' | 'wizard' | 'tracking';
  setActiveCandidateTab: (tab: 'catalog' | 'wizard' | 'tracking') => void;
  activeAdminTab: string;
  setActiveAdminTab: (tab: any) => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onNavigateToStep?: (appId: string) => void;
  onOpenEmailLogs?: () => void;
  openArchModal?: () => void;
  canManagePrivileges: boolean;
  demoMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  currentUser,
  onSelectPersona,
  lang,
  setLang,
  cartCount,
  openCart,
  activeCandidateTab,
  setActiveCandidateTab,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onNavigateToStep,
  demoMode = true,
}) => {
  const t = translations[lang];

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rolesConfig: { id: RoleId; label: string; name: string }[] = [
    { id: 'candidate', label: 'Candidat', name: 'Amine Tazi' },
    { id: 'thesis_director', label: 'Directeur de thèse', name: 'Pr. Karim El Mansouri' },
    { id: 'structure_director', label: 'Directeur de structure', name: 'Pr. Samir Benjelloun' },
    { id: 'commission', label: 'Commission', name: 'Pr. Rachid Chami' },
    { id: 'ced_director', label: 'Directeur du CED', name: 'Pr. Hassan Alaoui' },
    { id: 'gcd_admin', label: 'GCD / Administration', name: 'Dr. Naoual Chifa' },
  ];

  // When not in DEMO_MODE, only propose roles carried by currentUser
  const selectableRoles = demoMode
    ? rolesConfig
    : rolesConfig.filter((r) => currentUser.roles?.includes(r.id) || currentUser.roleId === r.id);

  return (
    <header className="fixed top-0 left-0 right-0 h-[60px] bg-[#1E3A8A] text-white z-40 shadow-sm border-b border-blue-900/50">
      <div className="max-w-7xl mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center font-bold text-white shadow-2xs">
            <GraduationCap className="w-5 h-5 text-blue-200" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] tracking-tight text-white leading-none">
              DocCycle
            </span>
            <span className="text-[11px] text-blue-200 font-medium leading-none mt-1">
              USMBA · Pôle Doctorat
            </span>
          </div>
        </div>

        {/* Center Navigation: Candidate tabs only (staff navigation lives in lateral sidebar) */}
        <nav className="hidden md:flex items-center gap-1 text-[13px] font-medium">
          {currentRole === 'candidate' && (
            <>
              <button
                onClick={() => setActiveCandidateTab('catalog')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeCandidateTab === 'catalog'
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                Sujets
              </button>
              <button
                onClick={() => setActiveCandidateTab('tracking')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeCandidateTab === 'tracking'
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                Suivi de dossier
              </button>
            </>
          )}
        </nav>

        {/* Right Section: Cart (candidate), Language, Notifications, Role Selector */}
        <div className="flex items-center gap-2.5">
          {currentRole === 'candidate' && (
            <button
              onClick={openCart}
              className="relative p-2 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Mes choix de sujets"
            >
              <Bookmark className="w-5 h-5 text-blue-200" />
              {cartCount > 0 && (
                <span className="bg-emerald-500 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            className="px-2.5 py-1 rounded-lg text-[12px] font-semibold text-blue-100 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-blue-200" />
            <span>{t.switchLanguage}</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-blue-200" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#1E3A8A]" />
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[14px] text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount} non lues
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={onMarkAllNotificationsRead}
                      className="text-[12px] text-[#1E3A8A] hover:underline font-semibold cursor-pointer"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-[13px]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-[12px]">
                      Aucune notification.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          onMarkNotificationRead(notif.id);
                          if (onNavigateToStep && notif.applicationId) {
                            onNavigateToStep(notif.applicationId);
                          }
                          setIsNotifOpen(false);
                        }}
                        className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-2.5 ${
                          !notif.read ? 'bg-blue-50/40 font-semibold' : 'opacity-80'
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full bg-[#1E3A8A] shrink-0 mt-1.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-slate-900 text-[13px] leading-snug">{notif.title}</div>
                          <p className="text-slate-600 text-[12px] font-normal line-clamp-2 mt-0.5">{notif.message}</p>
                          <div className="text-[10px] text-slate-400 font-normal mt-1">{notif.date}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active Role / Mode Démonstration Switcher */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 text-white font-bold text-[12px] flex items-center justify-center border border-white/30">
                {currentUser.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[12px] font-bold text-white leading-tight truncate max-w-[130px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-blue-200 leading-tight">
                  Rôle actif : {rolesConfig.find((r) => r.id === currentRole)?.label}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-blue-200" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-76 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50">
                  <div className="font-bold text-[13px] text-slate-900">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                  <div className="text-[10px] font-semibold text-[#1E3A8A] mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                    {currentUser.scope || 'Rôle actif'}
                  </div>
                </div>

                <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                  <div className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1.5">
                    {demoMode ? 'Mode démonstration — Changer de rôle' : 'Rôle actif'}
                  </div>
                  <div className="space-y-0.5">
                    {selectableRoles.map((r) => {
                      const isActive = currentRole === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            onSelectPersona(r.id);
                            setIsProfileOpen(false);
                          }}
                          className={`w-full p-2 rounded-lg text-left text-[12px] transition-colors flex items-center justify-between cursor-pointer ${
                            isActive
                              ? 'bg-[#1E3A8A] text-white font-semibold'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{r.label}</div>
                            <div className={`text-[10px] ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                              {r.name}
                            </div>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-2 text-center text-[11px] text-slate-400">
                  DocCycle USMBA
                </div>
              </div>
            )}
          </div>

          {currentRole === 'candidate' && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-blue-100 hover:text-white cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu (Candidate only; staff uses lateral/mobile tabs) */}
      {isMobileMenuOpen && currentRole === 'candidate' && (
        <div className="md:hidden bg-[#1E3A8A] text-white border-b border-blue-900/80 px-4 py-3 space-y-2">
          <button
            onClick={() => {
              setActiveCandidateTab('catalog');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 text-[14px] font-medium text-blue-100 hover:text-white"
          >
            Sujets de thèse
          </button>
          <button
            onClick={() => {
              setActiveCandidateTab('tracking');
              setIsMobileMenuOpen(false);
            }}
            className="w-full text-left py-2 text-[14px] font-medium text-blue-100 hover:text-white"
          >
            Suivi de dossier
          </button>
        </div>
      )}
    </header>
  );
};
