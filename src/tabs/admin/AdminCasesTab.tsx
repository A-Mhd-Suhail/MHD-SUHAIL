import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, CaseDoc } from '../../lib/types';
import { fmtDT, rupees } from '../../lib/format';
import Modal from '../../components/Modal';
import { PageHeader, Loading, StatusChip, FilterPills } from '../common';

export default function AdminCasesTab({ }: { adminData: MhdUser }) {
  const [cases, setCases] = useState<CaseDoc[] | null>(null);
  const [filter, setFilter] = useState('All');
  const [open, setOpen] = useState<CaseDoc | null>(null);

  useEffect(() => {
    const u = onSnapshot(collection(db, 'cases'), (s) => setCases(s.docs.map((d) => ({ id: d.id, ...d.data() } as CaseDoc))));
    return u;
  }, []);

  if (cases === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  const list = [...cases].sort((a, b) => b.createdAt - a.createdAt)
    .filter((c) => filter === 'All' || (filter === 'Waiting' ? c.status === 'waiting' : c.status === 'reviewed'));

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="All Cases" sub={`${cases.length} cases across the hospital.`} />
      <FilterPills filters={['All', 'Waiting', 'Reviewed']} value={filter} onChange={setFilter} />

      <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stripe border-b border-line">
                {['Patient', 'Complaint', 'Severity', 'Status', 'Doctor', 'Fee', 'When'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((c) => (
                <tr key={c.id} className="hover:bg-stripe transition-colors text-[13px] cursor-pointer" onClick={() => setOpen(c)}>
                  <td className="px-4 py-3 font-medium text-ink">{c.patientName} <span className="font-mono text-[11px] text-muted">{c.healthId}</span></td>
                  <td className="px-4 py-3 text-muted max-w-[220px] truncate">{c.chiefComplaint}</td>
                  <td className="px-4 py-3"><StatusChip danger={c.severity === 'Severe'} warn={c.severity === 'Moderate'} ok={c.severity === 'Mild'}>{c.severity}</StatusChip></td>
                  <td className="px-4 py-3"><StatusChip ok={c.status === 'reviewed'} warn={c.status === 'waiting'}>{c.status}</StatusChip></td>
                  <td className="px-4 py-3 text-muted">{c.doctorName || '—'}</td>
                  <td className="px-4 py-3 text-muted">{c.fee ? rupees(c.fee) : '—'}</td>
                  <td className="px-4 py-3 text-muted">{fmtDT(c.createdAt)}</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted text-[13px]">No cases.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <Modal wide title={`Case — ${open.patientName}`} onClose={() => setOpen(null)}>
          <div className="space-y-2 text-[13px]">
            {[['Complaint', open.chiefComplaint], ['Symptoms', open.symptoms], ['Area', open.area], ['Duration', open.duration], ['Severity', open.severity], ['Prev treatment', open.prevTreatment], ['Existing', open.existing], ['Current meds', open.currentMeds], ['Allergy note', open.allergyNote], ['Surgery note', open.surgeryNote], ['Family history', open.familyHistory], ['Other', open.other]].map(([k, v], i) => v && (
              <p key={`${k}-${i}`}><b className="text-muted">{k}:</b> <span className="whitespace-pre-line">{v}</span></p>
            ))}
            {open.status === 'reviewed' && (
              <div className="border-t border-line pt-3 mt-3 space-y-1">
                <p><b className="text-muted">Reviewed by:</b> {open.doctorName} · {fmtDT(open.reviewedAt)}</p>
                <p><b className="text-muted">Notes:</b> {open.doctorNotes}</p>
                <p><b className="text-muted">Prescription:</b> <span className="whitespace-pre-line">{open.prescriptionText}</span></p>
                <p><b className="text-muted">Fee:</b> {open.fee ? rupees(open.fee) : '—'}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
