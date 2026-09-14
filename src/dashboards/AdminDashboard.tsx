import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Stethoscope, FileText, Pill, Calendar,
  LogOut, Bell, UserCircle, Settings, Loader2, FileCheck, CreditCard, Upload, Home, ArrowLeft, RefreshCw,
  UserPlus, Search, Command, ChevronRight, Menu, X,
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { MhdUser } from '../lib/types';
import { t, LANG_EVENT } from '../lib/i18n';
import { LangSelect, ThemeSelect } from '../components/Controls';
import { Logo } from './PatientDashboard';
import NotificationBell from '../components/NotificationBell';
import GlobalSearchModal from '../components/GlobalSearchModal';

import AdminHomeTab from '../tabs/admin/AdminHomeTab';
import AdminPatientsTab from '../tabs/admin/AdminPatientsTab';
import AdminDoctorsTab from '../tabs/admin/AdminDoctorsTab';
import HospitalRequestsTab from '../tabs/admin/HospitalRequestsTab';
import AdminCasesTab from '../tabs/admin/AdminCasesTab';
import AdminMedicinesTab from '../tabs/admin/AdminMedicinesTab';
import AdminAppointmentsTab from '../tabs/admin/AdminAppointmentsTab';
import AdminBillingTab from '../tabs/admin/AdminBillingTab';
import AdminReportsTab from '../tabs/admin/AdminReportsTab';
import UploadResultTab from '../tabs/admin/UploadResultTab';
import NotificationsTab from '../tabs/shared/NotificationsTab';
import SettingsTab from '../tabs/shared/SettingsTab';

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [me, setMe] = useState<MhdUser | null>(null);
  const [activeTab, setActiveTab] = useState(t('hdash'));
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const onNavigate = (e: Event) => setActiveTab(t((e as CustomEvent<string>).detail));
    const onOpenSearch = () => setSearchOpen(true);
    window.addEventListener('mhd:navigate', onNavigate);
    window.addEventListener('mhd:open-search', onOpenSearch);
    return () => {
      window.removeEventListener('mhd:navigate', onNavigate);
      window.removeEventListener('mhd:open-search', onOpenSearch);
    };
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) setMe({ id: snap.id, ...snap.data() } as MhdUser);
    });
    const onLang = () => force((v) => v + 1);
    window.addEventListener(LANG_EVENT, onLang);
    return () => { unsub(); window.removeEventListener(LANG_EVENT, onLang); };
  }, []);

  // Real-time listener for pending doctor join requests
  useEffect(() => {
    if (!me?.id) return;
    const unsub = onSnapshot(collection(db, 'hospital_requests'), (snap) => {
      const pending = snap.docs.filter((d) => {
        const data = d.data();
        const matchId = data.hospitalId === me.id;
        const matchName = data.hospitalName && me.name &&
          data.hospitalName.trim().toLowerCase() === me.name.trim().toLowerCase();
        return (matchId || matchName) && data.status === 'pending';
      });
      setPendingRequestsCount(pending.length);
    });
    return unsub;
  }, [me?.id, me?.name]);

  const doLogout = async () => {
    try { await signOut(auth); } catch { /* ignore */ }
    onLogout();
  };

  const NAV: [string, typeof LayoutDashboard, number?][] = [
    [t('hdash'), LayoutDashboard],
    [t('hpatients'), Users],
    [t('hdoctors'), Stethoscope],
    [t('hrequests') || 'Hospital Requests', UserPlus, pendingRequestsCount],
    [t('hcases'), FileText],
    [t('hmeds'), Pill],
    [t('happts'), Calendar],
    [t('hdocs'), FileCheck],
    [t('hupload'), Upload],
    [t('billing'), CreditCard],
    [t('notifs'), Bell],
    [t('myinfo'), UserCircle],
  ];

  if (!me) {
    return <div className="h-screen bg-app flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const renderSidebar = () => (
    <aside className="portal-dark-sidebar w-[270px] bg-white flex flex-col h-full shrink-0 border-r border-slate-200">
      <div className="h-[64px] flex items-center justify-between px-6 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-[#1e3a8a] leading-none">UNITED MEDICATION</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-1">Hospital Portal</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar space-y-1">
        {NAV.map(([label, Icon, badgeCount], i) => {
          const isActive = activeTab === label;
          return (
            <button
              key={`${label}-${i}`}
              onClick={() => {
                setActiveTab(label);
                setMobileMenuOpen(false);
              }}
              className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-[#2a8eff] text-white font-semibold shadow-md shadow-[#2a8eff]/30'
                  : 'bg-white text-[#2a8eff] hover:bg-[#2a8eff] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 truncate relative z-10">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#2a8eff]'}`} strokeWidth={1.5} />
                <span className={`truncate ${isActive ? 'text-white font-semibold' : 'text-[#2a8eff] font-medium'}`}>{label}</span>
              </span>
              {badgeCount && badgeCount > 0 ? (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0 relative z-10">
                  {badgeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-200 space-y-2 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200">
          {me.photo ? (
            <img src={me.photo} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/40" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-[#2a8eff]" strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#1e3a8a] truncate">{me.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{me.adminName}</p>
          </div>
        </div>

        <button
          onClick={doLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors border border-red-500 shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5 text-white" style={{ color: '#ffffff' }} strokeWidth={1.5} />
          <span className="text-white font-bold" style={{ color: '#ffffff' }}>{t('logout')}</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="dashboard-shell flex h-screen bg-white font-sans text-[#1e3a8a] overflow-hidden">
      <style>{`
        .dashboard-shell { background: #ffffff !important; color: #1e3a8a !important; }
        .dashboard-shell .bg-app,
        .dashboard-shell .bg-surface,
        .dashboard-shell .bg-white,
        .dashboard-shell main,
        .dashboard-shell header { background-color: #ffffff !important; }

        .dashboard-shell header button[title="Home"],
        .dashboard-shell header button[title="Back"],
        .dashboard-shell header button[title="Refresh portal"] {
          background-color: #ffffff !important;
          color: #1e3a8a !important;
          border: 1px solid #e2e8f0 !important;
        }
        .dashboard-shell header button[title="Home"] *,
        .dashboard-shell header button[title="Back"] *,
        .dashboard-shell header button[title="Refresh portal"] * {
          color: #1e3a8a !important;
        }

        .dashboard-shell .text-ink,
        .dashboard-shell .text-muted,
        .dashboard-shell .text-heading,
        .dashboard-shell p,
        .dashboard-shell h1,
        .dashboard-shell h2,
        .dashboard-shell h3,
        .dashboard-shell h4,
        .dashboard-shell span,
        .dashboard-shell div,
        .dashboard-shell td,
        .dashboard-shell label { color: #1e3a8a !important; }

        /* COMPULSORY RULE: IF BACKGROUND IS BLUE OR DARK NAVY (#1c364f, #102B47, #071A2D, bg-navy), TEXT MUST BE WHITE */
        .dashboard-shell .bg-primary,
        .dashboard-shell .bg-\[\#2a8eff\],
        .dashboard-shell .bg-\[\#1e74ff\],
        .dashboard-shell .bg-blue-600,
        .dashboard-shell .bg-blue-500,
        .dashboard-shell [class*="bg-green-"],
        .dashboard-shell [class*="bg-emerald-"],
        .dashboard-shell .bg-ok,
        .dashboard-shell .bg-ok-bg,
        .dashboard-shell .bg-success,
        .dashboard-shell .bg-stripe,
        .dashboard-shell [class*="bg-\[\#1c364f\]"],
        .dashboard-shell [class*="bg-\[\#1C364F\]"],
        .dashboard-shell [class*="bg-\[\#13233b\]"],
        .dashboard-shell [class*="bg-\[\#13233B\]"],
        .dashboard-shell [class*="bg-\[\#1b2a4a\]"],
        .dashboard-shell [class*="bg-\[\#1B2A4A\]"],
        .dashboard-shell [class*="bg-\[\#1d2e4d\]"],
        .dashboard-shell [class*="bg-\[\#14233c\]"],
        .dashboard-shell [class*="bg-\[\#102B47\]"],
        .dashboard-shell [class*="bg-\[\#071A2D\]"],
        .dashboard-shell [class*="bg-\[\#0f172a\]"],
        .dashboard-shell [class*="bg-\[\#1e293b\]"],
        .dashboard-shell [style*="#1c364f"],
        .dashboard-shell [style*="#1C364F"],
        .dashboard-shell [style*="#13233b"],
        .dashboard-shell [style*="#13233B"],
        .dashboard-shell [style*="#1b2a4a"],
        .dashboard-shell [style*="#1B2A4A"] {
          color: #ffffff !important;
        }

        .dashboard-shell .bg-primary *,
        .dashboard-shell .bg-\[\#2a8eff\] *,
        .dashboard-shell .bg-\[\#1e74ff\] *,
        .dashboard-shell .bg-blue-600 *,
        .dashboard-shell .bg-blue-500 *,
        .dashboard-shell [class*="bg-green-"] *,
        .dashboard-shell [class*="bg-emerald-"] *,
        .dashboard-shell .bg-ok *,
        .dashboard-shell .bg-ok-bg *,
        .dashboard-shell .bg-success *,
        .dashboard-shell .bg-stripe *,
        .dashboard-shell [class*="bg-\[\#1c364f\]"] *,
        .dashboard-shell [class*="bg-\[\#1C364F\]"] *,
        .dashboard-shell [class*="bg-\[\#13233b\]"] *,
        .dashboard-shell [class*="bg-\[\#13233B\]"] *,
        .dashboard-shell [class*="bg-\[\#1b2a4a\]"] *,
        .dashboard-shell [class*="bg-\[\#1B2A4A\]"] *,
        .dashboard-shell [class*="bg-\[\#1d2e4d\]"] *,
        .dashboard-shell [class*="bg-\[\#14233c\]"] *,
        .dashboard-shell [class*="bg-\[\#102B47\]"] *,
        .dashboard-shell [class*="bg-\[\#071A2D\]"] *,
        .dashboard-shell [class*="bg-\[\#0f172a\]"] *,
        .dashboard-shell [class*="bg-\[\#1e293b\]"] *,
        .dashboard-shell [style*="#1c364f"] *,
        .dashboard-shell [style*="#1C364F"] *,
        .dashboard-shell [style*="#13233b"] *,
        .dashboard-shell [style*="#13233B"] *,
        .dashboard-shell [style*="#1b2a4a"] *,
        .dashboard-shell [style*="#1B2A4A"] *,
        .dashboard-shell th,
        .dashboard-shell thead th,
        .dashboard-shell table thead th,
        .dashboard-shell tr[class*="bg-blue"],
        .dashboard-shell td[class*="bg-blue"],
        .dashboard-shell th *,
        .dashboard-shell thead th *,
        .dashboard-shell table thead th *,
        .dashboard-shell tr[class*="bg-blue"] *,
        .dashboard-shell td[class*="bg-blue"] * {
          color: #ffffff !important;
        }

        .dashboard-shell button.bg-red-500,
        .dashboard-shell button.bg-red-500 *,
        .dashboard-shell button[class*="bg-red-"],
        .dashboard-shell button[class*="bg-red-"] *,
        .dashboard-shell .bg-red-500,
        .dashboard-shell .bg-red-500 * {
          color: #ffffff !important;
        }

        .dashboard-shell .border-line,
        .dashboard-shell .border-gray-200,
        .dashboard-shell .border-white\/10,
        .dashboard-shell .border-white\/5 { border-color: rgba(42, 142, 255, 0.25) !important; }
      `}</style>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">{renderSidebar()}</div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80] flex lg:hidden bg-slate-950/50 backdrop-blur-sm animate-in fade-in">
          {renderSidebar()}
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-[64px] bg-white border-b border-line flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted hover:bg-app"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-[13px] text-muted font-medium truncate">
              <span>Hospital Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted/60" />
              <span className="text-ink font-semibold truncate">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl border border-line bg-white hover:bg-slate-100 text-[#1e3a8a] text-[12px] font-medium transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-[#2a8eff]" />
              <span>Search hospital records...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] bg-white px-1.5 py-0.5 rounded border border-line text-muted">
                <Command className="w-3 h-3" />K
              </kbd>
            </button>

            <button onClick={() => setActiveTab(t('hdash'))} title="Home" className="p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100"><Home className="w-4 h-4 text-[#1e3a8a]" /></button>
            <button onClick={() => window.history.back()} title="Back" className="p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100"><ArrowLeft className="w-4 h-4 text-[#1e3a8a]" /></button>
            <button onClick={() => window.location.reload()} title="Refresh portal" className="p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100"><RefreshCw className="w-4 h-4 text-[#1e3a8a]" /></button>

            <LangSelect />
            <ThemeSelect insidePortal />
            <NotificationBell onOpen={() => setActiveTab(t('notifs'))} />
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === t('hdash') && <AdminHomeTab adminData={me} go={setActiveTab} />}
              {activeTab === t('hpatients') && <AdminPatientsTab adminData={me} />}
              {activeTab === t('hdoctors') && <AdminDoctorsTab adminData={me} />}
              {(activeTab === (t('hrequests') || 'Hospital Requests') || activeTab === 'Hospital Requests' || activeTab === 'hrequests') && <HospitalRequestsTab adminData={me} />}
              {activeTab === t('hcases') && <AdminCasesTab adminData={me} />}
              {activeTab === t('hmeds') && <AdminMedicinesTab adminData={me} />}
              {activeTab === t('happts') && <AdminAppointmentsTab adminData={me} />}
              {activeTab === t('hdocs') && <AdminReportsTab adminData={me} />}
              {activeTab === t('hupload') && <UploadResultTab adminData={me} />}
              {activeTab === t('billing') && <AdminBillingTab adminData={me} />}
              {activeTab === t('notifs') && <NotificationsTab />}
              {(activeTab === t('myinfo') || activeTab === t('settings')) && <SettingsTab me={me} onSaved={setMe} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setSearchOpen(false);
        }}
        userRole="hospital"
      />
    </div>
  );
}


