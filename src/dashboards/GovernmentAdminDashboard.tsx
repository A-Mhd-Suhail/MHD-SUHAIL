import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Bell, Building2, CalendarDays, LogOut, Search, ShieldCheck,
  Stethoscope, Users, Home, ArrowLeft, RefreshCw, UserCircle, Menu, X, ChevronRight,
} from 'lucide-react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import type { Appointment, MhdUser } from '../lib/types';
import NotificationsTab from '../tabs/shared/NotificationsTab';
import SettingsTab from '../tabs/shared/SettingsTab';
import { LangSelect, ThemeSelect } from '../components/Controls';

type Section = 'overview' | 'hospitals' | 'doctors' | 'patients' | 'appointments' | 'notifications' | 'myinfo';

export default function GovernmentAdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [me, setMe] = useState<MhdUser | null>(null);
  const [users, setUsers] = useState<MhdUser[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [section, setSection] = useState<Section>('overview');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('All states');
  const [district, setDistrict] = useState('All districts');
  const [hospital, setHospital] = useState('All hospitals');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    return onSnapshot(doc(db, 'users', uid), (s) => s.exists() && setMe({ id: s.id, ...s.data() } as MhdUser));
  }, []);

  useEffect(() => {
    const us = [
      onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() } as MhdUser)))),
      onSnapshot(collection(db, 'appointments'), (s) => setAppointments(s.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)))),
    ];
    return () => us.forEach((u) => u());
  }, []);

  const hospitals = users.filter((u) => u.role === 'hospital');
  const doctors = users.filter((u) => u.role === 'doctor');
  const patients = users.filter((u) => u.role === 'patient');

  const states = useMemo(() => ['All states', ...Array.from(new Set(users.map((u) => u.state).filter(Boolean)))], [users]);
  const districts = useMemo(() => ['All districts', ...Array.from(new Set(users.filter((u) => state === 'All states' || u.state === state).map((u) => u.district).filter(Boolean)))], [users, state]);
  const hospitalNames = useMemo(() => ['All hospitals', ...Array.from(new Set(hospitals.map((u) => u.name).filter(Boolean)))], [hospitals]);

  const matches = (v: unknown) => String(v || '').toLowerCase().includes(search.toLowerCase());
  const location = (u: MhdUser) => (state === 'All states' || u.state === state) && (district === 'All districts' || u.district === district);

  const fd = doctors.filter((u) => location(u) && (hospital === 'All hospitals' || u.hospital === hospital) && matches(`${u.name} ${u.email} ${u.regNo} ${u.hospital}`));
  const fp = patients.filter((u) => location(u) && matches(`${u.name} ${u.email} ${u.healthId} ${u.phone}`));
  const fh = hospitals.filter((u) => location(u) && matches(`${u.name} ${u.email} ${u.licenseNo}`));
  const fa = appointments.filter((a) => matches(`${a.patientName} ${a.doctorName} ${a.hospital} ${a.status}`));

  const logout = async () => {
    await signOut(auth).catch(() => {});
    onLogout();
  };

  const nav: [Section, string, typeof Building2][] = [
    ['overview', 'Overview', Activity],
    ['hospitals', 'Hospitals', Building2],
    ['doctors', 'Doctors', Stethoscope],
    ['patients', 'Patients', Users],
    ['appointments', 'Appointments', CalendarDays],
    ['notifications', 'Notifications', Bell],
    ['myinfo', 'My Info', UserCircle],
  ];

  const renderSidebar = () => (
    <aside className="portal-dark-sidebar w-[270px] bg-white text-[#1e3a8a] p-5 flex flex-col shrink-0 border-r border-slate-200 h-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-[#2a8eff]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-[#1e3a8a] leading-none">UNITED MEDICATION</h1>
            <p className="text-[10px] text-[#2a8eff] uppercase tracking-wider font-semibold mt-1">Govt Admin Portal</p>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1 text-slate-500 hover:text-[#1e3a8a]">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
        {nav.map(([id, label, Icon], idx) => {
          const active = section === id;
          return (
            <button
              key={`${id}-${idx}`}
              onClick={() => {
                setSection(id);
                setMobileMenuOpen(false);
              }}
              className={`relative w-full text-left p-3 rounded-xl flex gap-3 items-center text-sm font-medium transition-all ${
                active
                  ? 'bg-[#2a8eff] text-white font-semibold shadow-md shadow-[#2a8eff]/30'
                  : 'text-[#2a8eff] hover:bg-slate-100 bg-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 relative z-10 ${active ? 'text-white' : 'text-[#2a8eff]'}`} />
              <span className={`relative z-10 ${active ? 'text-white' : 'text-[#2a8eff]'}`}>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-200 shrink-0">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors border border-red-500 shadow-sm"
        >
          <LogOut className="w-4 h-4 text-white" style={{ color: '#ffffff' }} />
          <span className="text-white font-bold" style={{ color: '#ffffff' }}>Logout</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="dashboard-shell min-h-screen bg-white text-[#1e3a8a] flex overflow-hidden">
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
        .dashboard-shell [class*="bg-\[\#1c364f\]"],
        .dashboard-shell [class*="bg-\[\#102B47\]"],
        .dashboard-shell [class*="bg-\[\#071A2D\]"],
        .dashboard-shell [class*="bg-\[\#0f172a\]"],
        .dashboard-shell [class*="bg-\[\#1e293b\]"],
        .dashboard-shell [style*="#1c364f"],
        .dashboard-shell [style*="#1C364F"] {
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
        .dashboard-shell [class*="bg-\[\#1c364f\]"] *,
        .dashboard-shell [class*="bg-\[\#102B47\]"] *,
        .dashboard-shell [class*="bg-\[\#071A2D\]"] *,
        .dashboard-shell [class*="bg-\[\#0f172a\]"] *,
        .dashboard-shell [class*="bg-\[\#1e293b\]"] *,
        .dashboard-shell [style*="#1c364f"] *,
        .dashboard-shell [style*="#1C364F"] *,
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
      <div className="hidden lg:block h-screen">{renderSidebar()}</div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80] flex lg:hidden bg-slate-950/50 backdrop-blur-sm animate-in fade-in">
          {renderSidebar()}
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="h-[64px] bg-white border-b border-line px-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg text-muted hover:bg-app">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted font-medium truncate">
              <span>National Health Authority</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted/60" />
              <span className="text-ink font-semibold capitalize">{section}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LangSelect />
            <ThemeSelect insidePortal />
            <button onClick={() => setSection("overview")} title="Home" className="p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100"><Home className="w-4 h-4 text-[#1e3a8a]" /></button>
            <button onClick={() => window.history.back()} title="Back" className="p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100"><ArrowLeft className="w-4 h-4 text-[#1e3a8a]" /></button>
            <button onClick={() => window.location.reload()} title="Refresh portal" className="p-2 rounded-lg bg-white border border-line text-[#1e3a8a] hover:bg-slate-100"><RefreshCw className="w-4 h-4 text-[#1e3a8a]" /></button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-[1400px] mx-auto"
            >
              {section === 'notifications' ? (
                <NotificationsTab />
              ) : section === 'myinfo' ? (
                <div>
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-ink">My Administrator Profile</h1>
                    <p className="text-muted text-sm mt-1">Manage government authority credentials and portal settings.</p>
                  </div>
                  <SettingsTab
                    me={me || { id: auth.currentUser?.uid || 'gov-admin', name: auth.currentUser?.displayName || 'Government Admin', role: 'admin', email: auth.currentUser?.email || 'admin@gov.in' } as MhdUser}
                    onSaved={setMe}
                  />
                </div>
              ) : (
                <>
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-ink tracking-tight">
                        {section === 'overview' ? 'National Healthcare Dashboard' : section[0].toUpperCase() + section.slice(1)}
                      </h1>
                      <p className="text-muted text-sm mt-1">System-wide healthcare oversight, hospital registrations, and patient metrics.</p>
                    </div>
                  </div>

                  {/* Filter bar */}
                  <div className="bg-surface border border-line rounded-2xl p-4 mb-6 shadow-xs">
                    <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Geographic & Record Filters</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <label className="text-xs font-medium text-muted">
                        Search Query
                        <div className="relative mt-1">
                          <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
                          <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search records…"
                            className="w-full h-10 pl-9 pr-3 border border-line rounded-xl bg-app text-sm text-ink focus:outline-none focus:border-primary"
                          />
                        </div>
                      </label>

                      <label className="text-xs font-medium text-muted">
                        State
                        <select
                          value={state}
                          onChange={(e) => { setState(e.target.value); setDistrict('All districts'); }}
                          className="mt-1 w-full h-10 px-3 border border-line rounded-xl bg-app text-sm text-ink focus:outline-none focus:border-primary"
                        >
                          {states.map((x, i) => <option key={`st-${x}-${i}`}>{x}</option>)}
                        </select>
                      </label>

                      <label className="text-xs font-medium text-muted">
                        District
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="mt-1 w-full h-10 px-3 border border-line rounded-xl bg-app text-sm text-ink focus:outline-none focus:border-primary"
                        >
                          {districts.map((x, i) => <option key={`dst-${x}-${i}`}>{x}</option>)}
                        </select>
                      </label>

                      <label className="text-xs font-medium text-muted">
                        Hospital
                        <select
                          value={hospital}
                          onChange={(e) => setHospital(e.target.value)}
                          className="mt-1 w-full h-10 px-3 border border-line rounded-xl bg-app text-sm text-ink focus:outline-none focus:border-primary"
                        >
                          {hospitalNames.map((x, i) => <option key={`hosp-${x}-${i}`}>{x}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>

                  {/* Main sections */}
                  {section === 'overview' && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Stat n={hospitals.length} t="Registered Hospitals" icon={Building2} go={() => setSection('hospitals')} />
                      <Stat n={doctors.length} t="Verified Doctors" icon={Stethoscope} go={() => setSection('doctors')} />
                      <Stat n={patients.length} t="Enrolled Patients" icon={Users} go={() => setSection('patients')} />
                      <Stat n={appointments.length} t="Total Appointments" icon={CalendarDays} go={() => setSection('appointments')} />
                    </div>
                  )}

                  {section === 'hospitals' && (
                    <DataTable
                      title={`Registered Hospitals (${fh.length})`}
                      headers={['Hospital Name', 'State', 'District', 'License No', 'Administrator', 'Email']}
                      rows={fh.map((u) => [u.name, u.state, u.district, u.licenseNo || 'Pending', u.adminName, u.email])}
                    />
                  )}

                  {section === 'doctors' && (
                    <DataTable
                      title={`Verified Doctors (${fd.length})`}
                      headers={['Doctor Name', 'State', 'District', 'Specialization', 'Hospital', 'Reg No']}
                      rows={fd.map((u) => [u.name && `Dr. ${u.name}`, u.state, u.district, u.specialization, u.hospital, u.regNo])}
                    />
                  )}

                  {section === 'patients' && (
                    <DataTable
                      title={`Enrolled Patients (${fp.length})`}
                      headers={['Patient Name', 'State', 'District', 'Health ID', 'Phone', 'Email']}
                      rows={fp.map((u) => [u.name, u.state, u.district, u.healthId, u.phone, u.email])}
                    />
                  )}

                  {section === 'appointments' && (
                    <DataTable
                      title={`System Appointments (${fa.length})`}
                      headers={['Patient', 'Doctor', 'Hospital', 'Date & Time', 'Status']}
                      rows={fa.map((a) => [a.patientName, a.doctorName, a.hospital, `${a.date} ${a.time}`, a.status])}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Stat({ n, t, icon: Icon, go }: { n: number; t: string; icon: typeof Building2; go: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={go}
      className="bg-surface border border-line rounded-2xl p-5 text-left shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl font-bold text-ink tracking-tight">{n}</span>
        <div className="p-2.5 rounded-xl bg-app text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-sm font-semibold text-muted">{t}</div>
    </motion.button>
  );
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: unknown[][] }) {
  return (
    <section className="bg-surface border border-line rounded-2xl overflow-hidden shadow-xs">
      <div className="p-4 sm:p-5 border-b border-line font-bold text-ink text-base bg-stripe">{title}</div>
      {rows.length === 0 ? (
        <p className="p-8 text-center text-muted text-sm">No matching records found.</p>
      ) : (
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-app border-b border-line text-left text-muted font-semibold">
                {headers.map((h, i) => (
                  <th className="px-4 py-3.5 whitespace-nowrap text-xs uppercase tracking-wider" key={`th-${h}-${i}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row, i) => (
                <tr className="hover:bg-active/50 transition-colors" key={`row-${i}`}>
                  {row.map((cell, j) => (
                    <td className="px-4 py-3.5 whitespace-nowrap text-ink" key={`cell-${i}-${j}`}>
                      {String(cell ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


