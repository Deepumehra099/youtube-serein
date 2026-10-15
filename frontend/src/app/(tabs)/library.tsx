import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../context/AppProvider';
import { useTheme } from '../../context/ThemeProvider';
import { fetchMyLibrary, PlatformVideo } from '../../services/api';
import { AppIcon } from '../../components/Icon';

type Section = 'history' | 'saved' | 'liked' | 'videos';
const sections: { id: Section; title: string; note: string }[] = [
  { id: 'history', title: 'History', note: 'Videos you watched' },
  { id: 'saved', title: 'Watch later', note: 'Videos saved for later' },
  { id: 'liked', title: 'Liked videos', note: 'Videos you liked' },
  { id: 'videos', title: 'Your videos', note: 'Videos you uploaded' },
];

export default function LibraryScreen() {
  const { colors } = useTheme();
  const { token, user, ready } = useApp();
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<Section>('history');
  const [videos, setVideos] = useState<PlatformVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (sections.some((item) => item.id === params.section)) setSection(params.section as Section); }, [params.section]);
  const load = useCallback(async () => {
    if (!token) { setVideos([]); return; }
    setLoading(true); setError('');
    try { setVideos(await fetchMyLibrary(token, section)); }
    catch { setError('Your library couldn’t load. Check your connection and retry.'); }
    finally { setLoading(false); }
  }, [token, section]);
  useEffect(() => { void load(); }, [load]);

  if (!ready) return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.accent} /></View>;
  const activeSection = sections.find((item) => item.id === section)!;
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={s.content}>
    <View style={s.heading}><View><Text style={[s.title, { color: colors.text }]}>Library</Text><Text style={[s.subtitle, { color: colors.muted }]}>Your history, saves, and uploads.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/profile')} style={[s.avatar, { backgroundColor: colors.accentSoft }]}><Text style={[s.avatarText, { color: colors.accent }]}>{user?.displayName.slice(0, 1).toUpperCase() ?? 'S'}</Text></Pressable></View>
    <View style={s.sectionGrid}>{sections.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: section === item.id }} onPress={() => setSection(item.id)} style={[s.sectionButton, { backgroundColor: section === item.id ? colors.accentSoft : colors.surface }]}><Text numberOfLines={1} adjustsFontSizeToFit style={[s.sectionLabel, { color: section === item.id ? colors.accent : colors.secondary }]}>{item.title}</Text></Pressable>)}</View>
    {!user && <View style={s.signIn}><Text style={[s.signTitle, { color: colors.text }]}>Make this space yours</Text><Text style={[s.message, { color: colors.muted }]}>Sign in to sync your {activeSection.title.toLowerCase()} across devices.</Text><Pressable onPress={() => router.push('/auth')} style={[s.signButton, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentText, fontSize: 12, fontWeight: '700' }}>Sign in</Text></Pressable></View>}
    {!!error && <View style={s.state}><Text style={[s.message, { color: colors.danger }]}>{error}</Text><Pressable onPress={() => void load()}><Text style={[s.retry, { color: colors.accent }]}>Retry</Text></Pressable></View>}
    {user && loading && <ActivityIndicator style={{ marginTop: 24 }} color={colors.accent} />}
    {user && !loading && !error && videos.length === 0 && <View style={s.state}><View style={[s.stateIcon, { backgroundColor: colors.accentSoft }]}><AppIcon name={section === 'history' ? 'history' : 'library'} color={colors.accent} size={21} /></View><Text style={[s.signTitle, { color: colors.text }]}>{section === 'history' ? 'Your watch history starts here' : `No ${activeSection.title.toLowerCase()} yet`}</Text><Text style={[s.message, { color: colors.muted }]}>{activeSection.note} will show up here when you have some.</Text><Pressable onPress={() => router.push('/(tabs)')} style={s.discover}><Text style={[s.retry, { color: colors.accent }]}>Explore videos</Text></Pressable></View>}
    {user && !loading && videos.map((video) => <Pressable key={video.id} onPress={() => router.push({ pathname: '/watch/[videoId]', params: { videoId: video.id, title: video.title, channel: video.channel.displayName, source: 'platform' } })} style={[s.video, { borderBottomColor: colors.border }]}><View style={[s.poster, { backgroundColor: colors.elevated }]}><AppIcon name="play" color={colors.accent} size={22} /><Text style={s.posterLabel}>{video.category}</Text></View><View style={s.videoCopy}><Text numberOfLines={2} style={[s.videoTitle, { color: colors.text }]}>{video.title}</Text><Text numberOfLines={1} style={[s.note, { color: colors.muted }]}>{video.channel.displayName} · {video.views} views</Text></View><AppIcon name="forward" color={colors.muted} size={18} /></Pressable>)}
    <Pressable onPress={() => router.push('/feedback')} style={[s.help, { borderTopColor: colors.border }]}><Text style={[s.note, { color: colors.muted }]}>Need help with your library?</Text><AppIcon name="forward" color={colors.muted} size={18} /></Pressable>
  </ScrollView>;
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 28 }, center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }, subtitle: { marginTop: 4, fontSize: 12 }, avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 14, fontWeight: '800' },
  sectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }, sectionButton: { minHeight: 34, paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center', flexGrow: 1, flexBasis: '22%' }, sectionLabel: { textAlign: 'center', fontSize: 10, fontWeight: '600' },
  signIn: { paddingVertical: 25, paddingHorizontal: 8, alignItems: 'flex-start' }, signTitle: { fontSize: 16, fontWeight: '700' }, message: { marginTop: 6, fontSize: 12, lineHeight: 18 }, signButton: { marginTop: 15, minHeight: 38, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  state: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 22 }, stateIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, retry: { fontSize: 12, fontWeight: '700' }, discover: { paddingVertical: 12 },
  video: { minHeight: 93, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 11 }, poster: { width: 104, aspectRatio: 16 / 9, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, posterLabel: { position: 'absolute', left: 6, bottom: 4, color: '#FFFFFF', fontSize: 8, fontWeight: '700' }, videoCopy: { flex: 1 }, videoTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700' }, note: { marginTop: 4, fontSize: 10 }, help: { marginTop: 22, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
