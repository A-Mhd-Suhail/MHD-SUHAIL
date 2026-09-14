import { useEffect, useState, useSyncExternalStore } from 'react';
import { LANGS, curLang, setLanguage, LANG_EVENT } from '../lib/i18n';
import { applyTheme, getTheme, type ThemeName } from '../lib/prefs';
import { toast } from './Toaster';

/* Language + theme selects (top bar / auth / settings) — same options as the
 * original app: 10 languages, light/dark/pink themes. */

let version = 0;
const listeners = new Set<() => void>();
window.addEventListener(LANG_EVENT, () => { version++; listeners.forEach((l) => l()); });

function useLangVersion() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => version,
  );
}

export function LangSelect({ className = '' }: { className?: string }) {
  const langVersion = useLangVersion();
  const [activeLang, setActiveLang] = useState(curLang());
  useEffect(() => { setActiveLang(curLang()); }, [langVersion]);
  return (
    <select
      title="Language"
      value={activeLang}
      onChange={(e) => { const next = e.target.value; setActiveLang(next); setLanguage(next); window.location.reload(); }}
      onClick={(e) => { try { (e.currentTarget as HTMLSelectElement).showPicker(); } catch { /* native behaviour */ } }}
      className={className || 'h-[36px] border border-line rounded-[4px] bg-surface text-ink text-[12px] px-2 focus:outline-none focus:border-primary transition-colors [&>option]:bg-white [&>option]:text-[#0f172a]'}
    >
      {LANGS.map(([v, n], i) => <option key={`${v}-${i}`} value={v}>{n}</option>)}
    </select>
  );
}

export function ThemeSelect({ className = '', insidePortal = false }: { className?: string; insidePortal?: boolean }) {
  const [activeTheme, setActiveTheme] = useState<ThemeName>(getTheme());
  const selectedValue = insidePortal ? activeTheme : activeTheme === 'dark' ? 'dark' : 'light';
  return (
    <select
      title="Theme"
      value={selectedValue}
      onChange={(e) => { const next = e.target.value as ThemeName; setActiveTheme(next); applyTheme(next); toast('Theme changed'); }}
      onClick={(e) => { try { (e.currentTarget as HTMLSelectElement).showPicker(); } catch { /* native behaviour */ } }}
      className={className || 'h-[36px] border border-line rounded-[4px] bg-surface text-ink text-[12px] px-2 focus:outline-none focus:border-primary transition-colors [&>option]:bg-white [&>option]:text-[#0f172a]'}
    >
      <option value="light">White Mode</option>
      <option value="dark">Dark Mode</option>
      {insidePortal && <option value="pink">Pink Mode</option>}
    </select>
  );
}
