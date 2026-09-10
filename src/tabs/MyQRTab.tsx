import { QRCodeSVG } from 'qrcode.react';
import { QrCode } from 'lucide-react';
import type { MhdUser, Appointment } from '../lib/types';
import { useEffect, useState } from 'react';
import { ageOf, todayStr, queueNumberOf } from '../lib/format';
import { bind } from './bind';
import { PageHeader, Loading } from './common';

export default function MyQRTab({ patientData }: { patientData: MhdUser }) {
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  useEffect(() => bind<Appointment>('appointments', [['patientId', '==', patientData.id]], setAppts), [patientData.id]);

  if (appts === null) return <div className="max-w-[1000px] mx-auto"><Loading /></div>;

  const today = todayStr();
  const nextAppt = appts
    .filter((a) => a.status === 'upcoming' && a.date >= today)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  const payload = JSON.stringify({
    app: 'MHD-Hospital', healthId: patientData.healthId, name: patientData.name,
    age: ageOf(patientData.dob), gender: patientData.gender, bloodGroup: patientData.bloodGroup,
    allergies: patientData.allergies, conditions: patientData.conditions,
    emergencyContact: patientData.emergencyPhone, issuedDate: todayStr(),
    issuedTime: new Date().toLocaleTimeString('en-IN'),
    todayQueue: nextAppt ? { doctor: nextAppt.doctorName, date: nextAppt.date, time: nextAppt.time, queue: queueNumberOf(appts, nextAppt), hospital: nextAppt.hospital } : null,
  });

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title="🆔 My QR Medical ID" sub="Show this at the hospital desk or in an emergency." />
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-line rounded-[4px] p-6 shadow-sm flex flex-col items-center">
          <div className="border border-line rounded-[4px] p-4 bg-white">
            <QRCodeSVG value={payload} size={190} level="M" />
          </div>
          <p className="text-[15px] font-semibold text-heading mt-4">{patientData.name}</p>
          <p className="text-[13px] text-muted font-mono">{patientData.healthId}</p>
          <p className="text-[12px] text-muted mt-1 text-center">Issued {todayStr()} · MHD Hospital</p>
        </div>
        <div className="bg-surface border border-line rounded-[4px] p-5 shadow-sm">
          <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-3">What&apos;s inside</h4>
          <ul className="text-[13px] text-ink space-y-2">
            <li>🆔 Health ID &amp; name</li>
            <li>🎂 Age, gender</li>
            <li>🩸 Blood group</li>
            <li>⚠️ Allergies &amp; existing conditions</li>
            <li>🚑 Emergency contact</li>
            <li>🎟️ Today&apos;s queue token {nextAppt ? `— #${queueNumberOf(appts, nextAppt)} at ${nextAppt.doctorName}` : '— none today'}</li>
          </ul>
          <p className="text-[11px] text-muted mt-4">Hospital staff scan this to pull your emergency card instantly. Data is read-only.</p>
        </div>
      </div>
    </div>
  );
}
