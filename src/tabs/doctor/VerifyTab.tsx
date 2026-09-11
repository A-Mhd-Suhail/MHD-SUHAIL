import { useEffect, useState } from 'react';
import { Pill, Loader2, CheckCircle2 } from 'lucide-react';
import { collection, doc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Medicine } from '../../lib/types';
import { fmtD } from '../../lib/format';
import { notify } from '../../lib/fs';
import { toast } from '../../components/Toaster';
import { PageHeader, EmptyState, StatusChip } from '../common';

export default function VerifyTab({ doctorData }: { doctorData: MhdUser }) {
  const [meds, setMeds] = useState<Medicine[] | null>(null);
  const [pnames, setPnames] = useState<Record<string, string>>({});

  useEffect(() => {
    const u = onSnapshot(query(collection(db, 'medicines'), where('verified', '==', false)), (s) =>
      setMeds(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine))));
    return u;
  }, []);

  useEffect(() => {
    if (!meds || meds.length === 0) return;
    getDocs(query(collection(db, 'users'), where('role', '==', 'patient'))).then((s) => {
      const m: Record<string, string> = {};
      s.docs.forEach((d) => { m[d.id] = d.data().name || '—'; });
      setPnames(m);
    }).catch(() => { /* ignore */ });
  }, [meds?.length]);

  const verify = async (m: Medicine) => {
    try {
      await updateDoc(doc(db, 'medicines', m.id), { verified: true, verifiedBy: 'Dr. ' + doctorData.name, verifiedAt: Date.now() });
      await notify(m.patientId, 'Medicine verified', `${m.name} was verified by Dr. ${doctorData.name}`);
      toast(`${m.name} verified`);
    } catch { toast('Could not verify', 'err'); }
  };

  if (meds === null) return <div className="max-w-[1200px] mx-auto"><div className="bg-surface border border-line rounded-[4px] p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted mx-auto" /></div></div>;

  const list = [...meds].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="Medicine Verification Center" sub="Confirm self-reported medicines so patients know they are safe to take." />
      {list.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="All caught up!" sub="No medicines waiting for verification." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {list.map((m) => (
            <div key={m.id} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{m.name}</p>
                <p className="text-[12px] text-muted mt-0.5">{m.dosage || '—'} · started {fmtD(m.startDate)}</p>
                <p className="text-[12px] text-muted mt-0.5">
                  Patient: <b className="text-ink">{pnames[m.patientId] || '…'}</b> · by {m.prescribedBy || '—'} · <StatusChip warn={m.source === 'patient'}>self</StatusChip>
                </p>
              </div>
              <button onClick={() => verify(m)} className="shrink-0 flex items-center gap-1.5 text-[12px] font-bold text-ok border border-ok-bd px-3 py-2 rounded-[4px] hover:bg-ok-bg transition-colors">
                <CheckCircle2 className="w-4 h-4" /> Verify
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
