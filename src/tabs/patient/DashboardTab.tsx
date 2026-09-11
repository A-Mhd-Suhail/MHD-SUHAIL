import { useEffect, useState } from 'react';
import {
  Pill, CalendarClock, ListChecks, Bell, FileText, CalendarPlus, MessageSquare,
  AlertCircle, QrCode, Activity, Loader2,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import type { MhdUser, Medicine, Appointment, CaseDoc, TimelineEntry, ReportDoc, Bill } from '../../lib/types';
import { t } from '../../lib/i18n';
import { greetKey } from '../../lib/format';
import { fmtD, todayStr, schedTimeFromDosage, queueNumberOf, rupees } from '../../lib/format';

/** Patient dashboard — ported from the original pg-p-dash. */
export default function DashboardTab({ me, go }: { me: MhdUser; go: (tab: string) => void }) {
  const uid = me.id;
  const [meds, setMeds] = useState<Medicine[]>([]);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<CaseDoc[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [reports, setReports] = useState<ReportDoc[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [notifs, setNotifs] = useState<{ id: string; read: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const bind = <T,>(col: string, cb: (rows: T[]) => void, ...wheres: [string, unknown][]) => {
      let q: any = collection(db, col);
      wheres.forEach(([f, v]) => { q = query(q, where(f, '==', v)); });
      unsubs.push(onSnapshot(q, (s: any) => { cb(s.docs.map((d: any) => ({ id: d.id, ...d.data() }))); setLoading(false); }, () => setLoading(false)));
    };
    bind<Medicine>('medicines', setMeds, ['patientId', uid]);
    bind<Appointment>('appointments', setAppts, ['patientId', uid]);
    bind<CaseDoc>('cases', setCases, ['patientId', uid]);
    bind<TimelineEntry>('timeline', setTimeline, ['patientId', uid]);
    bind<ReportDoc>('reports', setReports, ['patientId', uid]);
    bind<Bill>('bills', setBills, ['patientId', uid]);
    // notifications (unread count)
    unsubs.push(onSnapshot(
      query(collection(db, 'notifications'), where('to', '==', uid ?? '')),
      (s) => setNotifs(s.docs.map((d) => ({ id: d.id, read: !!d.data().read }))),
      () => { /* ignore */ },
    ));
    return () => unsubs.forEach((u) => u());
  }, [uid]);

  if (loading) {
    return <div className="max-w-[1000px] mx-auto p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>;
  }

  const today = todayStr();
  const upcoming = appts.filter((a) => a.status === 'upcoming' && a.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const nextAppt = upcoming[0];
  const activeMeds = meds.filter((m) => m.active !== false);
  const unread = notifs.filter((n) => !n.read).length;
  const reviewed = cases.filter((c) => c.status === 'reviewed').length;
  const healthPct = cases.length ? Math.round((reviewed / cases.length) * 100) : 0;
  const dueFollowups = timeline.filter((e) => e.type === 'followup' && e.due && e.due >= today);
  const pendingBills = bills.filter((b) => b.status === 'pending');
  const lastBill = bills[bills.length - 1];

  const todaysMeds = activeMeds
    .map((m) => ({ ...m, at: schedTimeFromDosage(m.dosage || '') }))
    .sort((a, b) => a.at.localeCompare(b.at));

  const reco = cases.length === 0 ? t('recoStart') : healthPct === 100 ? t('recoGreat') : t('recoDoing');

  const quickActions: [string, typeof Pill, string][] = [
    [t('bookAppt'), CalendarPlus, t('appts')],
    [t('talkDoctor'), MessageSquare, t('doctors')],
    [t('newCase'), FileText, t('mycase')],
    [t('qr'), QrCode, t('qr')],
  ];

  const careBars: [string, number][] = [
    ['Cases reviewed', cases.length ? Math.round((reviewed / cases.length) * 100) : 0],
    ['Meds verified', activeMeds.length ? Math.round((activeMeds.filter((m) => m.verified).length / activeMeds.length) * 100) : 0],
    ['Results verified', reports.length ? Math.round((reports.filter((r) => r.verified).length / reports.length) * 100) : 0],
    ['Bills paid', bills.length ? Math.round(((bills.length - pendingBills.length) / bills.length) * 100) : 0],
  ];

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      {/* Greeting + Health ID */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold text-heading">{t(greetKey())}, {me.name}</h2>
          <p className="text-[13px] text-muted mt-1">
            Health ID: <span className="font-mono font-semibold text-primary">{me.healthId}</span> · {t('careStatus')}: staying on track
          </p>
        </div>
        <button onClick={() => go(t('appts'))} className="h-[40px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors">
          {t('confirmAppt')}
        </button>
      </div>

      {/* Health status + next appointment */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-surface border border-line rounded-[4px] p-5 shadow-sm">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-3">{t('healthStatus')}</p>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-[28px] font-bold leading-none text-heading">{healthPct}%</span>
            <span className="text-[12px] text-muted pb-0.5">{reviewed} / {cases.length} cases reviewed</span>
          </div>
          <div className="h-[8px] bg-app rounded-full overflow-hidden border border-line">
            <div className="h-full bg-primary transition-all" style={{ width: `${healthPct}%` }} />
          </div>
          <p className="text-[12px] text-muted mt-3 leading-snug">{reco}</p>
          {cases.some((c) => c.status === 'waiting') && (
            <div className="mt-3 flex items-start gap-2 text-[12px] text-warn bg-warn-bg border border-warn-bd rounded-[4px] p-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {t('waitingReview')}
            </div>
          )}
        </div>

        <div className="bg-surface border-l-4 border-primary border-y border-r border-y-line border-r-line rounded-[4px] p-5">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-3">{t('nextApptLbl')}</p>
          {nextAppt ? (
            <>
              <p className="text-[15px] font-semibold text-ink">{nextAppt.doctorName}</p>
              <p className="text-[13px] text-muted mt-1">{fmtD(nextAppt.date)} · {nextAppt.time} ·Queue #{queueNumberOf(appts, nextAppt)}</p>
              <p className="text-[12px] text-muted mt-1">{nextAppt.type}{nextAppt.hospital ? ` · ${nextAppt.hospital}` : ''}</p>
              <button onClick={() => go(t('appts'))} className="mt-3 text-[13px] font-medium text-primary hover:underline">{t('viewDetails')}</button>
            </>
          ) : (
            <>
              <p className="text-[13px] text-muted">{t('noUpcomingAppts')}</p>
              <button onClick={() => go(t('appts'))} className="mt-3 text-[13px] font-medium text-primary hover:underline">{t('bookAppt')} →</button>
            </>
          )}
          {dueFollowups.length > 0 && (
            <div className="mt-3 text-[12px] text-warn bg-warn-bg border border-warn-bd rounded-[4px] p-2.5">
             {t('followDue')}: {fmtD(dueFollowups[0].due)}
            </div>
          )}
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          [t('activeSub'), activeMeds.length, Pill, t('meds')],
          [t('upcomingSub'), upcoming.length, CalendarClock, t('appts')],
          [t('totalSub'), reports.length, ListChecks, t('results')],
          [t('unreadSub'), unread, Bell, t('notifs')],
        ] as [string, number, typeof Pill, string][]).map(([label, val, Icon, nav]) => (
          <button key={label} onClick={() => go(nav)} className="bg-surface border border-line rounded-[4px] p-4 text-left shadow-sm hover:border-primary transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{label}</span>
              <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-[28px] font-bold leading-none text-heading">{val}</p>
          </button>
        ))}
      </div>

      {/* Today's medications */}
      <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-stripe">
          <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">{t('todaysMeds')}</h4>
          <button onClick={() => go(t('meds'))} className="text-[11px] font-bold text-primary uppercase tracking-wider hover:underline">{t('viewAll')}</button>
        </div>
        {todaysMeds.length === 0 ? (
          <p className="p-5 text-[13px] text-muted text-center">No active medicines. Add one from {t('meds')}.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stripe border-b border-line">
                {['Time', 'Medicine', 'Dosage', t('verifiedLbl')].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-bold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {todaysMeds.slice(0, 5).map((m) => {
                const taken = !!(m.takenDates && m.takenDates[today]);
                return (
                  <tr key={m.id} className="hover:bg-stripe transition-colors">
                    <td className="px-4 py-3 text-[13px] text-muted">{m.at}</td>
                    <td className="px-4 py-3 text-[13px] font-medium text-ink">{m.name}{taken ? '' : ''}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{m.dosage || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] border ${m.verified ? 'text-ok bg-ok-bg border-ok-bd' : 'text-warn bg-warn-bg border-warn-bd'}`}>
                        {m.verified ? t('verifiedLbl') : 'Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h4 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">{t('quickActions')}</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(([label, Icon, nav]) => (
            <button key={label} onClick={() => go(nav)} className="bg-surface border border-line rounded-[4px] p-5 shadow-sm hover:border-primary transition-colors flex flex-col items-center gap-3">
              <Icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
              <span className="text-[13px] font-medium text-ink">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Care status bars */}
      <div className="bg-surface border border-line rounded-[4px] p-5 shadow-sm space-y-4">
        <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">{t('careStatus')}</h4>
        {careBars.map(([label, pct]) => (
          <div key={label}>
            <div className="flex justify-between text-[12px] mb-1">
              <span className="text-muted">{label}</span>
              <span className="font-semibold text-ink">{pct}%</span>
            </div>
            <div className="h-[6px] bg-app rounded-full overflow-hidden border border-line">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Mini lists */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">{t('allMeds')}</h4>
            <button onClick={() => go(t('meds'))} className="text-[11px] font-bold text-primary">{t('viewLink')}</button>
          </div>
          {activeMeds.slice(0, 3).map((m) => (
            <p key={m.id} className="text-[13px] text-ink py-1.5 border-b border-line last:border-0">{m.name} <span className="text-muted">· {m.dosage}</span></p>
          ))}
          {activeMeds.length === 0 && <p className="text-[12px] text-muted">—</p>}
        </div>
        <div className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">{t('allResults')}</h4>
            <button onClick={() => go(t('results'))} className="text-[11px] font-bold text-primary">{t('viewLink')}</button>
          </div>
          {reports.slice(-3).reverse().map((r) => (
            <p key={r.id} className="text-[13px] text-ink py-1.5 border-b border-line last:border-0">{r.title} <span className="text-muted">· {fmtD(r.date)}</span></p>
          ))}
          {reports.length === 0 && <p className="text-[12px] text-muted">—</p>}
        </div>
        <div className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider">{t('billingHistory')}</h4>
            <button onClick={() => go(t('billing'))} className="text-[11px] font-bold text-primary">{t('viewLink')}</button>
          </div>
          {lastBill ? (
            <p className="text-[13px] text-ink py-1.5">{rupees(lastBill.total)} <span className={`font-semibold ${lastBill.status === 'paid' ? 'text-ok' : 'text-danger'}`}>· {lastBill.status === 'paid' ? t('paidLbl') : t('pendingLbl')}</span></p>
          ) : <p className="text-[12px] text-muted">{t('noBillsYet')}</p>}
          {pendingBills.length > 0 && <p className="text-[12px] text-danger mt-1">{pendingBills.length} {t('pendingLbl').toLowerCase()}</p>}
        </div>
      </div>

      {/* Tracking link */}
      <button onClick={() => go(t('tracking'))} className="w-full flex items-center justify-between bg-surface border border-line rounded-[4px] p-5 shadow-sm hover:border-primary transition-colors">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <span className="text-[14px] font-medium text-ink">{t('tracking')} — BP · Temperature · Heart Rate · Weight</span>
        </div>
        <span className="text-[13px] font-medium text-primary">{t('viewLink')}</span>
      </button>
    </div>
  );
}
