import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, LayoutAnimation, Pressable, RefreshControl, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../../context/ThemeProvider';
import { demoVideos, getPopularVideos, hasYouTubeApiKey, searchVideos, Video } from '../../backend/youtube';
import { AppIcon } from '../../components/Icon';
import { BrandMark } from '../../components/BrandMark';
import { useApp } from '../../context/AppProvider';

const RECENTS_KEY = 'serein.search.recent';
const topics = ['All', 'Music', 'Gaming', 'Tech', 'Learning', 'News', 'Sports'];

export default function HomeFeedScreen() {
  const { colors, resolved } = useTheme();
  const { user } = useApp();
  const [videos, setVideos] = useState<Video[]>([]);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const input = useRef<TextInput>(null);

  const loadFeed = useCallback(async () => {
    setError('');
    if (!hasYouTubeApiKey) { setVideos(demoVideos); setLoading(false); return; }
    setLoading(true);
    try { setVideos(await getPopularVideos()); }
    catch { setError('We couldn’t refresh the video feed. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadFeed();
    void SecureStore.getItemAsync(RECENTS_KEY).then((raw) => { if (raw) setRecent(JSON.parse(raw) as string[]); }).catch(() => {});
  }, [loadFeed]);

  const visible = useMemo(() => videos.filter((video) => {
    if (query.trim() && !`${video.title} ${video.channel}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (topic === 'All') return true;
    return `${video.title} ${video.channel}`.toLowerCase().includes(topic.toLowerCase());
  }), [videos, query, topic]);

  const doSearch = async (term = query.trim()) => {
    if (!term) return;
    setQuery(term); setSearchFocused(false); Keyboard.dismiss(); setError(''); setLoading(true);
    const nextRecent = [term, ...recent.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    setRecent(nextRecent);
    void SecureStore.setItemAsync(RECENTS_KEY, JSON.stringify(nextRecent)).catch(() => {});
    if (!hasYouTubeApiKey) {
      setVideos(demoVideos.filter((video) => `${video.title} ${video.channel}`.toLowerCase().includes(term.toLowerCase())));
      setTopic('All'); setLoading(false); return;
    }
    try { setVideos(await searchVideos(term)); setTopic('All'); }
    catch { setError('Search couldn’t finish. Please try again.'); }
    finally { setLoading(false); }
  };

  const selectTopic = async (item: string) => {
    setTopic(item); setQuery('');
    if (item === 'All') { await loadFeed(); return; }
    await doSearch(item);
    setTopic(item);
  };

  const openSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (searchFocused) { Keyboard.dismiss(); setSearchFocused(false); return; }
    setSearchFocused(true);
    setTimeout(() => input.current?.focus(), 100);
  };

  const shareVideo = (video: Video) => void Share.share({ message: `${video.title} https://www.youtube.com/watch?v=${video.id}` });

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={resolved === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFeed} tintColor={colors.accent} />} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Serein home" onPress={() => router.replace('/(tabs)')} style={s.brand}><BrandMark size={31} /><Text style={[s.brandText, { color: colors.text }]}>Serein</Text></Pressable>
          <View style={s.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={openSearch} style={s.headerButton}><AppIcon name="search" color={colors.text} size={22} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} style={s.headerButton}><AppIcon name="notifications" color={colors.text} size={22} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.push('/profile')} style={[s.avatarButton, { backgroundColor: colors.accentSoft }]}><Text style={[s.avatarInitial, { color: colors.accent }]}>{user?.displayName.slice(0, 1).toUpperCase() ?? 'S'}</Text></Pressable>
          </View>
        </View>

        {searchFocused || !!query ? <View style={[s.search, { backgroundColor: colors.surface }]}>
          <AppIcon name="search" color={colors.muted} size={19} />
          <TextInput ref={input} accessibilityLabel="Search videos" placeholder="Search videos" placeholderTextColor={colors.muted} value={query} onFocus={() => setSearchFocused(true)} onChangeText={setQuery} onSubmitEditing={() => void doSearch()} returnKeyType="search" style={[s.searchInput, { color: colors.text }]} />
          {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setQuery(''); setTopic('All'); void loadFeed(); input.current?.focus(); }} hitSlop={10}><AppIcon name="close" color={colors.muted} size={18} /></Pressable>}
        </View> : <Pressable accessibilityRole="button" onPress={openSearch} style={[s.searchCollapsed, { backgroundColor: colors.surface }]}><AppIcon name="search" color={colors.muted} size={19} /><Text style={[s.searchPlaceholder, { color: colors.muted }]}>Search videos</Text></Pressable>}

        {searchFocused && recent.length > 0 && <View style={s.recentWrap}><Text style={[s.recentHeading, { color: colors.muted }]}>RECENT SEARCHES</Text>{recent.slice(0, 4).map((item) => <Pressable key={item} onPress={() => void doSearch(item)} style={s.recentItem}><AppIcon name="history" color={colors.muted} size={16} /><Text numberOfLines={1} style={[s.recentText, { color: colors.text }]}>{item}</Text></Pressable>)}</View>}

        <View style={s.pageHeading}><Text style={[s.pageTitle, { color: colors.text }]}>Home</Text><Text style={[s.pageCaption, { color: colors.muted }]}>Find something worth your time.</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.topicRow}>
          {topics.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: topic === item }} onPress={() => void selectTopic(item)} style={[s.topic, { backgroundColor: topic === item ? colors.chipSelected : colors.chip }]}><Text style={[s.topicText, { color: topic === item ? colors.accent : colors.chipText, fontWeight: topic === item ? '700' : '500' }]}>{item}</Text></Pressable>)}
        </ScrollView>

        <View style={s.recommendedHeading}><View><Text style={[s.recommended, { color: colors.text }]}>{query ? 'Search results' : 'Recommended'}</Text><Text style={[s.sectionCaption, { color: colors.muted }]}>{query ? `Videos matching “${query}”` : 'Videos worth making time for.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Refresh feed" onPress={() => void loadFeed()} hitSlop={10}><AppIcon name="refresh" color={colors.muted} size={19} /></Pressable></View>

        {!!error && <View style={[s.error, { backgroundColor: colors.dangerSoft }]}><Text style={[s.errorText, { color: colors.danger }]}>{error}</Text><Pressable onPress={() => void loadFeed()}><Text style={[s.retry, { color: colors.danger }]}>Retry</Text></Pressable></View>}

        {loading && videos.length === 0 && <View style={s.skeletonList}>{[0, 1, 2].map((item) => <View key={item} style={s.skeletonCard}><View style={[s.skeletonImage, { backgroundColor: colors.elevated }]} /><View style={s.skeletonMeta}><View style={[s.skeletonAvatar, { backgroundColor: colors.elevated }]} /><View style={{ flex: 1, gap: 8 }}><View style={[s.skeletonLine, { backgroundColor: colors.elevated }]} /><View style={[s.skeletonLine, s.shortLine, { backgroundColor: colors.elevated }]} /></View></View></View>)}</View>}

        {!loading && visible.map((video) => <Pressable key={video.id} accessibilityRole="button" accessibilityLabel={`Play ${video.title}`} onPress={() => router.push({ pathname: '/watch/[videoId]', params: { videoId: video.id, title: video.title, channel: video.channel } })} style={s.card}>
          <View style={s.thumbnailWrap}><Image source={{ uri: video.thumbnail }} style={s.thumbnail} resizeMode="cover" />{!!video.duration && <Text style={s.duration}>{video.duration}</Text>}</View>
          <View style={s.meta}><View style={[s.channelAvatar, { backgroundColor: colors.accentSoft }]}><Text style={[s.avatarText, { color: colors.accent }]}>{video.channel.slice(0, 1).toUpperCase()}</Text></View><View style={s.metaCopy}><Text numberOfLines={1} style={[s.channelTitle, { color: colors.secondary }]}>{video.channel}</Text><Text numberOfLines={2} style={[s.videoTitle, { color: colors.text }]}>{video.title}</Text><Text numberOfLines={1} style={[s.videoSub, { color: colors.muted }]}>{video.views} · {video.published}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`More options for ${video.title}`} onPress={() => Alert.alert('Video options', video.title, [{ text: 'Share', onPress: () => shareVideo(video) }, { text: 'Cancel', style: 'cancel' }])} hitSlop={10} style={s.moreButton}><AppIcon name="more" color={colors.muted} size={20} /></Pressable></View>
        </Pressable>)}

        {!loading && visible.length === 0 && !error && <View style={s.empty}><Text style={[s.emptyTitle, { color: colors.text }]}>No matches yet</Text><Text style={[s.emptyCopy, { color: colors.muted }]}>Try another search or topic to find your next watch.</Text><Pressable onPress={() => { setQuery(''); setTopic('All'); void loadFeed(); }} style={[s.searchAction, { backgroundColor: colors.accentSoft }]}><Text style={{ color: colors.accent, fontWeight: '700' }}>Clear filters</Text></Pressable></View>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 18 },
  header: { minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandText: { fontSize: 21, fontWeight: '800', letterSpacing: -0.55 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 }, headerButton: { width: 38, height: 40, alignItems: 'center', justifyContent: 'center' }, avatarButton: { width: 31, height: 31, borderRadius: 16, marginLeft: 5, alignItems: 'center', justifyContent: 'center' }, avatarInitial: { fontSize: 13, fontWeight: '800' },
  searchCollapsed: { height: 44, marginHorizontal: 16, marginTop: 5, paddingHorizontal: 13, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, searchPlaceholder: { flex: 1, fontSize: 13 }, search: { height: 46, marginHorizontal: 16, marginTop: 5, paddingHorizontal: 13, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }, searchInput: { flex: 1, paddingVertical: 0, fontSize: 14 },
  recentWrap: { marginHorizontal: 20, paddingTop: 11 }, recentHeading: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 5 }, recentItem: { flexDirection: 'row', alignItems: 'center', height: 35, gap: 12 }, recentText: { fontSize: 13 },
  pageHeading: { marginHorizontal: 18, marginTop: 18 }, pageTitle: { fontSize: 25, fontWeight: '800', letterSpacing: -0.5 }, pageCaption: { marginTop: 3, fontSize: 12 },
  topicRow: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 5, gap: 8 }, topic: { minHeight: 32, paddingHorizontal: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, topicText: { fontSize: 11 },
  recommendedHeading: { marginHorizontal: 18, marginTop: 17, marginBottom: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, recommended: { fontSize: 17, fontWeight: '700' }, sectionCaption: { marginTop: 3, fontSize: 11 },
  skeletonList: { gap: 14 }, skeletonCard: { marginBottom: 2 }, skeletonImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14 }, skeletonMeta: { paddingHorizontal: 15, paddingTop: 12, flexDirection: 'row', gap: 11, alignItems: 'center' }, skeletonAvatar: { width: 38, height: 38, borderRadius: 19 }, skeletonLine: { height: 10, borderRadius: 5, width: '82%' }, shortLine: { width: '58%' },
  card: { marginHorizontal: 14, marginBottom: 16 }, thumbnailWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#202824', overflow: 'hidden', borderRadius: 14 }, thumbnail: { width: '100%', height: '100%' }, duration: { position: 'absolute', right: 9, bottom: 9, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(11,17,14,0.82)', color: '#fff', fontSize: 10, fontWeight: '700' },
  meta: { paddingHorizontal: 2, paddingTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 11 }, channelAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontWeight: '800', fontSize: 14 }, metaCopy: { flex: 1, gap: 3 }, channelTitle: { fontSize: 11, fontWeight: '600' }, videoTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700' }, videoSub: { fontSize: 11 }, moreButton: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  error: { marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }, errorText: { flex: 1, fontSize: 12, lineHeight: 17 }, retry: { fontWeight: '700' }, empty: { marginHorizontal: 18, marginTop: 30, alignItems: 'center' }, emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' }, emptyCopy: { marginTop: 6, fontSize: 12, lineHeight: 18, textAlign: 'center' }, searchAction: { marginTop: 13, paddingHorizontal: 15, paddingVertical: 9, borderRadius: 10 },
});
