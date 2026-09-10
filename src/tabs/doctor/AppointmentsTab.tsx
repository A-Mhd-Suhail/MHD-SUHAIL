import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
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

  const setStatus = async (a: Appointment, status: 'completed' | 'cancelled') => {
    try {
      await updateDoc(doc(db, 'appointments', a.id), { status });
      if (status === 'cancelled') await deleteDoc(doc(db, 'slots', slotKey(a.doctorId, a.date, a.time))).catch(() => { /* ignore */ });
      await notify(a.patientId, status === 'completed' ? '✅ Appointment completed' : '🚫 Appointment cancelled', `Dr. ${doctorData.name} marked ${fmtD(a.date)} ${a.time} as ${status}`);
      toast(status === 'completed' ? 'Marked done ✅' : 'Cancelled');
    } catch { toast('Could not update', 'err'); }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="📅 My Appointments" sub="All bookings with your patients — mark visits done." />
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
                  <StatusChip ok={a.status === 'completed'} warn={a.status === 'upcoming'} danger={a.status === 'cancelled'}>{a.status}</StatusChip>
                  {a.status === 'upcoming' && (
                    <>
                      <button onClick={() => setStatus(a, 'completed')} className="text-[12px] font-medium text-ok border border-ok-bd px-3 py-1.5 rounded-[4px] hover:bg-ok-bg transition-colors">✔ Mark Done</button>
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
