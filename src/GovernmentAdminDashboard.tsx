import { useEffect, useState } from 'react';
import { Activity, Bell, Building2, CalendarDays, LogOut, Search, ShieldCheck, Stethoscope, Users } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import type { Appointment, CaseDoc, MhdUser } from './lib/types';
import NotificationsTab from './tabs/shared/NotificationsTab';

type Section = 'overview' | 'hospitals' | 'doctors' | 'patients' | 'appointments' | 'cases' | 'notifications';

export default function GovernmentAdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [users, setUsers] = useState<MhdUser[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<CaseDoc[]>([]);
  const [section, setSection] = useState<Section>('overview');
  const [search, setSearch] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('All hospitals');

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() } as MhdUser)))),
      onSnapshot(collection(db, 'appointments'), (s) => setAppointments(s.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)))),
      onSnapshot(collection(db, 'cases'), (s) => setCases(s.docs.map((d) => ({ id: d.id, ...d.data() } as CaseDoc)))),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const logout = async () => { await signOut(auth).catch(() => {}); onLogout(); };
  const hospitals = users.filter((u) => u.role === 'hospital');
  const doctors = users.filter((u) => u.role === 'doctor');
  const patients = users.filter((u) => u.role === 'patient');
  const hospitalNames = ['All hospitals', ...hospitals.map((h) => h.name).filter(Boolean)];
  const matches = (v: unknown) => String(v || '').toLowerCase().includes(search.toLowerCase());
  const inHospital = (v?: string) => hospitalFilter === 'All hospitals' || v === hospitalFilter;
  const filteredDoctors = doctors.filter((d) => matches(`${d.name} ${d.regNo} ${d.hospital} ${d.email}`) && inHospital(d.hospital));
  const filteredPatients = patients.filter((p) => matches(`${p.name} ${p.healthId} ${p.email} ${p.phone}`));
  const filteredHospitals = hospitals.filter((h) => matches(`${h.name} ${h.licenseNo} ${h.email}`));
  const filteredAppointments = appointments.filter((a) => matches(`${a.patientName} ${a.doctorName} ${a.hospital} ${a.status}`) && inHospital(a.hospital));
  const filteredCases = cases.filter((c) => matches(`${c.patientName} ${c.healthId} ${c.chiefComplaint} ${c.status}`));
  const today = new Date().toISOString().slice(0, 10);
  const todayCases = cases.filter((c) => new Date(c.createdAt).toISOString().slice(0, 10) === today);
  const nav: [Section, string, typeof Building2][] = [['overview', 'Overview', Activity], ['hospitals', 'Hospitals', Building2], ['doctors', 'Doctors', Stethoscope], ['patients', 'Patients', Users], ['appointments', 'Appointments', CalendarDays], ['cases', 'Cases', Activity], ['notifications', 'Notifications', Bell]];

  return <div className="min-h-screen bg-app text-ink flex"><aside className="w-[250px] bg-navy text-white p-5 flex flex-col shrink-0"><div className="flex items-center gap-3 mb-8"><ShieldCheck className="w-8 h-8" /><div><b>UNITED MEDICATION</b><p className="text-[10px] text-on-navy-muted">Admin Portal</p></div></div><nav className="space-y-1">{nav.map(([id, label, Icon]) => <button key={id} onClick={() => setSection(id)} className={`w-full text-left p-3 rounded-lg flex gap-3 items-center text-sm ${section === id ? 'bg-white/15 text-white' : 'text-on-navy-muted hover:bg-white/10'}`}><Icon className="w-4 h-4" />{label}</button>)}</nav><button onClick={logout} className="mt-auto text-left p-3 text-red-200 flex gap-3"><LogOut className="w-4 h-4" />Logout</button></aside><main className="flex-1 p-6 lg:p-8 overflow-auto"><div className="max-w-[1400px] mx-auto">{section === 'notifications' ? <NotificationsTab /> : <><div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h1 className="text-2xl font-semibold text-heading">{section === 'overview' ? 'Admin Portal' : section[0].toUpperCase() + section.slice(1)}</h1><p className="text-muted mt-1">System-wide healthcare oversight and records.</p></div><div className="flex gap-2"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-muted" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records…" className="h-9 pl-9 pr-3 border border-line rounded-lg bg-surface text-sm" /></div><select value={hospitalFilter} onChange={(e) => setHospitalFilter(e.target.value)} className="h-9 px-3 border border-line rounded-lg bg-surface text-sm">{hospitalNames.map((h) => <option key={h}>{h}</option>)}</select></div></div>{section === 'overview' && <><div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">{[[hospitals.length, 'Hospitals', 'hospitals'], [doctors.length, 'Doctors', 'doctors'], [patients.length, 'Patients', 'patients'], [appointments.length, 'Appointments', 'appointments'], [todayCases.length, "Today's cases", 'cases']].map(([n, label, target]) => <button onClick={() => setSection(target as Section)} className="bg-surface border border-line rounded-xl p-4 text-left hover:-translate-y-0.5" key={String(label)}><div className="text-2xl font-semibold text-heading">{n}</div><div className="text-sm text-muted mt-1">{label}</div></button>)}</div><div className="grid lg:grid-cols-2 gap-6"><DataTable title="Recent appointments" headers={['Patient', 'Doctor', 'Hospital', 'Status']} rows={filteredAppointments.slice(0, 8).map((a) => [a.patientName, a.doctorName, a.hospital, a.status])} /><DataTable title="Recent cases" headers={['Patient', 'Complaint', 'Doctor', 'Status']} rows={filteredCases.slice(0, 8).map((c) => [c.patientName || c.healthId, c.chiefComplaint, c.doctorName || 'Unassigned', c.status])} /></div></>}{section === 'hospitals' && <DataTable title="Registered hospitals" headers={['Hospital', 'License', 'Admin', 'Email']} rows={filteredHospitals.map((h) => [h.name, h.licenseNo || 'Pending', h.adminName, h.email])} />}{section === 'doctors' && <DataTable title={`Registered doctors (${filteredDoctors.length})`} headers={['Doctor ID', 'Doctor', 'Specialization', 'Hospital', 'Registration']} rows={filteredDoctors.map((d) => [d.id, `Dr. ${d.name}`, d.specialization, d.hospital, d.regNo])} />}{section === 'patients' && <DataTable title={`Registered patients (${filteredPatients.length})`} headers={['Patient ID', 'Patient', 'Health ID', 'Phone', 'Email']} rows={filteredPatients.map((p) => [p.id, p.name, p.healthId, p.phone, p.email])} />}{section === 'appointments' && <DataTable title="All appointments" headers={['Patient', 'Doctor', 'Hospital', 'Date', 'Status']} rows={filteredAppointments.map((a) => [a.patientName, a.doctorName, a.hospital, `${a.date} ${a.time}`, a.status])} />}{section === 'cases' && <DataTable title="All patient cases" headers={['Patient', 'Complaint', 'Doctor', 'Created', 'Status']} rows={filteredCases.map((c) => [c.patientName || c.healthId, c.chiefComplaint, c.doctorName || 'Unassigned', new Date(c.createdAt).toLocaleDateString(), c.status])} />}</>}</div></main></div>;
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: unknown[][] }) { return <section className="bg-surface border border-line rounded-xl overflow-hidden"><div className="p-4 border-b border-line font-semibold">{title}</div>{rows.length === 0 ? <p className="p-6 text-muted text-sm">No records found.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-stripe text-left text-muted">{headers.map((h) => <th className="px-4 py-3 font-medium" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr className="border-t border-line hover:bg-stripe" key={i}>{row.map((cell, j) => <td className="px-4 py-3" key={j}>{String(cell ?? '—')}</td>)}</tr>)}</tbody></table></div>}</section>; }
