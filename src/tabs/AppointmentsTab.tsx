import { useEffect, useState } from 'react';
import { Calendar, Loader2, Lock } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser, Appointment } from '../lib/types';
import { fmtD, todayStr, SLOT_TIMES, slotKey, queueNumberOf } from '../lib/format';
import { notify, logAccess } from '../lib/fs';
import { toast } from '../components/Toaster';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState, StatusChip, inputCls, labelCls, btnPrimary, FilterPills } from './common';

const TYPES = ['Follow-up Checkup', 'Video Consultation', 'In-person Visit'];

interface DocRow { id: string; name?: string; specialization?: string; hospital?: string; phone?: string; photo?: string; onDuty?: boolean }

export default function AppointmentsTab({ patientData }: { patientData: MhdUser }) {
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [doctors, setDoctors] = useState<DocRow[]>([]);
  const [tab, setTab] = useState('Upcoming');
  const [f, setF] = useState({ doctorId: '', date: todayStr(), type: TYPES[0], reason: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u1 = bind<Appointment>('appointments', [['patientId', '==', patientData.id]], setAppts);
    getDocs(query(collection(db, 'users'), where('role', '==', 'doctor')))
      .then((s) => setDoctors(s.docs.map((d) => ({ id: d.id, ...d.data() } as DocRow))))
      .catch(() => { /* ignore */ });
    return u1;
  }, [patientData.id]);

  const doctor = doctors.find((d) => d.id === f.doctorId);

  const book = async (time: string) => {
    if (!doctor) { toast('Choose a doctor first.', 'err'); return; }
    setBusy(true);
    try {
      // double-booking lock (same as original)
      await setDocDoc(slotKey(doctor.id, f.date, time));
      await addDoc(collection(db, 'appointments'), {
        patientId: patientData.id, patientName: patientData.name, healthId: patientData.healthId || '',
        doctorId: doctor.id, doctorName: 'Dr. ' + doctor.name, hospital: doctor.hospital || 'MHD Hospital',
        date: f.date, time, type: f.type, reason: f.reason || '', status: 'upcoming', createdAt: Date.now(),
      });
      await addDoc(collection(db, 'timeline'), {
        patientId: patientData.id, date: f.date, type: 'appointment', icon: '📅',
        title: 'Appointment booked', description: `${'Dr. ' + doctor.name} · ${f.type}`, createdAt: Date.now(),
      });
      await notify(doctor.id, '📅 New appointment', `${patientData.name} booked ${fmtD(f.date)} ${time}`);
      toast('Appointment booked ✅');
    } catch {
      toast('That slot was just taken — pick another.', 'err');
    } finally { setBusy(false); }
  };

  // small helper so the setDoc lock failure propagates
  const setDocDoc = async (key: string) => {
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'slots', key), { doctorId: doctor!.id, date: f.date, patientId: patientData.id, createdAt: Date.now() });
  };

  const cancel = async (a: Appointment) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await updateDoc(doc(db, 'appointments', a.id), { status: 'cancelled' });
      await deleteDoc(doc(db, 'slots', slotKey(a.doctorId, a.date, a.time))).catch(() => { /* ignore */ });
      await notify(a.doctorId, '🚫 Appointment cancelled', `${patientData.name} cancelled ${fmtD(a.date)} ${a.time}`);
      toast('Appointment cancelled');
    } catch { toast('Could not cancel', 'err'); }
  };

  if (appts === null) return <div className="max-w-[1000px] mx-auto space-y-6"><Loading /></div>;

  const list = [...appts].sort((a, b) => b.createdAt - a.createdAt)
    .filter((a) => tab === 'All' || a.status === tab.toLowerCase());
  const booked = appts.filter((a) => a.doctorId === f.doctorId && a.date === f.date && a.status === 'upcoming').map((a) => a.time);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title="📅 Appointments" sub="Book a doctor, pick a slot, and track your visits." />

      {/* Booking */}
      <div className="bg-surface border border-line rounded-[4px] p-5 shadow-sm space-y-4">
        <h4 className="text-[13px] font-bold text-ink uppercase tracking-wider">➕ Book Appointment</h4>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Doctor</label>
            <select value={f.doctorId} onChange={(e) => setF({ ...f, doctorId: e.target.value })} className={inputCls}>
              <option value="">Select a doctor…</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.name} · {d.specialization || ''}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Date</label><input type="date" min={todayStr()} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={inputCls} /></div>
          <div>
            <label className={labelCls}>Type</label>
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={inputCls}>
              {TYPES.map((ty) => <option key={ty}>{ty}</option>)}
            </select>
          </div>
        </div>
        <div><label className={labelCls}>Reason (optional)</label><input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className={inputCls} /></div>
        {doctor && (
          <div>
            <label className={labelCls}>Available slots — {fmtD(f.date)}</label>
            <div className="flex flex-wrap gap-2">
              {SLOT_TIMES.map((tm) => {
                const isBooked = booked.includes(tm);
                return (
                  <button key={tm} disabled={isBooked || busy}
                    onClick={() => book(tm)}
                    className={`text-[12px] font-medium px-3 py-2 rounded-[4px] border transition-colors ${
                      isBooked ? 'bg-app border-line text-muted cursor-not-allowed' : 'border-primary text-primary hover:bg-active'}`}>
                    {isBooked ? <Lock className="w-3 h-3 inline mr-1" /> : null}{tm}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <FilterPills filters={['Upcoming', 'Completed', 'Cancelled']} value={tab} onChange={setTab} />

      {list.length === 0 ? (
        <EmptyState icon={<Calendar className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title={`No ${tab.toLowerCase()} appointments`} sub="Book one above." />
      ) : (
        <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
          <div className="divide-y divide-line">
            {list.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-stripe transition-colors">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{a.doctorName} <span className="text-muted font-normal">· {a.type}</span></p>
                  <p className="text-[12px] text-muted mt-0.5">{fmtD(a.date)} · {a.time} · {a.hospital || '—'}{a.reason ? ` · ${a.reason}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.status === 'upcoming' && <span className="text-[11px] font-bold text-primary border border-primary rounded-[4px] px-2 py-0.5">🎟️ #{queueNumberOf(appts, a)}</span>}
                  <StatusChip ok={a.status === 'completed'} warn={a.status === 'upcoming'} danger={a.status === 'cancelled'}>{a.status}</StatusChip>
                  {a.status === 'upcoming' && (
                    <button onClick={() => cancel(a)} className="text-[12px] font-medium text-danger border border-danger-bd px-3 py-1.5 rounded-[4px] hover:bg-danger-bg transition-colors">Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
