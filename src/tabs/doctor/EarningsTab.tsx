import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Bill } from '../../lib/types';
import { fmtDT, rupees } from '../../lib/format';
import { PageHeader, Loading, EmptyState, StatusChip } from '../common';

export default function EarningsTab({ doctorData }: { doctorData: MhdUser }) {
  const [bills, setBills] = useState<Bill[] | null>(null);

  useEffect(() => {
    const u = onSnapshot(query(collection(db, 'bills'), where('doctorId', '==', doctorData.id)), (s) =>
      setBills(s.docs.map((d) => ({ id: d.id, ...d.data() } as Bill))));
    return u;
  }, [doctorData.id]);

  if (bills === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  const list = [...bills].sort((a, b) => b.createdAt - a.createdAt);
  const paid = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + (b.total || 0), 0);
  const pending = bills.filter((b) => b.status === 'pending').reduce((s, b) => s + (b.total || 0), 0);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="My Earnings" sub="Consultation fees generated from your case reviews." />

      <div className="grid grid-cols-3 gap-4">
        {[['Collected', paid, 'text-ok'], ['Pending', pending, 'text-warn'], ['Consultations', bills.length, 'text-heading']].map(([l, v, c]) => (
          <div key={l as string} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">{l}</p>
            <p className={`text-[24px] font-bold leading-tight ${c}`}>{typeof v === 'number' && l !== 'Consultations' ? rupees(v) : v}</p>
          </div>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<DollarSign className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No earnings yet" sub="Review cases with a fee to generate bills." />
      ) : (
        <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stripe border-b border-line">
                {['Patient', 'Date', 'Items', 'Total', 'Status', 'Paid on'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((b) => (
                <tr key={b.id} className="hover:bg-stripe transition-colors text-[13px]">
                  <td className="px-4 py-3 font-medium text-ink">{b.patientName || '—'}</td>
                  <td className="px-4 py-3 text-muted">{fmtDT(b.createdAt)}</td>
                  <td className="px-4 py-3 text-muted">{(b.items || []).map((i) => i.label).join(', ') || '—'}</td>
                  <td className="px-4 py-3 font-bold text-heading">{rupees(b.total)}</td>
                  <td className="px-4 py-3"><StatusChip ok={b.status === 'paid'} warn={b.status === 'pending'}>{b.status}</StatusChip></td>
                  <td className="px-4 py-3 text-muted">{b.paidAt ? fmtDT(b.paidAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
