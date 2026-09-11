import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import type { MhdUser, VitalsDoc } from '../lib/types';
import { fmtD, fmtDT } from '../lib/format';
import { bind } from './bind';
import { PageHeader, Loading, EmptyState } from './common';

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${28 - ((v - min) / range) * 24}`).join(' ');
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-[32px]">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" className="text-primary" />
    </svg>
  );
}

export default function HealthOverviewTab({ patientData }: { patientData: MhdUser }) {
  const [vitals, setVitals] = useState<VitalsDoc[] | null>(null);

  useEffect(() => bind<VitalsDoc>('vitals', [['patientId', '==', patientData.id]], setVitals), [patientData.id]);

  if (vitals === null) return <div className="max-w-[1000px] mx-auto"><Loading /></div>;

  const sorted = [...vitals].sort((a, b) => b.createdAt - a.createdAt);
  const latest = sorted[0];
  const last7 = sorted.slice(0, 7).reverse();

  const num = (v?: string) => { const n = parseFloat(String(v || '')); return isNaN(n) ? null : n; };
  const sys = latest?.bp ? num(latest.bp.split('/')[0]) : null;
  const dia = latest?.bp ? num(latest.bp.split('/')[1]) : null;

  const metric = (label: string, unit: string, val: string | number | null, series: (number | null)[]) => (
    <div className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
      <p className="text-[11px] font-bold text-muted uppercase tracking-wider">{label}</p>
      <p className="text-[24px] font-bold text-heading leading-tight mt-1">{val ?? '—'} <span className="text-[12px] text-muted font-normal">{unit}</span></p>
      <Spark values={series.filter((v): v is number => v != null)} />
    </div>
  );

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <PageHeader title="Health Overview" sub="Vitals recorded by your doctors, with trends." />

      {sorted.length === 0 ? (
        <EmptyState icon={<Activity className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No vitals recorded yet" sub="When a doctor records your vitals they will show up here." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metric('Blood Pressure', 'mmHg', sys != null && dia != null ? sys + '/' + dia : null, last7.map((v) => num(v.bp?.split('/')[0])))}
            {metric('Temperature', '°F', num(latest?.temp), last7.map((v) => num(v.temp)))}
            {metric('Heart Rate', 'bpm', num(latest?.hr), last7.map((v) => num(v.hr)))}
            {metric('Weight', 'kg', num(latest?.wt), last7.map((v) => num(v.wt)))}
          </div>

          {latest?.sym && (
            <div className="bg-surface border-l-4 border-primary border-y border-r border-y-line border-r-line rounded-[4px] p-4">
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Latest symptoms noted</p>
              <p className="text-[13px] text-ink">{latest.sym}</p>
              <p className="text-[11px] text-muted mt-1">by {latest.doctorName} · {fmtDT(latest.createdAt)}</p>
            </div>
          )}

          <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-line bg-stripe text-[11px] font-bold text-muted uppercase tracking-wider">Recent records</div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stripe border-b border-line">
                  {['Date', 'BP', 'Temp', 'HR', 'Weight', 'Symptoms', 'By'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-bold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sorted.slice(0, 10).map((v) => (
                  <tr key={v.id} className="hover:bg-stripe transition-colors text-[13px]">
                    <td className="px-4 py-2.5 text-muted">{fmtD(v.date)}</td>
                    <td className="px-4 py-2.5 text-ink font-medium">{v.bp || '—'}</td>
                    <td className="px-4 py-2.5 text-ink">{v.temp || '—'}</td>
                    <td className="px-4 py-2.5 text-ink">{v.hr || '—'}</td>
                    <td className="px-4 py-2.5 text-ink">{v.wt || '—'}</td>
                    <td className="px-4 py-2.5 text-muted max-w-[220px] truncate">{v.sym || '—'}</td>
                    <td className="px-4 py-2.5 text-muted">{v.doctorName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
