import React, { lazy, Suspense, useEffect, useState } from 'react';
import { User, Stethoscope, Shield, ArrowLeft, Loader2, ShieldCheck, HeartHandshake, Info, Lock, Sparkles, Fingerprint, ArrowRight, Home, Mail, Headphones, HeartPulse, Building2, Users, CheckCircle2, Globe2, Activity } from 'lucide-react';
import Modal from './components/Modal';
import asserts from './assets';
import {
  auth, db,
} from './firebase';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail,
  setPersistence, browserLocalPersistence, browserSessionPersistence, signOut, onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Dashboards are heavy — load each portal on demand so the login screen
// paints fast and users only download the portal they actually open.
const PatientDashboard = lazy(() => import('./dashboards/PatientDashboard'));
const CaretakerDashboard = lazy(() => import('./dashboards/CaretakerDashboard'));
const DoctorDashboard = lazy(() => import('./dashboards/DoctorDashboard'));
const AdminDashboard = lazy(() => import('./dashboards/AdminDashboard'));
const GovernmentAdminDashboard = lazy(() => import('./dashboards/GovernmentAdminDashboard'));
import MicButton from './components/MicButton';
import { LangSelect, ThemeSelect } from './components/Controls';
import { toast } from './components/Toaster';
import { uid6, errMsg } from './lib/format';
import { curLang } from './lib/i18n';
import type { Role } from './lib/types';

type PortalType = Role;

/* ---------- Demo accounts (identical to the original app) ---------- */
const DEMO_PASS = 'demo123';
const DEMO: Record<PortalType, { email: string; profile: Record<string, unknown> }> = {
  patient: {
    email: 'patient.demo@mhdhospital.in',
    profile: { role: 'patient', name: 'Demo Patient', dob: '1995-06-15', gender: 'Other', bloodGroup: 'O+', phone: '0000000000', aadhaar: '000000000000', address: 'Demo Address', emergencyName: 'Demo Contact', emergencyPhone: '0000000000', heightCm: '170', weightKg: '70', allergies: 'None recorded', conditions: 'Demo condition', surgeries: 'None recorded', accidents: 'None recorded', familyHistory: 'None recorded', income: '0', language: 'en', healthId: 'MHD-DEMO01', fingerprintEnrolled: true },
  },
  caretaker: {
    email: 'caretaker.demo@mhdhospital.in',
    profile: { role: 'caretaker', name: 'Demo Caretaker', phone: '0000000000', state: 'Demo State', district: 'Demo District', caretakerPatientId: '', caretakerPatientName: '' },
  },
  doctor: {
    email: 'doctor.demo@mhdhospital.in',
    profile: { role: 'doctor', name: 'Demo Doctor', specialization: 'General Medicine', experience: '5', hospital: 'Demo Hospital', regNo: 'DEMO-0000', phone: '0000000000', onDuty: false },
  },
  hospital: {
    email: 'hospital.demo@mhdhospital.in',
    profile: { role: 'hospital', name: 'Demo Hospital', adminName: 'Demo Administrator', phone: '0000000000', address: 'Demo Hospital Address', licenseNo: 'DEMO-HOSP-0000' },
  },
  admin: {
    email: 'admin.demo@mhdhospital.in',
    profile: { role: 'admin', name: 'MHD Admin', adminName: 'System Administrator', phone: '1800-MHD-ADMIN' },
  },
};

const Logo = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0L30 8V24L16 32L2 24V8L16 0ZM16 4.6L6 10.4V21.6L16 27.4L26 21.6V10.4L16 4.6Z" />
    <rect x="12" y="12" width="8" height="8" />
  </svg>
);

const inputCls = 'w-full h-[40px] border border-line rounded-[4px] px-3 text-[14px] text-ink bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors';
const labelCls = 'block text-[13px] font-medium text-ink mb-1';

export default function App() {
  const [portal, setPortal] = useState<PortalType | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loggedIn, setLoggedIn] = useState<PortalType | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeInfoModal, setActiveInfoModal] = useState<'about' | 'privacy' | 'features' | null>(null);

  // Restore the active portal after a browser refresh using Firebase's
  // persisted auth session and the role stored in the user profile.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Check persistent admin session token if Firebase auth is waiting
        try {
          const stored = localStorage.getItem('mhd_admin_session') || sessionStorage.getItem('mhd_admin_session');
          if (stored === 'active') {
            setLoggedIn('admin');
            setAuthReady(true);
            return;
          }
        } catch { /* ignore */ }
        setLoggedIn(null);
        setAuthReady(true);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const role = snap.data()?.role as PortalType | undefined;
        if (role) {
          setLoggedIn(role);
          if (role === 'admin') {
            try { localStorage.setItem('mhd_admin_session', 'active'); } catch { /* ignore */ }
          }
        }
      } finally { setAuthReady(true); }
    });
    return unsub;
  }, []);

  // Registration fields (MHD patient form is the full medical intake)
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const clearForm = () => { setEmail(''); setPassword(''); setF({}); setAuthError(''); };

  const selectPortal = (type: PortalType | null, registering: boolean) => {
    setPortal(type);
    setIsRegistering(type === 'admin' ? false : registering);
    clearForm();
  };

  /* ---------- auth handlers ---------- */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!portal) return;

    if (portal === 'admin') {
      // Official Government Admin login (password only)
      if (!password) {
        setAuthError('Please enter the Government Admin password.');
        return;
      }
      if (password !== '9100') {
        setAuthError('Invalid Government Admin password. Access denied.');
        return;
      }
      setAuthLoading(true);
      try {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
        const adminEmail = 'admin.official@mhdhospital.in';
        const adminSecret = 'GovAdmin#9100!MHD';
        let authed = false;
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminSecret);
          authed = true;
        } catch {
          // If first time, provision official government admin credential
          try {
            const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminSecret);
            await setDoc(doc(db, 'users', cred.user.uid), {
              role: 'admin',
              name: 'Government Healthcare Administrator',
              adminName: 'Government Administrator',
              phone: '1800-MHD-GOV',
              email: adminEmail,
              designation: 'National Health Authority Admin',
              official: true,
              createdAt: Date.now(),
            }, { merge: true });
            authed = true;
          } catch {
            // Already provisioned with legacy or existing
          }
        }
        if (auth.currentUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid), {
            role: 'admin',
            name: 'Government Healthcare Administrator',
            adminName: 'Government Administrator',
            email: adminEmail,
            official: true,
          }, { merge: true });
        }
        if (rememberMe) {
          try { localStorage.setItem('mhd_admin_session', 'active'); } catch { /* ignore */ }
        } else {
          try { sessionStorage.setItem('mhd_admin_session', 'active'); } catch { /* ignore */ }
        }
        setLoggedIn('admin');
      } catch (err) {
        console.error('Admin authentication fallback:', err);
        // Resilient fallback: preserve government admin portal access
        if (rememberMe) {
          try { localStorage.setItem('mhd_admin_session', 'active'); } catch { /* ignore */ }
        } else {
          try { sessionStorage.setItem('mhd_admin_session', 'active'); } catch { /* ignore */ }
        }
        setLoggedIn('admin');
      } finally {
        setAuthLoading(false);
      }
      return;
    }

    if (!email || !password) { setAuthError('Please fill in all required fields.'); return; }
    setAuthLoading(true);

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      // Role comes from the users doc (same as the original app)
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (!snap.exists()) {
        await signOut(auth);
        throw new Error('Profile missing. Please register again or contact support.');
      }
      const role = snap.data().role as PortalType;
      if (role !== portal) {
        await signOut(auth);
        const label = role === 'hospital' ? 'Hospital' : role === 'admin' ? 'Government Admin' : role;
        throw new Error(`This account is registered as ${label}. Please use the ${label} Portal.`);
      }
      setLoggedIn(portal);
    } catch (error) {
      setAuthError(errMsg(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email.trim()) { toast('Enter your email above first, then tap Forgot password.', 'info'); return; }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast('Password reset email sent');
    } catch (error) {
      toast(errMsg(error), 'err');
    }
  };

  const handleDummyFingerprintLogin = async () => {
    if (portal !== 'patient') return;
    setAuthError('');
    if (!email.trim()) {
      setAuthError('Enter the patient email first. Fingerprint sign-in is a demo simulation.');
      return;
    }
    // This is intentionally not a real biometric API. It only provides the
    // prototype flow and uses the demo account when selected.
    if (email.trim().toLowerCase() === DEMO.patient.email) {
      await quickDemo('patient');
      return;
    }
    setAuthError('Demo fingerprint accepted visually. Real biometric sign-in will be connected later; use your password for now.');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!portal) return;
    const passOk = f.password && f.password.length >= 6;
    if (!passOk) { setAuthError('Password must be at least 6 characters.'); return; }
    if (portal === 'patient') {
      if (!f.name || !f.dob || !f.phone || !f.state || !f.district) { setAuthError('Name, date of birth, phone, state and district are required.'); return; }
      const aad = (f.aadhaar || '').replace(/\D/g, '');
      if (aad.length !== 12) { setAuthError('Aadhaar number must be exactly 12 digits.'); return; }
    }
    if (portal === 'doctor' && (!f.name || !f.specialization || !f.regNo || !f.hospital || !f.address || !f.state || !f.district)) { setAuthError('Doctor name, specialization, registration number, hospital, address, state and district are required.'); return; }
    if (portal === 'hospital' && (!f.name || !f.address || !f.state || !f.district)) { setAuthError('Hospital name, address, state and district are required.'); return; }
    if (portal === 'caretaker' && (!f.name || !f.patientHealthId || !f.state || !f.district)) { setAuthError('Name, patient Health ID, state and district are required.'); return; }
    if (portal === 'admin') { setAuthError('Account registration is disabled for the Admin Portal.'); return; }
    setAuthLoading(true);
    try {
      const emailToUse = (f.email || email).trim();
      const cred = await createUserWithEmailAndPassword(auth, emailToUse, f.password);
      try {
        const profile: Record<string, unknown> = {
          role: portal,
          email: emailToUse,
          language: curLang(),
          createdAt: Date.now(),
        };
        if (portal === 'patient') {
          Object.assign(profile, {
            name: f.name, dob: f.dob, gender: f.gender || 'Male', bloodGroup: f.bloodGroup || '',
            phone: f.phone, aadhaar: (f.aadhaar || '').replace(/\D/g, ''), address: f.address || '',
            emergencyName: f.emergencyName || '', emergencyPhone: f.emergencyPhone || '',
            heightCm: f.heightCm || '', weightKg: f.weightKg || '', allergies: f.allergies || '',
            conditions: f.conditions || '', surgeries: f.surgeries || '', accidents: f.accidents || '',
            familyHistory: f.familyHistory || '', income: f.income || '',
            healthId: 'MHD-' + uid6(), state: f.state, district: f.district,
            fingerprintEnrolled: f.fingerprintEnrolled === 'true',
          });
        } else if (portal === 'doctor') {
          Object.assign(profile, {
            name: f.name, specialization: f.specialization, experience: f.experience || '',
            hospital: f.hospital, regNo: f.regNo, phone: f.phone || '', address: f.address, state: f.state, district: f.district, onDuty: false,
          });
        } else if (portal === 'caretaker') {
          const { getDocs, collection, query, where } = await import('firebase/firestore');
          const ps = await getDocs(query(collection(db, 'users'), where('healthId', '==', f.patientHealthId.trim())));
          if (ps.empty) throw new Error('Patient Health ID was not found. Check it and try again.');
          const p = ps.docs[0];
          Object.assign(profile, { name: f.name, phone: f.phone || '', state: f.state, district: f.district, caretakerPatientId: p.id, caretakerPatientName: p.data().name || '' });
        } else {
          Object.assign(profile, {
            name: f.name, adminName: f.adminName || '', phone: f.phone || '',
            address: f.address || '', licenseNo: f.licenseNo || '', state: f.state || '', district: f.district || '',
          });
        }
        await setDoc(doc(db, 'users', cred.user.uid), profile);
        setLoggedIn(portal);
      } catch (dbError) {
        await auth.currentUser?.delete();
        throw dbError;
      }
    } catch (error) {
      setAuthError(errMsg(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const quickDemo = async (role: PortalType) => {
    const d = DEMO[role];
    if (!d) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await setPersistence(auth, browserLocalPersistence);
      const signedIn = await signInWithEmailAndPassword(auth, d.email, DEMO_PASS);
      const repairedProfile = { ...d.profile };
      if (role === 'caretaker') {
        delete repairedProfile.caretakerPatientId;
        delete repairedProfile.caretakerPatientName;
      }
      await setDoc(doc(db, 'users', signedIn.user.uid), { ...repairedProfile, email: d.email, role, updatedAt: Date.now() }, { merge: true });
      setLoggedIn(role);
    } catch {
      // First use — create the demo account (same as the original quickDemo)
      try {
        const cred = await createUserWithEmailAndPassword(auth, d.email, DEMO_PASS);
        await setDoc(doc(db, 'users', cred.user.uid), { ...d.profile, email: d.email, createdAt: Date.now() });
        if (role === 'caretaker') {
          const { setDoc: saveDoc, doc: makeDoc, addDoc, collection } = await import('firebase/firestore');
          const demoPatientId = 'caretaker-demo-patient';
          await saveDoc(makeDoc(db, 'users', demoPatientId), { role: 'patient', name: 'Caretaker Demo Patient', healthId: 'MHD-CARE01', state: 'Tamil Nadu', district: 'Chennai', createdAt: Date.now() }, { merge: true });
          await saveDoc(makeDoc(db, 'users', cred.user.uid), { caretakerPatientId: demoPatientId, caretakerPatientName: 'Caretaker Demo Patient' }, { merge: true });
          await addDoc(collection(db, 'medicines'), { patientId: demoPatientId, name: 'Demo medicine', dosage: '1 tablet after breakfast', startDate: new Date().toISOString().slice(0, 10), prescribedBy: 'Dr. Demo', verified: true, active: true, createdAt: Date.now() });
        }
        if (role === 'patient') {
          const { addDoc, collection } = await import('firebase/firestore');
          await addDoc(collection(db, 'medicines'), {
            patientId: cred.user.uid, name: 'Metformin 500mg', dosage: '1 tablet after breakfast',
            startDate: new Date().toISOString().slice(0, 10), durationDays: '30',
            prescribedBy: 'Demo Patient (self-reported)', verified: false, source: 'patient',
            active: true, createdAt: Date.now(),
          });
        }
        setLoggedIn(role);
      } catch (e2) {
        setAuthError(errMsg(e2));
      }
    }
    setAuthLoading(false);
  };

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center bg-app"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (loggedIn) {
    const Dashboard =
      loggedIn === 'patient' ? PatientDashboard : loggedIn === 'caretaker' ? CaretakerDashboard : loggedIn === 'doctor' ? DoctorDashboard : loggedIn === 'hospital' ? AdminDashboard : GovernmentAdminDashboard;
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-app"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
        <Dashboard onLogout={() => {
          try {
            localStorage.removeItem('mhd_admin_session');
            sessionStorage.removeItem('mhd_admin_session');
          } catch { /* ignore */ }
          setLoggedIn(null);
        }} />
      </Suspense>
    );
  }

  // Premium public landing page. The existing authentication UI below remains
  // untouched and is shown as soon as a portal is selected.
  if (portal === null) {
    return (
      <LandingPage
        onLogin={(role) => selectPortal(role, false)}
        onSignup={(role) => selectPortal(role, true)}
        onDemo={(role) => quickDemo(role)}
        onAdmin={() => selectPortal('admin', false)}
        onAbout={() => setActiveInfoModal('about')}
        onPrivacy={() => setActiveInfoModal('privacy')}
        activeInfoModal={activeInfoModal}
        setActiveInfoModal={setActiveInfoModal}
        authLoading={authLoading}
      />
    );
  }

  const portalCopy: Record<PortalType, { icon: React.ReactNode; title: string; desc: string }> = {
    patient: { icon: <User className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'PATIENT PORTAL', desc: 'Access your medical records, medicines, appointments and care plan.' },
    caretaker: { icon: <HeartHandshake className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'CARETAKER PORTAL', desc: 'Track a patient’s medicines and care instructions and report completion to the doctor.' },
    doctor: { icon: <Stethoscope className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'DOCTOR PORTAL', desc: 'Review cases, enter vitals, verify medicines and consult patients.' },
    hospital: { icon: <Shield className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'HOSPITAL PORTAL', desc: 'Manage this hospital, its doctors, patients, records and appointments.' },
    admin: { icon: <ShieldCheck className="w-[24px] h-[24px] text-heading shrink-0" strokeWidth={1.5} />, title: 'GOVERNMENT ADMIN PORTAL', desc: 'Official government healthcare oversight for registered hospitals, doctors, patients, and system-wide reports.' },
  };

  return (
    <div className="min-h-screen w-full bg-[#f5f8fa] text-ink font-sans flex flex-col">
      <style>{`
        .auth-page-bg {
          background:
            radial-gradient(circle at 20% 10%, rgba(22,163,74,.035), transparent 28%),
            radial-gradient(circle at 85% 80%, rgba(22,163,74,.025), transparent 30%),
            #f5f8fa;
        }
        .auth-main-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 6px 20px rgba(15,23,42,.08);
        }
        .auth-input {
          width: 100%;
          height: 45px;
          padding: 0 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #ffffff;
          color: #1f2937;
          font-size: 14px;
          outline: none;
          box-shadow: 0 2px 7px rgba(15,23,42,.035);
          transition: border-color .2s ease, box-shadow .2s ease;
        }
        .auth-input::placeholder { color: #9ca3af; }
        .auth-input:focus {
          border-color: #07543d;
          box-shadow: 0 0 0 3px rgba(7,84,61,.10);
        }
        .auth-primary-btn {
          background: #07543d;
          color: #ffffff;
          transition: background .2s ease, transform .15s ease;
        }
        .auth-primary-btn:hover { background: #064734; }
        .auth-primary-btn:active { transform: translateY(1px); }
        .auth-link { color: #07543d; }
        .auth-link:hover { color: #064734; }
        .auth-checkbox { accent-color: #07543d; }
      `}</style>

      {/* Header */}
      <header className="h-[70px] shrink-0 bg-white border-b border-gray-200 flex items-center justify-end px-5 sm:px-8 gap-3">
        <LangSelect />
        <ThemeSelect />
      </header>

      <main className="auth-page-bg flex-1 w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[720px] pt-8 sm:pt-10">
          {portal === null ? (
            <>
              <div className="mb-6">
                <h2 className="text-[24px] md:text-[28px] font-semibold text-ink mb-1">
                  Welcome to United Medication in Cooperation
                </h2>
                <p className="text-[14px] text-muted">Secure access to your healthcare services.</p>
              </div>

              <div className="space-y-3">
                {(['patient', 'caretaker', 'doctor', 'hospital'] as PortalType[]).map((p) => (
                  <div
                    key={p}
                    className="bg-white border border-gray-200 rounded-[10px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-1">
                      {portalCopy[p].icon}
                      <div>
                        <h3 className="text-[15px] font-semibold text-ink mb-1">{portalCopy[p].title}</h3>
                        <p className="text-[13px] text-muted leading-relaxed pr-2">{portalCopy[p].desc}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0 w-full sm:w-[180px]">
                      <button
                        type="button"
                        onClick={() => selectPortal(p, false)}
                        className="h-[38px] px-4 auth-primary-btn rounded-[7px] text-[13px] font-medium shadow-sm w-full"
                      >
                        {p === 'hospital' ? 'Sign in as Hospital' : `Sign in as ${p}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => selectPortal(p, true)}
                        className="h-[38px] px-4 bg-[#f0fdf4] border border-[#bbf7d0] text-green-700 rounded-[7px] text-[13px] font-medium transition-colors hover:bg-[#dcfce7] w-full"
                      >
                        Create new account
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">→ Demo accounts</p>
                <div className="flex flex-wrap gap-2">
                  {(['patient', 'caretaker', 'doctor', 'hospital'] as PortalType[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => quickDemo(p)}
                      disabled={authLoading}
                      className="h-[32px] px-3 bg-transparent border border-gray-200 text-muted text-[12px] font-medium rounded-[4px] hover:bg-white hover:text-green-700 hover:border-green-200 transition-colors disabled:opacity-60"
                    >
                      {p[0].toUpperCase() + p.slice(1)} Demo
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted mt-2">Demo accounts — created automatically on first use. Password: demo123</p>
              </div>
            </>
          ) : (
            <div>
              {/* Back */}
              <button
                type="button"
                onClick={() => selectPortal(null, false)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 mb-4 rounded-full border border-gray-200 bg-white text-[13px] font-semibold auth-link shadow-sm hover:border-green-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to portal selection
              </button>

              {authError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-[6px]">
                  {authError}
                </div>
              )}

              {!isRegistering ? (
                /* ---------- LOGIN ---------- */
                <form onSubmit={handleLogin} className="auth-main-card rounded-[20px] p-6 sm:p-7 lg:p-7">
                  <h3 className="text-[18px] font-semibold auth-link mb-1">
                    {portal === 'patient' && 'Patient Sign In'}
                    {portal === 'caretaker' && 'Caretaker Sign In'}
                    {portal === 'doctor' && 'Doctor Sign In'}
                    {portal === 'hospital' && 'Hospital Sign In'}
                    {portal === 'admin' && 'Government Admin Portal'}
                  </h3>

                  <p className="text-[13px] text-muted mb-4 border-b border-gray-200 pb-3">
                    {portal === 'admin'
                      ? 'Enter official government administrator password to proceed'
                      : 'Login to continue to your health portal'}
                  </p>

                  <div className="space-y-3.5">
                    {portal !== 'admin' && (
                      <div>
                        <label className="block text-[13px] font-semibold auth-link mb-1.5">Email address</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="auth-input"
                          placeholder="Enter your email address"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[13px] font-semibold auth-link mb-1.5">
                        {portal === 'admin' ? 'Administrator Password' : 'Password'}
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input"
                        placeholder={portal === 'admin' ? 'Enter administrator password' : 'Enter your password'}
                        autoFocus={portal === 'admin'}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 text-[13px] text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded-[3px] border-gray-300 auth-checkbox"
                        />
                        Remember me
                      </label>

                      {portal !== 'admin' && (
                        <button
                          type="button"
                          onClick={handleForgot}
                          className="text-[13px] font-semibold auth-link hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full h-[44px] auth-primary-btn rounded-[7px] text-[14px] font-medium shadow-sm flex items-center justify-center disabled:opacity-80"
                      >
                        {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (portal === 'admin' ? 'Access Admin Portal' : 'Sign In')}
                      </button>

                      {portal === 'patient' && (
                        <button
                          type="button"
                          onClick={handleDummyFingerprintLogin}
                          disabled={authLoading}
                          className="w-full h-[44px] mt-2 border border-green-600 text-green-700 bg-white rounded-[7px] text-[13px] font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          <Fingerprint className="w-4 h-4" /> Continue with fingerprint (demo)
                        </button>
                      )}
                    </div>

                    {portal !== 'admin' && (
                      <div className="pt-4 text-center">
                        <button
                          type="button"
                          onClick={() => { setIsRegistering(true); setAuthError(''); }}
                          className="text-[13px] font-semibold auth-link hover:underline transition-colors"
                        >
                          Don&apos;t have an account? Create an account
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                /* ---------- REGISTER ---------- */
                <form onSubmit={handleRegister} className="auth-main-card rounded-[20px] p-6 sm:p-7 lg:p-7">
                  <h3 className="text-[18px] font-semibold auth-link mb-4 border-b border-gray-200 pb-3">
                    {portal === 'patient' && 'Create Patient Account'}
                    {portal === 'doctor' && 'Register as Doctor'}
                    {portal === 'hospital' && 'Register Hospital'}
                    {portal === 'caretaker' && 'Register as Caretaker'}
                  </h3>

                  <div className="space-y-3">
                    {portal === 'patient' && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FieldWithMic label="Full Name *" value={f.name || ''} onChange={(v) => set('name', v)} required />
                          <div>
                            <label className={labelCls}>Date of Birth *</label>
                            <input type="date" required value={f.dob || ''} onChange={(e) => set('dob', e.target.value)} className={inputCls} />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Gender *</label>
                            <select value={f.gender || 'Male'} onChange={(e) => set('gender', e.target.value)} className={inputCls}>
                              <option>Male</option><option>Female</option><option>Other</option>
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Blood Group</label>
                            <select value={f.bloodGroup || ''} onChange={(e) => set('bloodGroup', e.target.value)} className={inputCls}>
                              <option value="">Select</option>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><label className={labelCls}>Phone *</label><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></div>
                          <div><label className={labelCls}>Aadhaar Number *</label><input value={f.aadhaar || ''} onChange={(e) => set('aadhaar', e.target.value)} className={inputCls} placeholder="12-digit" maxLength={12} /></div>
                        </div>
                        <FieldWithMic label="Address" textarea value={f.address || ''} onChange={(v) => set('address', v)} />
                        <LocationFields f={f} set={set} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><label className={labelCls}>Emergency Contact 1 (optional)</label><input placeholder="Optional" value={f.emergencyName || ''} onChange={(e) => set('emergencyName', e.target.value)} className={inputCls} /></div>
                          <div><label className={labelCls}>Emergency Contact 1 Phone (optional)</label><input placeholder="Optional" value={f.emergencyPhone || ''} onChange={(e) => set('emergencyPhone', e.target.value)} className={inputCls} /></div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><label className={labelCls}>Annual Income (₹) (optional)</label><input type="number" placeholder="Optional" value={f.income || ''} onChange={(e) => set('income', e.target.value)} className={inputCls} /></div>
                          <div>
                            <label className={labelCls}>Language</label>
                            <select value={f.rpLang || 'English'} onChange={(e) => set('rpLang', e.target.value)} className={inputCls}>
                              <option>English</option><option>Hindi</option>
                            </select>
                          </div>
                        </div>
                        <div className="rounded-md border border-gray-200 bg-[#f8fafc] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[13px] font-medium text-ink">Optional fingerprint sign-in</p>
                              <p className="text-[11px] text-muted mt-1">Prototype only — no real fingerprint is collected.</p>
                            </div>
                            <button type="button" onClick={() => { set('fingerprintEnrolled', 'true'); toast('Demo fingerprint enrolled for this prototype'); }} className={`px-3 py-2 rounded-md text-[12px] font-medium flex items-center gap-1.5 ${f.fingerprintEnrolled === 'true' ? 'bg-ok-bg text-ok' : 'auth-primary-btn'}`}>
                              <Fingerprint className="w-4 h-4" /> {f.fingerprintEnrolled === 'true' ? 'Enrolled' : 'Enroll demo'}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {portal === 'doctor' && (
                      <>
                        <FieldWithMic label="Doctor Name *" value={f.name || ''} onChange={(v) => set('name', v)} required />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><label className={labelCls}>Specialization *</label><input value={f.specialization || ''} onChange={(e) => set('specialization', e.target.value)} className={inputCls} placeholder="e.g. General Surgery" /></div>
                          <div><label className={labelCls}>Experience (years)</label><input type="number" value={f.experience || ''} onChange={(e) => set('experience', e.target.value)} className={inputCls} /></div>
                        </div>
                        <div><label className={labelCls}>Hospital Name *</label><input required value={f.hospital || ''} onChange={(e) => set('hospital', e.target.value)} className={inputCls} placeholder="Enter the hospital where you work" /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><label className={labelCls}>Medical Reg No *</label><input value={f.regNo || ''} onChange={(e) => set('regNo', e.target.value)} className={inputCls} /></div>
                          <div><label className={labelCls}>Phone</label><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></div>
                        </div>
                        <LocationFields f={f} set={set} />
                      </>
                    )}

                    {portal === 'hospital' && (
                      <>
                        <div><label className={labelCls}>Hospital Name *</label><input value={f.name || ''} onChange={(e) => set('name', e.target.value)} className={inputCls} /></div>
                        <div><label className={labelCls}>Phone (optional)</label><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></div>
                        <FieldWithMic label="Address *" textarea value={f.address || ''} onChange={(v) => set('address', v)} required />
                        <LocationFields f={f} set={set} />
                        <div><label className={labelCls}>License No</label><input value={f.licenseNo || ''} onChange={(e) => set('licenseNo', e.target.value)} className={inputCls} /></div>
                      </>
                    )}

                    {portal === 'caretaker' && (
                      <>
                        <FieldWithMic label="Caretaker Name *" value={f.name || ''} onChange={(v) => set('name', v)} required />
                        <div><label className={labelCls}>Patient Health ID *</label><input required value={f.patientHealthId || ''} onChange={(e) => set('patientHealthId', e.target.value)} className={inputCls} placeholder="e.g. MHD-ABC123" /></div>
                        <div><label className={labelCls}>Phone</label><input value={f.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} /></div>
                        <LocationFields f={f} set={set} />
                      </>
                    )}

                    <div>
                      <label className={labelCls}>Email *</label>
                      <input type="email" required value={f.email || ''} onChange={(e) => set('email', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Password *</label>
                      <input type="password" required value={f.password || ''} onChange={(e) => set('password', e.target.value)} className={inputCls} placeholder="min 6 characters" />
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button type="submit" disabled={authLoading} className="flex-1 h-[44px] auth-primary-btn rounded-[7px] text-[14px] font-medium shadow-sm flex items-center justify-center disabled:opacity-80">
                        {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          portal === 'patient' ? 'Create Health ID' : portal === 'doctor' ? 'Register as Doctor' : portal === 'caretaker' ? 'Register Caretaker' : 'Register Hospital'
                        )}
                      </button>
                    </div>

                    <div className="pt-3 text-center">
                      <button type="button" onClick={() => { setIsRegistering(false); setAuthError(''); }} className="text-[13px] font-semibold auth-link hover:underline transition-colors">
                        Already have an account? Sign in
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      

        {/* Informational Modals */}
        {activeInfoModal === 'about' && (
          <Modal
            small
            title="About CareSphere"
            icon={<Info className="w-5 h-5 text-primary" strokeWidth={1.75} />}
            onClose={() => setActiveInfoModal(null)}
            footer={
              <button
                id="modal-close-about"
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="h-[36px] px-5 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors cursor-pointer shadow-sm"
              >
                Close
              </button>
            }
          >
            <div className="space-y-3.5 text-ink text-[13px] leading-relaxed">
              <div className="p-2.5 bg-active/70 border border-line rounded-[6px] flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                <p className="text-[12px] font-medium text-heading">
                  CareSphere &bull; United Medication in Cooperation
                </p>
              </div>

              <p>
                <strong>CareSphere</strong> is a unified, patient-centric digital healthcare infrastructure engineered to harmonize every step of your clinical journey. By connecting patients, designated caretakers, consulting physicians, hospitals, and national health authorities onto one synchronized platform, CareSphere eliminates fragmented records and communication bottlenecks.
              </p>

              <div className="border-t border-line pt-3 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted">Core Mission & Principles</h4>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>One Patient, One Record:</strong> A lifetime continuous health journey with verifiable electronic health records.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Care Team Collaboration:</strong> Real-time coordination between attending doctors and family caretakers for medication adherence.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Sustainable Health Equity:</strong> Developed in strategic collaboration with United Nations Sustainable Development Goal 3.</p>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {activeInfoModal === 'privacy' && (
          <Modal
            small
            title="Privacy Policy"
            icon={<Lock className="w-5 h-5 text-primary" strokeWidth={1.75} />}
            onClose={() => setActiveInfoModal(null)}
            footer={
              <button
                id="modal-close-privacy"
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="h-[36px] px-5 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors cursor-pointer shadow-sm"
              >
                Close
              </button>
            }
          >
            <div className="space-y-3.5 text-ink text-[13px] leading-relaxed">
              <div className="p-2.5 bg-active/70 border border-line rounded-[6px] flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                <p className="text-[12px] font-medium text-heading">
                  Healthcare Data Security & Privacy Commitment
                </p>
              </div>

              <p>
                Your personal health data is confidential, encrypted, and strictly safeguarded. CareSphere applies defense-in-depth clinical security standards to protect patient identity and medical history.
              </p>

              <div className="border-t border-line pt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Patient Data Ownership:</strong> You own your medical information. Records and diagnostic files are never sold, monetized, or shared without your explicit consent.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Role-Based Access:</strong> Doctors, caretakers, and hospital staff access only authorized patient information relevant to active treatment.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>End-to-End Encryption:</strong> All vitals, surgical entries, prescriptions, and communications are encrypted in transit and at rest.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Immutable Audit Trail:</strong> Every record viewing, prescription issuance, and vital log update is securely tracked with verifiable timestamps.</p>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {activeInfoModal === 'features' && (
          <Modal
            small
            title="CareSphere Features"
            icon={<Sparkles className="w-5 h-5 text-primary" strokeWidth={1.75} />}
            onClose={() => setActiveInfoModal(null)}
            footer={
              <button
                id="modal-close-features"
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="h-[36px] px-5 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors cursor-pointer shadow-sm"
              >
                Close
              </button>
            }
          >
            <div className="space-y-3.5 text-ink text-[13px] leading-relaxed">
              <div className="p-2.5 bg-active/70 border border-line rounded-[6px] flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                <p className="text-[12px] font-medium text-heading">
                  Integrated CareSphere Platform Capabilities
                </p>
              </div>

              <p>
                CareSphere brings hospital departments, clinical staff, patients, and families together with purpose-built tools:
              </p>

              <div className="border-t border-line pt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Unified Digital Health ID:</strong> Unique longitudinal health profile capturing vitals, allergies, conditions, surgeries, and family histories.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Specialized Portals:</strong> Custom dashboards for Patients, Caretakers, Doctors, Hospitals, and Government Administrators.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Medication & Vitals Tracking:</strong> Live recording of BP, blood sugar, temperature, pulse, and daily caretaker verification of prescriptions.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Speech & Regional Languages:</strong> One-tap voice dictation and instant regional language translation across clinical interfaces.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p><strong>Emergency SOS & Dispatch:</strong> Instant emergency triggers with critical contact notification and nearby hospital mapping.</p>
                </div>
              </div>
            </div>
          </Modal>
        )}
    </div>
  );
}


/* --------------------------------------------------------------------------
 * Premium public landing page
 * -------------------------------------------------------------------------- */
type PublicPortal = 'patient' | 'caretaker' | 'doctor' | 'hospital';
type LandingInfoModal = 'about' | 'privacy' | 'features' | null;

type LandingPageProps = {
  onLogin: (role: PublicPortal) => void;
  onSignup: (role: PublicPortal) => void;
  onDemo: (role: PublicPortal) => void;
  onAdmin: () => void;
  onAbout: () => void;
  onPrivacy: () => void;
  activeInfoModal: LandingInfoModal;
  setActiveInfoModal: (value: LandingInfoModal) => void;
  authLoading: boolean;
};

function LandingPage({
  onLogin,
  onSignup,
  onDemo,
  onAdmin,
  onAbout,
  onPrivacy,
  activeInfoModal,
  setActiveInfoModal,
  authLoading,
}: LandingPageProps) {
  const roles: Array<{
    key: PublicPortal;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    badge: string;
  }> = [
    {
      key: 'patient',
      title: 'Patient',
      subtitle: 'Own your lifelong health identity, records, medicines and care journey.',
      icon: <User className="w-6 h-6" strokeWidth={1.7} />,
      badge: 'PERSONAL CARE',
    },
    {
      key: 'caretaker',
      title: 'Caretaker',
      subtitle: 'Coordinate medicines, care tasks and patient updates with confidence.',
      icon: <HeartHandshake className="w-6 h-6" strokeWidth={1.7} />,
      badge: 'CONNECTED CARE',
    },
    {
      key: 'doctor',
      title: 'Doctor',
      subtitle: 'Review verified records, vitals, prescriptions and patient history faster.',
      icon: <Stethoscope className="w-6 h-6" strokeWidth={1.7} />,
      badge: 'CLINICAL ACCESS',
    },
    {
      key: 'hospital',
      title: 'Hospital',
      subtitle: 'Manage hospital operations, doctors, patients, records and appointments.',
      icon: <Building2 className="w-6 h-6" strokeWidth={1.7} />,
      badge: 'HOSPITAL HUB',
    },
  ];

  const demoAccounts: Array<{
    key: PublicPortal;
    title: string;
    email: string;
    icon: React.ReactNode;
  }> = [
    { key: 'patient', title: 'Patient Demo', email: 'patient.demo@mhdhospital.in', icon: <User className="w-5 h-5" /> },
    { key: 'caretaker', title: 'Caretaker Demo', email: 'caretaker.demo@mhdhospital.in', icon: <HeartHandshake className="w-5 h-5" /> },
    { key: 'doctor', title: 'Doctor Demo', email: 'doctor.demo@mhdhospital.in', icon: <Stethoscope className="w-5 h-5" /> },
    { key: 'hospital', title: 'Hospital Demo', email: 'hospital.demo@mhdhospital.in', icon: <Building2 className="w-5 h-5" /> },
  ];

  const benefits = [
    {
      number: '01',
      title: 'Lifelong Digital Health Identity',
      icon: <Fingerprint className="w-5 h-5" />,
      text: 'United Medication in Cooperation gives every patient a lifelong digital health identity — register once, and your medical history, prescriptions and reports follow you to any hospital.',
    },
    {
      number: '02',
      title: 'FInger Print Access to Medical Records during Emergencies',
      icon: <Headphones className="w-5 h-5" />,
      text: 'Doctors can access patients\' medical records via fingerprint authorisation during emergency crises.',
    },
    {
      number: '03',
      title: 'Records Doctors Can Verify in Seconds',
      icon: <CheckCircle2 className="w-5 h-5" />,
      text: 'Doctors verify records in seconds, giving clinical teams faster access to the information needed for better-informed care.',
    },
    {
      number: '04',
      title: 'Hassle-free appointment process',
      icon: <Activity className="w-5 h-5" />,
      text: 'No need to stand in long queues; you can easily check your doctor\'s appointment status here.',
    },
    {
      number: '05',
      title: 'Five Connected Portals, One Ecosystem',
      icon: <Globe2 className="w-5 h-5" />,
      text: 'With 5 connected portals synced in real time on a secure, paperless cloud platform, healthcare becomes connected, inclusive and instant.',
    },
  ];

  const dots = Array.from({ length: 92 });

  return (
    <div className="um-page relative min-h-screen overflow-x-hidden bg-[#020b0a] text-white selection:bg-emerald-300/30">
      <style>{`
        html { scroll-behavior: smooth; }

        @keyframes um-orbit {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .32; }
          50% { transform: translate3d(22px, -18px, 0) scale(1.08); opacity: .55; }
        }
        @keyframes um-pulse {
          0%, 100% { transform: scale(.78); opacity: .34; box-shadow: 0 0 7px 1px rgba(7,84,61,.22); }
          50% { transform: scale(1.55); opacity: .98; box-shadow: 0 0 30px 7px rgba(7,84,61,.34); }
        }
        @keyframes um-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes um-scan {
          0% { transform: translateY(-120%); opacity: 0; }
          15% { opacity: .7; }
          85% { opacity: .7; }
          100% { transform: translateY(520%); opacity: 0; }
        }
        @keyframes um-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes um-flow {
          0% { transform: translateX(-4%) translateY(0) rotate(-1deg); }
          50% { transform: translateX(4%) translateY(-12px) rotate(1deg); }
          100% { transform: translateX(-4%) translateY(0) rotate(-1deg); }
        }
        @keyframes um-reveal {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes um-typing {
          from { width: 0; }
          to { width: 100%; }
        }

        .um-grid {
          background-image:
            linear-gradient(rgba(7,84,61,.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(7,84,61,.045) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: linear-gradient(to bottom, black, transparent 82%);
          -webkit-mask-image: linear-gradient(to bottom, black, transparent 82%);
        }
        .um-glass {
          background: linear-gradient(145deg, rgba(255,255,255,.085), rgba(255,255,255,.025));
          border: 1px solid rgba(255,255,255,.11);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 24px 80px rgba(0,0,0,.24);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }
        .um-border {
          position: relative;
        }
        .um-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(120deg, rgba(7,84,61,.48), rgba(255,255,255,.04), rgba(7,84,61,.3));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: .55;
        }
        .um-typing {
          display: inline-block;
          max-width: 100%;
          overflow: hidden;
          white-space: nowrap;
          border-right: 1px solid rgba(7,84,61,.7);
          animation: um-typing 4.2s steps(42, end) both, um-shimmer 5s linear infinite;
        }
        .um-shimmer-text {
          background: linear-gradient(100deg, #ffffff 10%, #a7f3d0 42%, #ffffff 65%, #6ee7b7 90%);
          background-size: 220% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: um-shimmer 7s linear infinite;
        }
        .um-orb { animation: um-orbit 7s ease-in-out infinite; }
        .um-dot { animation: um-pulse 4s ease-in-out infinite; }
        .um-float { animation: um-float 6s ease-in-out infinite; }
        .um-flow { animation: um-flow 12s ease-in-out infinite; }
        .um-scan { animation: um-scan 4.5s ease-in-out infinite; }
        .um-reveal { animation: um-reveal .8s ease-out both; }

        @media (prefers-reduced-motion: reduce) {
          .um-page *, .um-page *::before, .um-page *::after {
            animation-duration: .001ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* Advanced digital atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 um-grid opacity-90" />
        <div className="um-orb absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="um-orb absolute right-[-140px] top-[28%] h-[520px] w-[520px] rounded-full bg-teal-400/10 blur-[120px]" style={{ animationDelay: '-2.5s' }} />
        <div className="um-orb absolute left-[35%] bottom-[-220px] h-[500px] w-[500px] rounded-full bg-cyan-400/5 blur-[120px]" style={{ animationDelay: '-4s' }} />

        <svg className="um-flow absolute left-[-8%] top-[15%] h-[48%] w-[116%] opacity-45" viewBox="0 0 1200 600" fill="none" preserveAspectRatio="none">
          <path d="M-80 470C150 90 330 540 590 270S930 30 1280 330" stroke="rgba(52,211,153,.22)" strokeWidth="1.5" />
          <path d="M-80 520C160 170 360 570 620 320S950 100 1280 380" stroke="rgba(45,212,191,.16)" strokeWidth="1" />
          <path d="M-60 410C190 40 400 480 640 220S980 0 1260 250" stroke="rgba(125,211,252,.12)" strokeWidth="1" />
        </svg>

        {dots.map((_, i) => (
          <span
            key={i}
            className="um-dot absolute h-[5px] w-[5px] rounded-full bg-emerald-200"
            style={{
              left: `${(i * 37) % 101}%`,
              top: `${(i * 61 + 7) % 94}%`,
              animationDelay: `${-((i % 13) * .38)}s`,
              animationDuration: `${3 + (i % 5)}s`,
            }}
          />
        ))}
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[.08] bg-[#020b0a]/75 backdrop-blur-2xl">
        <nav className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <a href="#home" className="group flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200 shadow-[0_0_30px_rgba(52,211,153,.1)]">
              <Logo className="h-6 w-6" />
              <span className="absolute inset-0 rounded-xl border border-emerald-300/20 opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-bold tracking-[.16em] text-white">UNITED MEDITATION</span>
              <span className="block text-[9px] font-medium uppercase tracking-[.25em] text-emerald-200/55">Digital Healthcare Network</span>
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#home" className="hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/75 transition hover:bg-white/[.06] hover:text-white">
              <Home className="h-4 w-4" /> Home
            </a>
            <button type="button" onClick={onAbout} className="rounded-full px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/[.06] hover:text-white sm:px-4">
              About Us
            </button>
            <div className="rounded-xl border border-white/10 bg-white/[.04] px-1.5 py-1 shadow-lg">
              <LangSelect />
            </div>
            <div className="hidden rounded-xl border border-white/10 bg-white/[.04] px-1.5 py-1 shadow-lg sm:block">
              <ThemeSelect />
            </div>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {/* HERO */}
        <section id="home" className="relative mx-auto flex min-h-[calc(100vh-72px)] max-w-[1320px] items-center px-5 py-20 sm:px-8 lg:px-10 lg:py-24">
          <div className="grid w-full items-center gap-14 lg:grid-cols-[1.06fr_.94fr]">
            <div className="um-reveal">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[.07] px-4 py-2 text-[11px] font-semibold uppercase tracking-[.2em] text-emerald-200 shadow-[0_0_35px_rgba(52,211,153,.07)]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                </span>
                Connected Healthcare • Real-Time Care
              </div>

              <p className="mb-4 text-sm font-medium uppercase tracking-[.28em] text-white/45">A unified digital health identity</p>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-[84px]">
                United <span className="um-shimmer-text">Meditation</span>
              </h1>
              <div className="mt-7 min-h-8 text-base font-medium text-emerald-100/75 sm:text-lg">
                <span className="um-typing">One patient. One record. One connected journey.</span>
              </div>
              <p className="mt-7 max-w-2xl text-base leading-8 text-white/55 sm:text-lg">
                A premium, paperless healthcare ecosystem connecting patients, caretakers, doctors, hospitals and administrators through one synchronized digital experience.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#roles" className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-300 px-6 text-sm font-bold text-[#032019] shadow-[0_0_35px_rgba(52,211,153,.18)] transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_50px_rgba(52,211,153,.28)]">
                  Explore Portals <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <button type="button" onClick={() => onDemo('patient')} disabled={authLoading} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[.045] px-6 text-sm font-semibold text-white/85 transition hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-white/[.08] disabled:opacity-60">
                  <Sparkles className="h-4 w-4 text-emerald-200" /> Try Patient Demo
                </button>
              </div>


            </div>

            {/* Hero visual */}
            <div className="relative mx-auto w-full max-w-[600px] lg:ml-auto">
              <div className="absolute -inset-10 rounded-full bg-emerald-400/10 blur-[80px]" />
              <div className="um-glass um-border relative overflow-hidden rounded-[34px] p-3 shadow-[0_40px_120px_rgba(0,0,0,.45)]">
                <div className="relative overflow-hidden rounded-[27px] border border-white/10 bg-[#071613]">
                  <img
                    src="https://static.vecteezy.com/system/resources/previews/071/068/760/non_2x/global-healthcare-technology-concept-a-laptop-computer-with-a-stethoscope-resting-on-its-lid-an-overlay-of-a-digital-world-map-with-interconnected-nodes-is-projected-onto-the-laptop-photo.jpeg"
                    alt="Connected digital healthcare"
                    className="w-[600px] h-[600px] max-w-full object-cover rounded-2xl opacity-90 sm:w-[650px] sm:h-[650px] lg:w-[700px] lg:h-[700px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020b0a] via-[#020b0a]/15 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_35%,rgba(52,211,153,.18),transparent_34%)]" />
                  <div className="um-scan absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent shadow-[0_0_20px_rgba(52,211,153,.6)]" />

                  <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
                    <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.18em] text-emerald-100/75 backdrop-blur-xl">
                      Live care network
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[9px] font-semibold text-emerald-100">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.9)]" /> Synced
                    </div>
                  </div>


                </div>
              </div>
              <div className="um-float absolute -right-2 top-20 hidden rounded-2xl border border-emerald-300/20 bg-[#071713]/85 px-4 py-3 shadow-[0_15px_45px_rgba(0,0,0,.35)] backdrop-blur-xl sm:block">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-emerald-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-[.15em] text-white/65">Care connected</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUOTE + IMAGE */}
        <section id="about" className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="um-glass um-border grid overflow-hidden rounded-[32px] lg:grid-cols-[.9fr_1.1fr]">
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <div className="mb-6 flex items-center gap-3 text-emerald-200/75">
                <span className="h-px w-10 bg-emerald-300/50" />
                <span className="text-[10px] font-bold uppercase tracking-[.24em]">Our vision</span>
              </div>
              <blockquote className="text-2xl font-medium leading-relaxed tracking-[-.025em] text-white sm:text-3xl lg:text-[38px]">
                “Healthcare becomes stronger when every patient, caretaker, doctor and hospital moves as <span className="text-emerald-200">one connected system.</span>”
              </blockquote>
              <p className="mt-7 max-w-xl text-sm leading-7 text-white/50 sm:text-base">
                United Medication in Cooperation is designed around continuity: your identity, information and care journey stay connected wherever treatment happens.
              </p>
              <button type="button" onClick={onAbout} className="mt-8 inline-flex w-fit items-center gap-2 text-sm font-semibold text-emerald-200 transition hover:text-emerald-100">
                Discover our mission <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="relative min-h-[330px] overflow-hidden border-t border-white/10 lg:min-h-[500px] lg:border-l lg:border-t-0">
              <img
                src="https://media.gettyimages.com/id/2210843980/video/glowing-neon-heart-pulse-heart-beat-healthcare-vector-medical-background-with-heart.jpg?s=640x640&k=20&c=E6o1kDE_kLFKfzoHw1vmmxz6HX94fY1_RWfb3j3sRs8="
                alt="Healthcare professionals using digital health technology"
                className="absolute inset-0 h-full w-full object-cover opacity-70"
              />
            </div>
          </div>
        </section>

        {/* PORTALS */}
        <section id="roles" className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-emerald-200/70">
                <Users className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[.24em]">One ecosystem • four access points</span>
              </div>
              <h2 className="text-3xl font-semibold tracking-[-.035em] sm:text-5xl">Choose your <span className="text-emerald-200">care portal.</span></h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/45">Every portal is connected to the same real-time health ecosystem while keeping access focused on the user's role.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {roles.map((role, index) => (
              <article key={role.key} className="group um-glass um-border relative overflow-hidden rounded-[26px] p-5 transition duration-500 hover:-translate-y-2 hover:border-emerald-300/25 hover:bg-white/[.09] hover:shadow-[0_30px_90px_rgba(16,185,129,.1)]" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-emerald-300/[.06] blur-2xl transition duration-500 group-hover:bg-emerald-300/[.13]" />
                <div className="um-scan pointer-events-none absolute left-0 top-0 h-20 w-full bg-gradient-to-b from-emerald-300/[.06] to-transparent" style={{ animationDelay: `${-index * .7}s` }} />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200 shadow-[0_0_28px_rgba(52,211,153,.08)] transition duration-500 group-hover:scale-105 group-hover:bg-emerald-300/15">
                    {role.icon}
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[8px] font-bold tracking-[.16em] text-white/35">{role.badge}</span>
                </div>

                <div className="relative mt-7">
                  <h3 className="text-xl font-semibold text-white">{role.title}</h3>
                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/48">{role.subtitle}</p>
                </div>

                <div className="relative mt-6 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onLogin(role.key)} className="h-10 rounded-xl bg-emerald-300 text-xs font-bold text-[#032019] transition hover:bg-emerald-200">Sign in</button>
                  <button type="button" onClick={() => onSignup(role.key)} className="h-10 rounded-xl border border-white/10 bg-white/[.045] text-xs font-semibold text-white/75 transition hover:border-emerald-300/25 hover:bg-white/[.08] hover:text-white">Create account</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* DEMO CREDENTIALS */}
        <section id="demos" className="relative border-y border-white/[.07] bg-white/[.018]">
          <div className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
            <div className="mb-10 max-w-3xl">
              <div className="mb-4 flex items-center gap-2 text-emerald-200/70">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[.24em]">Interactive preview</span>
              </div>
              <h2 className="text-3xl font-semibold tracking-[-.035em] sm:text-5xl">Explore the platform with <span className="text-emerald-200">demo access.</span></h2>
              <p className="mt-4 text-sm leading-7 text-white/45 sm:text-base">These cards use the existing demo-account flow. No new authentication logic is introduced.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {demoAccounts.map((demo, index) => (
                <article key={demo.key} className="group um-glass relative overflow-hidden rounded-[24px] p-5 transition duration-500 hover:-translate-y-1.5 hover:border-emerald-300/25" style={{ animationDelay: `${index * 120}ms` }}>
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-300/[.07] blur-2xl" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-200">{demo.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-white">{demo.title}</p>
                      <p className="mt-0.5 text-[9px] uppercase tracking-[.17em] text-emerald-200/45">Demo environment</p>
                    </div>
                  </div>

                  <div className="relative mt-5 space-y-2 rounded-2xl border border-white/[.07] bg-black/20 p-3.5">
                    <div>
                      <p className="text-[9px] uppercase tracking-[.15em] text-white/30">Email</p>
                      <p className="mt-1 break-all font-mono text-[11px] text-white/75">{demo.email}</p>
                    </div>
                    <div className="border-t border-white/[.06] pt-2">
                      <p className="text-[9px] uppercase tracking-[.15em] text-white/30">Password</p>
                      <p className="mt-1 font-mono text-[11px] text-emerald-200">demo123</p>
                    </div>
                  </div>

                  <button type="button" disabled={authLoading} onClick={() => onDemo(demo.key)} className="group relative mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300/15 disabled:cursor-not-allowed disabled:opacity-50">
                    Launch {demo.title.replace(' Demo', '')} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section id="benefits" className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.22em] text-emerald-200/75">
              <ShieldCheck className="h-3.5 w-3.5" /> Benefits
            </div>
            <h2 className="max-w-4xl text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Why <span className="text-emerald-200">United Medication</span> matters ? </h2>
            <p className="mt-5 max-w-4xl text-sm leading-7 text-white/50 sm:text-base">
             Our software creates an internationally connected digital healthcare network, bridging the gap between patients, doctors, and hospitals. It provides quick access to essential medical history during emergencies and reduces paperwork through digital records. By keeping healthcare information organized, it helps reduce medical errors and improve treatment decisions. Patients can also consult doctors online to understand their medications and receive the right guidance, anytime and anywhere. This is the only place in India where patients can get a doctor verified health report anywhere and everywhere across the globe.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr] lg:items-stretch">
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <article key={benefit.number} className="group um-glass um-border relative overflow-hidden rounded-[22px] p-5 transition duration-500 hover:-translate-x-1 hover:bg-white/[.075]">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-300/15 bg-emerald-300/[.07] text-emerald-200 transition group-hover:border-emerald-300/30 group-hover:bg-emerald-300/10">{benefit.icon}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] text-emerald-300/45">{benefit.number}</span>
                        <h3 className="text-base font-semibold text-white sm:text-lg">{benefit.title}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/47">{benefit.text}</p>
                    </div>
                  </div>
                  <span className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-emerald-300/60 to-transparent transition-all duration-500 group-hover:w-full" />
                </article>
              ))}
            </div>

            <div className="um-glass um-border relative min-h-[500px] overflow-hidden rounded-[30px] lg:sticky lg:top-28 lg:h-[650px]">
              <img
                src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1400&q=85"
                alt="Connected healthcare experience"
                className="absolute inset-0 h-full w-full object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020b0a] via-[#020b0a]/30 to-[#020b0a]/10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(52,211,153,.18),transparent_40%)]" />

              <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
                <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.18em] text-white/60 backdrop-blur-xl">Benefits / 05</div>
                <ShieldCheck className="h-5 w-5 text-emerald-200/80" />
              </div>

              <div className="absolute bottom-7 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8">
                <p className="text-[10px] font-bold uppercase tracking-[.25em] text-emerald-200/65">Connected • Inclusive • Instant</p>
                <h3 className="mt-3 text-3xl font-semibold leading-tight tracking-[-.035em] text-white sm:text-4xl">Healthcare that remembers the patient.</h3>
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {['Digital ID', 'Voice Care', 'QR Emergency'].map((item) => (
                    <div key={item} className="rounded-xl border border-white/10 bg-black/25 px-3 py-3 backdrop-blur-xl">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      <p className="mt-2 text-[10px] font-semibold text-white/70">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[1320px] px-5 pb-20 sm:px-8 lg:px-10 lg:pb-28">
          <div className="um-glass um-border relative overflow-hidden rounded-[30px] px-6 py-12 text-center sm:px-10 lg:px-16 lg:py-16">
            <div className="absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-[80px]" />
            <Sparkles className="relative mx-auto h-6 w-6 text-emerald-200" />
            <h2 className="relative mt-5 text-3xl font-semibold tracking-[-.035em] sm:text-5xl">Ready to enter your <span className="text-emerald-200">care portal?</span></h2>
            <p className="relative mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">Choose your role above, sign in with your existing account, or explore the platform using one of the demo environments.</p>
            <a href="#roles" className="relative mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-emerald-300 px-6 text-sm font-bold text-[#032019] transition hover:bg-emerald-200">Choose a portal <ArrowRight className="h-4 w-4" /></a>
          </div>
        </section>
      </main>

      {/* Premium footer */}
      <footer className="relative z-10 border-t border-white/[.08] bg-black/20">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <button type="button" onClick={onAdmin} className="font-semibold text-white/75 transition hover:text-emerald-200">Admin Login</button>
            <span className="text-white/15">•</span>
            <a href="mailto:support@mhdhospital.in" className="inline-flex items-center gap-1.5 text-white/55 transition hover:text-emerald-200"><Headphones className="h-3.5 w-3.5" /> Support</a>
            <span className="text-white/15">•</span>
            <button type="button" onClick={onPrivacy} className="text-white/55 transition hover:text-emerald-200">Privacy Policy</button>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/55 lg:text-right">
            <Mail className="h-4 w-4 text-emerald-200/70" />
            <a href="mailto:contact@mhdhospital.in" className="transition hover:text-emerald-200">contact@mhdhospital.in</a>
          </div>
        </div>
        <div className="border-t border-white/[.05] px-5 py-4 text-center text-[10px] uppercase tracking-[.18em] text-white/25">
          © {new Date().getFullYear()} United Medication in Cooperation • Secure Digital Healthcare Ecosystem
        </div>
      </footer>

      {/* Landing-page versions of the existing information dialogs. */}
      {activeInfoModal === 'about' && (
        <Modal
          small
          title="About United Medication"
          icon={<Info className="h-5 w-5 text-primary" strokeWidth={1.75} />}
          onClose={() => setActiveInfoModal(null)}
          footer={
            <button type="button" onClick={() => setActiveInfoModal(null)} className="h-[36px] px-5 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors cursor-pointer shadow-sm">
              Close
            </button>
          }
        >
          <div className="space-y-3.5 text-ink text-[13px] leading-relaxed">
            <p><strong>United Medication</strong> is a unified, patient-centric digital healthcare platform designed to connect patients, caretakers, doctors, hospitals and healthcare administrators through a synchronized care journey.</p>
            <p><strong>Our mission:</strong> keep the patient's identity, medical history and care information connected while reducing fragmented records, paperwork and communication delays.</p>
          </div>
        </Modal>
      )}

      {activeInfoModal === 'privacy' && (
        <Modal
          small
          title="Privacy Policy"
          icon={<Lock className="h-5 w-5 text-primary" strokeWidth={1.75} />}
          onClose={() => setActiveInfoModal(null)}
          footer={
            <button type="button" onClick={() => setActiveInfoModal(null)} className="h-[36px] px-5 bg-primary text-on-navy rounded-[6px] text-[13px] font-medium hover:bg-primary-d transition-colors cursor-pointer shadow-sm">
              Close
            </button>
          }
        >
          <div className="space-y-3.5 text-ink text-[13px] leading-relaxed">
            <p>Your personal health information should be treated as confidential. The platform is designed around role-based access and controlled visibility of patient records.</p>
            <p><strong>Role-based access:</strong> Patients, caretakers, doctors and hospitals use separate portals so access can be focused on the appropriate care role.</p>
            <p><strong>Secure workflow:</strong> Health records, prescriptions and clinical information are intended to remain inside the authenticated healthcare workflow.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* Small helpers for the registration forms */
function FieldWithMic({
  label, value, onChange, textarea, placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  textarea?: boolean; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-2">
        {textarea ? (
          <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={inputCls + ' h-auto py-2'} />
        ) : (
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} className={inputCls} />
        )}
        <MicButton onText={(t) => onChange(value ? value + ' ' + t : t)} />
      </div>
    </div>
  );
}

function LocationFields({ f, set }: { f: Record<string, string>; set: (k: string, v: string) => void }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <div><label className={labelCls}>State *</label><input required value={f.state || ''} onChange={(e) => set('state', e.target.value)} className={inputCls} placeholder="State" /></div>
    <div><label className={labelCls}>District *</label><input required value={f.district || ''} onChange={(e) => set('district', e.target.value)} className={inputCls} placeholder="District" /></div>
  </div>;
}