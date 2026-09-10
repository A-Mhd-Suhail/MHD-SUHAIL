import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { addDoc, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser, CaseDoc, Medicine } from '../lib/types';
import { fmtDT, todayStr } from '../lib/format';
import { notifyRole } from '../lib/fs';
import MicButton from '../components/MicButton';
import { toast } from '../components/Toaster';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState, StatusChip, inputCls, labelCls, btnPrimary, FilterPills } from './common';

const AREAS = ['Head', 'Chest', 'Abdomen', 'Limbs & Joints', 'Skin', 'General'];
const FIELDS: [string, string, boolean][] = [
  ['symptoms', 'Symptoms (describe fully)', true],
  ['duration', 'How long have you had this?', false],
  ['prevTreatment', 'Any previous treatment for this?', true],
  ['existing', 'Existing conditions to mention', true],
  ['currentMeds', 'Current medications', true],
  ['allergyNote', 'Allergies to mention', true],
  ['surgeryNote', 'Past surgeries to mention', true],
  ['familyHistory', 'Family history relevant here', true],
  ['other', 'Anything else the doctor should know', true],
];

const DRAFT_KEY = (uid: string) => `mhd_draft_${uid}`;

export default function MyCaseTab({ patientData }: { patientData: MhdUser }) {
  const [cases, setCases] = useState<CaseDoc[] | null>(null);
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [f, setF] = useState<Record<string, string>>({});
  const [areas, setAreas] = useState<string[]>([]);
  const [severity, setSeverity] = useState('Moderate');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const u1 = bind<CaseDoc>('cases', [['patientId', '==', patientData.id]], setCases);
    const u2 = bind<Medicine>('medicines', [['patientId', '==', patientData.id]], setMeds);
    try {
      const raw = localStorage.getItem(DRAFT_KEY(patientData.id));
      if (raw) { const d = JSON.parse(raw); setF(d.fields || {}); setAreas(d.areas || []); }
    } catch { /* ignore */ }
    return () => { u1(); u2(); };
  }, [patientData.id]);

  // autosave draft
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY(patientData.id), JSON.stringify({ fields: f, areas, at: Date.now() })); } catch { /* ignore */ }
  }, [f, areas, patientData.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.chiefComplaint?.trim()) { toast('Please describe your main problem.', 'err'); return; }
    setBusy(true);
    try {
      await addDoc(collection(db, 'cases'), {
        patientId: patientData.id, patientName: patientData.name, healthId: patientData.healthId || '',
        chiefComplaint: f.chiefComplaint, symptoms: f.symptoms || '', area: areas.join(', '),
        duration: f.duration || '', severity, prevTreatment: f.prevTreatment || '',
        existing: f.existing || '', currentMeds: f.currentMeds || '', allergyNote: f.allergyNote || '',
        surgeryNote: f.surgeryNote || '', familyHistory: f.familyHistory || '', other: f.other || '',
        status: 'waiting', createdAt: Date.now(),
      });
      await addDoc(collection(db, 'timeline'), {
        patientId: patientData.id, date: todayStr(), type: 'case', icon: '📋',
        title: 'New case submitted', description: f.chiefComplaint, createdAt: Date.now(),
      });
      await notifyRole('doctor', '📋 New case', `${patientData.name}: ${f.chiefComplaint}`);
      setF({}); setAreas([]); setSeverity('Moderate');
      try { localStorage.removeItem(DRAFT_KEY(patientData.id)); } catch { /* ignore */ }
      toast('Case submitted — a doctor will review it ✅');
    } catch {
      toast('Could not submit case', 'err');
    } finally {
      setBusy(false);
    }
  };

  if (cases === null) return <div className="max-w-[1000px] mx-auto"><Loading /></div>;

  const list = [...cases].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title={t_c('mycase')} sub="Describe your problem — a doctor reviews it and replies here." />

      {/* New case form */}
      <form onSubmit={submit} className="bg-surface border border-line rounded-[4px] p-5 shadow-sm space-y-4">
        <h4 className="text-[13px] font-bold text-ink uppercase tracking-wider">📋 New Case</h4>
        <div>
          <label className={labelCls}>What is your main problem? *</label>
          <div className="flex gap-2">
            <textarea rows={2} value={f.chiefComplaint || ''} onChange={(e) => set('chiefComplaint', e.target.value)} className={inputCls + ' h-auto py-2'} placeholder="e.g. Fever and body pain since 2 days" />
            <MicButton onText={(t2) => set('chiefComplaint', (f.chiefComplaint || '') + ' ' + t2)} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.slice(0, 2).map(([k, label, mic]) => (
            <div key={k}>
              <label className={labelCls}>{label}</label>
              <div className="flex gap-2">
                <input value={f[k] || ''} onChange={(e) => set(k, e.target.value)} className={inputCls} />
                {mic && <MicButton onText={(t2) => set(k, (f[k] || '') + ' ' + t2)} />}
              </div>
            </div>
          ))}
        </div>
        <div>
          <label className={labelCls}>Where does it hurt? (select all that apply)</label>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a) => (
              <button key={a} type="button" onClick={() => setAreas((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a])}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-[4px] border transition-colors ${areas.includes(a) ? 'bg-primary text-white border-primary' : 'bg-surface border-line text-muted hover:text-ink'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.slice(2).map(([k, label]) => (
            <div key={k}>
              <label className={labelCls}>{label}</label>
              <div className="flex gap-2">
                <input value={f[k] || ''} onChange={(e) => set(k, e.target.value)} className={inputCls} />
                <MicButton onText={(t2) => set(k, (f[k] || '') + ' ' + t2)} />
              </div>
            </div>
          ))}
          <div>
            <label className={labelCls}>Severity</label>
            <div className="flex gap-2">
              {['Mild', 'Moderate', 'Severe'].map((s) => (
                <button key={s} type="button" onClick={() => setSeverity(s)}
                  className={`flex-1 text-[12px] font-medium px-3 py-2 rounded-[4px] border transition-colors ${severity === s ? 'bg-primary text-white border-primary' : 'bg-surface border-line text-muted'}`}>
                  {s === 'Mild' ? '🙂 Mild' : s === 'Moderate' ? '😐 Moderate' : '😣 Severe'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button type="submit" disabled={busy} className={btnPrimary + ' flex items-center gap-2 disabled:opacity-70'}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : '📋'} Submit Case for Review
        </button>
      </form>

      {/* My cases */}
      <div>
        <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">All My Cases ({list.length})</h4>
        {list.length === 0 ? (
          <EmptyState icon={<FileText className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No cases yet" sub="Submit your first case above to start your medical journey." />
        ) : (
          <div className="space-y-3">
            {list.map((c) => (
              <div key={c.id} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{c.chiefComplaint}</p>
                    <p className="text-[12px] text-muted mt-1">{fmtDT(c.createdAt)}{c.area ? ` · ${c.area}` : ''}{c.duration ? ` · ${c.duration}` : ''}</p>
                  </div>
                  <StatusChip ok={c.status === 'reviewed'} warn={c.status === 'waiting'}>
                    {c.status === 'reviewed' ? '🟩 Reviewed' : '🟡 Waiting'}
                  </StatusChip>
                </div>
                {c.status === 'reviewed' && (
                  <div className="mt-3 pt-3 border-t border-line space-y-2 text-[13px]">
                    <p className="text-muted"><b className="text-ink">{c.doctorName}</b> reviewed · {fmtDT(c.reviewedAt)} · {c.fee ? `Fee ₹${c.fee}` : ''}</p>
                    {c.doctorNotes && <p><b className="text-muted">Notes:</b> {c.doctorNotes}</p>}
                    {c.observations && <p><b className="text-muted">Observations:</b> {c.observations}</p>}
                    {c.prescriptionText && <p><b className="text-muted">Prescription:</b> <span className="whitespace-pre-line">{c.prescriptionText}</span></p>}
                    {c.tests && <p><b className="text-muted">Tests:</b> {c.tests}</p>}
                    {c.followupDays && <p><b className="text-muted">Follow-up:</b> in {c.followupDays} days</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Patient-reported profile cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ProfileCard title="👤 Personal" rows={[['DOB', patientData.dob], ['Gender', patientData.gender], ['Blood', patientData.bloodGroup], ['Phone', patientData.phone], ['Address', patientData.address]]} />
        <ProfileCard title="🏥 Medical" rows={[['Conditions', patientData.conditions], ['Allergies', patientData.allergies], ['Family history', patientData.familyHistory]]} />
        <ProfileCard title="🔪 Surgeries & Accidents" rows={[['Surgeries', patientData.surgeries], ['Accidents', patientData.accidents]]} />
        <ProfileCard title="💊 Medications" rows={meds.filter((m) => m.active !== false).slice(0, 6).map((m) => [m.name, m.dosage])} />
        <ProfileCard title="🆔 Identity" rows={[['Health ID', patientData.healthId], ['Emergency', patientData.emergencyName ? `${patientData.emergencyName} · ${patientData.emergencyPhone}` : ''], ['Height', patientData.heightCm ? `${patientData.heightCm} cm` : ''], ['Weight', patientData.weightKg ? `${patientData.weightKg} kg` : '']]} />
      </div>
    </div>
  );
}

function ProfileCard({ title, rows }: { title: string; rows: [string, string | undefined][] }) {
  const filled = rows.filter(([, v]) => v);
  if (filled.length === 0) return null;
  return (
    <div className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
      <h5 className="text-[12px] font-bold text-heading mb-2">{title}</h5>
      {filled.map(([k, v]) => (
        <p key={k} className="text-[12px] py-1 border-b border-line last:border-0"><b className="text-muted font-medium">{k}:</b> <span className="text-ink whitespace-pre-line">{v}</span></p>
      ))}
    </div>
  );
}

// i18n nav key
import { t } from '../lib/i18n';
const t_c = (k: string) => t(k);
