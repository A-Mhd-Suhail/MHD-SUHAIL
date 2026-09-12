import { useEffect, useState } from 'react';
import { CalendarClock, Pill, AlertCircle, Clock } from 'lucide-react';
import type { MhdUser, Appointment, TimelineEntry, Medicine } from '../lib/types';
import { fmtD, todayStr, queueNumberOf, schedTimeFromDosage } from '../lib/format';
import { t } from '../lib/i18n';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState, StatusChip } from './common';

/** Upcoming: appointments (queue #), follow-up reminders, active medicines. */
export default function UpcomingTab({ patientData }: { patientData: MhdUser }) {
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [meds, setMeds] = useState<Medicine[]>([]);

  useEffect(() => {
    const u1 = bind<Appointment>('appointments', [['patientId', '==', patientData.id]], setAppts);
    const u2 = bind<TimelineEntry>('timeline', [['patientId', '==', patientData.id]], setTimeline);
    const u3 = bind<Medicine>('medicines', [['patientId', '==', patientData.id]], setMeds);
    return () => { u1(); u2(); u3(); };
  }, [patientData.id]);

  if (appts === null) return <div className="max-w-[1000px] mx-auto space-y-6"><Loading /></div>;

  const today = todayStr();
  const upcoming = appts
    .filter((a) => a.status === 'upcoming' && a.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const followups = timeline
    .filter((e) => e.type === 'followup' && e.due && e.due >= today)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)));
  const activeMeds = meds.filter((m) => m.active !== false);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title={t('upcoming')} sub={t('upcomingEvents')} />

      <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-line bg-stripe text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" strokeWidth={1.5} />{t('appts')} ({upcoming.length})
        </div>
        {upcoming.length === 0 ? (
          <p className="p-6 text-[13px] text-muted text-center">{t('noUpcomingAppts')}</p>
        ) : (
          <div className="divide-y divide-line">
            {upcoming.map((a, i) => (
              <div key={`${a.id}-${i}`} className="flex items-center justify-between px-4 py-3 hover:bg-stripe transition-colors">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{a.doctorName} <span className="text-muted font-normal">· {a.type}</span></p>
                  <p className="text-[12px] text-muted mt-0.5">{fmtD(a.date)} · {a.time} · {a.hospital || '—'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-primary border border-primary rounded-[4px] px-2 py-0.5">#{queueNumberOf(appts, a)}</span>
                  <StatusChip warn>{t('upcomingTab')}</StatusChip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface border-l-4 border-warn border-y border-r border-y-line border-r-line rounded-[4px] p-5">
        <div className="flex items-center gap-2 text-[11px] font-bold text-warn uppercase tracking-wider mb-3">
          <AlertCircle className="w-4 h-4" />{t('followReminders')} ({followups.length})
        </div>
        {followups.length === 0 ? (
          <p className="text-[13px] text-muted">No follow-ups due.</p>
        ) : (
          <div className="space-y-2">
            {followups.map((f, i) => (
              <div key={`${f.id}-${i}`} className="flex items-center justify-between bg-warn-bg border border-warn-bd rounded-[4px] px-3 py-2">
                <div>
                  <p className="text-[13px] font-medium text-ink">{f.icon} {f.title}</p>
                  <p className="text-[12px] text-muted">{f.description}</p>
                </div>
                <span className="text-[12px] font-bold text-warn whitespace-nowrap">{fmtD(f.due)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-line bg-stripe text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-2">
          <Pill className="w-4 h-4 text-primary" strokeWidth={1.5} />{t('activeMeds')} ({activeMeds.length})
        </div>
        {activeMeds.length === 0 ? (
          <p className="p-6 text-[13px] text-muted text-center">No active medicines.</p>
        ) : (
          <div className="divide-y divide-line">
            {activeMeds.map((m, i) => (
              <div key={`${m.id}-${i}`} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{m.name}</p>
                  <p className="text-[12px] text-muted">{m.dosage} · {schedTimeFromDosage(m.dosage || '')} · by {m.prescribedBy || '—'}</p>
                </div>
                <StatusChip ok={m.verified} warn={!m.verified}>{m.verified ? t('verifiedLbl') : 'Pending'}</StatusChip>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
