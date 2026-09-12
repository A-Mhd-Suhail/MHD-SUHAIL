import { lazy, Suspense, useEffect, useState } from 'react';
import {
  LayoutDashboard, CalendarClock, History, FileText, Pill, Activity, Calendar,
  QrCode, CreditCard, AlertCircle, LogOut, Bell, UserCircle, Stethoscope,
  Settings, ListChecks, Loader2, Home, ArrowLeft, RefreshCw, HeartHandshake,
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { MhdUser } from '../lib/types';
import { t, LANG_EVENT } from '../lib/i18n';
import { LangSelect, ThemeSelect } from '../components/Controls';

// Keep the initial patient portal small. Each feature is downloaded only when
// the user opens that tab, which is especially helpful on slower connections.
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
  const [, force] = useState(0);
  useEffect(() => { const onNavigate = (e: Event) => { const target = (e as CustomEvent<string>).detail; setActiveTab(target === 'caretaker' ? 'My Caretaker' : t(target)); }; window.addEventListener('mhd:navigate', onNavigate); return () => window.removeEventListener('mhd:navigate', onNavigate); }, []);

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

  return (
    <div className="flex h-screen bg-app font-sans text-ink">
      <aside className="portal-dark-sidebar w-[260px] bg-navy flex flex-col h-full shrink-0">
        <div className="h-[64px] flex items-center gap-3 px-6 border-b border-white/10">
          <Logo />
          <div>
            <h1 className="text-[15px] font-bold tracking-wide leading-none text-white">UNITED MEDICATION</h1>
            <p className="text-[10px] text-on-navy-muted uppercase tracking-wider font-semibold mt-0.5">Patient Portal</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          {NAV.map(([label, Icon], i) => (
            <button
              key={`${label}-${i}`}
              onClick={() => setActiveTab(label)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[4px] text-[13px] font-medium transition-colors mb-0.5 ${
                activeTab === label ? 'bg-primary text-white shadow-sm' : 'text-on-navy-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} /> {label}
            </button>
          ))}
          <button
            onClick={() => setEmOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-[4px] text-[13px] font-bold text-danger hover:bg-danger-bg transition-colors mt-4 border border-danger-bd"
          >
            <AlertCircle className="w-4 h-4" strokeWidth={1.5} />{t('emergencyBtn')}
          </button>
        </div>
        <div className="p-4 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 mb-2">
            {me.photo ? (
              <img src={me.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><UserCircle className="w-5 h-5 text-white" strokeWidth={1.5} /></div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{me.name}</p>
              <p className="text-[11px] text-on-navy-muted font-mono">{me.healthId}</p>
            </div>
          </div>
          <button onClick={doLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-[4px] text-[13px] font-medium text-danger hover:bg-danger-bg transition-colors">
            <LogOut className="w-4 h-4" strokeWidth={1.5} /> {t('logout')}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-[64px] bg-surface border-b border-line flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab(t('dashboard'))} title="Home" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><Home className="w-4 h-4" /></button>
            <button onClick={() => window.history.back()} title="Back" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><ArrowLeft className="w-4 h-4" /></button>
            <button onClick={() => window.location.reload()} title="Refresh portal" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><RefreshCw className="w-4 h-4" /></button>
            <LangSelect />
            <ThemeSelect insidePortal />
            <NotificationBell onOpen={() => setActiveTab(t('notifs'))} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar animate-in fade-in duration-200">
          <Suspense fallback={<div className="min-h-[240px] flex items-center justify-center text-muted">Loading feature…</div>}>
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
        </main>
      </div>

      {emOpen && <EmergencyOverlay me={me} onClose={() => setEmOpen(false)} />}
    </div>
  );
}
