import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../../context/AppProvider';
import { useTheme } from '../../context/ThemeProvider';
import { fetchChannelVideos, fetchMySubscriptions, PlatformVideo, SubscribedChannel } from '../../services/api';
import { AppIcon } from '../../components/Icon';

type Feed = 'Latest' | 'Shorts' | 'Creators';
const feeds: Feed[] = ['Latest', 'Shorts', 'Creators'];

export default function SubscriptionsScreen() {
  const { colors } = useTheme();
  const { token, user, ready } = useApp();
  const [videos, setVideos] = useState<PlatformVideo[]>([]);
  const [channels, setChannels] = useState<SubscribedChannel[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<Feed>('Latest');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const subscribedChannels = await fetchMySubscriptions(token);
      setChannels(subscribedChannels);
      const pages = await Promise.all(subscribedChannels.map((channel) => fetchChannelVideos(channel.username, token)));
      setVideos(pages.flat().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
    } catch { setError('Subscriptions couldn’t load. Check your connection and retry.'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => videos.filter((video) => (!selectedChannel || video.channel.id === selectedChannel) && (selectedFeed !== 'Shorts' || video.category.toLowerCase() === 'shorts')), [videos, selectedChannel, selectedFeed]);

  if (!ready) return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.accent} /></View>;
  return <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={s.content}>
    <View style={s.heading}><Text style={[s.title, { color: colors.text }]}>Subscriptions</Text><Text style={[s.subtitle, { color: colors.muted }]}>New from creators you’ve subscribed to.</Text></View>
    <View style={[s.segments, { backgroundColor: colors.elevated }]}>{feeds.map((feed) => <Pressable key={feed} accessibilityRole="tab" accessibilityState={{ selected: selectedFeed === feed }} onPress={() => setSelectedFeed(feed)} style={[s.segment, selectedFeed === feed && { backgroundColor: colors.surface }]}><Text style={[s.segmentText, { color: selectedFeed === feed ? colors.text : colors.muted }]}>{feed}</Text></Pressable>)}</View>
    {selectedFeed !== 'Creators' && channels.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.creators}>
      <Pressable onPress={() => setSelectedChannel('')} style={[s.creatorChip, { backgroundColor: !selectedChannel ? colors.accentSoft : colors.surface }]}><Text style={{ color: !selectedChannel ? colors.accent : colors.secondary, fontSize: 11, fontWeight: '600' }}>All creators</Text></Pressable>
      {channels.map((channel) => <Pressable key={channel.id} onPress={() => setSelectedChannel(channel.id)} style={[s.creatorChip, { backgroundColor: selectedChannel === channel.id ? colors.accentSoft : colors.surface }]}><View style={[s.creatorDot, { backgroundColor: selectedChannel === channel.id ? colors.accent : colors.elevated }]}><Text style={{ color: selectedChannel === channel.id ? colors.accentText : colors.secondary, fontSize: 10, fontWeight: '700' }}>{channel.displayName.slice(0, 1).toUpperCase()}</Text></View><Text numberOfLines={1} style={{ color: selectedChannel === channel.id ? colors.accent : colors.secondary, fontSize: 11 }}>{channel.displayName}</Text></Pressable>)}
    </ScrollView>}
    {!!error && <View style={s.state}><Text style={[s.body, { color: colors.danger }]}>{error}</Text><Pressable onPress={() => void load()} style={{ marginTop: 10 }}><Text style={{ color: colors.accent, fontWeight: '700' }}>Retry</Text></Pressable></View>}
    {user && loading && <ActivityIndicator style={{ marginTop: 24 }} color={colors.accent} />}
    {!user && <View style={s.state}><View style={[s.stateIcon, { backgroundColor: colors.accentSoft }]}><AppIcon name="subscriptions" color={colors.accent} size={22} /></View><Text style={[s.emptyTitle, { color: colors.text }]}>Your creators, in one place</Text><Text style={[s.body, { color: colors.muted }]}>Sign in to see new uploads from creators you subscribe to.</Text><Pressable onPress={() => router.push('/auth')} style={[s.button, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentText, fontWeight: '700' }}>Sign in</Text></Pressable></View>}
    {user && !loading && !error && selectedFeed === 'Creators' && channels.length === 0 && <Empty title="No subscriptions yet" detail="Creators you subscribe to will appear here." colors={colors} />}
    {user && !loading && !error && selectedFeed === 'Creators' && channels.map((channel) => <Pressable key={channel.id} onPress={() => { setSelectedFeed('Latest'); setSelectedChannel(channel.id); }} style={[s.channelRow, { borderBottomColor: colors.border }]}><View style={[s.creatorDot, { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accentSoft }]}><Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700' }}>{channel.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={[s.channelName, { color: colors.text }]}>{channel.displayName}</Text><Text style={[s.body, { color: colors.muted }]}>@{channel.username} · {channel.subscriberCount} subscribers</Text></View><AppIcon name="forward" color={colors.muted} size={18} /></Pressable>)}
    {user && !loading && !error && selectedFeed !== 'Creators' && visible.length === 0 && <Empty title={channels.length ? 'You’re all caught up' : 'No subscriptions yet'} detail={channels.length ? 'New uploads will show up here when your creators share them.' : 'Subscribe to creators and their new videos will appear here.'} colors={colors} action={!channels.length} />}
    {user && !loading && visible.map((video) => <Pressable key={video.id} onPress={() => router.push({ pathname: '/watch/[videoId]', params: { videoId: video.id, title: video.title, channel: video.channel.displayName, source: 'platform' } })} style={s.video}>
      <View style={[s.poster, { backgroundColor: colors.elevated }]}><AppIcon name="play" color={colors.accent} size={23} /><Text style={[s.posterLabel, { color: colors.muted }]}>{video.category}</Text></View>
      <View style={s.videoInfo}><View style={[s.creatorDot, { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accentSoft }]}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>{video.channel.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text numberOfLines={2} style={[s.videoTitle, { color: colors.text }]}>{video.title}</Text><Text numberOfLines={1} style={[s.body, { color: colors.muted }]}>{video.channel.displayName} · {video.views} views</Text></View><AppIcon name="more" color={colors.muted} size={18} /></View>
    </Pressable>)}
  </ScrollView>;
}

function Empty({ title, detail, colors, action = false }: { title: string; detail: string; colors: ReturnType<typeof useTheme>['colors']; action?: boolean }) {
  return <View style={s.state}><View style={[s.stateIcon, { backgroundColor: colors.accentSoft }]}><AppIcon name="subscriptions" color={colors.accent} size={22} /></View><Text style={[s.emptyTitle, { color: colors.text }]}>{title}</Text><Text style={[s.body, { color: colors.muted }]}>{detail}</Text>{action && <Pressable onPress={() => router.push('/(tabs)')} style={s.discover}><Text style={{ color: colors.accent, fontWeight: '700' }}>Discover creators</Text></Pressable>}</View>;
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 21, paddingBottom: 28 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' }, heading: { marginBottom: 17 }, title: { fontSize: 25, fontWeight: '800', letterSpacing: -0.5 }, subtitle: { marginTop: 4, fontSize: 12 },
  segments: { minHeight: 39, padding: 3, borderRadius: 12, flexDirection: 'row' }, segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, segmentText: { fontSize: 11, fontWeight: '600' }, creators: { gap: 8, paddingTop: 15, paddingBottom: 2 }, creatorChip: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 18 }, creatorDot: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  state: { alignItems: 'center', paddingHorizontal: 26, paddingVertical: 35 }, stateIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, emptyTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' }, body: { marginTop: 5, fontSize: 11, lineHeight: 17 }, button: { marginTop: 16, minHeight: 38, paddingHorizontal: 17, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, discover: { paddingVertical: 14 }, channelRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth }, channelName: { fontSize: 13, fontWeight: '700' },
  video: { marginTop: 16 }, poster: { width: '100%', aspectRatio: 16 / 9, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, posterLabel: { position: 'absolute', left: 11, bottom: 9, fontSize: 9, fontWeight: '700' }, videoInfo: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 11 }, videoTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
