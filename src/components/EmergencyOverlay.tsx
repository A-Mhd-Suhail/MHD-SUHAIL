import { useState } from 'react';
import { X, AlertCircle, Search, Droplet, Pill, User, Phone, Radio } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import type { MhdUser } from '../lib/types';
import { logAccess } from '../lib/fs';
import { ageOf } from '../lib/format';

/** Emergency overlay — patient's own critical card, or (for staff) a
 * Health-ID lookup of any patient. Enhanced with radar motion and glassmorphic depth. */
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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-[#0b1329]/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-surface rounded-2xl shadow-2xl w-full max-w-[640px] border-2 border-danger-bd overflow-hidden relative"
        >
          {/* Sonar Radar Background Visual Effect */}
          <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-20 overflow-hidden">
            <motion.div
              animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
              className="absolute top-4 right-4 w-16 h-16 rounded-full border-2 border-red-500"
            />
            <motion.div
              animate={{ scale: [1, 2.8], opacity: [0.5, 0] }}
              transition={{ duration: 2.5, delay: 0.8, repeat: Infinity, ease: 'easeOut' }}
              className="absolute top-4 right-4 w-16 h-16 rounded-full border border-red-400"
            />
          </div>

          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-white relative z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <AlertCircle className="w-6 h-6 animate-pulse" />
                <Radio className="w-4 h-4 absolute -top-1 -right-1 text-yellow-300 animate-ping opacity-75" />
              </div>
              <div>
                <h3 className="text-[16px] font-extrabold tracking-wider uppercase">EMERGENCY MEDICAL CARD</h3>
                <p className="text-[11px] text-red-100">Live Critical First-Responder Telemetry</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          <div className="p-6 space-y-5 relative z-10">
            {isStaff && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted" />
                  <input
                    value={lookup}
                    onChange={(e) => setLookup(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && doLookup()}
                    placeholder="Lookup patient by Health ID (e.g. MHD-XXXXXX)"
                    className="w-full h-[42px] bg-app border border-line rounded-xl pl-9 pr-3 text-[13px] text-ink focus:outline-none focus:border-primary transition-all shadow-inner"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={doLookup}
                  disabled={busy}
                  className="h-[42px] px-5 bg-primary text-on-navy rounded-xl text-[13px] font-semibold hover:bg-primary-d shadow-sm"
                >
                  {busy ? 'Searching...' : 'Find'}
                </motion.button>
              </div>
            )}

            {!p ? (
              <div className="text-center py-10 text-muted space-y-2">
                <AlertCircle className="w-10 h-10 mx-auto text-muted opacity-40 animate-bounce" />
                <p className="text-[14px]">
                  {isStaff ? 'Enter a Health ID above to view a patient’s emergency card.' : 'No emergency data available.'}
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="flex items-start justify-between gap-4 p-4 bg-app/50 rounded-xl border border-line/60">
                  <div>
                    <p className="text-[20px] font-extrabold text-heading tracking-tight">{p.name}</p>
                    <p className="text-[13px] text-muted mt-0.5">
                      {ageOf(p.dob)} yrs · {p.gender} · <span className="font-mono text-primary font-bold px-2 py-0.5 bg-primary/10 rounded-md">{p.healthId}</span>
                    </p>
                  </div>
                  <motion.div whileHover={{ scale: 1.05 }} className="bg-white p-2 rounded-xl border border-line shadow-sm">
                    <QRCodeSVG value={qrPayload} size={88} level="M" />
                  </motion.div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="border-l-4 border-danger border border-line rounded-xl p-4 bg-red-500/5 transition-all hover:shadow-md">
                    <div className="flex items-center gap-2 text-danger font-extrabold text-[11px] uppercase tracking-wider mb-1">
                      <Droplet className="w-4 h-4 animate-bounce" /> Blood Group
                    </div>
                    <p className="text-[24px] font-extrabold text-heading tracking-tight">{p.bloodGroup || '—'}</p>
                  </div>

                  <div className="border border-line rounded-xl p-4 bg-app/30 hover:border-primary/40 transition-all">
                    <div className="flex items-center gap-2 text-muted font-extrabold text-[11px] uppercase tracking-wider mb-1">
                      <User className="w-4 h-4" /> Emergency Contact
                    </div>
                    <p className="text-[14px] font-semibold text-ink">{p.emergencyName || '—'}</p>
                    {p.emergencyPhone && (
                      <motion.a
                        whileHover={{ x: 2 }}
                        href={`tel:+91${String(p.emergencyPhone).replace(/\D/g, '').slice(-10)}`}
                        className="inline-flex items-center gap-1.5 text-[13px] text-primary font-bold mt-1.5 hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" /> {p.emergencyPhone}
                      </motion.a>
                    )}
                  </div>
                </div>

                <div className="border border-danger-bd bg-danger-bg/60 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-danger font-extrabold text-[11px] uppercase tracking-wider mb-1">
                    <AlertCircle className="w-4 h-4" /> Critical Allergies
                  </div>
                  <p className="text-[13px] font-medium text-ink">{p.allergies || 'None reported'}</p>
                </div>

                <div className="border border-line rounded-xl p-4 bg-app/30">
                  <div className="flex items-center gap-2 text-muted font-extrabold text-[11px] uppercase tracking-wider mb-1">
                    <Pill className="w-4 h-4" /> Pre-existing Conditions
                  </div>
                  <p className="text-[13px] text-ink">{p.conditions || 'None reported'}</p>
                </div>

                {firstSurgery && (
                  <div className="border border-line rounded-xl p-4 bg-app/30">
                    <div className="text-muted font-extrabold text-[11px] uppercase tracking-wider mb-1">Last Surgery Record</div>
                    <p className="text-[13px] text-ink">{firstSurgery}</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

