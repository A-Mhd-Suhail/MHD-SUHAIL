/* Fingerprint (WebAuthn) login helpers — talks to the Cloud Functions in /functions. */
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebase';

const fns = getFunctions(getApp());

/** Call while logged in (Settings → Security). Registers this device's fingerprint. */
export async function enableFingerprint(): Promise<void> {
  const options = await httpsCallable(fns, 'webauthnRegisterOptions')({}).then((r) => r.data as any);
  const attResp = await startRegistration({ optionsJSON: options });
  await httpsCallable(fns, 'webauthnRegisterVerify')(attResp);
}

/** Call from the sign-in screen. Verifies the fingerprint and signs the user in. Returns their role. */
export async function loginWithFingerprint(): Promise<string> {
  const data = await httpsCallable(fns, 'webauthnLoginOptions')({}).then((r) => r.data as any);
  const authResp = await startAuthentication({ optionsJSON: data.options });
  const res = await httpsCallable(fns, 'webauthnLoginVerify')({ sessionId: data.sessionId, response: authResp })
    .then((r) => r.data as any);
  await signInWithCustomToken(auth, res.customToken);
  return res.role as string;
}
