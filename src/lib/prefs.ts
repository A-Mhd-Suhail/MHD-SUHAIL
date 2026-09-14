/* MHD Hospital — theme / font / preferences (light · dark · pink).
 * Persisted in localStorage with the same keys as the original app. */

export type ThemeName = 'light' | 'dark' | 'pink';
export type FontName = 'sm' | 'md' | 'lg';

const THEMES: readonly ThemeName[] = ['light', 'dark', 'pink'];

export const getTheme = (): ThemeName => {
  try {
    const stored = localStorage.getItem('mhd_theme') as ThemeName | null;
    return stored && THEMES.includes(stored) ? stored : 'dark';
  } catch {
    return 'dark';
  }
};

export function applyTheme(v: ThemeName) {
  document.documentElement.dataset.theme = v;
  try { localStorage.setItem('mhd_theme', v); } catch { /* ignore */ }
}

export const getFont = (): FontName => ((localStorage.getItem('mhd_font') as FontName) || 'md');

export function applyFont(v: FontName) {
  document.body.dataset.font = v;
  try { localStorage.setItem('mhd_font', v); } catch { /* ignore */ }
}

/** Apply stored prefs at startup (called from main.tsx). */
export function initPrefs() {
  applyTheme(getTheme());
  applyFont(getFont());
}
