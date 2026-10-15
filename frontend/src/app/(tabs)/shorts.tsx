import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../context/ThemeProvider';
import { getShortVideos, hasYouTubeApiKey, Video } from '../../backend/youtube';
import { AppIcon } from '../../components/Icon';

export default function ShortsScreen() {
  const { colors } = useTheme();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pageHeight, setPageHeight] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    if (!hasYouTubeApiKey) {
      setVideos([]);
      setLoading(false);
      setError(true);
      return;
    }
    try {
      setVideos(await getShortVideos());
    } catch {
      setVideos([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openVideo = (video: Video) => router.push({
    pathname: '/watch/[videoId]',
    params: { videoId: video.id, title: video.title, channel: video.channel },
  });

  return <View onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)} style={[s.screen, { backgroundColor: '#000' }]}>
    {loading && <ActivityIndicator style={s.loading} color={colors.accent} />}
    {!loading && videos.length === 0 && <View style={s.empty}>
      <AppIcon name="shorts" color={colors.text} size={42} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>{error ? 'Shorts couldn’t load' : 'No Shorts found'}</Text>
      <Text style={[s.emptyBody, { color: colors.muted }]}>{error ? 'Check your connection and YouTube API setup, then try again.' : 'Try again in a moment to load fresh short videos.'}</Text>
      <Pressable onPress={() => void load()} style={[s.retry, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentText, fontWeight: '700' }}>Try again</Text></Pressable>
    </View>}
    <FlatList
      data={videos}
      keyExtractor={(video) => video.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      windowSize={3}
      removeClippedSubviews
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.accent} />}
      renderItem={({ item }) => {
        const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body,iframe{margin:0;width:100%;height:100%;background:#000;border:0}iframe{position:absolute;inset:0}</style></head><body><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.id)}?autoplay=1&playsinline=1&rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></body></html>`;
        return <View style={[s.page, { height: pageHeight || 640 }]}>
          <WebView source={{ html, baseUrl: 'https://www.youtube-nocookie.com' }} style={s.player} allowsFullscreenVideo javaScriptEnabled domStorageEnabled mediaPlaybackRequiresUserAction={false} setSupportMultipleWindows={false} originWhitelist={['*']} />
          <View pointerEvents="box-none" style={s.overlay}>
            <Pressable onPress={() => openVideo(item)} style={s.details}>
              <Text numberOfLines={2} style={s.videoTitle}>{item.title}</Text>
              <Text numberOfLines={1} style={s.channel}>@{item.channel} · {item.views}</Text>
            </Pressable>
            <View style={s.actions}>
              <Pressable accessibilityLabel="Open video details" onPress={() => openVideo(item)} style={s.action}><AppIcon name="play" color="#fff" size={26} /><Text style={s.actionLabel}>Open</Text></Pressable>
              <Pressable accessibilityLabel="Share Short" onPress={() => void Share.share({ message: `${item.title} https://www.youtube.com/shorts/${item.id}` })} style={s.action}><AppIcon name="share" color="#fff" size={25} /><Text style={s.actionLabel}>Share</Text></Pressable>
            </View>
          </View>
        </View>;
      }}
    />
  </View>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, loading: { marginTop: 28 }, page: { width: '100%', backgroundColor: '#000' },
  player: { flex: 1, backgroundColor: '#000' }, overlay: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'flex-end', padding: 16, paddingBottom: 20 },
  details: { flex: 1, paddingRight: 14, paddingBottom: 2 }, videoTitle: { color: '#fff', fontSize: 15, fontWeight: '700' }, channel: { color: '#eee', fontSize: 12, marginTop: 7 },
  actions: { alignItems: 'center', gap: 20, paddingBottom: 3 }, action: { alignItems: 'center', gap: 4, minWidth: 44 }, actionLabel: { color: '#fff', fontSize: 10, fontWeight: '600' },
  empty: { ...StyleSheet.absoluteFill, zIndex: 2, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#000' }, emptyTitle: { marginTop: 15, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptyBody: { marginTop: 8, fontSize: 13, lineHeight: 19, textAlign: 'center' }, retry: { marginTop: 18, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10 },
});
