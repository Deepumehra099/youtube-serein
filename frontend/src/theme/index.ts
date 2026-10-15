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
  background: '#101614', surface: '#171E1B', elevated: '#202925', text: '#F2F6F3',
  secondary: '#C4D0CA', muted: '#91A099', border: '#2A3731', accent: '#8CCDBA',
  accentSoft: '#203B33', accentText: '#10201A', chip: '#202925', chipText: '#DCE7E1',
  chipSelected: '#25483D', danger: '#FFAAA5', dangerSoft: '#382422',
  brandMark: '#17463D', onBrandMark: '#D4F2E7', overlay: 'rgba(5, 12, 10, 0.62)',
};

const light: ThemeColors = {
  background: '#F4F7F5', surface: '#FFFFFF', elevated: '#E9EFEC', text: '#19231F',
  secondary: '#4F5E57', muted: '#78877F', border: '#DCE5E0', accent: '#246D5F',
  accentSoft: '#E1F0EA', accentText: '#FFFFFF', chip: '#EAF0ED', chipText: '#34433C',
  chipSelected: '#DDECE6', danger: '#9B3E3A', dangerSoft: '#F7E9E5',
  brandMark: '#17463D', onBrandMark: '#D4F2E7', overlay: 'rgba(12, 22, 18, 0.55)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const;
export const type = { caption: 11, small: 12, body: 14, title: 18, heading: 23, display: 32 } as const;

export function colorsFor(mode: ThemeMode, system: 'light' | 'dark' | null): ThemeColors {
  return mode === 'system' ? (system === 'light' ? light : dark) : mode === 'light' ? light : dark;
}
