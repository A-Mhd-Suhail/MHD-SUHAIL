import { useEffect, useMemo, useState } from 'react';
import {
  Activity, Bell, Calendar, Check, ClipboardList, Home, ArrowLeft, RefreshCw,
  LayoutDashboard, LogOut, Pill, UserCircle, UserRound, Users, Menu, X, ChevronRight,
} from 'lucide-react';
import { collection, doc, getDoc, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import type { Appointment, Medicine, MhdUser } from '../lib/types';
import { todayStr } from '../lib/format';
import { notify } from '../lib/fs';
import NotificationsTab from '../tabs/shared/NotificationsTab';
import SettingsTab from '../tabs/shared/SettingsTab';
import { LangSelect, ThemeSelect } from '../components/Controls';
import NotificationBell from '../components/NotificationBell';

type Page = 'overview' | 'patients' | 'medicines' | 'appointments' | 'activity' | 'notifications' | 'myinfo';

export default function CaretakerDashboard({ onLogout }: { onLogout: () => void }) {
  const [me, setMe] = useState<MhdUser | null>(null);
  const [patients, setPatients] = useState<MhdUser[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [page, setPage] = useState<Page>('overview');
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onNavigate = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      if (target === 'appointments') setPage('appointments');
      else if (target === 'patients') setPage('patients');
      else if (target === 'notifs') setPage('notifications');
    };
    window.addEventListener('mhd:navigate', onNavigate);
    return () => window.removeEventListener('mhd:navigate', onNavigate);
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    return onSnapshot(doc(db, 'users', uid), (s) => s.exists() && setMe({ id: s.id, ...s.data() } as MhdUser));
  }, []);

  // Only patients assigned to this caretaker are visible in this portal.
  useEffect(() => {
    if (!me?.id) return;
    const assigned = query(collection(db, 'users'), where('caretakerAssignment.caretakerId', '==', me.id));
    return onSnapshot(assigned, async (s) => {
      const byId = new Map<string, MhdUser>();
      s.docs.forEach((d) => {
        const p = { id: d.id, ...d.data() } as MhdUser;
        if (p.role === 'patient' && ['pending', 'accepted'].includes(p.caretakerAssignment?.status || '')) byId.set(p.id, p);
      });
      if (me.caretakerPatientId && !byId.has(me.caretakerPatientId)) {
        const p = await getDoc(doc(db, 'users', me.caretakerPatientId));
        if (p.exists() && p.data().role === 'patient') byId.set(p.id, { id: p.id, ...p.data() } as MhdUser);
      }
      const list = [...byId.values()];
      setPatients(list);
      setSelectedId((old) => list.some((p) => p.id === old) ? old : list[0]?.id || '');
    }, () => setError('Could not load assigned patients.'));
  }, [me?.id, me?.caretakerPatientId]);

  const patientIds = patients.map((p) => p.id);

  useEffect(() => {
    if (!patientIds.length) { setMedicines([]); return; }
    return onSnapshot(query(collection(db, 'medicines'), where('patientId', 'in', patientIds.slice(0, 30))), (s) => setMedicines(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine))), () => setError('Could not load medicine instructions.'));
  }, [patientIds.join(',')]);

  useEffect(() => {
    if (!patientIds.length) { setAppointments([]); return; }
    return onSnapshot(query(collection(db, 'appointments'), where('patientId', 'in', patientIds.slice(0, 30))), (s) => setAppointments(s.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment))), () => setError('Could not load appointments.'));
  }, [patientIds.join(',')]);

  const selected = patients.find((p) => p.id === selectedId);
  const today = todayStr();
  const patientMeds = useMemo(() => medicines.filter((m) => m.patientId === selectedId && m.active !== false), [medicines, selectedId]);
  const patientAppts = useMemo(() => appointments.filter((a) => a.patientId === selectedId).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)), [appointments, selectedId]);
  const visiblePatients = patients;

  const mark = async (m: Medicine, taken: boolean) => {
    try {
      await updateDoc(doc(db, 'medicines', m.id), { [`takenDates.${today}`]: taken, lastUpdatedBy: me?.name || 'Nurse', lastUpdatedAt: Date.now() });
    } catch {
      setError('Could not save this care update.');
    }
  };

  const respondToAssignment = async (accept: boolean) => {
    if (!selected?.caretakerAssignment || selected.caretakerAssignment.caretakerId !== me.id) return;
    try {
      await updateDoc(doc(db, 'users', selected.id), { 'caretakerAssignment.status': accept ? 'accepted' : 'rejected', 'caretakerAssignment.updatedAt': Date.now(), ...(accept ? { caretakerPatientId: selected.id, caretakerPatientName: selected.name } : {}) });
      await updateDoc(doc(db, 'users', me.id), { ...(accept ? { caretakerPatientId: selected.id, caretakerPatientName: selected.name } : {}) });
      await notify(selected.id, accept ? 'Your caretaker is now connected' : 'Caretaker assignment declined', accept ? `${me.name} accepted the doctor’s assignment. You can now call or message your caretaker from My Caretaker.` : `${me.name} declined the caretaker assignment.`, 'caretaker');
    } catch {
      setError('Could not save the assignment response.');
    }
  };

  const logout = async () => {
    await signOut(auth).catch(() => {});
    onLogout();
  };

  const nav: [Page, string, typeof LayoutDashboard][] = [
    ['overview', 'Overview', LayoutDashboard],
    ['patients', 'All Patients', Users],
    ['medicines', 'Medicine Monitor', Pill],
    ['appointments', 'Appointments', Calendar],
    ['activity', 'Care Activities', Activity],
    ['notifications', 'Notifications', Bell],
    ['myinfo', 'My Info', UserCircle],
  ];

  if (!me) return <div className="min-h-screen flex items-center justify-center bg-app text-muted">Loading Caretaker Portal…</div>;

  const renderSidebar = () => (
    <aside className="portal-dark-sidebar w-[270px] bg-navy text-white p-5 flex flex-col h-full shrink-0 border-r border-white/5">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/20 border border-primary/30 text-primary">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-white leading-none">UNITED MEDICATION</h1>
            <p className="text-[10px] text-on-navy-muted uppercase tracking-wider font-semibold mt-1">Caretaker Portal</p>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1 text-on-navy-muted hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-1 space-y-1 custom-scrollbar">
        {nav.map(([id, label, Icon], i) => {
          const active = page === id;
          return (
            <button
              key={`${id}-${i}`}
              onClick={() => {
                setPage(id);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                active
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-on-navy-muted hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-white/10 space-y-2 shrink-0">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white truncate">{me.name}</p>
            <p className="text-[11px] text-on-navy-muted truncate">{me.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-danger hover:bg-danger-bg/20 border border-danger-bd/20 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} /> Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-app text-ink overflow-hidden">
      <div className="hidden lg:block h-screen">{renderSidebar()}</div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80] flex lg:hidden bg-slate-950/50 backdrop-blur-sm animate-in fade-in">
          {renderSidebar()}
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-[64px] bg-surface border-b border-line flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 rounded-lg text-muted hover:bg-app">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted font-medium truncate">
              <span>Caretaker Portal</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted/60" />
              <span className="text-ink font-semibold capitalize">{page}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setPage("overview")} title="Home" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><Home className="w-4 h-4" /></button>
            <button onClick={() => window.history.back()} title="Back" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><ArrowLeft className="w-4 h-4" /></button>
            <button onClick={() => window.location.reload()} title="Refresh portal" className="p-2 rounded-lg text-muted hover:bg-app hover:text-primary"><RefreshCw className="w-4 h-4" /></button>
            <LangSelect />
            <ThemeSelect insidePortal />
            <NotificationBell onOpen={() => setPage('notifications')} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar animate-in fade-in duration-200">
          <div className="max-w-[1250px] mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-ink tracking-tight">
                {page === 'overview' ? 'Care Monitoring Dashboard' : nav.find((x) => x[0] === page)?.[1]}
              </h1>
              <p className="text-muted text-sm mt-1">
                {page === 'myinfo' ? 'Manage your personal profile, photo and care preferences.' : 'Monitor assigned patient medicines, appointments, and daily care activities.'}
              </p>
            </div>

            {error && <div className="bg-danger-bg border border-danger-bd text-danger rounded-2xl p-4 text-sm font-medium">{error}</div>}

            {page === "notifications" && <NotificationsTab />}
            {page === 'myinfo' && <SettingsTab me={me} onSaved={setMe} />}

            {page !== 'myinfo' && page !== 'notifications' && (
              <div className="bg-surface border border-line rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-xs">
                <label className="text-xs font-bold text-muted uppercase tracking-wider">Select Active Patient:</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="h-10 px-3.5 border border-line rounded-xl bg-app text-sm text-ink focus:outline-none focus:border-primary min-w-[260px] font-medium"
                >
                  <option value="">Select assigned patient</option>
                  {visiblePatients.map((p, i) => (
                    <option key={`${p.id}-${i}`} value={p.id}>{p.name} · {p.healthId || p.id.slice(0, 8)}</option>
                  ))}
                </select>
              </div>
            )}

            {page === 'overview' && (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card icon={<Users className="w-5 h-5" />} n={patients.length} label="Assigned Patients" />
                  <Card icon={<Pill className="w-5 h-5" />} n={medicines.filter((m) => m.active !== false).length} label="Active Instructions" />
                  <Card icon={<Calendar className="w-5 h-5" />} n={appointments.filter((a) => a.status === 'upcoming').length} label="Upcoming Consultations" />
                  <Card icon={<Check className="w-5 h-5" />} n={patientMeds.filter((m) => m.takenDates?.[today]).length} label="Taken Today" />
                </div>
                <PatientPanel selected={selected} meds={patientMeds} appointments={patientAppts} mark={mark} respond={respondToAssignment} />
              </>
            )}

            {page === 'patients' && (
              <section className="bg-surface border border-line rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 sm:p-5 border-b border-line font-bold text-ink text-base bg-stripe">
                  Assigned Patients ({visiblePatients.length})
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-app border-b border-line text-left text-muted font-semibold">
                        <th className="p-3.5">Patient</th>
                        <th className="p-3.5">Health ID</th>
                        <th className="p-3.5">State</th>
                        <th className="p-3.5">District</th>
                        <th className="p-3.5">Phone</th>
                        <th className="p-3.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {visiblePatients.map((p, i) => (
                        <tr key={`${p.id}-${i}`} className="hover:bg-active/50 transition-colors">
                          <td className="p-3.5 font-semibold text-ink">{p.name}</td>
                          <td className="p-3.5 font-mono text-muted">{p.healthId || '-'}</td>
                          <td className="p-3.5 text-muted">{p.state || '-'}</td>
                          <td className="p-3.5 text-muted">{p.district || '-'}</td>
                          <td className="p-3.5 text-muted">{p.phone || '-'}</td>
                          <td className="p-3.5">
                            <button
                              onClick={() => { setSelectedId(p.id); setPage('overview'); }}
                              className="text-primary font-bold hover:underline"
                            >
                              Monitor Care
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {page === 'medicines' && (
              <PatientPanel selected={selected} meds={patientMeds} appointments={patientAppts} mark={mark} respond={respondToAssignment} />
            )}

            {page === 'appointments' && (
              <section className="bg-surface border border-line rounded-2xl p-6 shadow-xs">
                <h2 className="font-bold text-ink text-lg mb-4">
                  Upcoming Appointments {selected ? `for ${selected.name}` : ''}
                </h2>
                {patientAppts.length ? (
                  <div className="divide-y divide-line">
                    {patientAppts.map((a, i) => (
                      <div key={`${a.id}-${i}`} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <b className="text-ink font-bold">{a.date} · {a.time}</b>
                          <p className="text-sm text-muted mt-1">{a.doctorName} · {a.hospital || 'Hospital'} · {a.type}</p>
                        </div>
                        <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 capitalize">
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-sm py-4">No appointments recorded for this patient.</p>
                )}
              </section>
            )}

            {page === 'activity' && (
              <section className="bg-surface border border-line rounded-2xl p-6 shadow-xs">
                <h2 className="font-bold text-ink text-lg mb-4">Care Activity Log</h2>
                {patientMeds.filter((m) => m.lastUpdatedAt).length ? (
                  <div className="divide-y divide-line">
                    {patientMeds.filter((m) => m.lastUpdatedAt).map((m, i) => (
                      <div key={`${m.id}-${i}`} className="py-3.5 text-sm">
                        <b className="text-ink font-semibold">{m.name}</b>
                        <p className="text-muted mt-0.5">
                          {m.takenDates?.[today] ? 'Marked taken today' : 'Marked not taken today'} · Updated by {String(m.lastUpdatedBy || '-')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-sm py-4">No care activity recorded for the selected patient yet.</p>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({ icon, n, label }: { icon: React.ReactNode; n: number; label: string }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl font-bold text-ink tracking-tight">{n}</span>
        <div className="p-2.5 rounded-xl bg-app text-primary">{icon}</div>
      </div>
      <p className="text-xs font-bold text-muted uppercase tracking-wider">{label}</p>
    </div>
  );
}

function PatientPanel({ selected, meds, appointments, mark, respond }: { selected?: MhdUser; meds: Medicine[]; appointments: Appointment[]; mark: (m: Medicine, taken: boolean) => void; respond: (accept: boolean) => void }) {
  return (
    <section className="bg-surface border border-line rounded-2xl p-6 shadow-xs">
      {selected?.caretakerAssignment?.status === "pending" && selected.caretakerAssignment.caretakerId === auth.currentUser?.uid && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 rounded-2xl p-4 text-sm">
          <b>Caretaker assignment request</b>
          <p className="mt-1">Dr. {selected.caretakerAssignment.doctorName.replace(/^Dr. /, "")} assigned you to care for this patient.</p>
          <div className="flex gap-3 mt-3">
            <button onClick={() => respond(true)} className="px-4 py-1.5 bg-ok text-white font-semibold rounded-xl text-xs shadow-sm">Accept Assignment</button>
            <button onClick={() => respond(false)} className="px-4 py-1.5 border border-danger-bd text-danger font-semibold rounded-xl text-xs hover:bg-danger-bg">Decline</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6 pb-4 border-b border-line">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <UserRound className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-ink">{selected ? selected.name : 'Select a Patient'}</h2>
          <p className="text-xs text-muted mt-0.5">
            {selected ? `${selected.healthId || ''} · ${selected.state || ''}, ${selected.district || ''}` : 'Choose an assigned patient above to view medicine schedule.'}
          </p>
        </div>
      </div>

      {selected && (
        <>
          <h3 className="font-bold text-ink text-base mb-3">Daily Medication Checklist</h3>
          {meds.length ? (
            <div className="space-y-3">
              {meds.map((m, i) => {
                const taken = !!m.takenDates?.[todayStr()];
                return (
                  <div key={`${m.id}-${i}`} className="border border-line rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-app hover:bg-surface transition-colors">
                    <div>
                      <b className="text-ink font-semibold text-base">{m.name}</b>
                      <p className="text-xs text-muted mt-0.5">{m.dosage || 'Follow doctor instructions'} · Prescribed by {m.prescribedBy || 'Doctor'}</p>
                    </div>
                    <button
                      onClick={() => mark(m, !taken)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        taken
                          ? 'bg-ok-bg text-ok border border-ok-bd/40'
                          : 'bg-primary text-white shadow-sm hover:bg-primary-d'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {taken ? 'Taken Today' : 'Mark as Taken'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted py-4">No active medicine instructions recorded.</p>
          )}
          <p className="text-xs font-medium text-muted mt-4">{appointments.length} appointment(s) recorded for this patient.</p>
        </>
      )}
    </section>
  );
}

