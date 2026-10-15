import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../components/Icon';
import { useTheme } from '../context/ThemeProvider';
import { safeBack } from '../navigation';
import { searchVideos, Video } from '../backend/youtube';

const RECENTS_KEY = 'serein.search.recent';

export default function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync(RECENTS_KEY).then((raw) => {
      if (raw) setRecent(JSON.parse(raw) as string[]);
    }).catch(() => {});
  }, []);

  const search = async (term = query) => {
    const value = term.trim();
    if (!value) return;
    setQuery(value);
    setSearched(true);
    setLoading(true);
    setError(false);
    Keyboard.dismiss();
    const nextRecent = [value, ...recent.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
    setRecent(nextRecent);
    void SecureStore.setItemAsync(RECENTS_KEY, JSON.stringify(nextRecent)).catch(() => {});
    try { setResults(await searchVideos(value)); }
    catch { setResults([]); setError(true); }
    finally { setLoading(false); }
  };

  const removeRecent = (item: string) => {
    const next = recent.filter((value) => value !== item);
    setRecent(next);
    void SecureStore.setItemAsync(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
  };

  return <View style={[s.screen, { backgroundColor: colors.background }]}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack('/(tabs)')} style={s.back}><AppIcon name="back" color={colors.text} size={22} /></Pressable>
      <View style={[s.inputWrap, { backgroundColor: colors.elevated }]}>
        <AppIcon name="search" color={colors.muted} size={18} />
        <TextInput autoFocus accessibilityLabel="Search videos" placeholder="Search videos" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} returnKeyType="search" style={[s.input, { color: colors.text }]} />
        {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setQuery(''); setResults([]); setSearched(false); setError(false); }} hitSlop={10}><AppIcon name="close" color={colors.muted} size={18} /></Pressable>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Submit search" onPress={() => void search()} style={s.submit}><AppIcon name="search" color={colors.accent} size={21} /></Pressable>
    </View>

    {!searched && recent.length > 0 && <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.recentList}>
      {recent.map((item) => <View key={item} style={s.recentRow}>
        <Pressable accessibilityRole="button" onPress={() => void search(item)} style={s.recentSearch}><AppIcon name="history" color={colors.muted} size={18} /><Text numberOfLines={1} style={[s.recentText, { color: colors.text }]}>{item}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item} from recent searches`} onPress={() => removeRecent(item)} hitSlop={10} style={s.remove}><AppIcon name="close" color={colors.muted} size={16} /></Pressable>
      </View>)}
    </ScrollView>}

    {loading && <ActivityIndicator color={colors.accent} style={s.spinner} />}
    {error && !loading && <View style={s.state}><Text style={[s.stateText, { color: colors.muted }]}>Search couldn’t load. Try again.</Text><Pressable onPress={() => void search()}><Text style={[s.retry, { color: colors.accent }]}>Retry</Text></Pressable></View>}
    {searched && !loading && !error && results.length === 0 && <View style={s.state}><Text style={[s.stateText, { color: colors.text }]}>No videos found</Text></View>}
    {searched && !loading && !error && results.length > 0 && <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.results}>
      {results.map((video) => <Pressable key={video.id} accessibilityRole="button" accessibilityLabel={`Play ${video.title}`} onPress={() => router.push({ pathname: '/watch/[videoId]', params: { videoId: video.id, title: video.title, channel: video.channel } })} style={s.video}>
        <View style={[s.thumbnailWrap, { backgroundColor: colors.elevated }]}><Image source={{ uri: video.thumbnail }} style={s.thumbnail} resizeMode="cover" />{!!video.duration && <Text style={s.duration}>{video.duration}</Text>}</View>
        <View style={s.videoMeta}><Text numberOfLines={2} style={[s.title, { color: colors.text }]}>{video.title}</Text><Text numberOfLines={1} style={[s.detail, { color: colors.muted }]}>{video.channel} · {video.views} · {video.published}</Text></View>
      </Pressable>)}
    </ScrollView>}
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 58, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, height: 40, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 0, fontSize: 14 },
  submit: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  recentList: { paddingTop: 4, paddingHorizontal: 18 },
  recentRow: { minHeight: 45, flexDirection: 'row', alignItems: 'center' },
  recentSearch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 45 },
  recentText: { flex: 1, fontSize: 13 },
  remove: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  spinner: { marginTop: 32 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  stateText: { fontSize: 14, textAlign: 'center' },
  retry: { fontSize: 13, fontWeight: '700' },
  results: { paddingTop: 8, paddingBottom: 20 },
  video: { marginBottom: 18 },
  thumbnailWrap: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  duration: { position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.82)', color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  videoMeta: { paddingHorizontal: 14, paddingTop: 9, gap: 4 },
  title: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  detail: { fontSize: 11 },
});
