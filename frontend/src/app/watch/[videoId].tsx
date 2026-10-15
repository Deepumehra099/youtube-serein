import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useApp } from '../../context/AppProvider';
import { useTheme } from '../../context/ThemeProvider';
import { ThemeColors } from '../../theme';
import { safeBack } from '../../navigation';
import { API_URL, apiRequest, Comment, fetchComments } from '../../services/api';
import { AppIcon } from '../../components/Icon';

export default function WatchScreen() {
  const params = useLocalSearchParams<{ videoId: string; title?: string; channel?: string; source?: string }>();
  const videoId = Array.isArray(params.videoId) ? params.videoId[0] : params.videoId;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const channel = Array.isArray(params.channel) ? params.channel[0] : params.channel;
  const isPlatform = params.source === 'platform';
  const appId = 'com.deepumehra.serein';
  const { colors } = useTheme();
  const { token, user } = useApp();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const videoUrl = `${API_URL}/api/videos/${encodeURIComponent(videoId ?? '')}/media`;
  const playerHtml = useMemo(() => isPlatform
    ? `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,video{margin:0;width:100%;height:100%;background:#000}video{object-fit:contain}</style></head><body><video controls autoplay playsinline src="${videoUrl}"></video></body></html>`
    : `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body{margin:0;width:100%;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="https://www.youtube.com/embed/${encodeURIComponent(videoId ?? '')}?playsinline=1&rel=0&origin=${encodeURIComponent(`https://${appId}`)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`, [appId, isPlatform, videoId, videoUrl]);

  useEffect(() => {
    if (!isPlatform || !videoId) return;
    void fetchComments(videoId, token).then(setComments).catch(() => setError('Comments couldn’t load. Please try again later.'));
    if (token) void apiRequest<{ liked: boolean; saved: boolean }>(`/api/videos/${encodeURIComponent(videoId)}`, token).then((data) => { setLiked(data.liked); setSaved(data.saved); }).catch(() => {});
  }, [isPlatform, videoId, token]);

  const toggle = async (kind: 'like' | 'save') => {
    if (!token || !videoId) { setError('Sign in to save your activity.'); return; }
    setBusy(true); setError('');
    try {
      await apiRequest(`/api/videos/${encodeURIComponent(videoId)}/${kind}`, token, { method: 'POST' });
      if (kind === 'like') setLiked(!liked); else setSaved(!saved);
    } catch { setError('That action couldn’t be completed. Please try again.'); }
    finally { setBusy(false); }
  };

  const postComment = async () => {
    if (!token || !videoId || !commentText.trim()) { setError('Sign in and enter a comment first.'); return; }
    setBusy(true); setError('');
    try {
      const data = await apiRequest<{ comment: Comment }>(`/api/videos/${encodeURIComponent(videoId)}/comments`, token, { method: 'POST', body: JSON.stringify({ body: commentText.trim() }) });
      setComments((current) => [data.comment, ...current]); setCommentText('');
    } catch { setError('Your comment couldn’t be posted. Please try again.'); }
    finally { setBusy(false); }
  };

  return <View style={[s.screen, { backgroundColor: colors.background }]}>
    <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
    <ScrollView keyboardShouldPersistTaps="handled">
      <View style={[s.header, { backgroundColor: colors.background }]}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack('/(tabs)')} style={s.back}><AppIcon name="back" color={colors.text} size={21} /></Pressable><Text style={[s.headerTitle, { color: colors.text }]}>Now playing</Text></View>
      {Platform.OS === 'web' ? <View style={[s.webFallback, { backgroundColor: colors.surface }]}><Text style={[s.title, { color: colors.text }]}>Open this video on YouTube</Text><Text style={{ color: colors.accent }} onPress={() => void Linking.openURL(isPlatform ? videoUrl : `https://www.youtube.com/watch?v=${videoId}`)}>Play video</Text></View> : <WebView source={{ html: playerHtml, baseUrl: isPlatform ? API_URL : `https://${appId}/` }} style={s.player} allowsFullscreenVideo javaScriptEnabled domStorageEnabled mediaPlaybackRequiresUserAction setSupportMultipleWindows={false} originWhitelist={['*']} />}
      <View style={s.details}><Text style={[s.title, { color: colors.text }]}>{title ?? 'Video'}</Text><Text style={[s.channel, { color: colors.muted }]}>{channel ?? 'Creator'}</Text>
        <View style={s.actions}>{isPlatform && <><Action label={liked ? 'Liked' : 'Like'} icon="like" selected={liked} colors={colors} onPress={() => void toggle('like')} /><Action label={saved ? 'Saved' : 'Save'} icon="save" selected={saved} colors={colors} onPress={() => void toggle('save')} /></>}<Action label="Share" icon="share" selected={false} colors={colors} onPress={() => void Share.share({ message: `${title ?? 'Video'} ${isPlatform ? videoUrl : `https://www.youtube.com/watch?v=${videoId}`}` })} /></View>
        {!!error && <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>}
      </View>
      {isPlatform && <View style={[s.comments, { borderTopColor: colors.border }]}><Text style={[s.commentsTitle, { color: colors.text }]}>Comments · {comments.length}</Text><View style={s.commentInput}><TextInput value={commentText} onChangeText={setCommentText} placeholder={user ? 'Add a comment' : 'Sign in to comment'} placeholderTextColor={colors.muted} style={[s.input, { color: colors.text, borderBottomColor: colors.border }]} /><Pressable disabled={busy} onPress={() => void postComment()}><Text style={{ color: colors.accent, fontWeight: '700' }}>Post</Text></Pressable></View>{comments.map((comment) => <View key={comment.id} style={s.comment}><Text style={[s.author, { color: colors.text }]}>{comment.author.displayName}</Text><Text style={[s.commentBody, { color: colors.secondary }]}>{comment.body}</Text></View>)}{busy && <ActivityIndicator color={colors.accent} />}</View>}
    </ScrollView>
  </View>;
}

function Action({ label, icon, selected, colors, onPress }: { label: string; icon: 'like' | 'save' | 'share'; selected: boolean; colors: ThemeColors; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[s.action, { backgroundColor: selected ? colors.accentSoft : colors.surface }]}><AppIcon name={icon} color={selected ? colors.accent : colors.secondary} size={18} /><Text style={{ color: selected ? colors.accent : colors.text, fontSize: 11, fontWeight: '600' }}>{label}</Text></Pressable>;
}

const s = StyleSheet.create({ screen: { flex: 1 }, header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }, back: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, headerTitle: { flex: 1, fontSize: 14, fontWeight: '700' }, share: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }, player: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }, details: { paddingHorizontal: 18, paddingTop: 17, paddingBottom: 20, gap: 8 }, title: { fontSize: 18, lineHeight: 24, fontWeight: '700' }, channel: { fontSize: 12 }, actions: { flexDirection: 'row', gap: 8, marginTop: 7 }, action: { minHeight: 38, paddingHorizontal: 12, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, comments: { borderTopWidth: StyleSheet.hairlineWidth, padding: 18 }, commentsTitle: { fontSize: 15, fontWeight: '800' }, commentInput: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, input: { flex: 1, minHeight: 42, borderBottomWidth: 1, fontSize: 13 }, comment: { paddingVertical: 12 }, author: { fontSize: 12, fontWeight: '700' }, commentBody: { marginTop: 4, fontSize: 13, lineHeight: 19 }, webFallback: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 15 } });
