import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import type { MhdUser, TimelineEntry } from '../lib/types';
import { fmtDT } from '../lib/format';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState, FilterPills } from './common';

export default function TimelineTab({ patientData }: { patientData: MhdUser }) {
  const [entries, setEntries] = useState<TimelineEntry[] | null>(null);
  const [filter, setFilter] = useState('All');

  useEffect(() => bind<TimelineEntry>('timeline', [['patientId', '==', patientData.id]], setEntries), [patientData.id]);

  if (entries === null) return <div className="max-w-[1000px] mx-auto"><Loading /></div>;

  const types = ['All', 'case', 'appointment', 'consult', 'prescription', 'followup', 'report'];
  const list = [...entries].sort((a, b) => b.createdAt - a.createdAt)
    .filter((e) => filter === 'All' || e.type === filter);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title="Timeline" sub="Your complete medical journey — newest first." />
      <FilterPills filters={types} value={filter} onChange={setFilter} />

      {list.length === 0 ? (
        <EmptyState icon={<History className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="Nothing here yet" sub="Cases, appointments and prescriptions will build this timeline." />
      ) : (
        <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden divide-y divide-line">
          {list.map((e, idx) => (
            <div key={`${e.id}-${idx}`} className="flex items-start gap-4 px-4 py-3 hover:bg-stripe transition-colors">
              <span className="text-[20px] leading-none mt-0.5">{e.icon || '•'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-ink">{e.title}</p>
                {e.description && <p className="text-[12px] text-muted mt-0.5">{e.description}</p>}
                {e.due && <p className="text-[12px] text-warn mt-0.5">Due {e.due}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[12px] font-medium text-muted">{fmtDT(e.createdAt)}</p>
                <p className="text-[11px] text-muted">{e.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
