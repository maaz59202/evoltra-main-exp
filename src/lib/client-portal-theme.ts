import type { CSSProperties } from 'react';

export const CLIENT_PORTAL_PALETTES = {
  violet: {
    label: 'Violet',
    accent: '#7c3aed',
    accentStrong: '#5b21b6',
    accentSoft: 'rgba(124, 58, 237, 0.14)',
    accentBorder: 'rgba(124, 58, 237, 0.28)',
    accentForeground: '#ffffff',
  },
  ocean: {
    label: 'Ocean',
    accent: '#0f766e',
    accentStrong: '#115e59',
    accentSoft: 'rgba(15, 118, 110, 0.14)',
    accentBorder: 'rgba(15, 118, 110, 0.28)',
    accentForeground: '#ffffff',
  },
  amber: {
    label: 'Amber',
    accent: '#d97706',
    accentStrong: '#b45309',
    accentSoft: 'rgba(217, 119, 6, 0.16)',
    accentBorder: 'rgba(217, 119, 6, 0.28)',
    accentForeground: '#ffffff',
  },
  slate: {
    label: 'Slate',
    accent: '#334155',
    accentStrong: '#1e293b',
    accentSoft: 'rgba(51, 65, 85, 0.16)',
    accentBorder: 'rgba(51, 65, 85, 0.3)',
    accentForeground: '#ffffff',
  },
} as const;

export type ClientPortalPaletteKey = keyof typeof CLIENT_PORTAL_PALETTES;

const CLIENT_PORTAL_PALETTE_STORAGE_KEY = 'evoltra_client_portal_palette';
const CLIENT_PORTAL_THEME_STORAGE_KEY = 'theme';

export type ClientPortalTheme = 'light' | 'dark';

export const getStoredClientPortalPalette = (): ClientPortalPaletteKey => {
  if (typeof window === 'undefined') return 'violet';

  try {
    const stored = window.localStorage.getItem(CLIENT_PORTAL_PALETTE_STORAGE_KEY);
    if (stored && stored in CLIENT_PORTAL_PALETTES) {
      return stored as ClientPortalPaletteKey;
    }
  } catch {
    // Ignore storage issues.
  }

  return 'violet';
};

export const setStoredClientPortalPalette = (palette: ClientPortalPaletteKey) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(CLIENT_PORTAL_PALETTE_STORAGE_KEY, palette);
  } catch {
    // Ignore storage issues.
  }
};

export const getStoredClientPortalTheme = (): ClientPortalTheme => {
  if (typeof window === 'undefined') return 'dark';

  try {
    return window.localStorage.getItem(CLIENT_PORTAL_THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
};

export const applyClientPortalTheme = (theme: ClientPortalTheme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

export const setStoredClientPortalTheme = (theme: ClientPortalTheme) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(CLIENT_PORTAL_THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage issues.
  }

  applyClientPortalTheme(theme);
};

export const getClientPortalPaletteTheme = (palette: ClientPortalPaletteKey) => {
  const selected = CLIENT_PORTAL_PALETTES[palette] || CLIENT_PORTAL_PALETTES.violet;

  return {
    '--client-accent': selected.accent,
    '--client-accent-strong': selected.accentStrong,
    '--client-accent-soft': selected.accentSoft,
    '--client-accent-border': selected.accentBorder,
    '--client-accent-foreground': selected.accentForeground,
  } as CSSProperties;
};
