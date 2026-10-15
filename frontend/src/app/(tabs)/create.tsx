import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../components/Icon';
import { BrandMark } from '../../components/BrandMark';
import { useTheme } from '../../context/ThemeProvider';

export default function CreateTab() {
  const { colors } = useTheme();
  return <ScrollView style={[s.screen, { backgroundColor: colors.background }]} contentContainerStyle={s.content}>
    <View style={s.heading}><Text style={[s.eyebrow, { color: colors.accent }]}>SEREIN STUDIO</Text><Text style={[s.title, { color: colors.text }]}>Create</Text><Text style={[s.subtitle, { color: colors.muted }]}>Share a video with your community.</Text></View>
    <Pressable accessibilityRole="button" onPress={() => router.push('/upload')} style={[s.upload, { backgroundColor: colors.surface }]}>
      <View style={[s.mark, { backgroundColor: colors.accentSoft }]}><BrandMark size={42} /></View><View style={s.copy}><Text style={[s.cardTitle, { color: colors.text }]}>Upload a video</Text><Text style={[s.cardBody, { color: colors.muted }]}>Choose a clip and publish it to Serein.</Text></View><AppIcon name="forward" color={colors.muted} size={20} />
    </Pressable>
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/(tabs)/library', params: { section: 'videos' } })} style={[s.secondaryAction, { borderColor: colors.border }]}><AppIcon name="library" color={colors.accent} size={20} /><Text style={[s.secondaryText, { color: colors.text }]}>Manage your videos</Text><AppIcon name="forward" color={colors.muted} size={18} /></Pressable>
    <Text style={[s.note, { color: colors.muted }]}>Your uploads stay in your library, where you can review their details.</Text>
  </ScrollView>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 32 },
  heading: { marginBottom: 25 }, eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, title: { marginTop: 8, fontSize: 30, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { marginTop: 5, fontSize: 13 },
  upload: { minHeight: 102, padding: 16, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 13 }, mark: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, cardTitle: { fontSize: 15, fontWeight: '700' }, cardBody: { marginTop: 5, fontSize: 11, lineHeight: 16 },
  secondaryAction: { minHeight: 53, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12 }, secondaryText: { flex: 1, fontSize: 13, fontWeight: '600' }, note: { marginTop: 14, maxWidth: 290, fontSize: 11, lineHeight: 17 },
});
