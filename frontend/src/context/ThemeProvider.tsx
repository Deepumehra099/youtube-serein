import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { colorsFor, ThemeColors, ThemeMode } from '../theme';

const THEME_KEY = 'serein.theme';
type ThemeContextValue = { mode: ThemeMode; resolved: 'light' | 'dark'; colors: ThemeColors; setMode: (mode: ThemeMode) => Promise<void> };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(THEME_KEY).then((saved) => {
      if (active && (saved === 'dark' || saved === 'light' || saved === 'system')) setModeState(saved);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const setMode = async (next: ThemeMode) => {
    setModeState(next);
    await SecureStore.setItemAsync(THEME_KEY, next);
  };
  const systemMode = system === 'light' ? 'light' : 'dark';
  const resolved: 'light' | 'dark' = mode === 'system' ? systemMode : mode;
  const colors = useMemo(() => colorsFor(mode, systemMode), [mode, systemMode]);
  const value = useMemo(() => ({ mode, resolved, colors, setMode }), [mode, resolved, colors]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider.');
  return value;
}
