import { useEffect, useState } from 'react';
import { Pill, Loader2 } from 'lucide-react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Medicine } from '../../lib/types';
import { fmtD } from '../../lib/format';
import { PageHeader, Loading, StatusChip, FilterPills } from '../common';

export default function AdminMedicinesTab({ }: { adminData: MhdUser }) {
  const [meds, setMeds] = useState<Medicine[] | null>(null);
  const [filter, setFilter] = useState('All');
  const [pnames, setPnames] = useState<Record<string, string>>({});

  useEffect(() => {
    const u = onSnapshot(collection(db, 'medicines'), (s) => setMeds(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine))));
    return u;
  }, []);

  useEffect(() => {
    if (meds === null) return;
    getDocs(query(collection(db, 'users'), where('role', '==', 'patient'))).then((s) => {
      const m: Record<string, string> = {};
      s.docs.forEach((d) => { m[d.id] = d.data().name || '—'; });
      setPnames(m);
    }).catch(() => { /* ignore */ });
  }, [meds === null]);

  if (meds === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  const list = [...meds].sort((a, b) => b.createdAt - a.createdAt).filter((m) =>
    filter === 'All' ? true : filter === 'Unverified' ? !m.verified : m.verified);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="💊 All Medicines" sub={`${meds.length} medicines — both doctor-issued and self-reported.`} />
      <FilterPills filters={['All', 'Unverified', 'Verified']} value={filter} onChange={setFilter} />

      <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stripe border-b border-line">
                {['Medicine', 'Dosage', 'Patient', 'Prescribed by', 'Source', 'Verified', 'Active', 'Start'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((m) => (
                <tr key={m.id} className="hover:bg-stripe transition-colors text-[13px]">
                  <td className="px-4 py-3 font-medium text-ink">{m.name}</td>
                  <td className="px-4 py-3 text-muted">{m.dosage || '—'}</td>
                  <td className="px-4 py-3 text-ink">{pnames[m.patientId] || '…'}</td>
                  <td className="px-4 py-3 text-muted">{m.prescribedBy || '—'}</td>
                  <td className="px-4 py-3"><StatusChip ok={m.source === 'doctor'}>{m.source === 'doctor' ? 'Doctor' : 'Patient'}</StatusChip></td>
                  <td className="px-4 py-3"><StatusChip ok={m.verified} warn={!m.verified}>{m.verified ? '✅ Verified' : '🟡 Pending'}</StatusChip></td>
                  <td className="px-4 py-3 text-muted">{m.active === false ? '⏸ Stopped' : '▶ Active'}</td>
                  <td className="px-4 py-3 text-muted">{fmtD(m.startDate)}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted text-[13px]">No medicines.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
