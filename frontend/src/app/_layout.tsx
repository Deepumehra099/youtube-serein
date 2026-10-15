import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { AppProvider } from '../context/AppProvider';
import { ThemeProvider, useTheme } from '../context/ThemeProvider';

function AppStack() {
  const { colors, resolved } = useTheme();
  return (
    <>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="watch/[videoId]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="admin" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaView>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) return false;
      BackHandler.exitApp();
      return true;
    });
    return () => listener.remove();
  }, []);
  return <SafeAreaProvider><ThemeProvider><AppProvider><AppStack /></AppProvider></ThemeProvider></SafeAreaProvider>;
}
