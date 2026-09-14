import { lazy, Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CalendarClock, History, FileText, Pill, Activity, Calendar,
  QrCode, CreditCard, AlertCircle, LogOut, Bell, UserCircle, Stethoscope,
  Loader2, Home, ArrowLeft, RefreshCw, HeartHandshake, Search, Command, ChevronRight, Menu, X, ListChecks
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { MhdUser } from '../lib/types';
import { t, LANG_EVENT } from '../lib/i18n';
import { LangSelect, ThemeSelect } from '../components/Controls';
import GlobalSearchModal from '../components/GlobalSearchModal';

const DashboardTab = lazy(() => import('../tabs/patient/DashboardTab'));
const UpcomingTab = lazy(() => import('../tabs/UpcomingTab'));
const MyCaseTab = lazy(() => import('../tabs/MyCaseTab'));
const MedicinesTab = lazy(() => import('../tabs/MedicinesTab'));
const ResultsTab = lazy(() => import('../tabs/ResultsTab'));
const AppointmentsTab = lazy(() => import('../tabs/AppointmentsTab'));
const MyDoctorsTab = lazy(() => import('../tabs/MyDoctorsTab'));
const MyCaretakerTab = lazy(() => import('../tabs/MyCaretakerTab'));
const TimelineTab = lazy(() => import('../tabs/TimelineTab'));
const HealthOverviewTab = lazy(() => import('../tabs/HealthOverviewTab'));
const MyQRTab = lazy(() => import('../tabs/MyQRTab'));
const BillingTab = lazy(() => import('../tabs/BillingTab'));
const NotificationsTab = lazy(() => import('../tabs/shared/NotificationsTab'));
const SettingsTab = lazy(() => import('../tabs/shared/SettingsTab'));
import EmergencyOverlay from '../components/EmergencyOverlay';
import NotificationBell from '../components/NotificationBell';

export const LOGO_PATH = 'M16 0L30 8V24L16 32L2 24V8L16 0ZM16 4.6L6 10.4V21.6L16 27.4L26 21.6V10.4L16 4.6Z';

export const Logo = () => (
  <svg className="w-8 h-8 text-primary" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d={LOGO_PATH} />
    <rect x="12" y="12" width="8" height="8" />
  </svg>
);

export default function PatientDashboard({ onLogout }: { onLogout: () => void }) {
  const [me, setMe] = useState<MhdUser | null>(null);
  const [activeTab, setActiveTab] = useState(t('dashboard'));
  const [emOpen, setEmOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const onNavigate = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      setActiveTab(target === 'caretaker' ? 'My Caretaker' : t(target));
    };
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
      if (snap.exists()) {
        const u = { id: snap.id, ...snap.data() } as MhdUser;
        setMe(u);
        try { localStorage.setItem('mhd_emergency', JSON.stringify(u)); } catch { /* ignore */ }
      }
    });
    const onLang = () => { force((v) => v + 1); setActiveTab((cur) => cur); };
    window.addEventListener(LANG_EVENT, onLang);
    return () => { unsub(); window.removeEventListener(LANG_EVENT, onLang); };
  }, []);

  const doLogout = async () => {
    try { await signOut(auth); } catch { /* ignore */ }
    onLogout();
  };

  const NAV: [string, typeof LayoutDashboard][] = [
    [t('dashboard'), LayoutDashboard],
    [t('upcoming'), CalendarClock],
    [t('mycase'), FileText],
    [t('meds'), Pill],
    [t('results'), ListChecks],
    [t('appts'), Calendar],
    [t('doctors'), Stethoscope],
    ['My Caretaker', HeartHandshake],
    [t('timeline'), History],
    [t('tracking'), Activity],
    [t('qr'), QrCode],
    [t('billing'), CreditCard],
    [t('notifs'), Bell],
    [t('myinfo'), UserCircle],
  ];

  if (!me) {
    return (
      <div className="h-screen bg-app flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderSidebar = () => (
    <aside className="portal-dark-sidebar w-[270px] bg-navy flex flex-col h-full shrink-0 border-r border-white/5">
      <div className="h-[64px] flex items-center justify-between px-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-white leading-none">UNITED MEDICATION</h1>
            <p className="text-[10px] text-on-navy-muted uppercase tracking-wider font-semibold mt-1">Patient Portal</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1 rounded-md text-on-navy-muted hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar space-y-1">
        {NAV.map(([label, Icon], i) => {
          const isActive = activeTab === label;
          return (
            <button
              key={`${label}-${i}`}
              onClick={() => {
                setActiveTab(label);
                setMobileMenuOpen(false);
              }}
              className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-on-navy-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activePatientTab"
                  className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/30 z-0"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4 shrink-0 relative z-10" strokeWidth={1.5} />
              <span className="truncate relative z-10">{label}</span>
            </button>
          );
        })}

        <div className="pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setEmOpen(true)}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-danger bg-danger-bg/20 hover:bg-danger-bg/40 transition-colors border border-danger-bd/30 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" strokeWidth={1.5} />
            <span>{t('emergencyBtn')}</span>
          </motion.button>
        </div>
      </div>

      <div className="p-4 border-t border-white/10 space-y-2 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
          {me.photo ? (
            <img src={me.photo} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/40" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-white" strokeWidth={1.5} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate">{me.name}</p>
            <p className="text-[11px] text-on-navy-muted font-mono truncate">{me.healthId}</p>
          </div>
        </div>

        <button
          onClick={doLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold text-danger hover:bg-danger-bg/20 transition-colors border border-danger-bd/20"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} /> {t('logout')}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-app font-sans text-ink overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">{renderSidebar()}</div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80] flex lg:hidden bg-slate-950/50 backdrop-blur-sm animate-in fade-in">
          {renderSidebar()}
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-[64px] bg-surface border-b border-line flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted hover:bg-app"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-[13px] text-muted font-medium truncate">
              <span>Patient Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted/60" />
              <span className="text-ink font-semibold truncate">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl border border-line bg-app hover:bg-surface text-muted text-[12px] font-medium transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-primary" />
              <span>Search features...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] bg-surface px-1.5 py-0.5 rounded border border-line text-muted">
                <Command className="w-3 h-3" />K
              </kbd>
            </button>

            <button onClick={() => setActiveTab(t('dashboard'))} title="Home" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><Home className="w-4 h-4" /></button>
            <button onClick={() => window.history.back()} title="Back" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><ArrowLeft className="w-4 h-4" /></button>
            <button onClick={() => window.location.reload()} title="Refresh portal" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><RefreshCw className="w-4 h-4" /></button>

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
              <Suspense fallback={<div className="min-h-[240px] flex items-center justify-center text-muted"><Loader2 className="w-6 h-6 animate-spin text-primary mr-2" /> Loading portal tab…</div>}>
                {activeTab === t('dashboard') && <DashboardTab me={me} go={setActiveTab} />}
                {activeTab === t('upcoming') && <UpcomingTab patientData={me} />}
                {activeTab === t('mycase') && <MyCaseTab patientData={me} />}
                {activeTab === t('meds') && <MedicinesTab patientData={me} />}
                {activeTab === t('results') && <ResultsTab patientData={me} />}
                {activeTab === t('appts') && <AppointmentsTab patientData={me} />}
                {activeTab === t('doctors') && <MyDoctorsTab patientData={me} />}
                {activeTab === 'My Caretaker' && <MyCaretakerTab patientData={me} />}
                {activeTab === t('timeline') && <TimelineTab patientData={me} />}
                {activeTab === t('tracking') && <HealthOverviewTab patientData={me} />}
                {activeTab === t('qr') && <MyQRTab patientData={me} />}
                {activeTab === t('billing') && <BillingTab patientData={me} />}
                {activeTab === t('notifs') && <NotificationsTab />}
                {(activeTab === t('myinfo') || activeTab === t('settings')) && <SettingsTab me={me} onSaved={setMe} />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          setSearchOpen(false);
        }}
        userRole="patient"
      />

      {emOpen && <EmergencyOverlay me={me} onClose={() => setEmOpen(false)} />}
    </div>
  );
}


