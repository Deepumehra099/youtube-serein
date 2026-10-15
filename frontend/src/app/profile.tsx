import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppProvider';
import { useTheme } from '../context/ThemeProvider';
import { BrandMark } from '../components/BrandMark';
import { AppIcon } from '../components/Icon';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, signOut } = useApp();
  const signOutNow = () => Alert.alert('Sign out?', 'Your saved videos will stay in your account.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => void signOut() }]);
  return <ScrollView style={[s.screen, { backgroundColor: colors.background }]} contentContainerStyle={s.content}>
    <View style={s.header}><Text style={[s.title, { color: colors.text }]}>Profile</Text><Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={s.headerAction}><AppIcon name="settings" color={colors.secondary} size={21} /></Pressable></View>
    <View style={s.identity}><View style={[s.avatar, { backgroundColor: colors.accentSoft }]}>{user ? <Text style={[s.avatarText, { color: colors.accent }]}>{user.displayName.slice(0, 1).toUpperCase()}</Text> : <BrandMark size={54} />}</View><Text style={[s.name, { color: colors.text }]}>{user?.displayName ?? 'Welcome to Serein'}</Text><Text style={[s.handle, { color: colors.muted }]}>{user ? `@${user.username}` : 'A quieter place for good video'}</Text>{!user && <Pressable onPress={() => router.push('/auth')} style={[s.primary, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentText, fontSize: 12, fontWeight: '700' }}>Sign in</Text></Pressable>}</View>
    {user && <View style={[s.creatorInfo, { backgroundColor: colors.surface }]}><Text style={[s.creatorTitle, { color: colors.text }]}>Your creator space</Text><Text style={[s.copy, { color: colors.muted }]}>Manage your channel and find the videos you’ve shared.</Text><Pressable onPress={() => router.push({ pathname: '/(tabs)/library', params: { section: 'videos' } })} style={s.linkRow}><Text style={[s.link, { color: colors.accent }]}>View your videos</Text><AppIcon name="forward" color={colors.accent} size={18} /></Pressable></View>}
    <Text style={[s.sectionTitle, { color: colors.muted }]}>ACCOUNT</Text>
    <ActionRow icon="library" title="Your library" detail="History, saved videos, and likes" onPress={() => router.push('/(tabs)/library')} colors={colors} />
    <ActionRow icon="settings" title="Settings" detail="Appearance and preferences" onPress={() => router.push('/settings')} colors={colors} />
    <ActionRow icon="comment" title="Help and feedback" detail="Get help or send a note" onPress={() => router.push('/feedback')} colors={colors} />
    {user && <Pressable onPress={signOutNow} style={s.signOut}><Text style={[s.link, { color: colors.danger }]}>Sign out</Text></Pressable>}
  </ScrollView>;
}

function ActionRow({ icon, title, detail, onPress, colors }: { icon: 'library' | 'settings' | 'comment'; title: string; detail: string; onPress: () => void; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <Pressable onPress={onPress} style={[s.row, { borderBottomColor: colors.border }]}><AppIcon name={icon} color={colors.secondary} size={20} /><View style={s.rowCopy}><Text style={[s.rowTitle, { color: colors.text }]}>{title}</Text><Text style={[s.copy, { color: colors.muted }]}>{detail}</Text></View><AppIcon name="forward" color={colors.muted} size={18} /></Pressable>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 25, fontWeight: '800', letterSpacing: -0.5 }, headerAction: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', paddingTop: 28, paddingBottom: 25 }, avatar: { width: 76, height: 76, borderRadius: 27, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 30, fontWeight: '700' }, name: { marginTop: 13, fontSize: 19, fontWeight: '700' }, handle: { marginTop: 4, fontSize: 12 }, primary: { marginTop: 15, minHeight: 38, paddingHorizontal: 17, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  creatorInfo: { borderRadius: 15, padding: 16, marginBottom: 24 }, creatorTitle: { fontSize: 14, fontWeight: '700' }, copy: { marginTop: 4, fontSize: 11, lineHeight: 16 }, linkRow: { marginTop: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, link: { fontSize: 12, fontWeight: '700' }, sectionTitle: { marginBottom: 5, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  row: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: StyleSheet.hairlineWidth }, rowCopy: { flex: 1 }, rowTitle: { fontSize: 13, fontWeight: '600' }, signOut: { marginTop: 26, paddingVertical: 12 },
});
