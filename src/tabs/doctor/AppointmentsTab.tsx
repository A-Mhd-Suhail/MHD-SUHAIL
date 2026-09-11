import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Appointment } from '../../lib/types';
import { fmtD, slotKey } from '../../lib/format';
import { notify } from '../../lib/fs';
import { toast } from '../../components/Toaster';
import { PageHeader, Loading, EmptyState, StatusChip, FilterPills } from '../common';

export default function AppointmentsTab({ doctorData }: { doctorData: MhdUser }) {
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const u = onSnapshot(query(collection(db, 'appointments'), where('doctorId', '==', doctorData.id)), (s) =>
      setAppts(s.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment))));
    return u;
  }, [doctorData.id]);

  if (appts === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  const list = [...appts].sort((a, b) => b.createdAt - a.createdAt)
    .filter((a) => filter === 'All' || a.status === filter.toLowerCase());

  const accept = async (a: Appointment) => {
    try {
      await updateDoc(doc(db, 'appointments', a.id), { confirmed: true, confirmedAt: Date.now(), confirmedBy: doctorData.id });
      await Promise.all([
        notify(a.patientId, 'Appointment accepted', `Dr. ${doctorData.name} accepted your appointment for ${fmtD(a.date)} at ${a.time}`, 'appointments'),
        notify('role:hospital', 'Appointment accepted', `Dr. ${doctorData.name} accepted ${a.patientName}'s appointment`, 'appointments'),
      ]);
      toast('Appointment accepted');
    } catch { toast('Could not accept appointment', 'err'); }
  };

  const setStatus = async (a: Appointment, status: 'completed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'appointments', a.id), { status, updatedAt: Date.now(), updatedBy: doctorData.id });
      if (status === 'cancelled') await deleteDoc(doc(db, 'slots', slotKey(a.doctorId, a.date, a.time))).catch(() => { /* ignore */ });
      await addDoc(collection(db, 'timeline'), { patientId: a.patientId, date: a.date, type: 'appointment', icon: '', title: status === 'completed' ? 'Appointment completed' : 'Appointment cancelled', description: `Dr. ${doctorData.name} · ${a.time}`, createdAt: Date.now() });
      await Promise.all([
        notify(a.patientId, status === 'completed' ? 'Appointment completed' : 'Appointment cancelled', `Dr. ${doctorData.name} marked ${fmtD(a.date)} ${a.time} as ${status}`, 'appointments'),
        notify('role:hospital', status === 'completed' ? 'Appointment completed' : 'Appointment cancelled', `Dr. ${doctorData.name} updated ${a.patientName}'s appointment for ${fmtD(a.date)}`, 'appointments'),
      ]);
      toast(status === 'completed' ? 'Marked done' : 'Cancelled');
    } catch { toast('Could not update', 'err'); }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="My Appointments" sub="All bookings with your patients — mark visits done." />
      <FilterPills filters={['All', 'Upcoming', 'Completed', 'Cancelled']} value={filter} onChange={setFilter} />

      {list.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No appointments here" sub="Patient bookings appear automatically." />
      ) : (
        <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
          <div className="divide-y divide-line">
            {list.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-stripe transition-colors">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{a.patientName} <span className="text-[11px] font-mono text-muted">{a.healthId}</span></p>
                  <p className="text-[12px] text-muted mt-0.5">{fmtD(a.date)} · {a.time} · {a.type}{a.reason ? ` · ${a.reason}` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip ok={a.status === 'completed' || a.confirmed === true} warn={a.status === 'upcoming' && !a.confirmed} danger={a.status === 'cancelled'}>{a.status === 'upcoming' && !a.confirmed ? 'pending' : a.status === 'upcoming' ? 'accepted' : a.status}</StatusChip>
                  {a.status === 'upcoming' && (
                    <>
                      {!a.confirmed && <button onClick={() => accept(a)} className="text-[12px] font-medium text-primary border border-primary px-3 py-1.5 rounded-[4px] hover:bg-active transition-colors">Accept</button>}
                      <button onClick={() => setStatus(a, 'completed')} className="text-[12px] font-medium text-ok border border-ok-bd px-3 py-1.5 rounded-[4px] hover:bg-ok-bg transition-colors">Mark Done</button>
                      <button onClick={() => setStatus(a, 'cancelled')} className="text-[12px] font-medium text-danger border border-danger-bd px-3 py-1.5 rounded-[4px] hover:bg-danger-bg transition-colors">Cancel</button>
                    </>
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
