import { useEffect, useState } from 'react';
import { Activity, ShieldBan, Loader2 } from 'lucide-react';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, VitalsDoc, Consent } from '../../lib/types';
import { todayStr, fmtD, fmtDT } from '../../lib/format';
import { logAccess, notify } from '../../lib/fs';
import MicButton from '../../components/MicButton';
import { toast } from '../../components/Toaster';
import { PageHeader, inputCls, labelCls, btnPrimary } from '../common';

interface PRow { id: string; name?: string; healthId?: string }

export default function HealthInputTab({ doctorData }: { doctorData: MhdUser }) {
  const [patients, setPatients] = useState<PRow[]>([]);
  const [pid, setPid] = useState('');
  const [consent, setConsent] = useState<Consent | null | 'loading'>('loading');
  const [f, setF] = useState({ date: todayStr(), bp: '', temp: '', hr: '', wt: '', sym: '' });
  const [recent, setRecent] = useState<VitalsDoc[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'patient')))
      .then((s) => setPatients(s.docs.map((d) => ({ id: d.id, name: d.data().name, healthId: d.data().healthId }))))
      .catch(() => { /* ignore */ });
  }, []);

  useEffect(() => {
    setConsent('loading');
    setRecent([]);
    if (!pid) { setConsent(null); return; }
    getDoc(doc(db, 'consents', `${pid}_${doctorData.id}`)).then((s) => {
      setConsent(s.exists() ? ({ id: s.id, ...s.data() } as Consent) : null);
    }).catch(() => setConsent(null));
    const unsub = onSnapshot(query(collection(db, 'vitals'), where('patientId', '==', pid)), (s) => {
      setRecent(s.docs.map((d) => ({ id: d.id, ...d.data() } as VitalsDoc)).sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
  }, [pid, doctorData.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = patients.find((x) => x.id === pid);
    if (!p) { toast('Select a patient.', 'err'); return; }
    setBusy(true);
    try {
      await addDoc(collection(db, 'vitals'), {
        patientId: p.id, patientName: p.name || '', healthId: p.healthId || '',
        date: f.date, temp: f.temp, bp: f.bp, hr: f.hr, wt: f.wt, sym: f.sym,
        enteredBy: 'doctor', doctorId: doctorData.id, doctorName: 'Dr. ' + doctorData.name, createdAt: Date.now(),
      });
      await logAccess(p.id, 'Dr. ' + doctorData.name, 'doctor', '👨‍⚕️ Dr. ' + doctorData.name + ' entered your vitals');
      await notify(p.id, '📊 Vitals updated', `Dr. ${doctorData.name} recorded vitals for ${fmtD(f.date)}`);
      toast('Vitals saved ✅');
      setF({ date: todayStr(), bp: '', temp: '', hr: '', wt: '', sym: '' });
    } catch { toast('Could not save vitals', 'err'); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="📊 Health Input" sub="Record vitals for a patient — they see it instantly in their Health Overview." />

      <div className="bg-surface border border-line rounded-[4px] p-5 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Patient</label>
            <select value={pid} onChange={(e) => setPid(e.target.value)} className={inputCls}>
              <option value="">Select patient…</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.healthId}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Date</label><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inputCls} /></div>
        </div>

        {pid && consent === 'loading' && <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin text-muted mx-auto" /></div>}

        {pid && consent && consent !== 'loading' && consent.status === 'revoked' && (
          <div className="flex items-start gap-2 p-3 bg-danger-bg border border-danger-bd text-danger text-[13px] rounded-[4px]">
            <ShieldBan className="w-4 h-4 mt-0.5 shrink-0" />
            This patient has revoked your access. You cannot enter vitals for them.
          </div>
        )}

        {pid && (consent === null || (consent !== 'loading' && consent.status !== 'revoked')) && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><label className={labelCls}>BP (120/80)</label><input value={f.bp} onChange={(e) => setF({ ...f, bp: e.target.value })} className={inputCls} placeholder="120/80" /></div>
              <div><label className={labelCls}>Temp (°F)</label><input value={f.temp} onChange={(e) => setF({ ...f, temp: e.target.value })} className={inputCls} placeholder="98.6" /></div>
              <div><label className={labelCls}>HR (bpm)</label><input value={f.hr} onChange={(e) => setF({ ...f, hr: e.target.value })} className={inputCls} placeholder="72" /></div>
              <div><label className={labelCls}>Weight (kg)</label><input value={f.wt} onChange={(e) => setF({ ...f, wt: e.target.value })} className={inputCls} placeholder="70" /></div>
            </div>
            <div>
              <label className={labelCls}>Symptoms / notes</label>
              <div className="flex gap-2">
                <input value={f.sym} onChange={(e) => setF({ ...f, sym: e.target.value })} className={inputCls} />
                <MicButton onText={(t2) => setF({ ...f, sym: (f.sym ? f.sym + ' ' : '') + t2 })} />
              </div>
            </div>
            <button onClick={save} disabled={busy} className={btnPrimary + ' flex items-center gap-2 disabled:opacity-70'}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />} Save Vitals
            </button>
          </>
        )}
      </div>

      {recent.length > 0 && (
        <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-stripe text-[11px] font-bold text-muted uppercase tracking-wider">Recent entries for this patient</div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stripe border-b border-line">
                {['Date', 'BP', 'Temp', 'HR', 'Weight', 'Symptoms', 'Entered'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-bold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recent.slice(0, 8).map((v) => (
                <tr key={v.id} className="hover:bg-stripe transition-colors text-[13px]">
                  <td className="px-4 py-2.5 text-muted">{fmtD(v.date)}</td>
                  <td className="px-4 py-2.5 font-medium text-ink">{v.bp || '—'}</td>
                  <td className="px-4 py-2.5">{v.temp || '—'}</td>
                  <td className="px-4 py-2.5">{v.hr || '—'}</td>
                  <td className="px-4 py-2.5">{v.wt || '—'}</td>
                  <td className="px-4 py-2.5 text-muted max-w-[200px] truncate">{v.sym || '—'}</td>
                  <td className="px-4 py-2.5 text-muted">{fmtDT(v.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
