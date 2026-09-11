import { useState } from 'react';
import { X, AlertCircle, Search, Droplet, Pill, User, Phone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { MhdUser } from '../lib/types';
import { logAccess } from '../lib/fs';
import { ageOf } from '../lib/format';

/**Emergency overlay — patient's own critical card, or (for staff) a
 * Health-ID lookup of any patient. Ported from the original emOverlay. */
export default function EmergencyOverlay({ me, onClose }: { me?: MhdUser; onClose: () => void }) {
  const [lookup, setLookup] = useState('');
  const [found, setFound] = useState<MhdUser | null>(null);
  const [busy, setBusy] = useState(false);

  const isStaff = me && me.role !== 'patient';
  const p = found || (me && me.role === 'patient' ? me : null);

  const doLookup = async () => {
    if (!lookup.trim()) return;
    setBusy(true);
    try {
      const q = query(collection(db, 'users'), where('healthId', '==', lookup.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const doc0 = snap.docs[0];
        const u = { id: doc0.id, ...doc0.data() } as MhdUser;
        setFound(u);
        if (me) logAccess(u.id, me.role === 'doctor' ? 'Dr. ' + me.name : me.name, me.role, 'Emergency record viewed');
      } else {
        setFound(null);
        alert('No patient found with that Health ID.');
      }
    } finally {
      setBusy(false);
    }
  };

  const firstSurgery = (p?.surgeries || '').split('\n')[0] || '';
  const qrPayload = JSON.stringify({
    app: 'MHD-Hospital', emergency: true,
    name: p?.name, healthId: p?.healthId, age: ageOf(p?.dob),
    gender: p?.gender, bloodGroup: p?.bloodGroup,
    allergies: p?.allergies, emergencyContact: p?.emergencyPhone,
  });

  return (
    <div className="fixed inset-0 z-[90] bg-[#102A43]/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-surface rounded-[8px] shadow-xl w-full max-w-[640px] border-2 border-danger-bd">
        <div className="flex items-center justify-between px-5 py-4 bg-danger text-white rounded-t-[6px]">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <div>
              <h3 className="text-[16px] font-bold tracking-wide">EMERGENCY MEDICAL CARD</h3>
              <p className="text-[11px] opacity-90">Critical info for first responders</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-[4px] hover:bg-white/20"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {isStaff && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
                <input
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doLookup()}
                  placeholder="Lookup patient by Health ID (e.g. MHD-XXXXXX)"
                  className="w-full h-[40px] bg-app border border-line rounded-[4px] pl-9 pr-3 text-[13px] text-ink focus:outline-none focus:border-primary"
                />
              </div>
              <button onClick={doLookup} disabled={busy} className="h-[40px] px-4 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d">
                {busy ? '...' : 'Find'}
              </button>
            </div>
          )}

          {!p ? (
            <p className="text-[14px] text-muted text-center py-6">
              {isStaff ? 'Enter a Health ID above to view a patient’s emergency card.' : 'No emergency data available.'}
            </p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[18px] font-bold text-heading">{p.name}</p>
                  <p className="text-[13px] text-muted">{ageOf(p.dob)} yrs · {p.gender} · <span className="font-mono">{p.healthId}</span></p>
                </div>
                <QRCodeSVG value={qrPayload} size={92} level="M" />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="border-l-4 border-danger border-y border-r border-y-line border-r-line rounded-[4px] p-4">
                  <div className="flex items-center gap-2 text-danger font-bold text-[11px] uppercase tracking-wider mb-2"><Droplet className="w-4 h-4" /> Blood Group</div>
                  <p className="text-[20px] font-bold text-heading">{p.bloodGroup || '—'}</p>
                </div>
                <div className="border border-line rounded-[4px] p-4">
                  <div className="flex items-center gap-2 text-muted font-bold text-[11px] uppercase tracking-wider mb-2"><User className="w-4 h-4" /> Emergency Contact</div>
                  <p className="text-[14px] font-semibold text-ink">{p.emergencyName || '—'}</p>
                  {p.emergencyPhone && <a href={`tel:+91${String(p.emergencyPhone).replace(/\D/g, '').slice(-10)}`} className="flex items-center gap-1.5 text-[13px] text-primary mt-1"><Phone className="w-3.5 h-3.5" /> {p.emergencyPhone}</a>}
                </div>
              </div>

              <div className="border border-danger-bd bg-danger-bg rounded-[4px] p-4">
                <div className="flex items-center gap-2 text-danger font-bold text-[11px] uppercase tracking-wider mb-2"><AlertCircle className="w-4 h-4" /> Allergies</div>
                <p className="text-[13px] text-ink">{p.allergies || 'None reported'}</p>
              </div>

              <div className="border border-line rounded-[4px] p-4">
                <div className="flex items-center gap-2 text-muted font-bold text-[11px] uppercase tracking-wider mb-2"><Pill className="w-4 h-4" /> Conditions</div>
                <p className="text-[13px] text-ink">{p.conditions || 'None reported'}</p>
              </div>

              {firstSurgery && (
                <div className="border border-line rounded-[4px] p-4">
                  <div className="text-muted font-bold text-[11px] uppercase tracking-wider mb-2">Last Surgery</div>
                  <p className="text-[13px] text-ink">{firstSurgery}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
