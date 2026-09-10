import { useEffect, useState } from 'react';
import { FileText, Pill, Users, CalendarCheck, Bell, ArrowRight, Loader2 } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, CaseDoc, Appointment, Medicine, Notif } from '../../lib/types';
import { t } from '../../lib/i18n';
import { greetKey } from '../../lib/format';
import { todayStr, fmtD, queueNumberOf } from '../../lib/format';
import { PageHeader } from '../common';

export default function DoctorHomeTab({ doctorData, go }: { doctorData: MhdUser; go?: (tab: string) => void }) {
  const [cases, setCases] = useState<CaseDoc[]>([]);
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const us: (() => void)[] = [];
    us.push(onSnapshot(query(collection(db, 'cases'), where('status', '==', 'waiting')), (s) => { setCases(s.docs.map((d) => ({ id: d.id, ...d.data() } as CaseDoc))); setLoading(false); }, () => setLoading(false)));
    us.push(onSnapshot(query(collection(db, 'appointments'), where('doctorId', '==', doctorData.id)), (s) => setAppts(s.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)))));
    us.push(onSnapshot(query(collection(db, 'medicines'), where('verified', '==', false)), (s) => setMeds(s.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine)))));
    us.push(onSnapshot(query(collection(db, 'notifications'), where('to', '==', doctorData.id)), (s) => setNotifs(s.docs.map((d) => ({ id: d.id, ...d.data() } as Notif)))));
    return () => us.forEach((u) => u());
  }, [doctorData.id]);

  if (loading || appts === null) return <div className="max-w-[1200px] mx-auto"><div className="bg-surface border border-line rounded-[4px] p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted mx-auto" /></div></div>;

  const today = todayStr();
  const todays = appts.filter((a) => a.date === today && a.status === 'upcoming').sort((a, b) => a.time.localeCompare(b.time));
  const stats: [string, number, typeof FileText, string][] = [
    ['Waiting cases', cases.length, FileText, t('cases')],
    ['Today\u2019s patients', todays.length, CalendarCheck, t('dappts')],
    ['Medicines to verify', meds.length, Pill, t('verify')],
    ['Unread', notifs.filter((n) => !n.read).length, Bell, t('notifs')],
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title={`${t(greetKey())}, Dr. ${doctorData.name} 👋`} sub={`${doctorData.specialization || 'General'} · ${doctorData.hospital || 'MHD Hospital'} · Reg ${doctorData.regNo || '—'}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(([label, val, Icon, nav]) => (
          <button key={label} onClick={() => go?.(nav)} className="bg-surface border border-line rounded-[4px] p-4 text-left shadow-sm hover:border-primary transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{label}</span>
              <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-[28px] font-bold leading-none text-heading">{val}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-stripe">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">🟡 Waiting cases ({cases.length})</h4>
            {go && <button onClick={() => go(t('cases'))} className="text-[11px] font-bold text-primary uppercase">Open →</button>}
          </div>
          <div className="divide-y divide-line max-h-[340px] overflow-y-auto custom-scrollbar">
            {cases.length === 0 && <p className="p-6 text-[13px] text-muted text-center">No waiting cases. 🎉</p>}
            {cases.sort((a, b) => b.createdAt - a.createdAt).map((c) => (
              <button key={c.id} onClick={() => go?.(t('cases'))} className="w-full text-left px-4 py-3 hover:bg-stripe transition-colors">
                <p className="text-[13px] font-semibold text-ink">{c.patientName} <span className="text-muted font-normal font-mono text-[11px]">{c.healthId}</span></p>
                <p className="text-[12px] text-muted mt-0.5">{c.chiefComplaint}</p>
                <p className="text-[11px] text-muted mt-1">{c.severity} · {fmtD(new Date(c.createdAt).toISOString().slice(0, 10))}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-stripe">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">📅 Today&apos;s schedule ({todays.length})</h4>
            {go && <button onClick={() => go(t('dappts'))} className="text-[11px] font-bold text-primary uppercase">All →</button>}
          </div>
          <div className="divide-y divide-line max-h-[340px] overflow-y-auto custom-scrollbar">
            {todays.length === 0 && <p className="p-6 text-[13px] text-muted text-center">No appointments today.</p>}
            {todays.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{a.patientName}</p>
                  <p className="text-[12px] text-muted">{a.time} · {a.type}</p>
                </div>
                <span className="text-[11px] font-bold text-primary border border-primary rounded-[4px] px-2 py-0.5">🎟️ #{queueNumberOf(appts, a)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {meds.length > 0 && (
        <button onClick={() => go?.(t('verify'))} className="w-full flex items-center justify-between bg-surface border-l-4 border-primary border-y border-r border-y-line border-r-line rounded-[4px] p-5 shadow-sm hover:opacity-95 transition-opacity">
          <div className="flex items-center gap-3">
            <Pill className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <div className="text-left">
              <p className="text-[14px] font-medium text-ink">{meds.length} medicine{meds.length > 1 ? 's' : ''} waiting for your verification</p>
              <p className="text-[12px] text-muted">Self-reported medicines need a doctor&apos;s confirmation.</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-primary" />
        </button>
      )}
    </div>
  );
}
