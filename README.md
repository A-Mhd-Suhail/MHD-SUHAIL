# UNITED MEDICATION

United Medication is a React and Firebase healthcare portal connecting patients, caretakers, doctors, hospitals, and government administrators through a shared health identity and connected medical records.

## Portals

- **Patient Portal:** dashboard, activity, appointments, cases, medicines, results, doctors, caretaker, timeline, health overview, Health QR, billing, notifications, profile, settings, and emergency workflows.
- **Caretaker Portal:** care overview, assigned-patient selection, patients, medicine monitoring, medication checklist, appointments, care activities, notifications, profile, and assignment responses.
- **Doctor Portal:** clinical dashboard, cases, patients, patient verification, vitals, diagnoses, case notes, prescriptions, medicines, results, appointments, hospital affiliations, requests, earnings, messages, notifications, profile, and settings.
- **Hospital Portal:** hospital dashboard, patients, doctors, affiliation requests, appointments, cases, medicines, billing, result upload, reports, hospital requests, profile, and settings.
- **Government Admin Portal:** national overview, hospitals, doctors, patients, cases, reports, system activity, and protected administrative oversight.

## Shared features

- Firebase email/password authentication and role validation
- Persistent or session-based login, session restoration, registration, and password reset
- Demo account quick sign-in
- Lazy-loaded dashboards for faster initial loading
- Global feature search
- Home, back, refresh, and responsive mobile navigation
- Notifications, toast messages, loading states, and shared settings
- Multi-language navigation and content labels
- Light, dark, and pink themes; dark mode is the default
- Emergency overlay and safety workflows
- Optional prototype fingerprint enrollment/sign-in flow
- Health identity and QR verification workflows
- Firestore-backed profiles, records, appointments, medicines, reports, and activity data

## Healthcare workflow

```text
Register/sign in → Load role profile → Verify health identity
→ Select hospital/doctor/appointment → Consultation and care activity
→ Update vitals, cases, medicines, prescriptions, and reports
→ Continue authorized care through the connected patient timeline
```

## Security and privacy

- Role-based portal access
- Firebase Authentication and Firestore persistence
- Health identity and QR-based verification design
- Consent-aware access model
- Activity and notification flows for care coordination
- QR codes use identifiers/tokens rather than complete medical records

This is a prototype. Do not use it with real patient data without production Firestore rules, encryption, consent management, audit logging, identity verification, regulatory review, and healthcare compliance controls.

## Technology stack

- React 19, TypeScript, Vite, and Tailwind CSS 4
- Firebase Authentication, Cloud Firestore, and Firebase helpers
- Framer Motion, Lucide React, Leaflet, QRCode React, and SimpleWebAuthn

## Project structure

```text
src/App.tsx          Authentication, landing page, and portal selection
src/index.css        Design tokens, themes, and shared portal styling
src/main.tsx         Application bootstrap and preference initialization
src/dashboards/      Patient, caretaker, doctor, hospital, and admin shells
src/tabs/            Portal feature pages and tabs
src/components/      Shared controls, modals, search, alerts, and toasts
src/lib/             Firebase helpers, types, preferences, i18n, and utilities
functions/           Firebase Cloud Functions entry point
firestore.rules      Prototype Firestore security rules
```

## Local development

Requirements: Node.js 18+, npm 9+, and a Firebase project with Authentication and Firestore enabled.

```bash
npm install
cp .env.example .env
npm run dev
```

Open <http://localhost:3000>.

### Commands

```bash
npm run dev          # Vite development server
npm run start        # Alias for dev
npm run lint         # TypeScript validation
npm run build        # Production build
npm run check        # lint plus production build
npm run preview      # Preview the production build
npm run vercel-build # Vercel build command
```

## Firebase configuration

Copy `.env.example` to `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Enable Email/Password authentication and create the Firestore database. Keep `.env` private; it is excluded from Git.

## Demo accounts

Use the landing-page demo buttons. The demo password is `demo123`.

```text
patient.demo@mhdhospital.in
caretaker.demo@mhdhospital.in
doctor.demo@mhdhospital.in
hospital.demo@mhdhospital.in
```

Government Admin uses its protected admin access flow and is not a normal public registration portal.

## Deployment

```bash
npm run build
```

Vercel settings:

```text
Build command: npm run build
Output directory: dist
Install command: npm install
```

Configure all `VITE_FIREBASE_*` variables for Preview and Production. `vercel.json` provides SPA rewrites and asset caching.

## Project identity

**Team:** ECO FORGE  
**Project:** UNITED MEDICATION  
**Tagline:** One Patient. One Health Identity. Connected Care.

## Disclaimer

United Medication is a hackathon/prototype healthcare application. It does not provide medical advice and is not a certified clinical information system. Production use requires comprehensive privacy, security, identity, consent, audit, infrastructure, and regulatory controls.
