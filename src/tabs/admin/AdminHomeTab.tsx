import { useEffect, useState } from 'react';
import { Users, Stethoscope, CalendarCheck, FileCheck, Loader2, Building2, ShieldCheck, ArrowRight } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Appointment, ReportDoc } from '../../lib/types';
import { t } from '../../lib/i18n';
import { todayStr, fmtD, timeToMin } from '../../lib/format';

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

  if (users === null || appts === null) {
    return (
      <div className="max-w-[1200px] mx-auto p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-xs font-medium text-muted">Loading hospital administration dashboard…</p>
      </div>
    );
  }

  const patients = users.filter((u) => u.role === 'patient');
  const doctors = users.filter((u) => u.role === 'doctor');
  const today = todayStr();
  const todays = appts.filter((a) => a.date === today && a.status !== 'cancelled').sort((a, b) => timeToMin(a.time) - timeToMin(b.time));

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="bg-surface border border-line rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-1">
            <Building2 className="w-3.5 h-3.5" /> Hospital Facility Command Center
          </div>
          <h2 className="text-2xl font-bold text-ink tracking-tight">
            {adminData.name || 'Hospital Administration'}
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Admin Contact: <span className="font-semibold text-ink">{adminData.adminName || 'Facility Manager'}</span>
            {adminData.licenseNo ? ` · License ${adminData.licenseNo}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {([
          ['Enrolled Patients', patients.length, Users],
          ['Hospital Doctors', doctors.length, Stethoscope],
          ['Today\u2019s Consultations', todays.length, CalendarCheck],
        ] as [string, number, typeof Users][]).map(([label, val, Icon]) => (
          <div key={label} className="bg-surface border border-line rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">{label}</span>
              <div className="p-2 rounded-xl bg-app text-primary">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-ink tracking-tight">{val}</p>
          </div>
        ))}
      </div>

      {reports.length > 0 && go && (
        <button
          onClick={() => go(t('hdocs'))}
          className="w-full flex items-center justify-between bg-amber-500/10 border-l-4 border-amber-500 border-y border-r border-amber-500/30 rounded-2xl p-5 shadow-xs hover:bg-amber-500/15 transition-all text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950 dark:text-amber-200">{reports.length} laboratory document{reports.length > 1 ? 's' : ''} awaiting verification</p>
              <p className="text-xs text-muted">Review and verify uploaded medical test results for active patients.</p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
            Review Documents <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      )}

      <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-line bg-stripe flex items-center justify-between">
          <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
            Today&apos;s Clinical Patient Queue ({fmtD(today)})
          </h4>
          <span className="text-xs font-semibold text-primary">{todays.length} Consultations</span>
        </div>
        {todays.length === 0 ? (
          <p className="p-8 text-xs text-muted text-center">No patient appointments scheduled for today.</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-app border-b border-line text-muted font-semibold">
                  {['Queue', 'Time', 'Patient', 'Doctor', 'Type', 'Status'].map((h) => (
                    <th key={h} className="px-6 py-3.5 font-bold text-xs uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {todays.map((a, i) => (
                  <tr key={a.id} className="hover:bg-active/50 transition-colors">
                    <td className="px-6 py-3.5 font-extrabold text-primary">#{i + 1}</td>
                    <td className="px-6 py-3.5 font-mono text-muted">{a.time}</td>
                    <td className="px-6 py-3.5 font-semibold text-ink">{a.patientName}</td>
                    <td className="px-6 py-3.5 text-muted">{a.doctorName}</td>
                    <td className="px-6 py-3.5 text-muted">{a.type}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 capitalize">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

