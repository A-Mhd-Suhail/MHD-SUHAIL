import { useEffect, useState } from 'react';
import { FileText, Pill, Users, CalendarCheck, Bell, ArrowRight, Loader2, Stethoscope, Clock, ShieldCheck } from 'lucide-react';
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

  if (loading || appts === null) {
    return (
      <div className="max-w-[1200px] mx-auto p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-xs font-medium text-muted">Loading clinical workspace…</p>
      </div>
    );
  }

  const today = todayStr();
  const todays = appts.filter((a) => a.date === today && a.status === 'upcoming').sort((a, b) => a.time.localeCompare(b.time));
  const stats: [string, number, typeof FileText, string][] = [
    ['Waiting Cases', cases.length, FileText, t('cases')],
    ['Today\u2019s Queue', todays.length, CalendarCheck, t('dappts')],
    ['Pending Verification', meds.length, Pill, t('verify')],
    ['Unread Alerts', notifs.filter((n) => !n.read).length, Bell, t('notifs')],
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="bg-surface border border-line rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-1">
            <Stethoscope className="w-3.5 h-3.5" /> Clinical Practitioner Workspace
          </div>
          <h2 className="text-2xl font-bold text-ink tracking-tight">
            {t(greetKey())}, Dr. {doctorData.name}
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            {doctorData.specialization || 'General Practitioner'} · {doctorData.hospital || 'MHD Healthcare'} · Reg <span className="font-mono font-bold text-ink">{doctorData.regNo || 'VERIFIED'}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(([label, val, Icon, nav]) => (
          <button
            key={label}
            onClick={() => go?.(nav)}
            className="bg-surface border border-line rounded-2xl p-5 text-left shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">{label}</span>
              <div className="p-2 rounded-xl bg-app text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-ink tracking-tight">{val}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-stripe">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Waiting Cases ({cases.length})</h4>
            {go && <button onClick={() => go(t('cases'))} className="text-xs font-bold text-primary hover:underline">View All →</button>}
          </div>
          <div className="divide-y divide-line max-h-[360px] overflow-y-auto custom-scrollbar">
            {cases.length === 0 && <p className="p-8 text-xs text-muted text-center">No waiting cases right now.</p>}
            {cases.sort((a, b) => b.createdAt - a.createdAt).map((c) => (
              <button key={c.id} onClick={() => go?.(t('cases'))} className="w-full text-left px-6 py-4 hover:bg-active/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-ink">{c.patientName}</p>
                  <span className="text-xs font-mono text-muted">{c.healthId}</span>
                </div>
                <p className="text-xs text-muted font-medium line-clamp-1">{c.chiefComplaint}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 capitalize">
                    {c.severity} Severity
                  </span>
                  <span className="text-[11px] text-muted">{fmtD(new Date(c.createdAt).toISOString().slice(0, 10))}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-stripe">
            <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Today&apos;s Schedule ({todays.length})</h4>
            {go && <button onClick={() => go(t('dappts'))} className="text-xs font-bold text-primary hover:underline">Full Schedule →</button>}
          </div>
          <div className="divide-y divide-line max-h-[360px] overflow-y-auto custom-scrollbar">
            {todays.length === 0 && <p className="p-8 text-xs text-muted text-center">No consultations scheduled for today.</p>}
            {todays.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-bold text-ink">{a.patientName}</p>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" /> {a.time} · {a.type}
                  </p>
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-xl px-2.5 py-1">
                  Queue #{queueNumberOf(appts, a)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {meds.length > 0 && (
        <button onClick={() => go?.(t('verify'))} className="w-full flex items-center justify-between bg-surface border-l-4 border-primary border-y border-r border-line rounded-2xl p-5 shadow-xs hover:shadow-md transition-all text-left">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{meds.length} self-reported medicine{meds.length > 1 ? 's' : ''} waiting for clinical review</p>
              <p className="text-xs text-muted mt-0.5">Review patient-entered medications to confirm dosage and safety.</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-primary" />
        </button>
      )}
    </div>
  );
}

