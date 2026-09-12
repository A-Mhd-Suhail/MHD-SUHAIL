import { useEffect, useState } from 'react';
import { CreditCard, Loader2, Plus, Trash2 } from 'lucide-react';
import { addDoc, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import type { MhdUser, Bill } from '../../lib/types';
import { fmtD, fmtDT, rupees, todayStr } from '../../lib/format';
import { notify } from '../../lib/fs';
import { toast } from '../../components/Toaster';
import { PageHeader, Loading, EmptyState, StatusChip, inputCls, labelCls } from '../common';

interface PRow { id: string; name?: string; healthId?: string }

export default function AdminBillingTab({ adminData }: { adminData: MhdUser }) {
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [hid, setHid] = useState('');
  const [patient, setPatient] = useState<PRow | null>(null);
  const [type, setType] = useState('medicine');
  const [date, setDate] = useState(todayStr());
  const [items, setItems] = useState([{ label: '', amount: '' }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = onSnapshot(collection(db, 'bills'), (s) => setBills(s.docs.map((d) => ({ id: d.id, ...d.data() } as Bill))));
    return u;
  }, []);

  const lookup = async () => {
    if (!hid.trim()) return;
    const s = await getDocs(query(collection(db, 'users'), where('healthId', '==', hid.trim().toUpperCase())));
    if (s.empty) { setPatient(null); toast('No patient with that Health ID.', 'err'); }
    else setPatient({ id: s.docs[0].id, ...s.docs[0].data() } as PRow);
  };

  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const create = async () => {
    if (!patient) { toast('Find the patient by Health ID first.', 'err'); return; }
    const clean = items.filter((i) => i.label.trim() && Number(i.amount) > 0).map((i) => ({ label: i.label.trim(), amount: Number(i.amount) }));
    if (clean.length === 0) { toast('Add at least one item with an amount.', 'err'); return; }
    setBusy(true);
    try {
      await addDoc(collection(db, 'bills'), {
        patientId: patient.id, patientName: patient.name, healthId: patient.healthId || '',
        hospital: adminData.name, type, items: clean, total,
        status: 'pending', createdAt: Date.now(),
      });
      await addDoc(collection(db, 'timeline'), {
        patientId: patient.id, date, type: 'prescription', icon: '',
        title: 'New bill generated', description: `${rupees(total)} · ${adminData.name}`, createdAt: Date.now(),
      });
      await notify(patient.id, 'New bill', `A bill of ${rupees(total)} was added by ${adminData.name}`);
      toast('Bill created');
      setItems([{ label: '', amount: '' }]);
      setPatient(null); setHid('');
    } catch { toast('Could not create bill', 'err'); } finally { setBusy(false); }
  };

  if (bills === null) return <div className="max-w-[1200px] mx-auto"><Loading /></div>;

  const list = [...bills].sort((a, b) => b.createdAt - a.createdAt);
  const paid = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + (b.total || 0), 0);
  const pending = bills.filter((b) => b.status === 'pending').reduce((s, b) => s + (b.total || 0), 0);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <PageHeader title="Billing" sub="Create bills for patients by Health ID and track revenue." />

      <div className="bg-surface border border-line rounded-[4px] p-5 shadow-sm space-y-4">
        <h4 className="text-[13px] font-bold text-ink uppercase tracking-wider">Add Bill</h4>
        <div className="flex gap-2 items-end">
          <div className="flex-1 max-w-[280px]"><label className={labelCls}>Patient Health ID</label>
            <input value={hid} onChange={(e) => setHid(e.target.value)} placeholder="MHD-XXXXXX" className={inputCls} />
          </div>
          <button onClick={lookup} className="h-[38px] px-4 bg-surface border border-line rounded-[6px] text-[13px] font-medium hover:bg-app transition-colors">Find</button>
          {patient && <p className="text-[13px] text-ok font-medium pb-2">{patient.name} <span className="text-muted font-normal">({patient.healthId})</span></p>}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><label className={labelCls}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
              {['medicine', 'test', 'procedure', 'room', 'other'].map((t2) => <option key={t2}>{t2}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls + ' mb-0'}>Items</label>
            <button onClick={() => setItems([...items, { label: '', amount: '' }])} className="text-[12px] font-medium text-primary flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add item</button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input value={it.label} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Item label" className={inputCls + ' flex-1'} />
                <input value={it.amount} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} placeholder="₹ amount" type="number" className={inputCls + ' w-[140px]'} />
                {items.length > 1 && <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="p-2 text-danger hover:bg-danger-bg rounded-[4px]"><Trash2 className="w-4 h-4" /></button>}
              </div>
            ))}
          </div>
          <p className="text-[13px] font-bold text-heading mt-2">Total: {rupees(total)}</p>
        </div>
        <button onClick={create} disabled={busy} className="h-[40px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d flex items-center gap-2 disabled:opacity-70">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />} Create Bill
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[['Collected', paid, 'text-ok'], ['Pending', pending, 'text-danger'], ['Bills', bills.length, 'text-heading']].map(([l, v, c]) => (
          <div key={l as string} className="bg-surface border border-line rounded-[4px] p-4 shadow-sm">
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider">{l}</p>
            <p className={`text-[24px] font-bold ${c}`}>{l !== 'Bills' ? rupees(v as number) : v}</p>
          </div>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<CreditCard className="w-8 h-8 text-ghost mx-auto" strokeWidth={1.5} />} title="No bills yet" sub="Create the first bill above." />
      ) : (
        <div className="bg-surface border border-line rounded-[4px] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stripe border-b border-line">
                {['Patient', 'Health ID', 'Type', 'Items', 'Total', 'Status', 'Date'].map((h, i) => (
                  <th key={`${h}-${i}`} className="px-4 py-3 text-[11px] font-bold text-muted uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((b) => (
                <tr key={b.id} className="hover:bg-stripe transition-colors text-[13px]">
                  <td className="px-4 py-3 font-medium text-ink">{b.patientName || '—'}</td>
                  <td className="px-4 py-3 font-mono text-primary">{b.healthId || '—'}</td>
                  <td className="px-4 py-3 text-muted">{b.type || '—'}</td>
                  <td className="px-4 py-3 text-muted">{(b.items || []).map((i) => `${i.label} ${rupees(i.amount)}`).join(', ')}</td>
                  <td className="px-4 py-3 font-bold text-heading">{rupees(b.total)}</td>
                  <td className="px-4 py-3"><StatusChip ok={b.status === 'paid'} warn={b.status === 'pending'}>{b.status === 'paid' ? `Paid ${b.paidAt ? fmtDT(b.paidAt) : ''}` : 'Pending'}</StatusChip></td>
                  <td className="px-4 py-3 text-muted">{fmtD(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
