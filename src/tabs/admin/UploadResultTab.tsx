import { useEffect, useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { addDoc, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, ReportDoc } from '../../lib/types';
import { todayStr, fmtD } from '../../lib/format';
import { compressImage } from '../../lib/media';
import { notify, logAccess } from '../../lib/fs';
import { toast } from '../../components/Toaster';
import { PageHeader, inputCls, labelCls, btnPrimary } from '../common';

const TYPES = ['Lab Report', 'X-ray', 'CT / MRI', 'Scan', 'Prescription', 'Discharge Summary', 'Other Document'];
interface Row { id: string; name?: string }

export default function UploadResultTab({ adminData }: { adminData: MhdUser }) {
  const [patients, setPatients] = useState<Row[]>([]);
  const [doctors, setDoctors] = useState<Row[]>([]);
  const [recent, setRecent] = useState<ReportDoc[]>([]);
  const [f, setF] = useState({ patientId: '', title: '', type: TYPES[0], date: todayStr(), doctorId: '', note: '' });
  const [fileData, setFileData] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'patient')))
      .then((s) => setPatients(s.docs.map((d) => ({ id: d.id, name: d.data().name }))));
    getDocs(query(collection(db, 'users'), where('role', '==', 'doctor')))
      .then((s) => setDoctors(s.docs.map((d) => ({ id: d.id, name: d.data().name }))));
    const u = onSnapshot(collection(db, 'reports'), (s) =>
      setRecent(s.docs.map((d) => ({ id: d.id, ...d.data() } as ReportDoc)).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)));
    return u;
  }, []);

  const pick = async (file?: File) => {
    if (!file) return;
    try { setFileData(await compressImage(file)); toast('Image ready ✅'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not read image', 'err'); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = patients.find((x) => x.id === f.patientId);
    if (!p) { toast('Select a patient.', 'err'); return; }
    if (!f.title.trim()) { toast('Enter a title.', 'err'); return; }
    setBusy(true);
    try {
      const doc0 = (await getDocs(query(collection(db, 'users'), where('__name__', '==', f.patientId)))).docs[0];
      const healthId = doc0?.data().healthId || '';
      const doc0p = patients.find((x) => x.id === f.patientId);
      const doc0d = doctors.find((x) => x.id === f.doctorId);
      await addDoc(collection(db, 'reports'), {
        patientId: f.patientId, patientName: doc0p?.name || '', healthId,
        title: f.title.trim(), type: f.type, date: f.date,
        hospital: adminData.name, doctor: doc0d ? 'Dr. ' + doc0d.name : '',
        note: f.note, verified: true, uploadedBy: adminData.name, uploadedByRole: 'hospital',
        createdAt: Date.now(), ...(fileData ? { fileData, source: 'scan' } : {}),
      });
      await addDoc(collection(db, 'timeline'), {
        patientId: f.patientId, date: f.date, type: 'report', icon: '📄',
        title: f.title.trim(), description: f.type, createdAt: Date.now(),
      });
      await logAccess(f.patientId, adminData.name, 'hospital', '🏥 Hospital uploaded a result');
      await notify(f.patientId, '📄 New result uploaded', `${f.title} (${f.type}) is available in My Results`);
      toast('Result uploaded ✅');
      setF({ patientId: '', title: '', type: TYPES[0], date: todayStr(), doctorId: '', note: '' });
      setFileData(null);
    } catch { toast('Could not upload result', 'err'); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="📤 Upload Result" sub="Upload lab reports and scans — patients see them in My Results instantly." />

      <form onSubmit={submit} className="bg-surface border border-line rounded-[4px] p-5 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Patient *</label>
            <select value={f.patientId} onChange={(e) => setF({ ...f, patientId: e.target.value })} className={inputCls}>
              <option value="">Select patient…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Title *</label><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} placeholder="e.g. CBC Blood Test" /></div>
          <div>
            <label className={labelCls}>Type</label>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={inputCls}>
              {TYPES.map((t2) => <option key={t2}>{t2}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Date</label><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Doctor</label>
            <select value={f.doctorId} onChange={(e) => setF({ ...f, doctorId: e.target.value })} className={inputCls}>
              <option value="">—</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Photo / scan file</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()} className={btnPrimary + ' flex items-center gap-2'}><Upload className="w-4 h-4" /> Choose image</button>
              {fileData && <span className="text-[12px] text-ok self-center">✅ attached</span>}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </div>
          </div>
        </div>
        <div><label className={labelCls}>Note</label><textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className={inputCls + ' h-auto py-2'} /></div>
        <button type="submit" disabled={busy} className={btnPrimary + ' flex items-center gap-2 disabled:opacity-70'}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload Result
        </button>
      </form>

      {recent.length > 0 && (
        <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-stripe text-[11px] font-bold text-muted uppercase tracking-wider">Recent uploads</div>
          <div className="divide-y divide-line">
            {recent.map((r) => (
              <div key={r.id} className="px-4 py-2.5 text-[13px] flex items-center justify-between">
                <span className="text-ink">📄 {r.title} <span className="text-muted">· {r.patientName} · {r.type}</span></span>
                <span className="text-muted text-[12px]">{fmtD(r.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
