import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppIcon } from '../components/Icon';
import { useTheme } from '../context/ThemeProvider';
import { safeBack } from '../navigation';
import { getPopularVideos, searchVideos, Video } from '../backend/youtube';

const RECENTS_KEY = 'serein.search.recent';
type RecentSearch = { query: string; thumbnail?: string };

export default function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    void SecureStore.getItemAsync(RECENTS_KEY).then((raw) => {
      if (raw) {
        const stored = JSON.parse(raw) as Array<string | RecentSearch>;
        setRecent(stored.map((item) => typeof item === 'string' ? { query: item } : item));
      }
    }).catch(() => {});
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const search = async (term = query) => {
    const value = term.trim();
    if (!value) return;
    setQuery(value);
    setSearched(true);
    setLoading(true);
    setError(false);
    Keyboard.dismiss();
    const nextRecent = [{ query: value, thumbnail: results[0]?.thumbnail }, ...recent.filter((item) => item.query.toLowerCase() !== value.toLowerCase())].slice(0, 12);
    setRecent(nextRecent);
    void SecureStore.setItemAsync(RECENTS_KEY, JSON.stringify(nextRecent)).catch(() => {});
    try {
      const found = await searchVideos(value);
      setResults(found);
      const withThumbnail = [{ query: value, thumbnail: found[0]?.thumbnail }, ...recent.filter((item) => item.query.toLowerCase() !== value.toLowerCase())].slice(0, 12);
      setRecent(withThumbnail);
      void SecureStore.setItemAsync(RECENTS_KEY, JSON.stringify(withThumbnail)).catch(() => {});
    }
    catch { setResults([]); setError(true); }
    finally { setLoading(false); }
  };

  const removeRecent = (item: string) => {
    const next = recent.filter((value) => value.query !== item);
    setRecent(next);
    void SecureStore.setItemAsync(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const refreshPage = async () => {
    if (query.trim()) { await search(query); return; }
    if (recent[0]) { await search(recent[0].query); return; }
    setLoading(true);
    setError(false);
    setSearched(true);
    try { setResults(await getPopularVideos()); }
    catch { setResults([]); setError(true); }
    finally { setLoading(false); }
  };

  return <View style={[s.screen, { backgroundColor: colors.background }]}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack('/(tabs)')} style={s.back}><AppIcon name="back" color={colors.text} size={22} /></Pressable>
      <View style={[s.inputWrap, { backgroundColor: colors.elevated }]}>
        <TextInput autoFocus accessibilityLabel="Search videos" placeholder="Search Serein" placeholderTextColor={colors.muted} value={query} onChangeText={(value) => { setQuery(value); setSearched(false); }} onSubmitEditing={() => void search()} returnKeyType="search" style={[s.input, { color: colors.text }]} />
        {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setQuery(''); setResults([]); setSearched(false); setError(false); }} hitSlop={10}><AppIcon name="close" color={colors.muted} size={18} /></Pressable>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={query ? 'Submit search' : 'Voice search'} onPress={() => query ? void search() : Alert.alert('Voice search', 'Tap the microphone on your keyboard to dictate a search.')} style={s.submit}><AppIcon name={query ? 'search' : 'mic'} color={colors.text} size={23} /></Pressable>
    </View>

    {!searched && <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refreshPage()} tintColor={colors.accent} />} contentContainerStyle={s.recentList}>
      {query.trim().length > 0 && <Pressable accessibilityRole="button" onPress={() => void search(query)} style={s.recentRow}>
        <AppIcon name="search" color={colors.text} size={22} /><Text numberOfLines={1} style={[s.recentText, { color: colors.text }]}>{query.trim()}</Text><View style={{ width: 82 }} /><AppIcon name="arrowUpLeft" color={colors.text} size={21} />
      </Pressable>}
      {recent.filter((item) => !query.trim() || item.query.toLowerCase().includes(query.trim().toLowerCase())).map((item) => <View key={item.query} style={s.recentRow}>
        <Pressable accessibilityRole="button" onPress={() => void search(item.query)} style={s.recentSearch}><AppIcon name={query.trim() ? 'search' : 'history'} color={colors.text} size={22} /><Text numberOfLines={1} style={[s.recentText, { color: colors.text }]}>{item.query}</Text></Pressable>
        {!!item.thumbnail && <Image source={{ uri: item.thumbnail }} style={s.recentThumb} resizeMode="cover" />}
        <Pressable accessibilityRole="button" accessibilityLabel={`Search ${item.query}`} onPress={() => { setQuery(item.query); void search(item.query); }} hitSlop={8} style={s.remove}><AppIcon name="arrowUpLeft" color={colors.text} size={21} /></Pressable>
      </View>)}
    </ScrollView>}

    {keyboardVisible && !searched && <Pressable accessibilityRole="button" accessibilityLabel="Voice search" onPress={() => Alert.alert('Voice search', 'Tap the microphone on your keyboard to dictate a search.')} style={[s.floatingMic, { backgroundColor: colors.background }]}><AppIcon name="mic" color={colors.text} size={26} /></Pressable>}

    {loading && <ActivityIndicator color={colors.accent} style={s.spinner} />}
    {error && !loading && <View style={s.state}><Text style={[s.stateText, { color: colors.muted }]}>Search couldn’t load. Try again.</Text><Pressable onPress={() => void search()}><Text style={[s.retry, { color: colors.accent }]}>Retry</Text></Pressable></View>}
    {searched && !loading && !error && results.length === 0 && <View style={s.state}><Text style={[s.stateText, { color: colors.text }]}>No videos found</Text></View>}
    {searched && !error && results.length > 0 && <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refreshPage()} tintColor={colors.accent} />} contentContainerStyle={s.results}>
      {results.map((video) => <Pressable key={video.id} accessibilityRole="button" accessibilityLabel={`Play ${video.title}`} onPress={() => router.push({ pathname: '/watch/[videoId]', params: { videoId: video.id, title: video.title, channel: video.channel } })} style={s.video}>
        <View style={[s.thumbnailWrap, { backgroundColor: colors.elevated }]}><Image source={{ uri: video.thumbnail }} style={s.thumbnail} resizeMode="cover" />{!!video.duration && <Text style={s.duration}>{video.duration}</Text>}</View>
        <View style={s.videoMeta}><Text numberOfLines={2} style={[s.title, { color: colors.text }]}>{video.title}</Text><Text numberOfLines={1} style={[s.detail, { color: colors.muted }]}>{video.channel} · {video.views} · {video.published}</Text></View>
      </Pressable>)}
    </ScrollView>}
    {searched && !loading && !error && results.length === 0 && <ScrollView keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refreshPage()} tintColor={colors.accent} />} contentContainerStyle={s.emptyRefresh}><Text style={[s.stateText, { color: colors.text }]}>No videos found</Text></ScrollView>}
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 70, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { width: 38, height: 48, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, height: 46, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  input: { flex: 1, paddingVertical: 0, fontSize: 16 },
  submit: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  recentList: { paddingTop: 4, paddingBottom: 30 },
  recentRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18 },
  recentSearch: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 18, minHeight: 70 },
  recentText: { flex: 1, fontSize: 15, fontWeight: '500' },
  recentThumb: { width: 82, height: 52, borderRadius: 9, backgroundColor: '#ddd' },
  remove: { width: 34, height: 50, alignItems: 'center', justifyContent: 'center' },
  floatingMic: { position: 'absolute', right: 20, bottom: 24, width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 7, shadowOffset: { width: 0, height: 2 } },
  spinner: { marginTop: 32 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  stateText: { fontSize: 14, textAlign: 'center' },
  retry: { fontSize: 13, fontWeight: '700' },
  results: { paddingTop: 8, paddingBottom: 20 },
  emptyRefresh: { flexGrow: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 24 },
  video: { marginBottom: 18 },
  thumbnailWrap: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  duration: { position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.82)', color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  videoMeta: { paddingHorizontal: 14, paddingTop: 9, gap: 4 },
  title: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  detail: { fontSize: 11 },
});
