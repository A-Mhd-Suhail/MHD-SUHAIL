# UNITED MEDICATION

## One Patient. One Health Identity. Connected Care.

United Medication is a unified digital healthcare ecosystem designed to connect patients, doctors, hospitals, and authorized government administration through a single lifelong health identity and connected medical record system.

## 🚀 Overview

Healthcare information is often fragmented across different hospitals and systems. Patients may have to repeatedly explain their medical history, while doctors may lack access to relevant previous records.

United Medication aims to solve this by creating a connected healthcare platform where a patient's health information can follow them across participating hospitals.

### Core Idea

**Register once → Build a lifelong health record → Connect with hospitals and doctors → Continue care seamlessly.**

## ✨ Key Features

### 👤 Patient Portal

- Create a unified health profile
- Aadhaar-based Health ID for the prototype
- Lifelong digital health timeline
- View medical records
- View prescriptions and medicines
- View lab and scan reports
- Track health vitals
- Book hospital appointments
- Select hospital → doctor → date/time
- View affiliated doctors
- Secure My Health QR
- Consent and access controls
- Billing and notifications

### 👨‍⚕️ Doctor Portal

- Medical/Professional ID
- View patient health records
- Verify patients through Health ID/QR
- Update patient vitals
- Add diagnoses and medical records
- Add prescriptions and medicines
- Upload lab/scan reports
- View patient's lifelong timeline
- Manage appointments
- Work with multiple hospitals
- Request affiliation with registered hospitals

### 🏥 Hospital Portal

- Hospital registration and unique Hospital ID
- Manage hospital information
- Manage affiliated doctors
- Approve/reject doctor affiliation requests
- Manage patients
- Manage appointments
- Coordinate doctor–hospital workflows

### 🏛️ Government Admin Portal

- Authorized administrative oversight
- View registered hospitals
- View registered doctors
- View patient records according to authorized access
- Monitor healthcare ecosystem activity
- Maintain administrative visibility

## 🔐 Security & Privacy

United Medication is designed around controlled access to healthcare information.

- Role-based access
- Consent-aware record sharing
- Secure Health QR
- Patient identity verification
- Access tracking and audit trail
- Firebase-backed persistent data
- QR contains a secure identifier/token rather than exposing complete medical records

> **Prototype note:** Aadhaar is used as the Health ID concept for this hackathon prototype. A production implementation would require appropriate identity, privacy, consent, security, and regulatory compliance.

## 🏗️ Technology Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend & Database:** Firebase
- **Authentication:** Firebase Authentication
- **Database:** Cloud Firestore
- **Data:** Patients, doctors, hospitals, appointments, medical records, prescriptions, medicines, vitals, reports, and access information
- **Architecture:** Multi-portal connected healthcare ecosystem

## 🔄 Healthcare Workflow

```text
Patient Registration
        ↓
Unified Health Identity
        ↓
Lifelong Digital Health Record
        ↓
Select Hospital
        ↓
View Hospital's Doctors
        ↓
Select Date & Time
        ↓
Book Appointment
        ↓
Doctor Consultation
        ↓
Update Vitals / Diagnosis / Prescription / Reports
        ↓
Record Added to Lifelong Timeline
        ↓
Patient Visits Another Hospital
        ↓
Authorized Doctor Verifies Patient
        ↓
Existing Health History Available
        ↓
Continuous Connected Care
```

## 🌱 Sustainability & Social Impact

United Medication supports a more sustainable healthcare ecosystem through:

- Reduced dependence on paper records
- Reduced duplication of medical information
- More efficient healthcare workflows
- Better continuity of care
- Improved accessibility to health information
- Connected healthcare infrastructure
- Better coordination between healthcare stakeholders

### Relevant UN SDGs

SDG 3: Good Health and Well-being · SDG 9: Industry, Innovation and Infrastructure · SDG 10: Reduced Inequalities · SDG 11: Sustainable Cities and Communities · SDG 12: Responsible Consumption and Production · SDG 16: Peace, Justice and Strong Institutions · SDG 17: Partnerships for the Goals

## 🎯 Vision

> Healthcare should remember the patient — not make the patient remember everything.

United Medication aims to create a future where healthcare records are connected, accessible, secure, and available throughout a patient's healthcare journey.

## 👥 Team

**ECO FORGE**  
Project: **UNITED MEDICATION**  
Tagline: **One Patient. One Health Identity. Connected Care.**

## ⚠️ Disclaimer

United Medication is a hackathon prototype created to demonstrate a connected healthcare ecosystem. It is not intended to replace certified healthcare information systems or provide medical advice. Production deployment would require comprehensive security, privacy, identity verification, regulatory, and healthcare compliance measures.

## Local Development

### Requirements

- Node.js 18 or newer
- npm 9 or newer
- A Firebase project with Authentication and Firestore enabled

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
cd MHD-SUHAIL-main-
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run dev       # development server
npm run lint      # TypeScript validation
npm run build     # production bundle
npm run check     # lint + build
npm run preview   # preview the production bundle
```

## Firebase Configuration

Copy `.env.example` to `.env` and fill in the Firebase web-app values. `.env` is excluded from Git.

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Enable **Email/Password** under Firebase Authentication and create the required Firestore database before testing demo login.

## Demo Login

Use the **Demo accounts** buttons on the landing page. The demo password is:

```text
demo123
```

Available demo accounts:

- `patient.demo@mhdhospital.in`
- `caretaker.demo@mhdhospital.in`
- `doctor.demo@mhdhospital.in`
- `hospital.demo@mhdhospital.in`

If demo login fails, verify the Firebase environment variables, confirm that Email/Password authentication is enabled, and check the browser console for Firebase configuration errors.

## GitHub and Vercel Deployment

```bash
git init
git add .
git commit -m "Prepare United Medication portal"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

In Vercel, import the GitHub repository and use:

```text
Build command: npm run build
Output directory: dist
Install command: npm install
```

Add all `VITE_FIREBASE_*` variables in Vercel under **Settings → Environment Variables** for Preview and Production. The included `vercel.json` configures SPA rewrites and long-lived caching for hashed assets.

## Production Warning

Review and tighten `firestore.rules` before using real patient data. The current rules are intended for a hackathon prototype and are not suitable for production healthcare data without comprehensive authorization, consent, audit, privacy, and regulatory controls.
