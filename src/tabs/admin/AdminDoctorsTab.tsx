import { useEffect, useState } from 'react';
import { Stethoscope, Loader2 } from 'lucide-react';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Appointment, CaseDoc, Bill } from '../../lib/types';
import { fmtD, rupees } from '../../lib/format';
import Modal from '../../components/Modal';
import { PageHeader, Loading, StatusChip } from '../common';

interface DRow { id: string; name?: string; specialization?: string; hospital?: string; hospitals?: string[]; regNo?: string; phone?: string; experience?: string; onDuty?: boolean; photo?: string }

export default function AdminDoctorsTab({ adminData }: { adminData: MhdUser }) {
  const [doctors, setDoctors] = useState<DRow[] | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<CaseDoc[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [open, setOpen] = useState<DRow | null>(null);
  const [tab, setTab] = useState<'affiliated' | 'all'>('affiliated');

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'doctor')))
      .then((s) => setDoctors(s.docs.map((d) => ({ id: d.id, ...d.data() } as DRow))))
      .catch(() => setDoctors([]));
    const us = [
      onSnapshot(collection(db, 'appointments'), (s) => setAppts(s.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)))),
      onSnapshot(collection(db, 'cases'), (s) => setCases(s.docs.map((d) => ({ id: d.id, ...d.data() } as CaseDoc)))),
      onSnapshot(collection(db, 'bills'), (s) => setBills(s.docs.map((d) => ({ id: d.id, ...d.data() } as Bill)))),
    ];
    return () => us.forEach((u) => u());
  }, []);

  if (doctors === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  const isAffiliated = (d: DRow) => {
    if (!adminData.name) return false;
    const hospName = adminData.name.trim().toLowerCase();
    const primary = (d.hospital || '').trim().toLowerCase();
    const affiliated = (d.hospitals || []).map((h) => h.trim().toLowerCase());
    return primary === hospName || affiliated.includes(hospName);
  };

  const affiliatedDoctors = doctors.filter(isAffiliated);
  const displayList = tab === 'affiliated' ? affiliatedDoctors : doctors;

  const dAppts = open ? appts.filter((a) => a.doctorId === open.id) : [];
  const dCases = open ? cases.filter((c) => c.doctorId === open.id) : [];
  const dEarn = open ? bills.filter((b) => b.doctorId === open.id && b.status === 'paid').reduce((s, b) => s + (b.total || 0), 0) : 0;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Hospital Doctors"
          sub={`${affiliatedDoctors.length} affiliated with ${adminData.name || 'your hospital'} (${doctors.length} total registered).`}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setTab('affiliated')}
            className={`px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors ${
              tab === 'affiliated' ? 'bg-primary text-white shadow-sm' : 'bg-surface border border-line text-muted hover:text-ink'
            }`}
          >
            Affiliated With Us ({affiliatedDoctors.length})
          </button>
          <button
            onClick={() => setTab('all')}
            className={`px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors ${
              tab === 'all' ? 'bg-primary text-white shadow-sm' : 'bg-surface border border-line text-muted hover:text-ink'
            }`}
          >
            All Doctors ({doctors.length})
          </button>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stripe border-b border-line">
                {['Doctor', 'Specialization', 'Hospital Affiliation', 'Reg No', 'Phone', 'Duty', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {displayList.map((d) => {
                const affiliated = isAffiliated(d);
                return (
                  <tr key={d.id} className="hover:bg-stripe transition-colors text-[13px] cursor-pointer" onClick={() => setOpen(d)}>
                    <td className="px-4 py-3 font-medium text-ink">
                      <div className="flex items-center gap-2">
                        <span>Dr. {d.name}</span>
                        {affiliated && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-ok-bg text-ok border border-ok-bd">
                            Affiliated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{d.specialization || '—'}</td>
                    <td className="px-4 py-3 text-muted">
                      <span>{d.hospital || '—'}</span>
                      {d.hospitals && d.hospitals.length > 1 && (
                        <span className="text-[11px] text-primary ml-1 block font-normal">
                          +{d.hospitals.length - 1} more facility
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-primary">{d.regNo || '—'}</td>
                    <td className="px-4 py-3 text-muted">{d.phone || '—'}</td>
                    <td className="px-4 py-3"><StatusChip ok={d.onDuty} warn={!d.onDuty}>{d.onDuty ? 'On' : 'Off'}</StatusChip></td>
                    <td className="px-4 py-3 text-primary text-[12px] font-medium">View →</td>
                  </tr>
                );
              })}
              {displayList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted text-[13px]">
                    {tab === 'affiliated'
                      ? 'No doctors currently affiliated with this hospital. Accept join requests to add doctors automatically.'
                      : 'No doctors registered.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal wide title={`Dr. ${open.name}`} onClose={() => setOpen(null)}>
          <div className="space-y-4 text-[13px]">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-app border border-line rounded-[4px] p-3"><p className="text-[11px] text-muted uppercase font-bold">Appointments</p><p className="text-[20px] font-bold text-heading">{dAppts.length}</p></div>
              <div className="bg-app border border-line rounded-[4px] p-3"><p className="text-[11px] text-muted uppercase font-bold">Cases reviewed</p><p className="text-[20px] font-bold text-heading">{dCases.length}</p></div>
              <div className="bg-app border border-line rounded-[4px] p-3"><p className="text-[11px] text-muted uppercase font-bold">Earnings</p><p className="text-[20px] font-bold text-ok">{rupees(dEarn)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <p><b className="text-muted">Specialization:</b> {open.specialization || '—'}</p>
              <p><b className="text-muted">Experience:</b> {open.experience || '—'} yrs</p>
              <p><b className="text-muted">Hospital:</b> {open.hospital || '—'}</p>
              <p><b className="text-muted">Reg No:</b> <span className="font-mono">{open.regNo || '—'}</span></p>
              <p><b className="text-muted">Phone:</b> {open.phone || '—'}</p>
            </div>
            <div>
              <h5 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Recent appointments</h5>
              {[...dAppts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map((a) => (
                <p key={a.id} className="py-1 border-b border-line last:border-0">{a.patientName} · {fmtD(a.date)} {a.time} · <span className="text-muted">{a.status}</span></p>
              ))}
              {dAppts.length === 0 && <p className="text-muted">—</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
