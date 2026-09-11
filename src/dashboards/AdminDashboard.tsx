import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Stethoscope, FileText, Pill, Calendar,
  LogOut, Bell, UserCircle, Settings, Search, Loader2, FileCheck, CreditCard, Upload, Home, ArrowLeft, RefreshCw,
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { MhdUser } from '../lib/types';
import { t, LANG_EVENT } from '../lib/i18n';
import { LangSelect, ThemeSelect } from '../components/Controls';
import { Logo } from './PatientDashboard';
import NotificationBell from '../components/NotificationBell';

import AdminHomeTab from '../tabs/admin/AdminHomeTab';
import AdminPatientsTab from '../tabs/admin/AdminPatientsTab';
import AdminDoctorsTab from '../tabs/admin/AdminDoctorsTab';
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
  const [, force] = useState(0);
  useEffect(() => { const onNavigate = (e: Event) => setActiveTab(t((e as CustomEvent<string>).detail)); window.addEventListener('mhd:navigate', onNavigate); return () => window.removeEventListener('mhd:navigate', onNavigate); }, []);

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

  const doLogout = async () => {
    try { await signOut(auth); } catch { /* ignore */ }
    onLogout();
  };

  const NAV: [string, typeof LayoutDashboard][] = [
    [t('hdash'), LayoutDashboard],
    [t('hpatients'), Users],
    [t('hdoctors'), Stethoscope],
    [t('hcases'), FileText],
    [t('hmeds'), Pill],
    [t('happts'), Calendar],
    [t('hdocs'), FileCheck],
    [t('hupload'), Upload],
    [t('billing'), CreditCard],
    [t('notifs'), Bell],
    [t('settings'), Settings],
  ];

  if (!me) {
    return <div className="h-screen bg-app flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen bg-app font-sans text-ink">
      <aside className="w-[260px] bg-navy flex flex-col h-full shrink-0">
        <div className="h-[64px] flex items-center gap-3 px-6 border-b border-white/10">
          <svg className="w-8 h-8 text-white" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 0L30 8V24L16 32L2 24V8L16 0ZM16 4.6L6 10.4V21.6L16 27.4L26 21.6V10.4L16 4.6Z" />
            <rect x="12" y="12" width="8" height="8" />
          </svg>
          <div>
            <h1 className="text-[15px] font-bold tracking-wide leading-none text-white">UNITED MEDICATION</h1>
            <p className="text-[10px] text-on-navy-muted uppercase tracking-wider font-semibold mt-0.5">Hospital Portal</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          {NAV.map(([label, Icon]) => (
            <button
              key={label}
              onClick={() => setActiveTab(label)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-[4px] text-[14px] font-medium transition-colors mb-0.5 ${
                activeTab === label ? 'bg-primary text-white shadow-sm' : 'text-on-navy-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} /> {label}
            </button>
          ))}
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
              <p className="text-[11px] text-on-navy-muted truncate">{me.adminName}</p>
            </div>
          </div>
          <button onClick={doLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-[4px] text-[14px] font-medium text-danger hover:bg-danger-bg hover:text-danger-d transition-colors">
            <LogOut className="w-4 h-4" strokeWidth={1.5} /> {t('logout')}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-[64px] bg-surface border-b border-line flex items-center justify-between px-8 shrink-0">
          <div className="relative w-[300px] hidden md:block">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
            <input placeholder="Search..." className="w-full h-[36px] bg-app border border-line rounded-[4px] pl-9 pr-3 text-[13px] text-ink focus:outline-none focus:border-primary" />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab(t('hdash'))} title="Home" className="p-2 rounded-lg text-on-navy-muted hover:bg-white/10"><Home className="w-4 h-4" /></button>
            <button onClick={() => window.history.back()} title="Back" className="p-2 rounded-lg text-on-navy-muted hover:bg-white/10"><ArrowLeft className="w-4 h-4" /></button>
            <button onClick={() => window.location.reload()} title="Refresh portal" className="p-2 rounded-lg text-on-navy-muted hover:bg-white/10"><RefreshCw className="w-4 h-4" /></button>
            <LangSelect />
            <ThemeSelect insidePortal />
            <NotificationBell onOpen={() => setActiveTab(t('notifs'))} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar animate-in fade-in duration-200">
          {activeTab === t('hdash') && <AdminHomeTab adminData={me} go={setActiveTab} />}
          {activeTab === t('hpatients') && <AdminPatientsTab adminData={me} />}
          {activeTab === t('hdoctors') && <AdminDoctorsTab adminData={me} />}
          {activeTab === t('hcases') && <AdminCasesTab adminData={me} />}
          {activeTab === t('hmeds') && <AdminMedicinesTab adminData={me} />}
          {activeTab === t('happts') && <AdminAppointmentsTab adminData={me} />}
          {activeTab === t('hdocs') && <AdminReportsTab adminData={me} />}
          {activeTab === t('hupload') && <UploadResultTab adminData={me} />}
          {activeTab === t('billing') && <AdminBillingTab adminData={me} />}
          {activeTab === t('notifs') && <NotificationsTab />}
          {activeTab === t('settings') && <SettingsTab me={me} onSaved={setMe} />}
        </main>
      </div>
    </div>
  );
}
