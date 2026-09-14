import { useEffect, useState } from 'react';
import { FileCheck, FileText, Loader2 } from 'lucide-react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, ReportDoc } from '../../lib/types';
import { fmtD, fmtDT } from '../../lib/format';
import { notify } from '../../lib/fs';
import Modal from '../../components/Modal';
import { toast } from '../../components/Toaster';
import { PageHeader, Loading, StatusChip } from '../common';

/** Verify Documents (original pg-h-docs). */
export default function AdminReportsTab({ adminData }: { adminData: MhdUser }) {
  const [reports, setReports] = useState<ReportDoc[] | null>(null);
  const [open, setOpen] = useState<ReportDoc | null>(null);

  useEffect(() => {
    const u = onSnapshot(collection(db, 'reports'), (s) =>
      setReports(s.docs.map((d) => ({ id: d.id, ...d.data() } as ReportDoc)).sort((a, b) => b.createdAt - a.createdAt)));
    return u;
  }, []);

  if (reports === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  const unverified = reports.filter((r) => !r.verified);

  const verify = async (r: ReportDoc) => {
    try {
      await updateDoc(doc(db, 'reports', r.id), { verified: true, verifiedBy: adminData.name, verifiedAt: Date.now() });
      await notify(r.patientId, 'Document verified', `${r.title} was verified by ${adminData.name}`);
      toast('Document verified');
    } catch { toast('Could not verify', 'err'); }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="Verify Documents" sub={unverified.length ? `${unverified.length} document(s) awaiting verification.` : 'All documents verified.'} />

      {reports.length === 0 ? (
        <p className="p-6 text-[13px] text-muted text-center">No documents uploaded yet. Use Upload Result to add one.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r, i) => (
            <div key={`${r.id}-${i}`} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
              <button onClick={() => setOpen(r)} className="w-full text-left">
                {r.fileData ? (
                  <img src={r.fileData} alt="" className="w-full h-[120px] object-cover rounded-[4px] border border-line mb-3" />
                ) : (
                  <div className="w-full h-[120px] rounded-[4px] bg-active flex items-center justify-center mb-3"><FileText className="w-8 h-8 text-primary" strokeWidth={1.5} /></div>
                )}
                <p className="text-[13px] font-semibold text-ink truncate">{r.title}</p>
                <p className="text-[12px] text-muted">{r.type} · {r.patientName || '—'}</p>
                <p className="text-[11px] text-muted mt-0.5">{fmtD(r.date)} · by {r.uploadedBy || '—'}</p>
              </button>
              <div className="flex items-center justify-between mt-3">
                <StatusChip ok={r.verified} warn={!r.verified}>{r.verified ? 'Verified' : 'Pending'}</StatusChip>
                {!r.verified && (
                  <button onClick={() => verify(r)} className="text-[12px] font-bold text-ok border border-ok-bd px-3 py-1.5 rounded-[4px] hover:bg-ok-bg transition-colors">Verify</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal wide title={open.title} onClose={() => setOpen(null)}>
          {open.fileData && <img src={open.fileData} alt={open.title} className="w-full rounded-[4px] border border-line mb-4" />}
          <div className="text-[13px] space-y-1.5">
            {[['Type', open.type], ['Patient', open.patientName], ['Health ID', open.healthId], ['Date', fmtD(open.date)],
              ['Hospital', open.hospital], ['Doctor', open.doctor], ['Note', open.note],
              ['Uploaded', `${open.uploadedBy || '—'} · ${fmtDT(open.createdAt)}`],
              ['Status', open.verified ? 'Verified' : 'Awaiting verification']].map(([k, v], i) => v && (
              <p key={`${k}-${i}`}><b className="text-muted">{k}:</b> {v}</p>
            ))}
          </div>
          {!open.verified && (
            <button onClick={() => { verify(open); setOpen(null); }} className="mt-4 h-[40px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d">
             Verify this result
            </button>
          )}
        </Modal>
      )}
    </div>
  );
}
