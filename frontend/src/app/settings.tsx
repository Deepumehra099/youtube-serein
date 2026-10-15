import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useApp } from '../context/AppProvider';
import { useTheme } from '../context/ThemeProvider';
import { AppIcon } from '../components/Icon';
import { ThemeMode } from '../theme';
import { safeBack } from '../navigation';

export default function SettingsScreen() {
  const { mode, setMode, colors } = useTheme();
  const { user } = useApp();
  const [notifications, setNotifications] = useState(true);
  return <ScrollView style={[s.screen, { backgroundColor: colors.background }]} contentContainerStyle={s.content}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack('/profile')} style={s.back}><AppIcon name="back" color={colors.text} size={22} /></Pressable><Text style={[s.title, { color: colors.text }]}>Settings</Text></View>
    <Text style={[s.section, { color: colors.muted }]}>APPEARANCE</Text>
    <View style={[s.appearance, { backgroundColor: colors.surface }]}><Text style={[s.rowTitle, { color: colors.text }]}>Theme</Text><Text style={[s.rowDetail, { color: colors.muted }]}>Choose how Serein looks on this device.</Text><View style={[s.modeRow, { backgroundColor: colors.elevated }]}>{(['light', 'dark', 'system'] as ThemeMode[]).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: mode === option }} onPress={() => void setMode(option)} style={[s.mode, mode === option && { backgroundColor: colors.surface }]}><Text style={{ color: mode === option ? colors.accent : colors.secondary, fontSize: 11, fontWeight: mode === option ? '700' : '500', textTransform: 'capitalize' }}>{option}</Text></Pressable>)}</View></View>
    <Text style={[s.section, { color: colors.muted }]}>PREFERENCES</Text>
    <View style={[s.row, { borderBottomColor: colors.border }]}><View style={[s.iconBox, { backgroundColor: colors.accentSoft }]}><AppIcon name="notifications" color={colors.accent} size={19} /></View><View style={s.copy}><Text style={[s.rowTitle, { color: colors.text }]}>Notifications</Text><Text style={[s.rowDetail, { color: colors.muted }]}>Activity from channels and comments</Text></View><Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.surface} /></View>
    <Pressable onPress={() => router.push('/(tabs)/library')} style={[s.row, { borderBottomColor: colors.border }]}><View style={[s.iconBox, { backgroundColor: colors.accentSoft }]}><AppIcon name="history" color={colors.accent} size={19} /></View><View style={s.copy}><Text style={[s.rowTitle, { color: colors.text }]}>History and cache</Text><Text style={[s.rowDetail, { color: colors.muted }]}>Review your watched videos</Text></View><AppIcon name="forward" color={colors.muted} size={18} /></Pressable>
    <Pressable onPress={() => router.push('/feedback')} style={[s.row, { borderBottomColor: colors.border }]}><View style={[s.iconBox, { backgroundColor: colors.accentSoft }]}><AppIcon name="comment" color={colors.accent} size={19} /></View><View style={s.copy}><Text style={[s.rowTitle, { color: colors.text }]}>Help and feedback</Text><Text style={[s.rowDetail, { color: colors.muted }]}>Contact the Serein team</Text></View><AppIcon name="forward" color={colors.muted} size={18} /></Pressable>
    {user?.role === 'admin' && <Pressable onPress={() => router.push('/admin')} style={[s.row, { borderBottomColor: colors.border }]}><View style={[s.iconBox, { backgroundColor: colors.accentSoft }]}><AppIcon name="profile" color={colors.accent} size={19} /></View><View style={s.copy}><Text style={[s.rowTitle, { color: colors.text }]}>Admin panel</Text><Text style={[s.rowDetail, { color: colors.muted }]}>Manage reports, creators, and videos</Text></View><AppIcon name="forward" color={colors.muted} size={18} /></Pressable>}
    <Text style={[s.footer, { color: colors.muted }]}>SEREIN · VIDEO, AT YOUR PACE</Text>
  </ScrollView>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 30 }, header: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 17 }, back: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 24, fontWeight: '800' },
  section: { marginTop: 16, marginBottom: 9, fontSize: 10, fontWeight: '700', letterSpacing: 1 }, appearance: { padding: 15, borderRadius: 15 }, rowTitle: { fontSize: 13, fontWeight: '600' }, rowDetail: { marginTop: 4, fontSize: 10, lineHeight: 15 }, modeRow: { marginTop: 14, padding: 3, borderRadius: 11, flexDirection: 'row' }, mode: { flex: 1, minHeight: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 69, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth }, iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, footer: { marginTop: 27, textAlign: 'center', fontSize: 9, letterSpacing: 1 },
});
