import React, { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { User, Stethoscope, Shield, ArrowLeft, Loader2, ShieldCheck, HeartHandshake, Info, Lock, Sparkles, Fingerprint, ArrowRight, Home, Mail, Headphones, HeartPulse, Building2, Users, CheckCircle2, Globe2, Activity, Sun, ChevronDown, ArrowUp, Brain, Microscope, ScanLine, FolderHeart, Wifi } from 'lucide-react';
import Modal from './components/Modal';
import { loginWithFingerprint } from './lib/fingerprint';
import { getTheme } from './lib/prefs';
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
  <svg className={className} viewBox="0 0 32 32" fill="#dc2626" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0L30 8V24L16 32L2 24V8L16 0ZM16 4.6L6 10.4V21.6L16 27.4L26 21.6V10.4L16 4.6Z" />
    <rect x="12" y="12" width="8" height="8" />
  </svg>
);

const inputCls = 'w-full h-[40px] border border-[#07543d]/40 rounded-[4px] px-3 text-[14px] text-black bg-white focus:outline-none focus:border-[#07543d] focus:ring-1 focus:ring-[#07543d] transition-colors';

/* AI capability slides shown in the about box (7 points + the vision slide) */
const AI_SLIDES: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: <Brain className="h-7 w-7" strokeWidth={1.5} />,
    title: 'AI-Powered Medical Imaging & Radiology',
    desc: 'AI systems can analyze X-rays, CT scans and MRI images to identify potential abnormalities such as tuberculosis, lung nodules and head injuries — enabling faster screening, supporting radiologists and improving access to diagnostics in remote and underserved regions.',
  },
  {
    icon: <Microscope className="h-7 w-7" strokeWidth={1.5} />,
    title: 'Automated Pathology & Microscopy',
    desc: 'Computer vision and AI can analyze digital blood, urine and tissue samples to identify abnormalities and automate repetitive laboratory analysis — reducing manual workload, improving consistency and helping labs process more samples efficiently.',
  },
  {
    icon: <ScanLine className="h-7 w-7" strokeWidth={1.5} />,
    title: 'Early Non-Invasive Cancer Screening',
    desc: 'AI can process specialized imaging techniques, including thermal imaging, to identify patterns that may require further clinical evaluation — radiation-free screening that supports earlier detection and more accessible preliminary testing.',
  },
  {
    icon: <HeartPulse className="h-7 w-7" strokeWidth={1.5} />,
    title: 'Real-Time Cardiac Diagnostics',
    desc: 'AI-powered ECG systems can analyze electrocardiogram signals in real time and identify patterns associated with potential cardiac abnormalities — supporting faster assessments in primary-care and remote healthcare settings.',
  },
  {
    icon: <FolderHeart className="h-7 w-7" strokeWidth={1.5} />,
    title: 'Intelligent Electronic Medical Records (EMR)',
    desc: 'AI-enhanced EMRs can transform patient data into useful clinical insights — identifying potential drug interactions, health risks, missing care steps and important history — helping doctors make better-informed decisions while reducing time spent searching records.',
  },
  {
    icon: <Wifi className="h-7 w-7" strokeWidth={1.5} />,
    title: 'IoT & Remote Patient Monitoring',
    desc: 'IoT devices, sensors and wearables can continuously monitor vital signs and transmit health data. AI analyzes these signals to identify unusual patterns and provide early warnings — in hospitals and at home.',
  },
  {
    icon: <Globe2 className="h-7 w-7" strokeWidth={1.5} />,
    title: 'National Data Interoperability & Unified Health Records',
    desc: 'Interoperability lets authorized providers securely exchange verified patient information across institutions. In India, frameworks like the Ayushman Bharat Digital Mission (ABDM) aim to create a connected digital health ecosystem.',
  },
];
const labelCls = 'block text-[13px] font-medium text-[#07543d] mb-1';

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
    // Real WebAuthn fingerprint login — Cloud Functions verify the biometric
    // and mint a custom token; onAuthStateChanged routes by the user's role.
    setAuthError('');
    setAuthLoading(true);
    try {
      await loginWithFingerprint();
    } catch (error) {
      setAuthError(errMsg(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!portal) return;
    const passOk = f.password && f.password.length >= 6;
    if (!passOk) { setAuthError('Password must be at least 6 characters.'); return; }
    const hasLocation = (value: string | undefined) => Boolean(value?.trim());
    if (portal === 'patient') {
      if (!f.name?.trim() || !f.dob || !f.phone?.trim() || !hasLocation(f.state) || !hasLocation(f.district)) { setAuthError('Name, date of birth, phone, state and district are required.'); return; }
      const aad = (f.aadhaar || '').replace(/\D/g, '');
      if (aad.length !== 12) { setAuthError('Aadhaar number must be exactly 12 digits.'); return; }
    }
    if (portal === 'doctor' && (!f.name?.trim() || !f.specialization?.trim() || !f.regNo?.trim() || !f.hospital?.trim() || !f.address?.trim() || !hasLocation(f.state) || !hasLocation(f.district))) { setAuthError('Doctor name, specialization, registration number, hospital, address, state and district are required.'); return; }
    if (portal === 'hospital' && (!f.name?.trim() || !f.address?.trim() || !hasLocation(f.state) || !hasLocation(f.district))) { setAuthError('Hospital name, address, state and district are required.'); return; }
    if (portal === 'caretaker' && (!f.name?.trim() || !hasLocation(f.state) || !hasLocation(f.district))) { setAuthError('Name, state and district are required.'); return; }
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
          Object.assign(profile, { name: f.name, phone: f.phone || '', state: f.state, district: f.district });
        } else {
          Object.assign(profile, {
            name: f.name, adminName: f.adminName || '', phone: f.phone || '',
            address: f.address || '', licenseNo: f.licenseNo || '', state: f.state || '', district: f.district || '',
          });
        }
        await setDoc(doc(db, 'users', cred.user.uid), profile);
        setLoggedIn(portal);
      } catch (dbError) {
        try { await auth.currentUser?.delete(); } catch { /* keep the original database error */ }
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
        
        /* Create Account page - same MHD green theme */
.auth-register-page {
  background:
    radial-gradient(circle at 20% 10%, rgba(22,163,74,.035), transparent 28%),
    radial-gradient(circle at 85% 80%, rgba(22,163,74,.025), transparent 30%),
    #f5f8fa;
  min-height: 100%;
}

.auth-register-card {
  background: #ffffff;
  border: 1px solid rgba(34, 197, 94, 0.45);
  box-shadow:
    0 0 10px rgba(34, 197, 94, 0.25),
    0 0 30px rgba(34, 197, 94, 0.15),
    0 6px 20px rgba(15, 23, 42, 0.08);
}

.auth-register-title {
  color: #16a34a;
  text-shadow:
    0 0 5px rgba(34, 197, 94, 0.7),
    0 0 14px rgba(34, 197, 94, 0.35);
}
        /* MHD Hospital green glow */
.auth-branding {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.auth-brand-logo {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #22c55e;
  border-radius: 11px;
  background: rgba(34, 197, 94, 0.06);
  box-shadow:
    0 0 6px rgba(34, 197, 94, 0.8),
    0 0 18px rgba(34, 197, 94, 0.45);
  animation: mhdGlow 2s ease-in-out infinite alternate;
}

.auth-brand-logo svg {
  width: 24px !important;
  height: 24px !important;
  fill: #22c55e !important;
  filter:
    drop-shadow(0 0 4px rgba(34, 197, 94, 0.9))
    drop-shadow(0 0 9px rgba(34, 197, 94, 0.5));
}

.auth-brand-name {
  color: #16a34a;
  font-size: 23px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-shadow:
    0 0 5px rgba(34, 197, 94, 0.8),
    0 0 14px rgba(34, 197, 94, 0.45);
  animation: mhdTextGlow 2s ease-in-out infinite alternate;
}

.auth-brand-subtitle {
  color: #22a55a;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 2px;
  margin-top: 2px;
  text-shadow: 0 0 7px rgba(34, 197, 94, 0.5);
}

.auth-glow-page .auth-main-card {
  border-color: rgba(34, 197, 94, 0.45);
  box-shadow:
    0 0 8px rgba(34, 197, 94, 0.18),
    0 0 22px rgba(34, 197, 94, 0.12),
    0 6px 20px rgba(15, 23, 42, 0.08);
}

@keyframes mhdGlow {
  from {
    box-shadow:
      0 0 5px rgba(34, 197, 94, 0.5),
      0 0 12px rgba(34, 197, 94, 0.2);
  }
  to {
    box-shadow:
      0 0 9px rgba(34, 197, 94, 0.9),
      0 0 24px rgba(34, 197, 94, 0.5);
  }
}

@keyframes mhdTextGlow {
  from {
    text-shadow:
      0 0 4px rgba(34, 197, 94, 0.45),
      0 0 9px rgba(34, 197, 94, 0.2);
  }
  to {
    text-shadow:
      0 0 7px rgba(34, 197, 94, 0.9),
      0 0 18px rgba(34, 197, 94, 0.45);
  }
}
  /* ===== CREATE ACCOUNT FINAL THEME ===== */

/* Registration form fields */
.auth-main-card input,
.auth-main-card select,
.auth-main-card textarea,
.auth-main-card input[type="text"],
.auth-main-card input[type="email"],
.auth-main-card input[type="password"],
.auth-main-card input[type="tel"],
.auth-main-card input[type="number"],
.auth-main-card input[type="date"] {
  background: #ffffff !important;
  background-color: #ffffff !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;

  border: 1px solid rgba(7, 84, 61, 0.35) !important;
  border-radius: 10px !important;
  box-shadow: none !important;
  outline: none !important;
}

.auth-main-card input:focus,
.auth-main-card select:focus,
.auth-main-card textarea:focus {
  background: #ffffff !important;
  background-color: #ffffff !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;

  border-color: #07543d !important;
  box-shadow: 0 0 0 3px rgba(7, 84, 61, 0.12) !important;
}

.auth-main-card label {
  color: #07543d !important;
  opacity: 1 !important;
  -webkit-text-fill-color: #07543d !important;
  font-weight: 600 !important;
}

/* Placeholder text */
.auth-register-card input::placeholder,
.auth-register-card textarea::placeholder {
  color: #6b7280 !important;
  opacity: 1 !important;
  -webkit-text-fill-color: #6b7280 !important;
}

/* Dropdown text */
.auth-register-card select option {
  background: #ffffff !important;
  color: #111827 !important;
}

/* Date input text */
.auth-register-card input[type="date"] {
  color: #111827 !important;
  color-scheme: light !important;
}
      `}</style>

      {/* Header */}
      <header className="h-[70px] shrink-0 bg-white border-b border-gray-200 flex items-center justify-end px-5 sm:px-8 gap-3">
        <LangSelect />
        <ThemeSelect />
      </header>
      <main className="auth-page-bg auth-glow-page flex-1 w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* United Madication branding */}
<div className="auth-branding">
  <div className="auth-brand-logo">
    <Logo className="w-9 h-9" />
  </div>

  <div>
    <div className="auth-brand-name">
      United Madication Inc
    </div>

    <div className="auth-brand-subtitle">
      Internationally Digitalized healthcare Network
    </div>
  </div>
</div>
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
                          <div><label className={labelCls}>Specialization *</label><input required value={f.specialization || ''} onChange={(e) => set('specialization', e.target.value)} className={inputCls} placeholder="e.g. General Surgery" /></div>
                          <div><label className={labelCls}>Experience (years)</label><input type="number" value={f.experience || ''} onChange={(e) => set('experience', e.target.value)} className={inputCls} /></div>
                        </div>
                        <div><label className={labelCls}>Hospital Name *</label><input required value={f.hospital || ''} onChange={(e) => set('hospital', e.target.value)} className={inputCls} placeholder="Enter the hospital where you work" /></div>
                        <FieldWithMic label="Address *" textarea value={f.address || ''} onChange={(v) => set('address', v)} placeholder="Doctor or clinic address" required />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><label className={labelCls}>Medical Reg No *</label><input required value={f.regNo || ''} onChange={(e) => set('regNo', e.target.value)} className={inputCls} /></div>
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
  // Track live theme changes so the marketing page can switch to a light look.
  const [landingTheme, setLandingTheme] = useState(getTheme());
  useEffect(() => {
    const obs = new MutationObserver(() => setLandingTheme(getTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  // Which landing page is shown: 'home' | 'portals' | 'demos'
  const [page, setPage] = useState<'home' | 'portals' | 'demos'>('home');

  /* About-box carousel: 8 slides, auto-advance every 2.5s, long-press to pause */
  const [slide, setSlide] = useState(0);
  const [slidePaused, setSlidePaused] = useState(false);
  const longPressRef = useRef<number | null>(null);
  const touchXRef = useRef<number | null>(null);
  useEffect(() => {
    if (slidePaused) return;
    const t = window.setInterval(() => setSlide((s) => (s + 1) % (AI_SLIDES.length + 1)), 2500);
    return () => clearInterval(t);
  }, [slidePaused]);

  const goHomeThenScroll = (id: string) => {
    if (page !== 'home') {
      setPage('home');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 120);
    } else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
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
      title: 'Finger Print Access to Medical Records during Emergencies',
      icon: <Headphones className="w-5 h-5" />,
      text: "Doctors can access patients' medical records via fingerprint authorisation during emergency crises.",
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
      text: "No need to stand in long queues; you can easily check your doctor's appointment status here.",
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
    <div className={`um-page relative min-h-screen overflow-x-hidden bg-[#020b0a] text-white selection:bg-emerald-300/30${landingTheme === 'light' ? ' landing-light' : ''}`}>
      <style>{`
      /* =========================================================
   MHD HOSPITAL — GLOWING GREEN AUTHENTICATION EXPERIENCE
   ========================================================= */

.auth-glow-page {
  position: relative;
  overflow: hidden;
}

/* Ambient green light in the background */
.auth-glow-page::before {
  content: "";
  position: absolute;
  width: 520px;
  height: 520px;
  top: -180px;
  left: -180px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(16, 185, 129, 0.13),
    rgba(16, 185, 129, 0.045) 38%,
    transparent 70%
  );
  filter: blur(20px);
  pointer-events: none;
  animation: ambientGreenGlow 6s ease-in-out infinite alternate;
}

/* Second ambient glow */
.auth-glow-page::after {
  content: "";
  position: absolute;
  width: 480px;
  height: 480px;
  right: -180px;
  bottom: -180px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(5, 150, 105, 0.10),
    transparent 68%
  );
  filter: blur(25px);
  pointer-events: none;
  animation: ambientGreenGlow 7s ease-in-out infinite alternate-reverse;
}


/* =========================================================
   BRANDING
   ========================================================= */

.auth-branding {
  position: absolute;
  top: 30px;
  left: clamp(25px, 4vw, 65px);

  display: flex;
  align-items: center;
  gap: 13px;

  z-index: 10;

  animation: brandingEntrance 1s ease-out both;
}


/* Logo container */
.auth-brand-logo {
  position: relative;

  width: 52px;
  height: 52px;

  display: flex;
  align-items: center;
  justify-content: center;

  color: #087f5b;

  border-radius: 14px;

  background:
    linear-gradient(
      145deg,
      rgba(16, 185, 129, 0.12),
      rgba(16, 185, 129, 0.035)
    );

  border: 1px solid rgba(16, 185, 129, 0.30);

  box-shadow:
    0 0 12px rgba(16, 185, 129, 0.16),
    0 0 30px rgba(16, 185, 129, 0.08);

  overflow: hidden;
}


/* Moving glitter across logo */
.auth-brand-logo::after {
  content: "";

  position: absolute;

  top: -20px;
  left: -45px;

  width: 15px;
  height: 90px;

  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.95),
    rgba(110, 231, 183, 0.7),
    transparent
  );

  transform: rotate(20deg);

  animation: logoGlitter 4s ease-in-out infinite;

  pointer-events: none;
}


/* Project name */
.auth-brand-name {
  position: relative;

  font-family:
    Georgia,
    "Times New Roman",
    serif;

  font-size: clamp(24px, 2.3vw, 31px);

  font-weight: 600;

  letter-spacing: 0.015em;

  background: linear-gradient(
    105deg,
    #07543d 15%,
    #087f5b 35%,
    #35c48d 48%,
    #ffffff 51%,
    #35c48d 54%,
    #087f5b 68%,
    #07543d 90%
  );

  background-size: 260% 100%;

  -webkit-background-clip: text;
  background-clip: text;

  -webkit-text-fill-color: transparent;

  animation: textGlitter 4.5s ease-in-out infinite;

  filter:
    drop-shadow(0 0 5px rgba(16, 185, 129, 0.20));
}


/* Small subtitle */
.auth-brand-subtitle {
  margin-top: 2px;

  font-family:
    Inter,
    system-ui,
    sans-serif;

  font-size: 8px;

  font-weight: 600;

  letter-spacing: 0.25em;

  color: rgba(5, 120, 86, 0.62);

  text-shadow:
    0 0 8px rgba(16, 185, 129, 0.18);
}


/* =========================================================
   LOGIN CARD — GREEN GLOW
   ========================================================= */

.auth-main-card {
  position: relative;

  background: rgba(255, 255, 255, 0.94);

  border: 1px solid rgba(16, 185, 129, 0.18);

  box-shadow:
    0 6px 20px rgba(15, 23, 42, 0.08),
    0 0 0 1px rgba(16, 185, 129, 0.025),
    0 0 35px rgba(16, 185, 129, 0.08);

  transition:
    box-shadow 0.4s ease,
    border-color 0.4s ease;
}

.auth-main-card:hover {
  border-color: rgba(16, 185, 129, 0.30);

  box-shadow:
    0 10px 30px rgba(15, 23, 42, 0.09),
    0 0 45px rgba(16, 185, 129, 0.12);
}


/* =========================================================
   INPUTS — SUBTLE GREEN GLOW
   ========================================================= */

.auth-input {
  border-color: rgba(16, 185, 129, 0.16);

  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease;
}

.auth-input:hover {
  border-color: rgba(16, 185, 129, 0.30);
}

.auth-input:focus {
  border-color: #087f5b;

  box-shadow:
    0 0 0 3px rgba(16, 185, 129, 0.10),
    0 0 18px rgba(16, 185, 129, 0.10);
}


/* =========================================================
   GREEN TEXT / LINKS
   ========================================================= */

.auth-link {
  color: #07543d;

  text-shadow:
    0 0 8px rgba(16, 185, 129, 0.10);
}

.auth-link:hover {
  color: #087f5b;

  text-shadow:
    0 0 12px rgba(16, 185, 129, 0.22);
}


/* =========================================================
   FINGERPRINT BUTTON
   ========================================================= */

.auth-fingerprint-glow {
  box-shadow:
    0 0 10px rgba(16, 185, 129, 0.08);

  transition:
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.auth-fingerprint-glow:hover {
  box-shadow:
    0 0 18px rgba(16, 185, 129, 0.20),
    0 0 35px rgba(16, 185, 129, 0.08);
}


/* =========================================================
   ANIMATIONS
   ========================================================= */

@keyframes brandingEntrance {
  from {
    opacity: 0;
    transform: translateY(-14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}


@keyframes logoGlitter {
  0%,
  55% {
    left: -45px;
  }

  75%,
  100% {
    left: 75px;
  }
}


@keyframes textGlitter {
  0% {
    background-position: 100% 50%;
  }

  45%,
  100% {
    background-position: -100% 50%;
  }
}


@keyframes ambientGreenGlow {
  from {
    opacity: 0.65;
    transform: scale(1);
  }

  to {
    opacity: 1;
    transform: scale(1.12);
  }
}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 700px) {
  .auth-branding {
    position: relative;

    top: auto;
    left: auto;

    margin: 0 auto 25px;

    justify-content: center;
  }

  .auth-brand-logo {
    width: 45px;
    height: 45px;
  }

  .auth-brand-name {
    font-size: 23px;
  }

  .auth-brand-subtitle {
    font-size: 7px;
  }
}


/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .auth-branding,
  .auth-brand-logo::after,
  .auth-brand-name,
  .auth-glow-page::before,
  .auth-glow-page::after {
    animation: none;
  }
}
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
        @keyframes um-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .um-marquee { animation: um-marquee 22s linear infinite; }
        .landing-marquee {
          position: relative;
          z-index: 20;
          width: 100%;
          overflow: hidden;
          background: #000;
          border-top: 1px solid rgba(52,211,153,.2);
          border-bottom: 1px solid rgba(52,211,153,.2);
          padding: 10px 0;
        }
        .landing-marquee .um-marquee { color: #86efac; }
        .landing-marquee .um-marquee-separator { color: #22c55e; }
        .landing-light .landing-marquee {
          background: #fdf1f4;
          border-color: rgba(190,24,93,.25);
        }
        .landing-light .landing-marquee .um-marquee { color: #0a0a0a; }
        .landing-light .landing-marquee .um-marquee-separator { color: #9d174d; }
        .landing-light .um-marquee-wrap { border-color: rgba(5,150,105,.35) !important; }
        .landing-light .auth-marquee { background-color: #fdf1f4 !important; border-color: rgba(190,24,93,.25) !important; }
        .landing-light .auth-marquee .um-marquee [class*="text-emerald-200"] { color: #0a0a0a !important; }
        .landing-light .auth-marquee .um-marquee [class*="text-emerald-300"] { color: #9d174d !important; }
        .landing-light .um-marquee [class*="text-emerald-200"] { color: #047857 !important; }
        .landing-light .um-marquee [class*="text-emerald-300"] { color: #059669 !important; }

        /* ---- White Mode: flip the landing page to a light look ---- */
        .landing-light { background-color: #f2faf7 !important; color: #0f172a; }
        .landing-light header { background-color: rgba(244,250,248,.9) !important; border-color: rgba(15,23,42,.1) !important; }
        .landing-light [class*="text-white"] { color: #0f172a !important; }
        .landing-light [class*="text-emerald-200"] { color: #047857 !important; }
        .landing-light [class*="text-emerald-100"] { color: #065f46 !important; }
        .landing-light [class*="border-white"] { border-color: rgba(15,23,42,.12) !important; }
        .landing-light [class*="bg-white/"] { background-color: rgba(15,23,42,.045) !important; }
        .landing-light [class*="bg-[#020b0a]"], .landing-light [class*="bg-[#071613]"], .landing-light [class*="bg-[#071713]"] { background-color: rgba(244,250,248,.9) !important; }
        .landing-light [class*="bg-black/"] { background-color: rgba(15,23,42,.06) !important; }
        .landing-light [class*="text-emerald-300"] { color: #047857 !important; }
        .landing-light header [class*="bg-emerald-300"] { background-color: #059669 !important; }
        .landing-light [class*="bg-emerald-300/"] { background-color: rgba(5,150,105,.08) !important; }
        .landing-light [class*="border-emerald-300"] { border-color: rgba(5,150,105,.4) !important; }
        .landing-light [class*="bg-black/30"] { background-color: rgba(255,255,255,.88) !important; }
        .landing-light [class*="bg-black/20"] { background-color: rgba(15,23,42,.06) !important; }
        .landing-light .um-dot { background-color: rgba(13,148,136,.35) !important; opacity: .45 !important; width: 2px !important; height: 2px !important; }
        .landing-light .um-glass { background: rgba(255,255,255,.85); border: 1px solid rgba(15,23,42,.08); box-shadow: inset 0 1px 0 rgba(255,255,255,.6), 0 24px 80px rgba(15,23,42,.08); }
        .landing-light .um-grid { background-image: linear-gradient(rgba(13,148,136,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,.09) 1px, transparent 1px); }
        .landing-light .um-border::before { background: linear-gradient(120deg, rgba(5,150,105,.35), rgba(15,23,42,.06), rgba(13,148,136,.25)); }
        .landing-light .um-shimmer-text { background: linear-gradient(100deg, #0f172a 10%, #0d9488 42%, #0f172a 65%, #047857 90%); background-size: 220% auto; -webkit-background-clip: text; background-clip: text; }
        .landing-light .about-visual img { filter: brightness(.78) saturate(1.25); }
        .landing-light .on-dark, .landing-light .on-dark [class*="text-white"] { color: #ffffff !important; }
        .landing-light .on-dark [class*="text-emerald-300"] { color: #6ee7b7 !important; }
        .landing-light .on-dark [class*="bg-emerald-300/"] { background-color: rgba(110,231,183,.12) !important; }
        .landing-light .on-dark [class*="border-emerald-300"] { border-color: rgba(110,231,183,.35) !important; }
        .landing-light .about-visual + * , .landing-light .about-visual { background-color: #dbe9e4; }

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
              <span className="block text-[13px] font-bold tracking-[.14em] text-white whitespace-nowrap">UNITED MEDICATION INC</span>
              <span className="block text-[7.5px] font-medium uppercase tracking-[.18em] text-emerald-200/55 whitespace-nowrap mt-0.5">Internationally Digitalized Healthcare Network</span>
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#home" onClick={(e) => { e.preventDefault(); setPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hidden sm:inline-flex flex-col items-center gap-1 px-2.5 py-2 text-[13.5px] font-medium text-emerald-300 whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5"><Home className="h-4 w-4" /><span>Home</span></span>
              <span className="h-[2px] w-7 rounded-full bg-emerald-300" />
            </a>
            {[
              ['Vision 2030', 'about'],
              ['Contact', 'footer'],
            ].map(([label, id]) => (
              <a key={label} href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (id === 'roles') { setPage('portals'); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
                  goHomeThenScroll(id);
                }}
                className="hidden md:inline-block px-2.5 py-2 text-[13.5px] font-medium text-white/80 transition hover:text-white whitespace-nowrap">
                {label}
              </a>
            ))}
            <div className="flex items-center gap-2 h-[42px] rounded-full bg-white px-3.5 shadow-lg ml-1">
              <Globe2 className="h-[17px] w-[17px] text-[#0f172a] cursor-pointer" onClick={(e) => { const s = (e.currentTarget.parentElement as HTMLElement).querySelector('select') as HTMLSelectElement | null; if (s) { try { s.showPicker(); } catch { s.click(); } } }} />
              <LangSelect className="flex-1 min-w-0 border-0 bg-transparent text-[13px] font-semibold text-[#0f172a] focus:outline-none appearance-none cursor-pointer [&>option]:bg-white [&>option]:text-[#0f172a]" />
              <ChevronDown className="h-3.5 w-3.5 text-[#0f172a] cursor-pointer" onClick={(e) => { const s = (e.currentTarget.parentElement as HTMLElement).querySelector('select') as HTMLSelectElement | null; if (s) { try { s.showPicker(); } catch { s.click(); } } }} />
            </div>
            <div className="hidden sm:flex items-center gap-2 h-[42px] rounded-full bg-white px-3.5 shadow-lg">
              <Sun className="h-[17px] w-[17px] text-[#0f172a] cursor-pointer" onClick={(e) => { const s = (e.currentTarget.parentElement as HTMLElement).querySelector('select') as HTMLSelectElement | null; if (s) { try { s.showPicker(); } catch { s.click(); } } }} />
              <ThemeSelect className="flex-1 min-w-0 border-0 bg-transparent text-[13px] font-semibold text-[#0f172a] focus:outline-none appearance-none cursor-pointer [&>option]:bg-white [&>option]:text-[#0f172a]" />
              <ChevronDown className="h-3.5 w-3.5 text-[#0f172a] cursor-pointer" onClick={(e) => { const s = (e.currentTarget.parentElement as HTMLElement).querySelector('select') as HTMLSelectElement | null; if (s) { try { s.showPicker(); } catch { s.click(); } } }} />
            </div>
          </div>
        </nav>
      </header>

      {/* Dynamic strip in the marked gap below the navbar */}
      <div className="landing-marquee">
        <div className="um-marquee flex w-max items-center gap-8 whitespace-nowrap">
          {[0, 1].map((dup) => (
            <span key={dup} className="flex items-center gap-8 px-4 text-[12px] font-bold uppercase tracking-[.14em]">
              <span>United Medication Inc</span><span className="um-marquee-separator">|</span>
              <span>The Best Online Health Platform In India</span><span className="um-marquee-separator">|</span>
              <span>Connected Healthcare • Real-Time Care</span><span className="um-marquee-separator">|</span>
              <span>Make In India</span><span className="um-marquee-separator">|</span>
              <span>Bharat Vision 2030 With UMIC</span><span className="um-marquee-separator">|</span>
            </span>
          ))}
        </div>
      </div>

      <main className="relative z-10">
        {page === 'home' && (<>
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

              <p className="mb-4 text-sm font-medium uppercase tracking-[.28em] text-white/80">Internationally Digitalized Healthcare Network</p>

              <h1 className="max-w-4xl text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-[84px]">
                United <span className="um-shimmer-text">Medication</span>
              </h1>
              <div className="mt-7 min-h-8 text-base font-medium text-emerald-100/75 sm:text-lg">
                <span className="um-typing">One patient. One record. One connected journey.</span>
              </div>
              <p className="mt-7 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
                A premium, paperless healthcare ecosystem connecting patients, caretakers, doctors, hospitals and administrators through one synchronized digital experience.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#roles" onClick={(e) => { e.preventDefault(); setPage('portals'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-300 px-6 text-sm font-bold text-[#032019] shadow-[0_0_35px_rgba(52,211,153,.18)] transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_50px_rgba(52,211,153,.28)]">
                  Start Journey with UMIC <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a href="#demos" onClick={(e) => { e.preventDefault(); setPage('demos'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[.045] px-6 text-sm font-semibold text-white/85 transition hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-white/[.08]">
                  <Sparkles className="h-4 w-4 text-emerald-200" /> Try Well Wishers Demo
                </a>
              </div>

              <div className="mt-12 grid max-w-xl grid-cols-3 gap-3">
                {[
                  ['01', 'Digital ID'],
                  ['10', 'Indian Languages'],
                  ['05', 'Connected Portals'],
                ].map(([value, label]) => (
                  <div key={label} className="um-glass rounded-2xl p-4">
                    <p className="text-xl font-semibold text-white sm:text-2xl">{value}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[.16em] text-white/65">{label}</p>
                  </div>
                ))}
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
                  <span className="text-[10px] font-semibold uppercase tracking-[.15em] text-white/90">Care connected</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUOTE + IMAGE — left vision text constant; right panel cycles ECG image + 7 AI slides */}
        <section id="about" className="mx-auto max-w-[1080px] px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="um-glass um-border grid overflow-hidden rounded-[28px] lg:grid-cols-[.95fr_1.05fr]">
            {/* LEFT — constant vision text */}
            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
              <div className="mb-6 flex items-center gap-3">
                <span className="h-px w-10 bg-[#dc2626]/60" />
                <span className="text-[10px] font-bold uppercase tracking-[.24em] text-[#dc2626]">UMIC Vision 2030</span>
              </div>
              <blockquote className="text-2xl font-medium leading-relaxed tracking-[-.025em] text-white sm:text-3xl lg:text-[34px]">
                “Healthcare becomes stronger when every patient, caretaker, doctor and hospital moves as <span className="text-emerald-200">one connected system.</span>”
              </blockquote>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/50 sm:text-base">
                United Medication in Cooperation is designed around continuity: your identity, information and care journey stay connected wherever treatment happens.
              </p>
              <button type="button" onClick={onAbout} className="mt-7 inline-flex w-fit items-center gap-2 text-sm font-semibold text-emerald-200 transition hover:text-emerald-100">
                Discover our mission <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* RIGHT — carousel in the green-line space */}
            <div
              className="relative min-h-[330px] overflow-hidden border-t border-white/10 lg:min-h-[430px] lg:border-l lg:border-t-0 select-none"
              onPointerDown={() => { longPressRef.current = window.setTimeout(() => setSlidePaused(true), 450); }}
              onPointerUp={() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } setSlidePaused(false); }}
              onPointerLeave={() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } setSlidePaused(false); }}
              onTouchStart={(e) => { touchXRef.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                const dx = e.changedTouches[0].clientX - (touchXRef.current || 0);
                if (Math.abs(dx) > 50) setSlide((sl) => (sl + (dx < 0 ? 1 : AI_SLIDES.length)) % (AI_SLIDES.length + 1));
              }}
            >
              {/* frame 0 — green ECG line image */}
              <div className={`absolute inset-0 transition-opacity duration-500 ${slide === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <img
                  src="https://www.shutterstock.com/shutterstock/videos/4069347349/thumb/1.jpg?ip=x480"
                  alt="Healthcare heartbeat visualization"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>

              {/* frames 1-7 — AI capabilities */}
              {AI_SLIDES.map((s, i) => (
                <div key={s.title} className={`absolute inset-0 bg-[#87CEFA] transition-opacity duration-500 ${slide === i + 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="relative mx-auto flex h-full w-[80%] flex-col items-center justify-center text-center">
                    <p className="text-[12px] font-extrabold uppercase tracking-[.22em] text-[#0a0f1a]">INDIA's Medical Vision 2030</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#0a0f1a]/70">(INDIA's Vision is UMIC vision)</p>
                    <span className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#0a0f1a]/25 bg-white/50 text-[#0a0f1a]">{s.icon}</span>
                    <p className="mt-3 font-mono text-[10px] tracking-[.3em] text-[#0a0f1a]/60">{String(i + 2).padStart(2, '0')} / 08</p>
                    <h3 className="mt-2 text-2xl font-extrabold leading-tight text-[#0a0f1a] sm:text-[27px]">{s.title}</h3>
                    <p className="mt-3 text-[13.5px] font-medium leading-6 text-[#0a0f1a]/85 sm:text-[14.5px]">{s.desc}</p>
                  </div>
                </div>
              ))}

              {/* controls */}
              <button onClick={() => setSlide((sl) => (sl + AI_SLIDES.length) % (AI_SLIDES.length + 1))} className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-black/60">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setSlide((sl) => (sl + 1) % (AI_SLIDES.length + 1))} className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-black/60">
                <ArrowRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                {Array.from({ length: AI_SLIDES.length + 1 }).map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)} className={`h-1.5 rounded-full transition-all ${slide === i ? 'w-5 bg-emerald-300' : 'w-1.5 bg-white/40 hover:bg-white/70'}`} />
                ))}
              </div>
            </div>
          </div>
        </section>        </>) }

        {page === 'portals' && (
        <section id="roles" className="mx-auto max-w-[1320px] px-5 pt-10 pb-20 sm:px-8 lg:px-10 lg:py-28">
          <button onClick={() => setPage('home')} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200/80 hover:text-emerald-100 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </button>
          <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 text-emerald-200/70">
                <Users className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[.24em]">One ecosystem • four access points</span>
              </div>
              <h2 className="text-3xl font-semibold tracking-[-.035em] sm:text-5xl">Start Your <span className="text-emerald-200">Journey With UMIC</span></h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/80">Every portal is connected to the same real-time health ecosystem while keeping access focused on the user's role.</p>
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
                  <span className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[8px] font-bold tracking-[.16em] text-white/60">{role.badge}</span>
                </div>

                <div className="relative mt-7">
                  <h3 className="text-xl font-semibold text-white">{role.title}</h3>
                  <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/80">{role.subtitle}</p>
                </div>

                <div className="relative mt-6 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onLogin(role.key)} className="h-10 rounded-xl bg-emerald-300 text-xs font-bold text-[#032019] transition hover:bg-emerald-200">Sign in</button>
                  <button type="button" onClick={() => onSignup(role.key)} className="h-10 rounded-xl border border-white/10 bg-white/[.045] text-xs font-semibold text-white/75 transition hover:border-emerald-300/25 hover:bg-white/[.08] hover:text-white">Create account</button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <button type="button" onClick={() => { setPage('demos'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300/15">
              Go with demo accounts <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
        ) }

        {page === 'demos' && (
        <section id="demos" className="relative border-y border-white/[.07] bg-white/[.018]">
          <div className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
            <button onClick={() => setPage('home')} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-200/80 hover:text-emerald-100 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </button>
            <div className="mb-10 max-w-3xl">
              <div className="mb-4 flex items-center gap-2 text-emerald-200/70">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[.24em]">Interactive preview</span>
              </div>
              <h2 className="text-3xl font-semibold tracking-[-.035em] sm:text-5xl">Explore the platform with <span className="text-emerald-200">demo access.</span></h2>
              <p className="mt-4 text-sm leading-7 text-white/80 sm:text-base">These cards use the existing demo-account flow. No new authentication logic is introduced.</p>
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
            <div className="mt-8 flex justify-center">
              <button type="button" onClick={() => { setPage('portals'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300/15">
                Go with real account <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
        ) }

        {page === 'home' && (<>
        {/* BENEFITS */}
        <section id="benefits" className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.05] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.22em] text-emerald-200/75">
              <ShieldCheck className="h-3.5 w-3.5" /> Benefits
            </div>
            <h2 className="max-w-4xl text-3xl font-semibold tracking-[-.04em] sm:text-5xl">Why <span className="text-emerald-200">United Medication</span> matters ?</h2>
            <p className="mt-5 max-w-4xl text-sm leading-7 text-white/50 sm:text-base">
              Our software creates an internationally connected digital healthcare network, bridging the gap between patients, doctors, and hospitals. It provides quick access to essential medical history during emergencies and reduces paperwork through digital records. By keeping healthcare information organized, it helps reduce medical errors and improve treatment decisions. Patients can also consult doctors online to understand their medications and receive the right guidance, anytime and anywhere. This is the only place in India where patients can get a doctor verified health report anywhere and everywhere across the globe.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.08fr_.92fr] lg:items-stretch">
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <article key={benefit.number} className="group um-glass um-border relative overflow-hidden rounded-[30px] p-6 sm:p-8 transition duration-500 hover:-translate-x-1 hover:bg-white/[.075]">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/[.07] text-emerald-200 transition group-hover:border-emerald-300/30 group-hover:bg-emerald-300/10">{benefit.icon}</div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-emerald-300/45 sm:text-sm">{benefit.number}</span>
                        <h3 className="text-lg font-semibold text-white sm:text-2xl">{benefit.title}</h3>
                      </div>
                      <p className="mt-4 text-base leading-8 text-white/60 sm:text-xl">{benefit.text}</p>
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
          <div className="um-glass um-border relative overflow-hidden rounded-[28px] px-6 py-9 text-center sm:px-10 lg:px-16 lg:py-12">
            <div className="absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-emerald-300/10 blur-[80px]" />
            <Sparkles className="relative mx-auto h-6 w-6 text-emerald-200" />
            <h2 className="relative mt-5 text-3xl font-semibold tracking-[-.035em] sm:text-5xl">Ready To Prioritize Your Health With <span className="text-emerald-200">UMIC</span></h2>
            <p className="relative mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">Choose your role above, sign in with your existing account, or explore the platform using one of the demo environments.</p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <a href="#roles" onClick={(e) => { e.preventDefault(); setPage('portals'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-300 px-6 text-sm font-bold text-[#032019] transition hover:bg-emerald-200">Get Started <ArrowRight className="h-4 w-4" /></a>
              <button type="button" onClick={() => { setPage('demos'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="inline-flex h-11 items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-6 text-sm font-bold text-emerald-100 transition hover:bg-emerald-300/15">Go with demo <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        </section>
        </>) }
      </main>

      {/* Floating take-me-up button */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Take me up"
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-300 text-[#032019] shadow-[0_10px_30px_rgba(52,211,153,.35)] transition hover:-translate-y-1 hover:bg-emerald-200"
      >
        <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
      </button>

      {/* Premium footer */}
      <footer id="footer" className="relative z-10 border-t border-white/[.08] bg-black/20 scroll-mt-20">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <button type="button" onClick={onAdmin} className="font-semibold text-white/75 transition hover:text-emerald-200">Admin Login</button>
            <span className="text-white/15">•</span>
            <a href="mailto:support@mhdhospital.in" className="inline-flex items-center gap-1.5 text-white/85 transition hover:text-emerald-200"><Headphones className="h-3.5 w-3.5" /> Support</a>
            <span className="text-white/15">•</span>
            <button type="button" onClick={onPrivacy} className="text-white/85 transition hover:text-emerald-200">Privacy Policy</button>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/85 lg:text-right">
            <Mail className="h-4 w-4 text-emerald-200/70" />
            <a href="mailto:unitedmadication@gmail.com" className="transition hover:text-emerald-200">unitedmadication@gmail.com</a>
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
