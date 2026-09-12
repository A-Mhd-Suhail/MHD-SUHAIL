import { useEffect, useState } from 'react';
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
    <aside className="portal-dark-sidebar w-[270px] bg-navy flex flex-col h-full shrink-0 border-r border-white/5">
      <div className="h-[64px] flex items-center justify-between px-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-white leading-none">UNITED MEDICATION</h1>
            <p className="text-[10px] text-on-navy-muted uppercase tracking-wider font-semibold mt-1">Hospital Portal</p>
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
        {NAV.map(([label, Icon, badgeCount], i) => {
          const isActive = activeTab === label;
          return (
            <button
              key={`${label}-${i}`}
              onClick={() => {
                setActiveTab(label);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-on-navy-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 truncate">
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{label}</span>
              </span>
              {badgeCount && badgeCount > 0 ? (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm shrink-0">
                  {badgeCount}
                </span>
              ) : null}
            </button>
          );
        })}
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
            <p className="text-[11px] text-on-navy-muted truncate">{me.adminName}</p>
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
              <span>Hospital Admin</span>
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
              <span>Search hospital records...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] bg-surface px-1.5 py-0.5 rounded border border-line text-muted">
                <Command className="w-3 h-3" />K
              </kbd>
            </button>

            <button onClick={() => setActiveTab(t('hdash'))} title="Home" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><Home className="w-4 h-4" /></button>
            <button onClick={() => window.history.back()} title="Back" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><ArrowLeft className="w-4 h-4" /></button>
            <button onClick={() => window.location.reload()} title="Refresh portal" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><RefreshCw className="w-4 h-4" /></button>

            <LangSelect />
            <ThemeSelect insidePortal />
            <NotificationBell onOpen={() => setActiveTab(t('notifs'))} />
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar animate-in fade-in duration-200">
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

