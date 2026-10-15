import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeProvider';
import { getPopularVideos, hasYouTubeApiKey, searchVideos, Video } from '../../backend/youtube';
import { AppIcon } from '../../components/Icon';
import { useTabBarScroll } from '../../context/TabBarScrollContext';

const topics = ['All', 'Music', 'Gaming', 'Tech', 'Learning', 'News', 'Sports'];

function displayDuration(value: string) {
  if (!value.startsWith('PT')) return value;
  const hours = Number(value.match(/(\d+)H/)?.[1] ?? 0);
  const minutes = Number(value.match(/(\d+)M/)?.[1] ?? 0);
  const seconds = Number(value.match(/(\d+)S/)?.[1] ?? 0);
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function HomeFeedScreen() {
  const { colors } = useTheme();
  const [videos, setVideos] = useState<Video[]>([]);
  const [topic, setTopic] = useState('All');
  const [loading, setLoading] = useState(true);
  const previousScrollY = useRef(0);
  const setTabBarHidden = useTabBarScroll();

  const handleFeedScroll = (offsetY: number) => {
    const delta = offsetY - previousScrollY.current;
    if (offsetY <= 4) setTabBarHidden(false);
    else if (delta > 4) setTabBarHidden(true);
    else if (delta < -4) setTabBarHidden(false);
    previousScrollY.current = offsetY;
  };

  const loadFeed = useCallback(async () => {
    if (!hasYouTubeApiKey) { setVideos([]); setLoading(false); return; }
    setLoading(true);
    try { setVideos(await getPopularVideos()); }
    catch { setVideos([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const visible = useMemo(() => videos.filter((video) => {
    if (topic === 'All') return true;
    return `${video.title} ${video.channel}`.toLowerCase().includes(topic.toLowerCase());
  }), [videos, topic]);

  const selectTopic = async (item: string) => {
    setTopic(item);
    if (item === 'All') { await loadFeed(); return; }
    if (!hasYouTubeApiKey) { setVideos([]); setLoading(false); return; }
    setLoading(true);
    try { setVideos(await searchVideos(item)); }
    catch { setVideos([]); }
    finally { setLoading(false); }
  };

  const shareVideo = (video: Video) => void Share.share({ message: `${video.title} https://www.youtube.com/watch?v=${video.id}` });

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" onScroll={(event) => handleFeedScroll(event.nativeEvent.contentOffset.y)} scrollEventThrottle={16} refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFeed} tintColor={colors.accent} />} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Serein home" onPress={() => router.replace('/(tabs)')} style={s.brand}><Image source={require('../../../assets/header-icons/logo.png')} style={[s.headerLogo, { tintColor: colors.text }]} resizeMode="contain" /></Pressable>
          <View style={s.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Cast to device" onPress={() => Alert.alert('Cast to device', 'No devices are available right now.')} style={s.headerButton} android_ripple={{ color: 'transparent' }}>{({ pressed }) => <Image source={require('../../../assets/header-icons/cast.png')} style={[s.headerActionIcon, { tintColor: pressed ? colors.accent : colors.text }]} resizeMode="contain" />}</Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Search" onPress={() => router.push('/search')} style={s.headerButton} android_ripple={{ color: 'transparent' }}>{({ pressed }) => <Image source={require('../../../assets/header-icons/search.png')} style={[s.headerActionIcon, { tintColor: pressed ? colors.accent : colors.text }]} resizeMode="contain" />}</Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/notifications')} style={s.headerButton} android_ripple={{ color: 'transparent' }}>{({ pressed }) => <Image source={require('../../../assets/header-icons/notifications.png')} style={[s.headerActionIcon, { tintColor: pressed ? colors.accent : colors.text }]} resizeMode="contain" />}</Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => router.push('/profile')} style={s.headerButton} android_ripple={{ color: 'transparent' }}>{({ pressed }) => <Image source={require('../../../assets/header-icons/profile.png')} style={[s.headerActionIcon, { tintColor: pressed ? colors.accent : colors.text }]} resizeMode="contain" />}</Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.topicRow}>
          {topics.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: topic === item }} onPress={() => void selectTopic(item)} style={[s.topic, { backgroundColor: topic === item ? colors.chipSelected : colors.chip }]}><Text style={[s.topicText, { color: topic === item ? colors.accent : colors.chipText, fontWeight: topic === item ? '700' : '500' }]}>{item}</Text></Pressable>)}
        </ScrollView>



        {loading && videos.length === 0 && <View style={s.skeletonList}>{[0, 1, 2].map((item) => <View key={item} style={s.skeletonCard}><View style={[s.skeletonImage, { backgroundColor: colors.elevated }]} /><View style={s.skeletonMeta}><View style={[s.skeletonAvatar, { backgroundColor: colors.elevated }]} /><View style={{ flex: 1, gap: 8 }}><View style={[s.skeletonLine, { backgroundColor: colors.elevated }]} /><View style={[s.skeletonLine, s.shortLine, { backgroundColor: colors.elevated }]} /></View></View></View>)}</View>}

        {!loading && visible.map((video) => <Pressable key={video.id} accessibilityRole="button" accessibilityLabel={`Play ${video.title}`} onPress={() => router.push({ pathname: '/watch/[videoId]', params: { videoId: video.id, title: video.title, channel: video.channel } })} style={s.card}>
          <View style={[s.thumbnailWrap, { backgroundColor: colors.elevated }]}><Image source={{ uri: video.thumbnail }} style={s.thumbnail} resizeMode="cover" />{!!video.duration && <Text style={s.duration}>{displayDuration(video.duration)}</Text>}</View>
          <View style={s.meta}><View style={[s.channelAvatar, { backgroundColor: colors.accentSoft }]}><Text style={[s.avatarText, { color: colors.accent }]}>{video.channel.slice(0, 1).toUpperCase()}</Text></View><View style={s.metaCopy}><Text numberOfLines={2} style={[s.videoTitle, { color: colors.text }]}>{video.title}</Text><Text numberOfLines={1} style={[s.videoSub, { color: colors.secondary }]}>{video.channel}</Text><Text numberOfLines={1} style={[s.videoSub, { color: colors.muted }]}>{video.views} · {video.published}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`More options for ${video.title}`} onPress={() => Alert.alert('Video options', video.title, [{ text: 'Share', onPress: () => shareVideo(video) }, { text: 'Cancel', style: 'cancel' }])} hitSlop={10} style={s.moreButton}><AppIcon name="more" color={colors.muted} size={20} /></Pressable></View>
        </Pressable>)}

        {!loading && visible.length === 0 && <View style={s.empty}><Text style={[s.emptyTitle, { color: colors.text }]}>{topic !== 'All' ? 'No matches' : 'No videos available'}</Text><Pressable onPress={() => { setTopic('All'); void loadFeed(); }} style={s.searchAction}><Text style={{ color: colors.accent, fontWeight: '700' }}>{topic !== 'All' ? 'Clear filters' : 'Refresh'}</Text></Pressable></View>}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: 18 },
  header: { minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { alignItems: 'center', justifyContent: 'center' }, headerLogo: { width: 92, height: 34 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 }, headerButton: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center', elevation: 0, shadowOpacity: 0 }, headerActionIcon: { width: 22, height: 22 },
  search: { height: 46, marginHorizontal: 16, marginTop: 2, paddingHorizontal: 13, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 9 }, searchInput: { flex: 1, paddingVertical: 0, fontSize: 14 },
  recentWrap: { marginHorizontal: 20, paddingTop: 11 }, recentHeading: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 5 }, recentItem: { flexDirection: 'row', alignItems: 'center', height: 35, gap: 12 }, recentText: { fontSize: 13 },
  topicRow: { paddingHorizontal: 16, paddingTop: 7, paddingBottom: 10, gap: 8 }, topic: { minHeight: 32, paddingHorizontal: 13, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }, topicText: { fontSize: 11 },
  skeletonList: { gap: 14 }, skeletonCard: { marginBottom: 2 }, skeletonImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14 }, skeletonMeta: { paddingHorizontal: 15, paddingTop: 12, flexDirection: 'row', gap: 11, alignItems: 'center' }, skeletonAvatar: { width: 38, height: 38, borderRadius: 19 }, skeletonLine: { height: 10, borderRadius: 5, width: '82%' }, shortLine: { width: '58%' },
  card: { marginHorizontal: 14, marginBottom: 16 }, thumbnailWrap: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', borderRadius: 14 }, thumbnail: { width: '100%', height: '100%' }, duration: { position: 'absolute', right: 9, bottom: 9, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.82)', color: '#fff', fontSize: 10, fontWeight: '700' },
  meta: { paddingHorizontal: 2, paddingTop: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 11 }, channelAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontWeight: '800', fontSize: 14 }, metaCopy: { flex: 1, gap: 3 }, videoTitle: { fontSize: 14, lineHeight: 19, fontWeight: '700' }, videoSub: { fontSize: 11 }, moreButton: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  empty: { marginHorizontal: 18, marginTop: 22, alignItems: 'center' }, emptyTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' }, searchAction: { marginTop: 8, paddingVertical: 8 },
});
