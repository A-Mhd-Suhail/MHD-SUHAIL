import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Activity, FileText, Pill, MessageSquare, DollarSign,
  LogOut, Bell, UserCircle, Settings, Loader2, Users, CalendarCheck, Home, ArrowLeft, RefreshCw,
  Building2, Search, Command, ChevronRight, Menu, X, Radio,
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { MhdUser } from '../lib/types';
import { t, LANG_EVENT } from '../lib/i18n';
import { LangSelect, ThemeSelect } from '../components/Controls';
import { Logo } from './PatientDashboard';
import GlobalSearchModal from '../components/GlobalSearchModal';

import DoctorHomeTab from '../tabs/doctor/DoctorHomeTab';
import HealthInputTab from '../tabs/doctor/HealthInputTab';
import CasesTab from '../tabs/doctor/CasesTab';
import PatientsTab from '../tabs/doctor/PatientsTab';
import AppointmentsTab from '../tabs/doctor/AppointmentsTab';
import MessagesTab from '../tabs/doctor/MessagesTab';
import EarningsTab from '../tabs/doctor/EarningsTab';
import VerifyTab from '../tabs/doctor/VerifyTab';
import MyHospitalsTab from '../tabs/doctor/MyHospitalsTab';
import NotificationsTab from '../tabs/shared/NotificationsTab';
import SettingsTab from '../tabs/shared/SettingsTab';
import NotificationBell from '../components/NotificationBell';

export default function DoctorDashboard({ onLogout }: { onLogout: () => void }) {
  const [me, setMe] = useState<MhdUser | null>(null);
  const [activeTab, setActiveTab] = useState(t('dashboard'));
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

  const watchRef = useRef<number | null>(null);
  const lastSendRef = useRef(0);

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

  /* Duty + live location (GPS throttled to 1 write / 20s) */
  useEffect(() => {
    if (me?.onDuty && 'geolocation' in navigator) {
      watchRef.current = navigator.geolocation.watchPosition((pos) => {
        const now = Date.now();
        if (now - lastSendRef.current < 20000) return;
        lastSendRef.current = now;
        updateDoc(doc(db, 'users', me.id), {
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude, updatedAt: now },
        }).catch(() => { /* ignore */ });
      }, () => { /* ignore denied */ }, { enableHighAccuracy: true });
    } else if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    return () => { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); };
  }, [me?.onDuty, me?.id]);

  const setDuty = async (on: boolean) => {
    if (!me) return;
    try {
      if (on) await updateDoc(doc(db, 'users', me.id), { onDuty: true });
      else await updateDoc(doc(db, 'users', me.id), { onDuty: false, location: deleteField() });
    } catch { /* ignore */ }
  };

  const doLogout = async () => {
    if (me) { try { await updateDoc(doc(db, 'users', me.id), { onDuty: false, location: deleteField() }); } catch { /* ignore */ } }
    try { await signOut(auth); } catch { /* ignore */ }
    onLogout();
  };

  const NAV: [string, typeof LayoutDashboard][] = [
    [t('dashboard'), LayoutDashboard],
    [t('healthinput'), Activity],
    [t('cases'), FileText],
    [t('verify'), Pill],
    [t('chats'), MessageSquare],
    [t('patients'), Users],
    [t('dappts'), CalendarCheck],
    [t('earnings'), DollarSign],
    [t('myhospitals') || 'My Hospitals', Building2],
    [t('notifs'), Bell],
    [t('myinfo'), UserCircle],
  ];

  if (!me) {
    return <div className="h-screen bg-app flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const renderSidebar = () => (
    <aside className="portal-dark-sidebar w-[270px] bg-navy flex flex-col h-full shrink-0 border-r border-white/5">
      <div className="h-[64px] flex items-center justify-between px-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-white leading-none">UNITED MEDICATION</h1>
            <p className="text-[10px] text-on-navy-muted uppercase tracking-wider font-semibold mt-1">Doctor Portal</p>
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
                  layoutId="activeDoctorTab"
                  className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/30 z-0"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon className="w-4 h-4 shrink-0 relative z-10" strokeWidth={1.5} />
              <span className="truncate relative z-10">{label}</span>
            </button>
          );
        })}

        {/* Duty Status Card */}
        <div className={`mt-4 p-3.5 rounded-xl border transition-all ${me.onDuty ? 'border-ok-bd/40 bg-ok-bg/20' : 'border-white/10 bg-white/5'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-bold tracking-wider flex items-center gap-1.5 ${me.onDuty ? 'text-ok' : 'text-on-navy-muted'}`}>
              <Radio className={`w-3.5 h-3.5 ${me.onDuty ? 'animate-pulse text-ok' : ''}`} />
              {me.onDuty ? 'ON DUTY (GPS ACTIVE)' : 'OFF DUTY'}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setDuty(!me.onDuty)}
            className={`w-full py-2 rounded-lg text-[12px] font-bold transition-all shadow-sm ${
              me.onDuty
                ? 'bg-ok text-white hover:bg-ok/90'
                : 'bg-primary text-white hover:bg-primary-d'
            }`}
          >
            {me.onDuty ? 'Go Off Duty' : 'Go On Duty'}
          </motion.button>
          <p className="text-[10px] text-on-navy-muted mt-2 leading-snug">
            {me.onDuty ? 'Live GPS broadcasting to emergency radar.' : 'Enable to broadcast live clinical availability.'}
          </p>
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
            <p className="text-[13px] font-semibold text-white truncate">Dr. {me.name}</p>
            <p className="text-[11px] text-on-navy-muted truncate">{me.specialization}</p>
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

      {/* Mobile Menu Drawer */}
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

            <div className="hidden sm:flex items-center gap-2 text-[13px] text-muted font-medium truncate">
              <span>Doctor Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted/60" />
              <span className="text-ink font-semibold truncate">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl border border-line bg-app hover:bg-surface text-muted text-[12px] font-medium transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-primary" />
              <span>Search clinical records...</span>
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

        {/* Workspace */}
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
              {activeTab === t('dashboard') && <DoctorHomeTab doctorData={me} go={setActiveTab} />}
              {activeTab === t('healthinput') && <HealthInputTab doctorData={me} />}
              {activeTab === t('cases') && <CasesTab doctorData={me} />}
              {activeTab === t('verify') && <VerifyTab doctorData={me} />}
              {activeTab === t('chats') && <MessagesTab doctorData={me} />}
              {activeTab === t('patients') && <PatientsTab doctorData={me} />}
              {activeTab === t('dappts') && <AppointmentsTab doctorData={me} />}
              {activeTab === t('earnings') && <EarningsTab doctorData={me} />}
              {(activeTab === (t('myhospitals') || 'My Hospitals') || activeTab === 'My Hospitals' || activeTab === 'myhospitals') && <MyHospitalsTab doctorData={me} />}
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
        userRole="doctor"
      />
    </div>
  );
}


