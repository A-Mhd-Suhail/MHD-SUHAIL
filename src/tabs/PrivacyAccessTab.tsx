import { useEffect, useState } from 'react';
import { Lock, ShieldCheck, ShieldBan } from 'lucide-react';
import { collection, doc, getDocs, onSnapshot, query, where, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser, Consent, AccessLogEntry } from '../lib/types';
import { fmtDT } from '../lib/format';
import { PageHeader, Loading, EmptyState, StatusChip } from './common';

interface DocRow { id: string; name?: string; specialization?: string }

export default function PrivacyAccessTab({ patientData }: { patientData: MhdUser }) {
  const [doctors, setDoctors] = useState<DocRow[] | null>(null);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [access, setAccess] = useState<AccessLogEntry[] | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'doctor')))
      .then((s) => setDoctors(s.docs.map((d) => ({ id: d.id, ...d.data() } as DocRow))))
      .catch(() => setDoctors([]));
    const u1 = onSnapshot(query(collection(db, 'consents'), where('patientId', '==', patientData.id)), (s) =>
      setConsents(s.docs.map((d) => ({ id: d.id, ...d.data() } as Consent))));
    const u2 = onSnapshot(query(collection(db, 'accessLog'), where('patientId', '==', patientData.id)), (s) =>
      setAccess(s.docs.map((d) => ({ id: d.id, ...d.data() } as AccessLogEntry)).sort((a, b) => b.createdAt - a.createdAt)));
    return () => { u1(); u2(); };
  }, [patientData.id]);

  if (doctors === null || access === null) return <div className="max-w-[1000px] mx-auto space-y-6"><Loading /></div>;

  const consentFor = (id: string) => consents.find((c) => c.doctorId === id);

  const setConsent = async (d: DocRow, status: 'allowed' | 'revoked') => {
    await setDoc(doc(db, 'consents', `${patientData.id}_${d.id}`), {
      patientId: patientData.id, doctorId: d.id, doctorName: 'Dr. ' + d.name, status, updatedAt: Date.now(),
    }, { merge: true });
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title="Privacy & Access" sub="Decide which doctors can open your case. All views are logged." />

      <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-line bg-stripe text-[11px] font-bold text-muted uppercase tracking-wider">Consent Center — {doctors.length} doctors</div>
        <div className="divide-y divide-line">
          {doctors.map((d) => {
            const c = consentFor(d.id);
            const revoked = c?.status === 'revoked';
            return (
              <div key={d.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">Dr. {d.name}</p>
                  <p className="text-[12px] text-muted">{d.specialization || 'General'}{c ? ` · updated ${fmtDT(c.updatedAt)}` : ' · default: allowed'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {revoked ? <StatusChip danger><ShieldBan className="w-3 h-3 inline mr-1" />Blocked</StatusChip> : <StatusChip ok><ShieldCheck className="w-3 h-3 inline mr-1" />Allowed</StatusChip>}
                  {revoked
                    ? <button onClick={() => setConsent(d, 'allowed')} className="text-[12px] font-medium text-ok border border-ok-bd px-3 py-1.5 rounded-[4px] hover:bg-ok-bg transition-colors">Allow</button>
                    : <button onClick={() => setConsent(d, 'revoked')} className="text-[12px] font-medium text-danger border border-danger-bd px-3 py-1.5 rounded-[4px] hover:bg-danger-bg transition-colors">Revoke</button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-line bg-stripe text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" strokeWidth={1.5} /> Access History ({access.length})
        </div>
        {access.length === 0 ? (
          <p className="p-6 text-[13px] text-muted text-center">No one has viewed your records yet.</p>
        ) : (
          <div className="divide-y divide-line max-h-[420px] overflow-y-auto custom-scrollbar">
            {access.map((a) => (
              <div key={a.id} className="px-4 py-2.5">
                <p className="text-[13px] text-ink">{a.action}</p>
                <p className="text-[11px] text-muted mt-0.5">{a.actorName} ({a.actorRole}) · {fmtDT(a.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
