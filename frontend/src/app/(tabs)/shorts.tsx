import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useApp } from '../../context/AppProvider';
import { useTheme } from '../../context/ThemeProvider';
import { apiRequest, listPlatformVideos, PlatformVideo } from '../../services/api';
import { API_URL } from '../../services/api';
import { AppIcon, IconName } from '../../components/Icon';

export default function ShortsScreen() {
  const { colors } = useTheme();
  const { token } = useApp();
  const [videos, setVideos] = useState<PlatformVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageHeight, setPageHeight] = useState(0);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>({});
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setVideos(await listPlatformVideos(token)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load videos.'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const action = async (video: PlatformVideo, kind: 'like' | 'save') => {
    if (!token) { router.push('/auth'); return; }
    try {
      await apiRequest(`/api/videos/${encodeURIComponent(video.id)}/${kind}`, token, { method: 'POST' });
      if (kind === 'like') setLiked((state) => ({ ...state, [video.id]: !state[video.id] }));
      else setSaved((state) => ({ ...state, [video.id]: !state[video.id] }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Action failed.'); }
  };
  const subscribe = async (video: PlatformVideo) => {
    if (!token) { router.push('/auth'); return; }
    try {
      const data = await apiRequest<{ subscribed: boolean }>(`/api/channels/${encodeURIComponent(video.channel.username)}/subscribe`, token, { method: 'POST' });
      setSubscribed((state) => ({ ...state, [video.channel.id]: data.subscribed }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update subscription.'); }
  };

  return <View onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)} style={[s.screen, { backgroundColor: colors.background }]}>
    {loading && <ActivityIndicator style={s.loading} color={colors.accent} />}
    {!!error && <Text style={[s.error, { color: colors.danger }]}>{error}</Text>}
    {!loading && videos.length === 0 && <View style={s.empty}><Text style={[s.title, { color: colors.text }]}>No creator videos yet</Text><Text style={[s.body, { color: colors.muted }]}>Short form videos uploaded by Serein creators will appear here.</Text><Pressable onPress={() => router.push('/(tabs)')} style={[s.button, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentText, fontWeight: '800' }}>Explore videos</Text></Pressable><Pressable onPress={() => router.push('/upload')}><Text style={[s.create, { color: colors.accent }]}>Upload a video</Text></Pressable></View>}
    <FlatList data={videos} keyExtractor={(item) => item.id} pagingEnabled showsVerticalScrollIndicator={false} initialNumToRender={1} maxToRenderPerBatch={2} windowSize={3} removeClippedSubviews onRefresh={() => void load()} refreshing={loading} renderItem={({ item }) => {
      const source = item.mediaUrl ? `${API_URL}${item.mediaUrl}` : `${API_URL}/api/videos/${encodeURIComponent(item.id)}/media`;
      const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,video{margin:0;width:100%;height:100%;background:#000}video{object-fit:contain}</style></head><body><video controls autoplay playsinline src="${source}"></video></body></html>`;
      return <View style={[s.page, { height: pageHeight || 640, backgroundColor: colors.background }]}><WebView source={{ html, baseUrl: API_URL }} style={s.player} allowsFullscreenVideo javaScriptEnabled mediaPlaybackRequiresUserAction originWhitelist={['*']} /><View pointerEvents="box-none" style={s.overlay}><View style={s.copy}><Text style={[s.videoTitle, { color: '#fff' }]}>{item.title}</Text><Text style={s.channel}>@{item.channel.username} · {item.views} views</Text><Text numberOfLines={2} style={s.description}>{item.description || item.category}</Text><Pressable onPress={() => void subscribe(item)} style={[s.subscribe, { backgroundColor: subscribed[item.channel.id] ? '#28282C' : colors.accent }]}><Text style={{ color: subscribed[item.channel.id] ? '#fff' : colors.accentText, fontWeight: '800', fontSize: 12 }}>{subscribed[item.channel.id] ? 'Subscribed' : 'Subscribe'}</Text></Pressable></View><View style={s.actions}><Action label={liked[item.id] ? 'Liked' : 'Like'} color={liked[item.id] ? colors.accent : '#fff'} onPress={() => void action(item, 'like')} /><Action label="Comments" color="#fff" onPress={() => router.push({ pathname: '/watch/[videoId]', params: { videoId: item.id, title: item.title, channel: item.channel.displayName, source: 'platform' } })} /><Action label={saved[item.id] ? 'Saved' : 'Save'} color={saved[item.id] ? colors.accent : '#fff'} onPress={() => void action(item, 'save')} /><Action label="Share" color="#fff" onPress={() => void Share.share({ message: `${item.title} — ${API_URL}/api/videos/${item.id}` })} /></View></View></View>;
    }} />
  </View>;
}

function Action({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  const icon: IconName = label.toLowerCase().includes('like') ? 'like' : label.toLowerCase().includes('comment') ? 'comment' : label.toLowerCase().includes('save') ? 'save' : 'share';
  return <Pressable onPress={onPress} style={s.action}><AppIcon name={icon} color={color} size={25} /><Text style={{ color, fontSize: 10, fontWeight: '600' }}>{label}</Text></Pressable>;
}

const s = StyleSheet.create({ screen: { flex: 1 }, loading: { marginTop: 25 }, error: { padding: 12, fontSize: 12 }, page: { width: '100%' }, player: { flex: 1, backgroundColor: '#000' }, overlay: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'flex-end', padding: 16, paddingBottom: 22 }, copy: { flex: 1, paddingRight: 12 }, videoTitle: { fontSize: 16, fontWeight: '800' }, channel: { color: '#F0F0F0', marginTop: 6, fontSize: 12 }, description: { color: '#ddd', fontSize: 11, marginTop: 5, lineHeight: 16 }, subscribe: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 8 }, actions: { alignItems: 'center', gap: 15, paddingBottom: 3 }, action: { alignItems: 'center', gap: 5, minWidth: 47 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 }, title: { fontSize: 19, fontWeight: '800', textAlign: 'center' }, body: { marginTop: 8, fontSize: 12, lineHeight: 18, textAlign: 'center' }, button: { marginTop: 17, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 16 }, create: { marginTop: 16, fontSize: 12, fontWeight: '700' } });
