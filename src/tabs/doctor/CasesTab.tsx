import { useEffect, useState } from 'react';
import { FileText, Loader2, Plus, Trash2, ShieldBan } from 'lucide-react';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, CaseDoc, Medicine, ReportDoc, VitalsDoc, Consent } from '../../lib/types';
import { fmtD, fmtDT, todayStr, rupees } from '../../lib/format';
import { logAccess, notify } from '../../lib/fs';
import MicButton from '../../components/MicButton';
import Modal from '../../components/Modal';
import { toast } from '../../components/Toaster';
import { PageHeader, Loading, EmptyState, StatusChip, inputCls, labelCls, FilterPills } from '../common';

interface PRow { id: string; name?: string; dob?: string; gender?: string; bloodGroup?: string; allergies?: string; conditions?: string; surgeries?: string; accidents?: string }

const emptyRx = { name: '', dose: '', days: '', inst: '' };

export default function CasesTab({ doctorData }: { doctorData: MhdUser }) {
  const [tab, setTab] = useState('Waiting');
  const [cases, setCases] = useState<CaseDoc[] | null>(null);
  const [open, setOpen] = useState<CaseDoc | null>(null);
  const [patient, setPatient] = useState<PRow | null>(null);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [reports, setReports] = useState<ReportDoc[]>([]);
  const [vitals, setVitals] = useState<VitalsDoc[]>([]);
  const [notes, setNotes] = useState({ doctorNotes: '', observations: '', tests: '', fee: '', followupDays: '' });
  const [rx, setRx] = useState([{ ...emptyRx }]);
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'cases'), where('status', '==', 'waiting')), (s) =>
      setCases((prev) => {
        const waiting = s.docs.map((d) => ({ id: d.id, ...d.data() } as CaseDoc));
        const mine = (prev || []).filter((c) => c.status === 'reviewed' && c.doctorId === doctorData.id);
        return [...waiting, ...mine];
      }));
    return u1;
  }, []);
  useEffect(() => {
    const u = onSnapshot(query(collection(db, 'cases'), where('doctorId', '==', doctorData.id)), (s) =>
      setCases((prev) => {
        const mine = s.docs.map((d) => ({ id: d.id, ...d.data() } as CaseDoc));
        const waiting = (prev || []).filter((c) => c.status === 'waiting');
        return [...waiting, ...mine];
      }));
    return u;
  }, [doctorData.id]);

  // load case context on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const ps = await getDoc(doc(db, 'users', open.patientId));
        setPatient(ps.exists() ? ({ id: ps.id, ...ps.data() } as PRow) : null);
        const cs = await getDoc(doc(db, 'consents', `${open.patientId}_${doctorData.id}`));
        setConsent(cs.exists() ? ({ id: cs.id, ...cs.data() } as Consent) : null);
        const { collection: col, query: q, where: w } = await import('firebase/firestore');
        const ms = await getDocs(q(col(db, 'medicines'), w('patientId', '==', open.patientId)));
        setMeds(ms.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)));
        const rs = await getDocs(q(col(db, 'reports'), w('patientId', '==', open.patientId)));
        setReports(rs.docs.map((d) => ({ id: d.id, ...d.data() } as ReportDoc)));
        const vs = await getDocs(q(col(db, 'vitals'), w('patientId', '==', open.patientId)));
        setVitals(vs.docs.map((d) => ({ id: d.id, ...d.data() } as VitalsDoc)).sort((a, b) => b.createdAt - a.createdAt));
      } catch { /* ignore */ }
    })();
  }, [open?.id, doctorData.id]);

  if (cases === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  const list = [...cases].filter((c) => tab === 'Waiting' ? c.status === 'waiting' : c.status === 'reviewed' && c.doctorId === doctorData.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const blocked = consent?.status === 'revoked';

  const submitReview = async () => {
    if (!open) return;
    setBusy(true);
    try {
      const prescText = rx.filter((r) => r.name.trim()).map((r) => `${r.name} — ${r.dose} — ${r.days} days — ${r.inst}`).join('\n');
      await updateDoc(doc(db, 'cases', open.id), {
        status: 'reviewed', doctorId: doctorData.id, doctorName: 'Dr. ' + doctorData.name,
        reviewedAt: Date.now(), fee: Number(notes.fee) || 0, doctorNotes: notes.doctorNotes,
        observations: notes.observations, prescriptionText: prescText, tests: notes.tests,
        followupDays: notes.followupDays, sharedWithPatient: share,
      });
      for (const r of rx.filter((x) => x.name.trim())) {
        await addDoc(collection(db, 'medicines'), {
          patientId: open.patientId, name: r.name.trim(), dosage: [r.dose, r.inst].filter(Boolean).join(' '),
          startDate: todayStr(), durationDays: r.days, prescribedBy: 'Dr. ' + doctorData.name,
          verified: true, verifiedBy: 'Dr. ' + doctorData.name, verifiedAt: Date.now(),
          source: 'doctor', active: true, createdAt: Date.now(),
        });
      }
      const tDate = todayStr();
      await addDoc(collection(db, 'timeline'), { patientId: open.patientId, date: tDate, type: 'consult', icon: '👨‍⚕️', title: `Consultation by Dr. ${doctorData.name}`, description: open.chiefComplaint, createdAt: Date.now() });
      if (prescText) await addDoc(collection(db, 'timeline'), { patientId: open.patientId, date: tDate, type: 'prescription', icon: '💊', title: 'Prescription issued', description: prescText, createdAt: Date.now() });
      if (notes.followupDays && Number(notes.followupDays) > 0) {
        const due = new Date(Date.now() + Number(notes.followupDays) * 86400000).toISOString().slice(0, 10);
        await addDoc(collection(db, 'timeline'), { patientId: open.patientId, date: tDate, type: 'followup', icon: '⏰', title: `Follow-up in ${notes.followupDays} days`, description: `Due ${fmtD(due)}`, createdAt: Date.now(), due });
      }
      const fee = Number(notes.fee) || 0;
      if (fee > 0) {
        await addDoc(collection(db, 'bills'), {
          patientId: open.patientId, patientName: open.patientName, healthId: open.healthId || '',
          doctorId: doctorData.id, doctorName: 'Dr. ' + doctorData.name, hospital: doctorData.hospital || 'MHD Hospital',
          type: 'consultation', items: [{ label: 'Consultation fee', amount: fee }], total: fee,
          status: 'pending', createdAt: Date.now(),
        });
      }
      await logAccess(open.patientId, 'Dr. ' + doctorData.name, 'doctor', '👨‍⚕️ Dr. ' + doctorData.name + ' reviewed your case');
      await notify(open.patientId, '📋 Case reviewed', `Dr. ${doctorData.name} reviewed your case "${open.chiefComplaint}"`);
      toast('Review submitted ✅');
      setOpen(null);
      setNotes({ doctorNotes: '', observations: '', tests: '', fee: '', followupDays: '' });
      setRx([{ ...emptyRx }]);
    } catch { toast('Could not submit review', 'err'); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="📋 Cases" sub="Review waiting cases — prescriptions create medicines, bill and timeline automatically." />
      <FilterPills filters={['Waiting', 'Reviewed']} value={tab} onChange={setTab} />

      {list.length === 0 ? (
        <EmptyState icon={<FileText className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title={`No ${tab.toLowerCase()} cases`} sub={tab === 'Waiting' ? 'New patient cases will appear here.' : 'Cases you review appear here.'} />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {list.map((c) => (
            <button key={c.id} onClick={() => setOpen(c)} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm text-left hover:border-primary transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{c.patientName} <span className="text-[11px] text-muted font-mono">{c.healthId}</span></p>
                  <p className="text-[13px] text-ink mt-1">{c.chiefComplaint}</p>
                  <p className="text-[12px] text-muted mt-1">{c.severity} · {c.area || '—'} · {fmtDT(c.createdAt)}</p>
                </div>
                <StatusChip ok={c.status === 'reviewed'} warn={c.status === 'waiting'}>{c.status === 'reviewed' ? '🟩 Reviewed' : '🟡 Waiting'}</StatusChip>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Modal wide title={`Case — ${open.patientName}`} onClose={() => setOpen(null)}
          icon={<FileText className="w-5 h-5 text-primary" strokeWidth={1.5} />}>
          {blocked ? (
            <div className="flex items-start gap-2 p-4 bg-danger-bg border border-danger-bd text-danger text-[13px] rounded-[4px]">
              <ShieldBan className="w-5 h-5 shrink-0 mt-0.5" />
              <div><b>Access blocked.</b> This patient revoked your consent. The attempt has been logged.</div>
            </div>
          ) : (
            <div className="space-y-5 text-[13px]">
              {/* AI snapshot */}
              <div className="bg-app border border-line rounded-[4px] p-4">
                <h5 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">🧠 Case snapshot</h5>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <p><b className="text-muted">Age/Gender:</b> {patient ? `${patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : '—'} · ${patient.gender || '—'}` : '—'}</p>
                  <p><b className="text-muted">Blood:</b> {patient?.bloodGroup || '—'}</p>
                  <p><b className="text-danger">Allergies:</b> {patient?.allergies || '—'}</p>
                  <p><b className="text-muted">Conditions:</b> {patient?.conditions || '—'}</p>
                  <p className="col-span-2"><b className="text-muted">Surgery:</b> {(patient?.surgeries || '—').split('\n')[0]}</p>
                  <p><b className="text-muted">Active meds:</b> {meds.filter((m) => m.active !== false).length}</p>
                  <p><b className="text-muted">Documents:</b> {reports.length} ({reports.filter((r) => r.verified).length} verified)</p>
                  <p className="col-span-2"><b className="text-muted">Latest vitals:</b> {vitals[0] ? `${vitals[0].bp || '—'} BP · ${vitals[0].temp || '—'}°F · ${vitals[0].hr || '—'} bpm (${fmtD(vitals[0].date)})` : '—'}</p>
                </div>
              </div>

              {/* patient-reported */}
              <div>
                <h5 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">🟦 Patient-reported</h5>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                  {[['Complaint', open.chiefComplaint], ['Symptoms', open.symptoms], ['Duration', open.duration], ['Area', open.area], ['Severity', open.severity], ['Prev treatment', open.prevTreatment], ['Existing', open.existing], ['Current meds', open.currentMeds], ['Allergy note', open.allergyNote], ['Surgery note', open.surgeryNote], ['Family history', open.familyHistory], ['Other', open.other]].map(([k, v]) => v && (
                    <p key={k as string}><b className="text-muted">{k}:</b> <span className="whitespace-pre-line">{v}</span></p>
                  ))}
                </div>
              </div>

              {/* doctor form */}
              <div className="border-t border-line pt-4 space-y-3">
                <h5 className="text-[11px] font-bold text-muted uppercase tracking-wider">🟩 Doctor review</h5>
                <div>
                  <label className={labelCls}>Clinical notes</label>
                  <div className="flex gap-2"><textarea rows={2} value={notes.doctorNotes} onChange={(e) => setNotes({ ...notes, doctorNotes: e.target.value })} className={inputCls + ' h-auto py-2'} /><MicButton onText={(t2) => setNotes({ ...notes, doctorNotes: (notes.doctorNotes ? notes.doctorNotes + ' ' : '') + t2 })} /></div>
                </div>
                <div>
                  <label className={labelCls}>Observations</label>
                  <div className="flex gap-2"><textarea rows={2} value={notes.observations} onChange={(e) => setNotes({ ...notes, observations: e.target.value })} className={inputCls + ' h-auto py-2'} /><MicButton onText={(t2) => setNotes({ ...notes, observations: (notes.observations ? notes.observations + ' ' : '') + t2 })} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls + ' mb-0'}>Prescription</label>
                    <button type="button" onClick={() => setRx([...rx, { ...emptyRx }])} className="text-[12px] font-medium text-primary flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add row</button>
                  </div>
                  <div className="space-y-2">
                    {rx.map((r, i) => (
                      <div key={i} className="grid grid-cols-[1.2fr_1fr_0.6fr_1.2fr_auto] gap-2">
                        <input value={r.name} onChange={(e) => setRx(rx.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Medicine" className={inputCls} />
                        <input value={r.dose} onChange={(e) => setRx(rx.map((x, j) => j === i ? { ...x, dose: e.target.value } : x))} placeholder="Dose" className={inputCls} />
                        <input value={r.days} onChange={(e) => setRx(rx.map((x, j) => j === i ? { ...x, days: e.target.value } : x))} placeholder="Days" className={inputCls} />
                        <input value={r.inst} onChange={(e) => setRx(rx.map((x, j) => j === i ? { ...x, inst: e.target.value } : x))} placeholder="Instructions" className={inputCls} />
                        <button type="button" onClick={() => setRx(rx.filter((_, j) => j !== i))} className="p-2 text-danger hover:bg-danger-bg rounded-[4px]"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div><label className={labelCls}>Recommended tests</label><input value={notes.tests} onChange={(e) => setNotes({ ...notes, tests: e.target.value })} className={inputCls} /></div>
                  <div><label className={labelCls}>Consultation fee (₹)</label><input type="number" value={notes.fee} onChange={(e) => setNotes({ ...notes, fee: e.target.value })} className={inputCls} /></div>
                  <div><label className={labelCls}>Follow-up (days)</label><input type="number" value={notes.followupDays} onChange={(e) => setNotes({ ...notes, followupDays: e.target.value })} className={inputCls} /></div>
                </div>
                <label className="flex items-center gap-2 text-[13px] text-muted">
                  <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="w-4 h-4" /> Share review with patient
                </label>
              </div>

              {/* patient meds needing verify */}
              {meds.filter((m) => !m.verified).length > 0 && (
                <div className="border border-warn-bd bg-warn-bg rounded-[4px] p-3">
                  <p className="text-[11px] font-bold text-warn uppercase tracking-wider mb-2">Unverified patient medicines</p>
                  {meds.filter((m) => !m.verified).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-[12px] py-1">
                      <span className="text-ink">{m.name} · {m.dosage}</span>
                      <button onClick={async () => { await updateDoc(doc(db, 'medicines', m.id), { verified: true, verifiedBy: 'Dr. ' + doctorData.name, verifiedAt: Date.now() }); toast('Medicine verified ✅'); }} className="font-medium text-ok">Verify</button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={submitReview} disabled={busy} className="w-full h-[44px] bg-primary text-on-navy rounded-[6px] text-[14px] font-medium hover:bg-primary-d flex items-center justify-center disabled:opacity-70">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : `Submit Review${Number(notes.fee) > 0 ? ` · bill ${rupees(Number(notes.fee))}` : ''}`}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
