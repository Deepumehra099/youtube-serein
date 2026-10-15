export type ThemeMode = 'dark' | 'light' | 'system';

export type ThemeColors = {
  background: string;
  surface: string;
  elevated: string;
  text: string;
  secondary: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  chip: string;
  chipText: string;
  chipSelected: string;
  danger: string;
  dangerSoft: string;
  brandMark: string;
  onBrandMark: string;
  overlay: string;
};

const dark: ThemeColors = {
  background: '#0F0F0F', surface: '#181818', elevated: '#272727', text: '#F1F1F1',
  secondary: '#D0D0D0', muted: '#AAAAAA', border: '#303030', accent: '#FF7A00',
  accentSoft: '#48240D', accentText: '#211004', chip: '#272727', chipText: '#E6E6E6',
  chipSelected: '#65330F', danger: '#FFAAA5', dangerSoft: '#382422',
  brandMark: '#FF6A00', onBrandMark: '#FFF4E8', overlay: 'rgba(0, 0, 0, 0.62)',
};

const light: ThemeColors = {
  background: '#FFFFFF', surface: '#FFFFFF', elevated: '#F2F2F2', text: '#0F0F0F',
  secondary: '#606060', muted: '#767676', border: '#E5E5E5', accent: '#C94F00',
  accentSoft: '#FFE2C8', accentText: '#241105', chip: '#F2F2F2', chipText: '#3F3F3F',
  chipSelected: '#FFD1AB', danger: '#9B3E3A', dangerSoft: '#F7E9E5',
  brandMark: '#FF6A00', onBrandMark: '#FFFFFF', overlay: 'rgba(0, 0, 0, 0.55)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const;
export const type = { caption: 11, small: 12, body: 14, title: 18, heading: 23, display: 32 } as const;

export function colorsFor(mode: ThemeMode, system: 'light' | 'dark' | null): ThemeColors {
  return mode === 'system' ? (system === 'light' ? light : dark) : mode === 'light' ? light : dark;
}
