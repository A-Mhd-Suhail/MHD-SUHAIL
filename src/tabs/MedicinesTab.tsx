import { useEffect, useState } from 'react';
import { Pill, Loader2 } from 'lucide-react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser, Medicine } from '../lib/types';
import { fmtD, todayStr, schedTimeFromDosage } from '../lib/format';
import { toast } from '../components/Toaster';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState, StatusChip, inputCls, labelCls, btnPrimary, FilterPills } from './common';

export default function MedicinesTab({ patientData }: { patientData: MhdUser }) {
  const [meds, setMeds] = useState<Medicine[] | null>(null);
  const [filter, setFilter] = useState('All');
  const [f, setF] = useState({ name: '', dosage: '', startDate: todayStr(), durationDays: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => bind<Medicine>('medicines', [['patientId', '==', patientData.id]], setMeds), [patientData.id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) { toast('Enter the medicine name.', 'err'); return; }
    setBusy(true);
    try {
      await addDoc(collection(db, 'medicines'), {
        patientId: patientData.id, name: f.name.trim(), dosage: f.dosage,
        startDate: f.startDate || todayStr(), durationDays: f.durationDays,
        prescribedBy: `${patientData.name} (self-reported)`, verified: false,
        source: 'patient', active: true, createdAt: Date.now(),
      });
      toast('Medicine added');
      setF({ name: '', dosage: '', startDate: todayStr(), durationDays: '' });
    } catch { toast('Could not add medicine', 'err'); } finally { setBusy(false); }
  };

  const markTaken = async (m: Medicine) => {
    try {
      await updateDoc(doc(db, 'medicines', m.id), { [`takenDates.${todayStr()}`]: true });
      toast('Marked as taken');
    } catch { toast('Could not update', 'err'); }
  };

  const toggleActive = async (m: Medicine) => {
    try {
      await updateDoc(doc(db, 'medicines', m.id), { active: m.active === false });
      toast(m.active === false ? 'Medicine restarted' : 'Medicine stopped');
    } catch { toast('Could not update', 'err'); }
  };

  if (meds === null) return <div className="max-w-[1000px] mx-auto"><Loading /></div>;

  const list = [...meds].sort((a, b) => b.createdAt - a.createdAt).filter((m) =>
    filter === 'All' ? true : filter === 'Active' ? m.active !== false : m.active === false);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title="Medicines" sub="Self-report medicines; a doctor verifies them. Track what you take each day." />

      <form onSubmit={add} className="bg-surface border border-line rounded-[4px] p-5 shadow-sm grid sm:grid-cols-4 gap-3 items-end">
        <div><label className={labelCls}>Medicine name *</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} placeholder="e.g. Metformin 500mg" /></div>
        <div><label className={labelCls}>Dosage / when</label><input value={f.dosage} onChange={(e) => setF({ ...f, dosage: e.target.value })} className={inputCls} placeholder="1 tablet after breakfast" /></div>
        <div><label className={labelCls}>Start date</label><input type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} className={inputCls} /></div>
        <div className="flex gap-2 items-end">
          <div className="flex-1"><label className={labelCls}>Days</label><input value={f.durationDays} onChange={(e) => setF({ ...f, durationDays: e.target.value })} className={inputCls} placeholder="e.g. 30" /></div>
          <button type="submit" disabled={busy} className={btnPrimary + ' flex items-center gap-1.5 disabled:opacity-70'}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : ''} Add</button>
        </div>
      </form>

      <FilterPills filters={['All', 'Active', 'Stopped']} value={filter} onChange={setFilter} />

      {list.length === 0 ? (
        <EmptyState icon={<Pill className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No medicines here" sub="Add one above — a doctor will verify it." />
      ) : (
        <div className="space-y-3">
          {list.map((m) => {
            const taken = !!(m.takenDates && m.takenDates[todayStr()]);
            return (
              <div key={m.id} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-ink">{m.name} {taken && <span className="text-[12px] text-ok font-medium">· taken today</span>}</p>
                  <p className="text-[12px] text-muted mt-0.5">
                    {m.dosage || '—'} ·{schedTimeFromDosage(m.dosage || '')} · started {fmtD(m.startDate)}
                    {m.durationDays ? ` · ${m.durationDays} days` : ''} · by {m.prescribedBy || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip ok={m.verified} warn={!m.verified}>{m.verified ? `Verified${m.verifiedBy ? ` · ${m.verifiedBy}` : ''}` : 'Pending'}</StatusChip>
                  {m.active !== false && !taken && (
                    <button onClick={() => markTaken(m)} className="text-[12px] font-medium text-ok border border-ok-bd px-3 py-1.5 rounded-[4px] hover:bg-ok-bg transition-colors">Mark Taken</button>
                  )}
                  <button onClick={() => toggleActive(m)} className="text-[12px] font-medium text-muted border border-line px-3 py-1.5 rounded-[4px] hover:bg-app transition-colors">
                    {m.active === false ? '▶ Restart' : 'Stop'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
