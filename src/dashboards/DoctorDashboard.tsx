import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Activity, FileText, Pill, MessageSquare, DollarSign,
  LogOut, Bell, UserCircle, Settings, Loader2, Users, CalendarCheck, Home, ArrowLeft, RefreshCw,
  Building2,
} from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { MhdUser } from '../lib/types';
import { t, LANG_EVENT } from '../lib/i18n';
import { LangSelect, ThemeSelect } from '../components/Controls';
import { Logo } from './PatientDashboard';

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
  const [, force] = useState(0);
  useEffect(() => { const onNavigate = (e: Event) => setActiveTab(t((e as CustomEvent<string>).detail)); window.addEventListener('mhd:navigate', onNavigate); return () => window.removeEventListener('mhd:navigate', onNavigate); }, []);
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

  /* Duty + live location (GPS throttled to 1 write / 20s, like the original) */
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

  return (
    <div className="flex h-screen bg-app font-sans text-ink">
      <aside className="portal-dark-sidebar w-[260px] bg-navy flex flex-col h-full shrink-0">
        <div className="h-[64px] flex items-center gap-3 px-6 border-b border-white/10">
          <Logo />
          <div>
            <h1 className="text-[15px] font-bold tracking-wide leading-none text-white">UNITED MEDICATION</h1>
            <p className="text-[10px] text-on-navy-muted uppercase tracking-wider font-semibold mt-0.5">Doctor Portal</p>
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
          <div className={`doctor-duty-card mt-4 mx-1 p-3 rounded-[4px] border ${me.onDuty ? 'border-ok-bd bg-ok-bg' : 'border-line bg-app'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[12px] font-bold ${me.onDuty ? 'text-ok' : 'text-muted'}`}>{me.onDuty ? 'ON DUTY' : 'OFF DUTY'}</span>
            </div>
            <button
              onClick={() => setDuty(!me.onDuty)}
              className={`w-full h-[32px] rounded-[4px] text-[12px] font-medium transition-colors ${me.onDuty ? 'bg-ok text-white hover:opacity-90' : 'bg-primary text-on-navy hover:bg-primary-d'}`}
            >
              {me.onDuty ? 'Go Off Duty' : 'Go On Duty'}
            </button>
            <p className="text-[10px] text-muted mt-1.5 leading-snug">Shares live location with patients while on duty.</p>
          </div>
        </div>
        <div className="p-4 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 mb-2">
            {me.photo ? (
              <img src={me.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><UserCircle className="w-5 h-5 text-white" strokeWidth={1.5} /></div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">Dr. {me.name}</p>
              <p className="text-[11px] text-on-navy-muted truncate">{me.specialization}</p>
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
        </main>
      </div>
    </div>
  );
}
