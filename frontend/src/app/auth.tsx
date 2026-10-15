import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppProvider';
import { useTheme } from '../context/ThemeProvider';
import { safeBack } from '../navigation';
import { BrandMark } from '../components/BrandMark';

export default function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, register } = useApp();
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    if (creating && (!username.trim() || !displayName.trim())) { setError('Enter a name and username to create your channel.'); return; }
    setBusy(true);
    try {
      if (creating) await register({ email: email.trim(), username: username.trim(), displayName: displayName.trim(), password });
      else await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not complete your request.');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={[s.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack('/(tabs)')} style={[s.back, { backgroundColor: colors.elevated }]}><Text style={{ color: colors.text, fontSize: 13 }}>Back</Text></Pressable>
        <View style={s.logo}><BrandMark size={58} /></View>
        <Text style={[s.title, { color: colors.text }]}>{creating ? 'Make space for good video.' : 'Welcome back.'}</Text>
        <Text style={[s.subtitle, { color: colors.muted }]}>{creating ? 'Create your Serein account and creator profile.' : 'Sign in to your Serein account.'}</Text>
        <View style={s.form}>
          {creating && <><Field label="Display name" value={displayName} onChangeText={setDisplayName} colors={colors} /><Field label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" colors={colors} /></>}
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" colors={colors} />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry colors={colors} />
        </View>
        {!!error && <Text accessibilityRole="alert" style={[s.error, { color: colors.danger }]}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={[s.submit, { backgroundColor: colors.accent, opacity: busy ? 0.7 : 1 }]}>
          {busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={[s.submitText, { color: colors.accentText }]}>{creating ? 'Create account' : 'Sign in'}</Text>}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setCreating(!creating); setError(''); }} style={s.toggle}>
          <Text style={{ color: colors.muted }}>{creating ? 'Already have an account? ' : 'New to Serein? '}<Text style={{ color: colors.accent, fontWeight: '800' }}>{creating ? 'Sign in' : 'Create account'}</Text></Text>
        </Pressable>
        <Text style={[s.terms, { color: colors.muted }]}>By continuing, you agree to use Serein responsibly and respect creators’ rights.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, colors, ...props }: { label: string; colors: ReturnType<typeof useTheme>['colors'] } & React.ComponentProps<typeof TextInput>) {
  return <View style={s.field}><Text style={[s.label, { color: colors.secondary }]}>{label}</Text><TextInput {...props} accessibilityLabel={label} placeholder={label} placeholderTextColor={colors.muted} style={[s.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 36, flexGrow: 1, justifyContent: 'center' },
  back: { minWidth: 54, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 10 },
  logo: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginTop: 35 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6, marginTop: 22 }, subtitle: { fontSize: 13, lineHeight: 20, marginTop: 7 }, form: { marginTop: 26, gap: 14 }, field: { gap: 7 }, label: { fontSize: 11, fontWeight: '700' }, input: { height: 49, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  error: { marginTop: 12, fontSize: 12, lineHeight: 18 }, submit: { height: 49, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 18 }, submitText: { fontSize: 14, fontWeight: '800' }, toggle: { marginTop: 18, alignItems: 'center', paddingVertical: 8 }, terms: { marginTop: 24, textAlign: 'center', fontSize: 10, lineHeight: 16 },
});
