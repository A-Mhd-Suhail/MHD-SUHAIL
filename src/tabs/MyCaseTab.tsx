import { useEffect, useState } from 'react';
import { FileText, Loader2, ChevronDown, ChevronUp, Stethoscope, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showAllCases, setShowAllCases] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
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
        patientId: patientData.id, date: todayStr(), type: 'case', icon: '',
        title: 'New case submitted', description: f.chiefComplaint, createdAt: Date.now(),
      });
      await notifyRole('doctor', 'New case', `${patientData.name}: ${f.chiefComplaint}`);
      setF({}); setAreas([]); setSeverity('Moderate');
      try { localStorage.removeItem(DRAFT_KEY(patientData.id)); } catch { /* ignore */ }
      toast('Case submitted — a doctor will review it');
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

      {/* New case form card with glass styling */}
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submit}
        className="bg-surface border border-line rounded-2xl p-6 shadow-md space-y-5 hover:shadow-lg transition-all"
      >
        <div className="flex items-center gap-2 border-b border-line pb-3">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h4 className="text-[14px] font-extrabold text-heading uppercase tracking-wider">New Clinical Case Submission</h4>
        </div>
        
        <div>
          <label className={labelCls}>What is your main problem? *</label>
          <div className="flex gap-2">
            <textarea rows={2} value={f.chiefComplaint || ''} onChange={(e) => set('chiefComplaint', e.target.value)} className={inputCls + ' h-auto py-2.5 rounded-xl'} placeholder="e.g. Fever and body pain since 2 days" />
            <MicButton onText={(t2) => set('chiefComplaint', (f.chiefComplaint || '') + ' ' + t2)} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.slice(0, 2).map(([k, label, mic], i) => (
            <div key={`${k}-${i}`}>
              <label className={labelCls}>{label}</label>
              <div className="flex gap-2">
                <input value={f[k] || ''} onChange={(e) => set(k, e.target.value)} className={inputCls + ' rounded-xl'} />
                {mic && <MicButton onText={(t2) => set(k, (f[k] || '') + ' ' + t2)} />}
              </div>
            </div>
          ))}
        </div>
        <div>
          <label className={labelCls}>Where does it hurt? (select all that apply)</label>
          <div className="flex flex-wrap gap-2">
            {AREAS.map((a, i) => (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                key={`${a}-${i}`}
                type="button"
                onClick={() => setAreas((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a])}
                className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-xl border transition-all ${areas.includes(a) ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface border-line text-muted hover:text-ink'}`}
              >
                {a}
              </motion.button>
            ))}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.slice(2).map(([k, label], i) => (
            <div key={`${k}-${i}`}>
              <label className={labelCls}>{label}</label>
              <div className="flex gap-2">
                <input value={f[k] || ''} onChange={(e) => set(k, e.target.value)} className={inputCls + ' rounded-xl'} />
                <MicButton onText={(t2) => set(k, (f[k] || '') + ' ' + t2)} />
              </div>
            </div>
          ))}
          <div>
            <label className={labelCls}>Severity</label>
            <div className="flex gap-2">
              {['Mild', 'Moderate', 'Severe'].map((s, i) => (
                <button key={`${s}-${i}`} type="button" onClick={() => setSeverity(s)}
                  className={`flex-1 text-[12px] font-bold px-3 py-2.5 rounded-xl border transition-all ${severity === s ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface border-line text-muted hover:text-ink'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={busy}
          className={btnPrimary + ' flex items-center justify-center gap-2 rounded-xl py-3 shadow-md disabled:opacity-70'}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : ''} Submit Case for Review
        </motion.button>
      </motion.form>

      {/* My cases list */}
      <div>
        <h4 className="text-[12px] font-extrabold text-muted uppercase tracking-wider mb-3">All My Cases ({list.length})</h4>
        {list.length === 0 ? (
          <EmptyState icon={<FileText className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No cases yet" sub="Submit your first case above to start your medical journey." />
        ) : (
          <div className="space-y-3">
            {(showAllCases ? list : list.slice(0, 3)).map((c, i) => {
              const isExpanded = expandedCaseId === c.id || (i === 0 && expandedCaseId === null);
              return (
                <motion.div
                  key={`${c.id}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface border border-line rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setExpandedCaseId(isExpanded ? '' : c.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-bold text-ink">{c.chiefComplaint}</p>
                      </div>
                      <p className="text-[12px] text-muted mt-1 font-medium">{fmtDT(c.createdAt)}{c.area ? ` · ${c.area}` : ''}{c.duration ? ` · ${c.duration}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusChip ok={c.status === 'reviewed'} warn={c.status === 'waiting'}>
                        {c.status === 'reviewed' ? 'Reviewed' : 'Waiting'}
                      </StatusChip>
                      <button className="text-muted p-1 hover:text-primary">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 pt-4 border-t border-line/60 space-y-3 text-[13px]"
                      >
                        {c.status === 'reviewed' ? (
                          <div className="bg-ok-bg/30 border border-ok-bd/30 rounded-xl p-4 space-y-2">
                            <p className="text-muted"><b className="text-ink">{c.doctorName}</b> reviewed · {fmtDT(c.reviewedAt)} · {c.fee ? `Fee ₹${c.fee}` : ''}</p>
                            {c.doctorNotes && <p><b className="text-heading">Notes:</b> {c.doctorNotes}</p>}
                            {c.observations && <p><b className="text-heading">Observations:</b> {c.observations}</p>}
                            {c.prescriptionText && <p><b className="text-heading">Prescription:</b> <span className="whitespace-pre-line font-medium text-ink">{c.prescriptionText}</span></p>}
                            {c.tests && <p><b className="text-heading">Tests Required:</b> {c.tests}</p>}
                            {c.followupDays && <p><b className="text-heading">Follow-up:</b> in {c.followupDays} days</p>}
                          </div>
                        ) : (
                          <div className="bg-warn-bg/20 border border-warn-bd/30 rounded-xl p-3 text-muted text-[12px] flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-warn shrink-0" />
                            <span>This case is currently queued in the clinical review workspace. A registered doctor will review your telemetry shortly.</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            {list.length > 3 && (
              <button onClick={() => setShowAllCases((v) => !v)} className="text-[13px] font-semibold text-primary hover:underline">
                {showAllCases ? 'Show fewer cases' : `View all ${list.length} cases`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Patient-reported profile cards */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ProfileCard title="Personal" rows={[['DOB', patientData.dob], ['Gender', patientData.gender], ['Blood', patientData.bloodGroup], ['Phone', patientData.phone], ['Address', patientData.address]]} />
        <ProfileCard title="Medical" rows={[['Conditions', patientData.conditions], ['Allergies', patientData.allergies], ['Family history', patientData.familyHistory]]} />
        <ProfileCard title="Surgeries & Accidents" rows={[['Surgeries', patientData.surgeries], ['Accidents', patientData.accidents]]} />
        <ProfileCard title="Medications" rows={meds.filter((m) => m.active !== false).slice(0, 6).map((m, i) => [`${m.name}${meds.filter((x) => x.name === m.name).length > 1 ? ` (${i + 1})` : ''}`, m.dosage])} />
        <ProfileCard title="Identity" rows={[['Health ID', patientData.healthId], ['Emergency', patientData.emergencyName ? `${patientData.emergencyName} · ${patientData.emergencyPhone}` : ''], ['Height', patientData.heightCm ? `${patientData.heightCm} cm` : ''], ['Weight', patientData.weightKg ? `${patientData.weightKg} kg` : '']]} />
      </div>
    </div>
  );
}

function ProfileCard({ title, rows }: { title: string; rows: [string, string | undefined][] }) {
  const filled = rows.filter(([, v]) => v);
  if (filled.length === 0) return null;
  return (
    <motion.div whileHover={{ y: -2 }} className="bg-surface border border-line rounded-2xl p-4 shadow-sm">
      <h5 className="text-[12px] font-extrabold text-heading mb-2 uppercase tracking-wider">{title}</h5>
      {filled.map(([k, v], i) => (
        <p key={`${k}-${i}`} className="text-[12px] py-1.5 border-b border-line/60 last:border-0"><b className="text-muted font-medium">{k}:</b> <span className="text-ink font-semibold whitespace-pre-line">{v}</span></p>
      ))}
    </motion.div>
  );
}

// i18n nav key
import { t } from '../lib/i18n';
const t_c = (k: string) => t(k);

