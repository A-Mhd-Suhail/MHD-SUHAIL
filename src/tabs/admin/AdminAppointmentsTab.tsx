import { useEffect, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Appointment } from '../../lib/types';
import { fmtD, timeToMin } from '../../lib/format';
import { PageHeader, Loading, StatusChip } from '../common';

export default function AdminAppointmentsTab({ }: { adminData: MhdUser }) {
  const [appts, setAppts] = useState<Appointment[] | null>(null);

  useEffect(() => {
    const u = onSnapshot(collection(db, 'appointments'), (s) => setAppts(s.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment))));
    return u;
  }, []);

  if (appts === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  const counts = {
    total: appts.length,
    upcoming: appts.filter((a) => a.status === 'upcoming').length,
    completed: appts.filter((a) => a.status === 'completed').length,
    cancelled: appts.filter((a) => a.status === 'cancelled').length,
  };

  const byDate = new Map<string, Appointment[]>();
  appts.forEach((a) => {
    const arr = byDate.get(a.date) || [];
    arr.push(a);
    byDate.set(a.date, arr);
  });
  const dates = [...byDate.keys()].sort().reverse();

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="Appointments" sub="Every appointment across the hospital, grouped by day." />

      <div className="grid grid-cols-4 gap-4">
        {[['Total', counts.total, 'text-heading'], ['Upcoming', counts.upcoming, 'text-warn'], ['Completed', counts.completed, 'text-ok'], ['Cancelled', counts.cancelled, 'text-danger']].map(([l, v, c], idx) => (
          <div key={`${l}-${idx}`} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">{l}</p>
            <p className={`text-[24px] font-bold ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      {dates.length === 0 ? (
        <p className="p-6 text-[13px] text-muted text-center">No appointments.</p>
      ) : (
        <div className="space-y-4">
          {dates.map((d, i) => {
            const rows = byDate.get(d)!.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
            return (
              <div key={`${d}-${i}`} className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-line bg-stripe flex items-center justify-between">
                  <h4 className="text-[12px] font-bold text-ink">{fmtD(d)}</h4>
                  <span className="text-[11px] font-bold text-muted uppercase">{rows.length} appointment{rows.length > 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-line">
                  {rows.map((a, j) => (
                    <div key={`${a.id}-${j}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px]">
                      <div>
                        <p className="font-medium text-ink">{a.time} · {a.patientName} <span className="text-muted font-normal">→ {a.doctorName}</span></p>
                        <p className="text-[12px] text-muted">{a.type}{a.reason ? ` · ${a.reason}` : ''}</p>
                      </div>
                      <StatusChip ok={a.status === 'completed'} warn={a.status === 'upcoming'} danger={a.status === 'cancelled'}>{a.status}</StatusChip>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
