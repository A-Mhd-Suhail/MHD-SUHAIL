# MHD Hospital — My Health Defense Hospital 24×7

React + TypeScript rewrite of the MHD Hospital portal with the MediNexa UI system.

- **Stack**: React 19 · TypeScript · Vite 6 · Tailwind CSS v4 · Firebase v12 (modular) · lucide-react · qrcode.react · Leaflet
- **Firebase**: same project as the original app (`every-life-matters-8aca8`) — all existing patients, doctors, appointments, cases, medicines, bills and timelines are visible here unchanged.
- **Portals**: Patient · Doctor · Hospital Admin

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build → dist/
npm run lint       # tsc --noEmit
```

### One-click local launch

On macOS, double-click **Open MHD Hospital.command** in Finder. It installs dependencies on the first run, starts the development server, and opens `http://localhost:3000`. On Windows, double-click **Start MHD Hospital (Windows).bat**.

### GitHub upload

```bash
git init
git add .
git commit -m "Prepare MHD Hospital for GitHub"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

For the included GitHub Pages workflow, set **Settings → Pages → Source** to **GitHub Actions**.

## Demo accounts

Created automatically on first use (password `demo123`):

- `patient.demo@mhdhospital.in`
- `doctor.demo@mhdhospital.in`
- `hospital.demo@mhdhospital.in`

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

## Notes

- Firestore layout is identical to the vanilla app (collections: `users, medicines, appointments, slots, cases, timeline, reports, vitals, bills, notifications, accessLog, consents, threads/{id}/m`). Timestamps are epoch-ms numbers; dates are `YYYY-MM-DD` strings.
- `firestore.rules` is the same demo rules file as the original — tighten before production.
