import { useEffect, useState } from 'react';
import { ListChecks, FileText } from 'lucide-react';
import type { MhdUser, ReportDoc } from '../lib/types';
import { fmtD, fmtDT } from '../lib/format';
import Modal from '../components/Modal';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState, StatusChip, FilterPills } from './common';

export default function ResultsTab({ patientData }: { patientData: MhdUser }) {
  const [reports, setReports] = useState<ReportDoc[] | null>(null);
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState<ReportDoc | null>(null);

  useEffect(() => bind<ReportDoc>('reports', [['patientId', '==', patientData.id]], setReports), [patientData.id]);

  if (reports === null) return <div className="max-w-[1000px] mx-auto"><Loading /></div>;

  const types = ['All', ...Array.from(new Set(reports.map((r) => r.type)))];
  const list = [...reports].sort((a, b) => b.createdAt - a.createdAt)
    .filter((r) => filter === 'All' || r.type === filter);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title="My Results" sub="Lab reports, scans and documents uploaded by the hospital." />
      <FilterPills filters={types} value={filter} onChange={setFilter} />

      {list.length === 0 ? (
        <EmptyState icon={<ListChecks className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No results yet" sub="Documents your hospital uploads will appear here." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {list.map((r) => (
            <button key={r.id} onClick={() => setOpen(r)} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm text-left hover:border-primary transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {r.fileData ? (
                    <img src={r.fileData} alt="" className="w-12 h-12 rounded-[4px] object-cover border border-line shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-[4px] bg-active flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-primary" strokeWidth={1.5} /></div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink truncate">{r.title}</p>
                    <p className="text-[12px] text-muted">{r.type} · {fmtD(r.date)}</p>
                  </div>
                </div>
                <StatusChip ok={r.verified} warn={!r.verified}>{r.verified ? 'Verified' : 'Pending'}</StatusChip>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <Modal title={open.title} onClose={() => setOpen(null)}
          icon={<FileText className="w-5 h-5 text-primary" strokeWidth={1.5} />}>
          {open.fileData && <img src={open.fileData} alt={open.title} className="w-full rounded-[4px] border border-line mb-4" />}
          <dl className="text-[13px] space-y-1.5">
            {[['Type', open.type], ['Date', fmtD(open.date)], ['Hospital', open.hospital], ['Doctor', open.doctor], ['Note', open.note],
              ['Uploaded by', (open.uploadedBy || '—') + (open.uploadedByRole ? ` (${open.uploadedByRole})` : '')],
              ['Uploaded on', fmtDT(open.createdAt)], ['Status', open.verified ? 'Verified' : 'Awaiting verification']].map(([k, v], i) => v && (
              <div key={`${k}-${i}`} className="flex gap-2"><dt className="w-[110px] shrink-0 text-muted">{k}</dt><dd className="text-ink">{v}</dd></div>
            ))}
          </dl>
        </Modal>
      )}
    </div>
  );
}
