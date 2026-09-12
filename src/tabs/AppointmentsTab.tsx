import { useEffect, useState } from 'react';
import { Calendar, Loader2, Lock, Building2 } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser, Appointment } from '../lib/types';
import { fmtD, todayStr, SLOT_TIMES, slotKey, queueNumberOf } from '../lib/format';
import { notify, logAccess } from '../lib/fs';
import { toast } from '../components/Toaster';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState, StatusChip, inputCls, labelCls, btnPrimary, FilterPills } from './common';

const TYPES = ['Follow-up Checkup', 'Video Consultation', 'In-person Visit'];

interface DocRow { id: string; name?: string; specialization?: string; hospital?: string; hospitals?: string[]; phone?: string; photo?: string; onDuty?: boolean }

export default function AppointmentsTab({ patientData }: { patientData: MhdUser }) {
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [doctors, setDoctors] = useState<DocRow[]>([]);
  const [hospitals, setHospitals] = useState<string[]>([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [tab, setTab] = useState('Upcoming');
  const [f, setF] = useState({ doctorId: '', date: todayStr(), type: TYPES[0], reason: '' });
  const [busy, setBusy] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');

  useEffect(() => {
    const u1 = bind<Appointment>('appointments', [['patientId', '==', patientData.id]], setAppts);
    Promise.all([
      getDocs(query(collection(db, 'users'), where('role', '==', 'doctor'))),
      getDocs(query(collection(db, 'users'), where('role', '==', 'hospital'))),
    ])
      .then(([docSnap, hospSnap]) => {
        const docsList = docSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DocRow));
        setDoctors(docsList);

        const hospNames = new Set<string>();
        // Add hospitals from registered hospital users
        hospSnap.docs.forEach((d) => {
          const name = (d.data().name as string)?.trim();
          if (name) hospNames.add(name);
        });
        // Add hospitals from doctor profiles
        docsList.forEach((d) => {
          const name = (d.hospital || 'MHD Hospital').trim();
          if (name) hospNames.add(name);
          if (Array.isArray(d.hospitals)) {
            d.hospitals.forEach((h) => {
              if (h && typeof h === 'string' && h.trim()) hospNames.add(h.trim());
            });
          }
        });
        if (hospNames.size === 0) {
          hospNames.add('MHD Hospital');
        }
        const sortedHospitals = Array.from(hospNames).sort((a, b) => a.localeCompare(b));
        setHospitals(sortedHospitals);
      })
      .catch(() => { /* ignore */ });
    return u1;
  }, [patientData.id]);

  const filteredDoctors = selectedHospital
    ? doctors.filter((d) => {
        const target = selectedHospital.trim().toLowerCase();
        const primary = (d.hospital || 'MHD Hospital').trim().toLowerCase();
        const affiliated = (d.hospitals || []).map((h) => h.trim().toLowerCase());
        return primary === target || affiliated.includes(target);
      })
    : [];

  const doctor = doctors.find((d) => d.id === f.doctorId);

  const book = async (time: string) => {
    if (!doctor) { toast('Choose a doctor first.', 'err'); return; }
    setBusy(true);
    try {
      // double-booking lock (same as original)
      await setDocDoc(slotKey(doctor.id, f.date, time));
      await addDoc(collection(db, 'appointments'), {
        patientId: patientData.id, patientName: patientData.name, healthId: patientData.healthId || '',
        doctorId: doctor.id, doctorName: 'Dr. ' + doctor.name, hospital: selectedHospital || doctor.hospital || 'MHD Hospital',
        date: f.date, time, type: f.type, reason: f.reason || '', status: 'upcoming', confirmed: false, createdAt: Date.now(),
      });
      await addDoc(collection(db, 'timeline'), {
        patientId: patientData.id, date: f.date, type: 'appointment', icon: '',
        title: 'Appointment booked', description: `${'Dr. ' + doctor.name} · ${f.type}`, createdAt: Date.now(),
      });
      await Promise.all([
        notify(doctor.id, 'New appointment request', `${patientData.name} booked ${fmtD(f.date)} at ${time}`, 'appointments'),
        notify('role:hospital', 'New hospital appointment', `${patientData.name} booked Dr. ${doctor.name} for ${fmtD(f.date)} at ${time}`, 'appointments'),
      ]);
      setSelectedTime('');
      toast('Appointment booked');
    } catch {
      toast('That slot was just taken — pick another.', 'err');
    } finally { setBusy(false); }
  };

  // small helper so the setDoc lock failure propagates
  const setDocDoc = async (key: string) => {
    await runTransaction(db, async (tx) => {
      const slotRef = doc(db, 'slots', key);
      const existing = await tx.get(slotRef);
      if (existing.exists()) throw new Error('SLOT_TAKEN');
      tx.set(slotRef, { doctorId: doctor!.id, date: f.date, patientId: patientData.id, createdAt: Date.now() });
    });
  };

  const cancel = async (a: Appointment) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await updateDoc(doc(db, 'appointments', a.id), { status: 'cancelled' });
      await deleteDoc(doc(db, 'slots', slotKey(a.doctorId, a.date, a.time))).catch(() => { /* ignore */ });
      await addDoc(collection(db, 'timeline'), { patientId: patientData.id, date: a.date, type: 'appointment', icon: '', title: 'Appointment cancelled', description: `Cancelled with ${a.doctorName} · ${a.time}`, createdAt: Date.now() });
      await Promise.all([
        notify(a.doctorId, 'Appointment cancelled', `${patientData.name} cancelled ${fmtD(a.date)} ${a.time}`, 'appointments'),
        notify('role:hospital', 'Appointment cancelled', `${patientData.name} cancelled an appointment with ${a.doctorName}`, 'appointments'),
      ]);
      toast('Appointment cancelled');
    } catch { toast('Could not cancel', 'err'); }
  };

  if (appts === null) return <div className="max-w-[1000px] mx-auto space-y-6"><Loading /></div>;

  const list = [...appts].sort((a, b) => b.createdAt - a.createdAt)
    .filter((a) => tab === 'All' || a.status === tab.toLowerCase());
  const booked = appts.filter((a) => a.doctorId === f.doctorId && a.date === f.date && a.status === 'upcoming').map((a) => a.time);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title="Appointments" sub="Book a doctor, pick a slot, and track your visits." />

      {/* Booking */}
      <div className="bg-surface/95 border border-line rounded-2xl p-6 shadow-[0_8px_30px_rgba(16,42,67,0.08)] space-y-5">
        <div className="flex items-center gap-3 pb-1">
          <div className="w-10 h-10 rounded-xl bg-active flex items-center justify-center text-primary"><Calendar className="w-5 h-5" /></div>
          <div><h4 className="text-[15px] font-semibold text-heading">Book an appointment</h4><p className="text-[12px] text-muted mt-0.5">Select a hospital, choose a doctor, date, and visit type.</p></div>
        </div>

        {/* Select Hospital dropdown above Doctor field */}
        <div>
          <label className={labelCls}>Select Hospital</label>
          <select
            id="appointment-select-hospital"
            value={selectedHospital}
            onChange={(e) => {
              const nextHosp = e.target.value;
              setSelectedHospital(nextHosp);
              setF((prev) => ({ ...prev, doctorId: '' }));
              setSelectedTime('');
            }}
            className={inputCls}
          >
            <option value="">Select a hospital…</option>
            {hospitals.map((h, i) => (
              <option key={`${h}-${i}`} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Doctor</label>
            <select
              id="appointment-select-doctor"
              value={f.doctorId}
              onChange={(e) => {
                setF({ ...f, doctorId: e.target.value });
                setSelectedTime('');
              }}
              disabled={!selectedHospital}
              className={inputCls + (!selectedHospital ? ' opacity-60 cursor-not-allowed' : '')}
            >
              {!selectedHospital ? (
                <option value="">Select hospital first…</option>
              ) : filteredDoctors.length === 0 ? (
                <option value="">No doctors available at this hospital</option>
              ) : (
                <>
                  <option value="">Select a doctor…</option>
                  {filteredDoctors.map((d, i) => (
                    <option key={`${d.id}-${i}`} value={d.id}>
                      Dr. {d.name} {d.specialization ? `· ${d.specialization}` : ''}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              min={todayStr()}
              value={f.date}
              onChange={(e) => {
                setF({ ...f, date: e.target.value });
                setSelectedTime('');
              }}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select
              value={f.type}
              onChange={(e) => setF({ ...f, type: e.target.value })}
              className={inputCls}
            >
              {TYPES.map((ty, i) => (
                <option key={`${ty}-${i}`}>{ty}</option>
              ))}
            </select>
          </div>
        </div>
        <div><label className={labelCls}>Reason (optional)</label><input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} className={inputCls} /></div>
        {doctor && (
          <div>
            <label className={labelCls}>Available slots — {fmtD(f.date)}</label>
            <div className="flex flex-wrap gap-2">
              {SLOT_TIMES.map((tm, i) => {
                const isBooked = booked.includes(tm);
                return (
                  <button key={`${tm}-${i}`} disabled={isBooked || busy}
                    onClick={() => setSelectedTime(tm)}
                    className={`text-[12px] font-medium px-3 py-2 rounded-[4px] border transition-colors ${
                      isBooked ? 'bg-app border-line text-muted cursor-not-allowed' : selectedTime === tm ? 'bg-primary text-on-navy border-primary' : 'border-primary text-primary hover:bg-active'}`}>
                    {isBooked ? <Lock className="w-3 h-3 inline mr-1" /> : null}{tm}
                  </button>
                );
              })}
            </div>
            {selectedTime && !booked.includes(selectedTime) && <button disabled={busy} onClick={() => book(selectedTime)} className={btnPrimary + ' mt-3 disabled:opacity-60'}>{busy ? 'Booking…' : 'Book Appointment'}</button>}
          </div>
        )}
      </div>

      <FilterPills filters={['Upcoming', 'Completed', 'Cancelled']} value={tab} onChange={setTab} />

      {list.length === 0 ? (
        <EmptyState icon={<Calendar className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title={`No ${tab.toLowerCase()} appointments`} sub="Book one above." />
      ) : (
        <div className="bg-surface border border-line rounded-2xl shadow-[0_6px_24px_rgba(16,42,67,0.06)] overflow-hidden">
          <div className="divide-y divide-line">
            {list.map((a, i) => (
              <div key={`${a.id}-${i}`} className="flex items-center justify-between px-4 py-3 hover:bg-stripe transition-colors">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{a.doctorName} <span className="text-muted font-normal">· {a.type}</span></p>
                  <p className="text-[12px] text-muted mt-0.5">{fmtD(a.date)} · {a.time} · {a.hospital || '—'}{a.reason ? ` · ${a.reason}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.status === 'upcoming' && <span className="text-[11px] font-bold text-primary border border-primary rounded-[4px] px-2 py-0.5">#{queueNumberOf(appts, a)}</span>}
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
