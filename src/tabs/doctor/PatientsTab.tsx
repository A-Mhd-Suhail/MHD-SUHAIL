import { useEffect, useState } from 'react';
import { Users, Loader2, Phone, MessageSquare } from 'lucide-react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Consent, Medicine, VitalsDoc } from '../../lib/types';
import { ageOf, maskAadhaar, telLink, fmtDT } from '../../lib/format';
import { logAccess } from '../../lib/fs';
import Modal from '../../components/Modal';
import { PageHeader, inputCls, EmptyState, StatusChip } from '../common';

interface PRow { id: string; name?: string; healthId?: string; aadhaar?: string; dob?: string; gender?: string; bloodGroup?: string; phone?: string; address?: string; emergencyName?: string; emergencyPhone?: string; heightCm?: string; weightKg?: string; allergies?: string; conditions?: string; surgeries?: string; accidents?: string; familyHistory?: string; photo?: string }

export default function PatientsTab({ doctorData }: { doctorData: MhdUser }) {
  const [patients, setPatients] = useState<PRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<PRow | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [vitals, setVitals] = useState<VitalsDoc[]>([]);

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'patient')))
      .then((s) => setPatients(s.docs.map((d) => ({ id: d.id, ...d.data() } as PRow))))
      .catch(() => setPatients([]));
  }, []);

  const openPatient = async (p: PRow) => {
    setOpen(p); setMeds([]); setVitals([]);
    const cs = await getDoc(doc(db, 'consents', `${p.id}_${doctorData.id}`));
    const consent: Consent | null = cs.exists() ? ({ id: cs.id, ...cs.data() } as Consent) : null;
    const isBlocked = consent?.status === 'revoked';
    setBlocked(isBlocked);
    if (isBlocked) {
      await logAccess(p.id, 'Dr. ' + doctorData.name, 'doctor', '🚫 Attempted access — BLOCKED by patient consent');
      return;
    }
    await logAccess(p.id, 'Dr. ' + doctorData.name, 'doctor', '👨‍⚕️ Dr. ' + doctorData.name + ' viewed your profile');
    const { collection: col, query: q, where: w } = await import('firebase/firestore');
    const ms = await getDocs(q(col(db, 'medicines'), w('patientId', '==', p.id)));
    setMeds(ms.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)));
    const vs = await getDocs(q(col(db, 'vitals'), w('patientId', '==', p.id)));
    setVitals(vs.docs.map((d) => ({ id: d.id, ...d.data() } as VitalsDoc)).sort((a, b) => b.createdAt - a.createdAt));
  };

  if (patients === null) return <div className="max-w-[1200px] mx-auto"><div className="bg-surface border border-line rounded-[4px] p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted mx-auto" /></div></div>;

  const list = patients.filter((p) =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.healthId || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="👥 Patients" sub="All registered patients — open for full medical profile." />
      <div className="relative max-w-[340px]">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or Health ID…" className={inputCls + ' pl-9'} />
        <Users className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Users className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No patients found" sub="Try a different search." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
            <button key={p.id} onClick={() => openPatient(p)} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm text-left hover:border-primary transition-colors">
              <div className="flex items-center gap-3">
                {p.photo ? <img src={p.photo} alt="" className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-active flex items-center justify-center text-[16px]">🧑</div>}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">{p.name}</p>
                  <p className="text-[11px] text-muted font-mono">{p.healthId}</p>
                </div>
              </div>
              <p className="text-[12px] text-muted mt-2">{ageOf(p.dob)} yrs · {p.gender || '—'} · {p.bloodGroup || '—'}</p>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Modal wide title={open.name || 'Patient'} onClose={() => setOpen(null)}>
          {blocked ? (
            <div className="p-4 bg-danger-bg border border-danger-bd text-danger text-[13px] rounded-[4px]">
              🚫 <b>Access blocked by patient consent.</b> This attempt has been logged.
            </div>
          ) : (
            <div className="space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p><b className="text-muted">Age:</b> {ageOf(open.dob)}</p>
                <p><b className="text-muted">Gender:</b> {open.gender || '—'}</p>
                <p><b className="text-muted">Blood:</b> {open.bloodGroup || '—'}</p>
                <p><b className="text-muted">Aadhaar:</b> {maskAadhaar(open.aadhaar)}</p>
                <p><b className="text-muted">Height/Weight:</b> {open.heightCm || '—'} cm / {open.weightKg || '—'} kg</p>
                <p><b className="text-muted">Address:</b> {open.address || '—'}</p>
                <p><b className="text-muted">Emergency:</b> {open.emergencyName || '—'} {open.emergencyPhone || ''}</p>
              </div>
              <div className="space-y-1">
                <p><b className="text-muted">Allergies:</b> <span className="text-danger">{open.allergies || '—'}</span></p>
                <p><b className="text-muted">Conditions:</b> {open.conditions || '—'}</p>
                <p><b className="text-muted">Surgeries:</b> <span className="whitespace-pre-line">{open.surgeries || '—'}</span></p>
                <p><b className="text-muted">Accidents:</b> {open.accidents || '—'}</p>
                <p><b className="text-muted">Family history:</b> {open.familyHistory || '—'}</p>
              </div>
              <div>
                <h5 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Medicines</h5>
                {meds.filter((m) => m.active !== false).map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-1 border-b border-line last:border-0">
                    <span>💊 {m.name} · {m.dosage}</span>
                    <StatusChip ok={m.verified} warn={!m.verified}>{m.verified ? 'Verified' : 'Pending'}</StatusChip>
                  </div>
                ))}
                {meds.length === 0 && <p className="text-muted">—</p>}
              </div>
              <div>
                <h5 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Latest vitals</h5>
                {vitals[0] ? (
                  <p>BP {vitals[0].bp || '—'} · {vitals[0].temp || '—'}°F · {vitals[0].hr || '—'} bpm · {vitals[0].wt || '—'} kg <span className="text-muted">({fmtDT(vitals[0].createdAt)})</span></p>
                ) : <p className="text-muted">—</p>}
              </div>
              <div className="flex gap-2 pt-2">
                {telLink(open.phone) && <a href={telLink(open.phone)!} className="flex items-center gap-1.5 text-[12px] font-medium text-ok border border-ok-bd px-3 py-2 rounded-[4px]"><Phone className="w-3.5 h-3.5" /> Call</a>}
                <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted border border-line px-3 py-2 rounded-[4px]"><MessageSquare className="w-3.5 h-3.5" /> Use Messages tab to chat</span>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
