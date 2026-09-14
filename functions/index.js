/**
 * WebAuthn (fingerprint) backend for United Medication Inc.
 * Deploy:  firebase deploy --only functions   (requires the Blaze plan)
 *
 * Four callable functions:
 *   webauthnRegisterOptions / webauthnRegisterVerify — "Enable Fingerprint" (logged-in user)
 *   webauthnLoginOptions   / webauthnLoginVerify     — "Login with Fingerprint" (before sign-in)
 *
 * Works on https://united-medi.vercel.app and on http://localhost:* for local testing.
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

admin.initializeApp();
const db = admin.firestore();

const rpName = 'United Medication Inc';
const PROD_RP_ID = 'united-medi.vercel.app';
const PROD_ORIGIN = 'https://united-medi.vercel.app';

// Use localhost rpID when the request comes from local dev (WebAuthn is domain-bound).
function rpFor(req) {
  const hdr = (req.rawRequest && req.rawRequest.headers && req.rawRequest.headers.origin) || '';
  if (hdr.includes('localhost')) return { rpID: 'localhost', origin: hdr.replace(/\/$/, '') };
  return { rpID: PROD_RP_ID, origin: PROD_ORIGIN };
}

const UV_MODE = false; // 'preferred' verification — maximizes demo success on any device

/* ---------- Registration ("Enable Fingerprint") ---------- */

exports.webauthnRegisterOptions = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const uid = req.auth.uid;
  const { rpID } = rpFor(req);

  const existing = await db.collection('webauthnCredentials').where('userId', '==', uid).get();
  const userSnap = await db.doc('users/' + uid).get();
  const userData = userSnap.data() || {};

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(uid),
    userName: userData.email || uid,
    userDisplayName: userData.name || userData.adminName || 'United Medication user',
    attestationType: 'none',
    excludeCredentials: existing.docs.map((d) => ({ id: d.get('credentialId') })),
  });

  await db.doc('webauthnChallenges/' + uid).set({ challenge: options.challenge, at: Date.now() });
  return options;
});

exports.webauthnRegisterVerify = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const uid = req.auth.uid;
  const { rpID, origin } = rpFor(req);

  const challDoc = await db.doc('webauthnChallenges/' + uid).get();
  if (!challDoc.exists) throw new HttpsError('failed-precondition', 'No registration in progress.');

  const verification = await verifyRegistrationResponse({
    response: req.data,
    expectedChallenge: challDoc.get('challenge'),
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: UV_MODE,
  });

  if (!verification.verified) throw new HttpsError('failed-precondition', 'Fingerprint registration failed.');
  const { credential } = verification.registrationInfo;

  await db.collection('webauthnCredentials').add({
    userId: uid,
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter || 0,
    createdAt: Date.now(),
  });
  await challDoc.ref.delete();
  return { ok: true };
});

/* ---------- Login ("Login with Fingerprint") ---------- */

exports.webauthnLoginOptions = onCall(async (req) => {
  const { rpID } = rpFor(req);
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred' });
  const sessionId = db.collection('webauthnChallenges').doc().id;
  await db.doc('webauthnChallenges/' + sessionId).set({ challenge: options.challenge, at: Date.now() });
  return { sessionId, options };
});

exports.webauthnLoginVerify = onCall(async (req) => {
  const { sessionId, response } = req.data || {};
  if (!sessionId || !response) throw new HttpsError('invalid-argument', 'Missing data.');
  const { rpID, origin } = rpFor(req);

  const challDoc = await db.doc('webauthnChallenges/' + sessionId).get();
  if (!challDoc.exists) throw new HttpsError('failed-precondition', 'Login session expired. Try again.');

  const credSnap = await db.collection('webauthnCredentials')
    .where('credentialId', '==', response.id).limit(1).get();
  if (credSnap.empty) throw new HttpsError('not-found', 'This fingerprint is not registered on any account.');

  const credDoc = credSnap.docs[0];
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challDoc.get('challenge'),
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credDoc.get('credentialId'),
      publicKey: Buffer.from(credDoc.get('publicKey'), 'base64'),
      counter: credDoc.get('counter') || 0,
    },
    requireUserVerification: UV_MODE,
  });
  if (!verification.verified) throw new HttpsError('failed-precondition', 'Fingerprint verification failed.');

  await credDoc.ref.update({ counter: verification.authenticationInfo.newCounter });
  const uid = credDoc.get('userId');
  const customToken = await admin.auth().createCustomToken(uid);
  await challDoc.ref.delete();

  const userSnap = await db.doc('users/' + uid).get();
  return { ok: true, customToken, role: userSnap.get('role') || 'patient' };
});
