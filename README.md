# MHD Hospital Portal

MHD Hospital is a Vite + React + TypeScript healthcare portal with separate experiences for patients, caretakers, doctors, hospitals, and government administrators.

- **Stack**: React 19 · TypeScript · Vite 6 · Tailwind CSS v4 · Firebase v12 (modular) · lucide-react · qrcode.react · Leaflet
- **Firebase**: same project as the original app (`every-life-matters-8aca8`) — all existing patients, doctors, appointments, cases, medicines, bills and timelines are visible here unchanged.
## Features

- Patient records, cases, medicines, appointments, reports, billing, timeline, QR health ID, vitals, notifications, and emergency access.
- Doctor case review, prescriptions, medicine verification, vitals, appointments, earnings, messaging, hospital requests, and duty status.
- Hospital administration for patients, doctors, cases, medicines, appointments, reports, billing, and hospital requests.
- Caretaker monitoring limited to patients assigned by a doctor.
- Firebase Authentication and Firestore persistence.
- Multilingual UI, themes, responsive layout, voice input, and lazy-loaded patient features for faster startup.

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- A Firebase project with Authentication and Firestore enabled

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build → dist/
npm run lint       # tsc --noEmit
```

On macOS, double-click `Open-MHD-Portal.command` on the Desktop if it is available locally. It starts the active project on port 3100 and opens the browser. The project folder itself is source code and does not launch the portal by double-clicking.

### GitHub upload

```bash
git init
git add .
git commit -m "Prepare MHD Hospital for GitHub"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

## Firebase configuration

Copy `.env.example` to `.env` and fill in the Firebase web-app values. The `.env` file is ignored by Git and must never be committed.

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Keep the detected framework as **Vite**.
4. Add all six `VITE_FIREBASE_*` variables under **Settings → Environment Variables** for Preview and Production.
5. Deploy. The included `vercel.json` handles SPA rewrites and immutable asset caching.

Build settings:

```text
Build command: npm run build
Output directory: dist
Install command: npm install
```

## Demo accounts

Created automatically on first use (password `demo123`):

- `patient.demo@mhdhospital.in`
- `caretaker.demo@mhdhospital.in`
- `doctor.demo@mhdhospital.in`
- `hospital.demo@mhdhospital.in`

If demo login fails, confirm that the Firebase environment variables are configured and Email/Password sign-in is enabled in Firebase Authentication. Existing demo profiles are repaired during login without removing caretaker assignments.

## Features carried over from the original app

- 10-language UI (English, हिन्दी, தமிழ், తెలుగు, മലയാളം, ಕನ್ನಡ, বাংলা, मराठी, ગુજરાતી, ਪੰਜਾਬੀ)
- 🌙 Light / Dark / 💗 Pink themes + text size (A−/A/A+)
- 🎙️ Voice input (Chrome, follows selected language)
- 🚑 Emergency medical card (patient self card; staff Health-ID lookup)
- Patient: cases, medicines (self-report + doctor verify), appointments with slot locking & queue numbers, results, timeline, health overview (vitals trends), QR medical ID, consent center + access log, billing
- Doctor: case review with prescriptions → auto medicines/bill/timeline, vitals entry, medicine verification, live patient chat (threads), duty toggle with live location, earnings
- Hospital: patients/doctors/cases/medicines/appointments, document verification, result upload (client-compressed images), billing

## Structure

```
src/
  App.tsx                  # auth (login/register/demo) + portal switch
  PatientDashboard.tsx     # sidebar + tab router (patient)
  DoctorDashboard.tsx      # sidebar + duty/location + tab router
  AdminDashboard.tsx       # sidebar + tab router (hospital)
  firebase.ts              # Firebase init (modular SDK)
  lib/                     # types, i18n, formatters, voice, media, prefs, fs helpers
  components/              # Toaster, Modal, MicButton, LangSelect/ThemeSelect, EmergencyOverlay
  tabs/                    # patient tabs (src root of tabs/)
  tabs/patient/            # patient dashboard home
  tabs/doctor/             # doctor portal tabs
  tabs/admin/              # hospital admin tabs
  tabs/shared/             # notifications + settings (all roles)
```

## Repository commands

```bash
npm run dev       # development server
npm run lint      # TypeScript validation
npm run build     # production bundle
npm run check     # lint + build
npm run preview   # preview dist locally
```

## Notes

- Firestore layout is identical to the vanilla app (collections: `users, medicines, appointments, slots, cases, timeline, reports, vitals, bills, notifications, accessLog, consents, threads/{id}/m`). Timestamps are epoch-ms numbers; dates are `YYYY-MM-DD` strings.
- `firestore.rules` is permissive for demonstration — tighten it before using real patient data in production.
