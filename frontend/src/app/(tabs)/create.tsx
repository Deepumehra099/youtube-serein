import { router } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/Icon';
import { BrandMark } from '../../components/BrandMark';
import { ThemeColors } from '../../theme';
import { useTheme } from '../../context/ThemeProvider';
import { useApp } from '../../context/AppProvider';

export default function CreateTab() {
  const { colors, resolved } = useTheme();
  const { user } = useApp();
  if (!user) return <View style={[s.screen, { backgroundColor: colors.background }]}><CreateHeader colors={colors} resolved={resolved} /><View style={s.signInScreen}>
    <View style={[s.mark, { backgroundColor: colors.accentSoft }]}><BrandMark size={42} /></View>
    <Text style={[s.title, { color: colors.text }]}>Sign in to create</Text>
    <Text style={[s.subtitle, { color: colors.muted }]}>Sign in to upload videos and manage your posts.</Text>
    <Pressable accessibilityRole="button" onPress={() => router.push('/auth')} style={[s.signInButton, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentText, fontSize: 14, fontWeight: '700' }}>Sign in</Text></Pressable>
  </View></View>;
  return <View style={[s.screen, { backgroundColor: colors.background }]}><CreateHeader colors={colors} resolved={resolved} /><ScrollView style={s.createScroll} contentContainerStyle={s.content}>
    <View style={s.heading}><Text style={[s.eyebrow, { color: colors.accent }]}>SEREIN STUDIO</Text><Text style={[s.title, { color: colors.text }]}>Create</Text><Text style={[s.subtitle, { color: colors.muted }]}>Share a video with your community.</Text></View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/upload')} style={[s.upload, { backgroundColor: colors.surface }]}>
      <View style={[s.mark, { backgroundColor: colors.accentSoft }]}><BrandMark size={42} /></View><View style={s.copy}><Text style={[s.cardTitle, { color: colors.text }]}>Upload a video</Text><Text style={[s.cardBody, { color: colors.muted }]}>Choose a clip and publish it to Serein.</Text></View><AppIcon name="forward" color={colors.muted} size={20} />
    </Pressable>
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(tabs)/library', params: { section: 'videos' } })} style={[s.secondaryAction, { borderColor: colors.border }]}><AppIcon name="library" color={colors.accent} size={20} /><Text style={[s.secondaryText, { color: colors.text }]}>Manage your videos</Text><AppIcon name="forward" color={colors.muted} size={18} /></Pressable>
    <Text style={[s.note, { color: colors.muted }]}>Your uploads stay in your library, where you can review their details.</Text>
  </ScrollView></View>;
}

function CreateHeader({ colors, resolved }: { colors: ThemeColors; resolved: 'light' | 'dark' }) {
  return <View style={s.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="Serein home" onPress={() => router.replace('/(tabs)')} style={s.brand}><Image source={resolved === 'dark' ? require('../../../assets/header-icons/logo.png') : require('../../../assets/header-icons/logo-original-black.png')} style={s.headerLogo} resizeMode="contain" /></Pressable>
    <View style={s.headerActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cast to device" onPress={() => Alert.alert('Cast to device', 'No devices are available right now.')} style={s.headerButton}><Image source={require('../../../assets/header-icons/cast.png')} style={[s.headerActionIcon, { tintColor: colors.text }]} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={() => router.push('/search')} style={s.headerButton}><Image source={require('../../../assets/header-icons/search.png')} style={[s.headerActionIcon, { tintColor: colors.text }]} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} style={s.headerButton}><Image source={require('../../../assets/header-icons/notifications.png')} style={[s.headerActionIcon, { tintColor: colors.text }]} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.push('/profile')} style={s.headerButton}><Image source={require('../../../assets/header-icons/profile.png')} style={[s.headerActionIcon, { tintColor: colors.text }]} /></Pressable>
    </View>
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, headerLogo: { width: 120, height: 42 }, headerActions: { flexDirection: 'row', alignItems: 'center', gap: 2 }, headerButton: { width: 30, height: 40, alignItems: 'center', justifyContent: 'center' }, headerActionIcon: { width: 21, height: 21, resizeMode: 'contain' }, createScroll: { flex: 1 }, signInScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }, signInButton: { minHeight: 44, minWidth: 126, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 22, paddingHorizontal: 24 }, content: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 32 },
  heading: { marginBottom: 25 }, eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, title: { marginTop: 8, fontSize: 30, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { marginTop: 5, fontSize: 13 },
  upload: { minHeight: 102, padding: 16, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 13 }, mark: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, cardTitle: { fontSize: 15, fontWeight: '700' }, cardBody: { marginTop: 5, fontSize: 11, lineHeight: 16 },
  secondaryAction: { minHeight: 53, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 }, secondaryText: { flex: 1, fontSize: 13, fontWeight: '600' }, note: { marginTop: 14, maxWidth: 290, fontSize: 11, lineHeight: 17 },
});
