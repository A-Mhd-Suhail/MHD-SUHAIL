import { useEffect, useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser } from '../../lib/types';
import { ageOf, maskAadhaar } from '../../lib/format';
import { logAccess } from '../../lib/fs';
import Modal from '../../components/Modal';
import { PageHeader, inputCls, Loading } from '../common';

interface PRow { id: string; name?: string; healthId?: string; dob?: string; gender?: string; bloodGroup?: string; phone?: string; aadhaar?: string; address?: string; emergencyName?: string; emergencyPhone?: string; allergies?: string; conditions?: string; surgeries?: string; heightCm?: string; weightKg?: string; photo?: string }

export default function AdminPatientsTab({ adminData }: { adminData: MhdUser }) {
  const [patients, setPatients] = useState<PRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<PRow | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'patient')))
      .then((s) => setPatients(s.docs.map((d) => ({ id: d.id, ...d.data() } as PRow))))
      .catch(() => setPatients([]));
  }, []);

  const openP = async (p: PRow) => {
    setOpen(p);
    logAccess(p.id, adminData.name, 'hospital', 'Hospital viewed your record').catch(() => { /* ignore */ });
  };

  if (patients === null) return <div className="max-w-[1200px] mx-auto"><div className="bg-surface border border-line rounded-[4px] p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted mx-auto" /></div></div>;

  const list = patients.filter((p) =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.healthId || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search));

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="All Patients" sub={`${patients.length} registered patients.`} />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / Health ID / phone…" className={inputCls + ' max-w-[340px]'} />

      <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stripe border-b border-line">
                {['Patient', 'Health ID', 'Age/Gender', 'Blood', 'Phone', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((p) => (
                <tr key={p.id} className="hover:bg-stripe transition-colors text-[13px] cursor-pointer" onClick={() => openP(p)}>
                  <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-primary">{p.healthId}</td>
                  <td className="px-4 py-3 text-muted">{ageOf(p.dob)} / {p.gender || '—'}</td>
                  <td className="px-4 py-3 text-muted">{p.bloodGroup || '—'}</td>
                  <td className="px-4 py-3 text-muted">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-primary text-[12px] font-medium">View →</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted text-[13px]">No patients found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal wide title={open.name || 'Patient record'} onClose={() => setOpen(null)}>
          <div className="space-y-4 text-[13px]">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <p><b className="text-muted">Health ID:</b> <span className="font-mono">{open.healthId}</span></p>
              <p><b className="text-muted">Age/Gender:</b> {ageOf(open.dob)} / {open.gender || '—'}</p>
              <p><b className="text-muted">Blood:</b> {open.bloodGroup || '—'}</p>
              <p><b className="text-muted">Aadhaar:</b> {maskAadhaar(open.aadhaar)}</p>
              <p><b className="text-muted">Phone:</b> {open.phone || '—'}</p>
              <p><b className="text-muted">Address:</b> {open.address || '—'}</p>
              <p><b className="text-muted">Emergency:</b> {open.emergencyName || '—'} {open.emergencyPhone || ''}</p>
              <p><b className="text-muted">Height/Weight:</b> {open.heightCm || '—'} cm / {open.weightKg || '—'} kg</p>
            </div>
            <div className="space-y-1">
              <p><b className="text-muted">Allergies:</b> <span className="text-danger">{open.allergies || '—'}</span></p>
              <p><b className="text-muted">Conditions:</b> {open.conditions || '—'}</p>
              <p><b className="text-muted">Surgeries:</b> <span className="whitespace-pre-line">{open.surgeries || '—'}</span></p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
