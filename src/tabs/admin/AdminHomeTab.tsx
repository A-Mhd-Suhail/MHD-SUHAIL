import { useEffect, useState } from 'react';
import { Users, Stethoscope, CalendarCheck, FileCheck, Loader2 } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Appointment, ReportDoc } from '../../lib/types';
import { t } from '../../lib/i18n';
import { todayStr, fmtD, timeToMin } from '../../lib/format';
import { PageHeader } from '../common';

interface URow { id: string; role?: string; name?: string; healthId?: string }

export default function AdminHomeTab({ adminData, go }: { adminData: MhdUser; go?: (tab: string) => void }) {
  const [users, setUsers] = useState<URow[] | null>(null);
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [reports, setReports] = useState<ReportDoc[]>([]);

  useEffect(() => {
    const us: (() => void)[] = [];
    const u0 = onSnapshot(collection(db, 'users'), (s) => { setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() } as URow))); });
    us.push(u0);
    us.push(onSnapshot(collection(db, 'appointments'), (s) => setAppts(s.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment)))));
    us.push(onSnapshot(query(collection(db, 'reports'), where('verified', '==', false)), (s) => setReports(s.docs.map((d) => ({ id: d.id, ...d.data() } as ReportDoc)))));
    return () => us.forEach((u) => u());
  }, []);

  if (users === null || appts === null) return <div className="max-w-[1200px] mx-auto"><div className="bg-surface border border-line rounded-[4px] p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted mx-auto" /></div></div>;

  const patients = users.filter((u) => u.role === 'patient');
  const doctors = users.filter((u) => u.role === 'doctor');
  const today = todayStr();
  const todays = appts.filter((a) => a.date === today && a.status !== 'cancelled').sort((a, b) => timeToMin(a.time) - timeToMin(b.time));

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title={`${t('hdash')}`} sub={`${adminData.name}${adminData.licenseNo ? ` · License ${adminData.licenseNo}` : ''}`} />

      <div className="grid grid-cols-3 gap-4">
        {([['Total patients', patients.length, Users], ['Total doctors', doctors.length, Stethoscope], ['Today\u2019s appointments', todays.length, CalendarCheck]] as [string, number, typeof Users][]).map(([label, val, Icon]) => (
          <div key={label} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">{label}</span>
              <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <p className="text-[28px] font-bold leading-none text-heading">{val}</p>
          </div>
        ))}
      </div>

      {reports.length > 0 && go && (
        <button onClick={() => go(t('hdocs'))} className="w-full flex items-center justify-between bg-warn-bg border-l-4 border-warn border-y border-r border-y-warn-bd border-r-warn-bd rounded-[4px] p-4">
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-warn" strokeWidth={1.5} />
            <span className="text-[13px] font-medium text-ink">{reports.length} uploaded document{reports.length > 1 ? 's' : ''} awaiting verification</span>
          </div>
          <span className="text-[13px] font-bold text-warn">Verify →</span>
        </button>
      )}

      <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-line bg-stripe text-[11px] font-bold text-muted uppercase tracking-wider">Today&apos;s patient queue ({fmtD(today)})</div>
        {todays.length === 0 ? (
          <p className="p-6 text-[13px] text-muted text-center">No appointments today.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stripe border-b border-line">
                {['Queue', 'Time', 'Patient', 'Doctor', 'Type', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-bold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {todays.map((a, i) => (
                <tr key={a.id} className="hover:bg-stripe transition-colors text-[13px]">
                  <td className="px-4 py-3 font-bold text-primary">#{i + 1}</td>
                  <td className="px-4 py-3 text-ink font-medium">{a.time}</td>
                  <td className="px-4 py-3 text-ink">{a.patientName}</td>
                  <td className="px-4 py-3 text-muted">{a.doctorName}</td>
                  <td className="px-4 py-3 text-muted">{a.type}</td>
                  <td className="px-4 py-3"><span className="text-[11px] font-bold uppercase text-warn">{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
