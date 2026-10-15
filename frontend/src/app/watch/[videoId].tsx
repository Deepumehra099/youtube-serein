import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useApp } from '../../context/AppProvider';
import { useTheme } from '../../context/ThemeProvider';
import { ThemeColors } from '../../theme';
import { safeBack } from '../../navigation';
import { API_URL, apiRequest, Comment, fetchComments, PlatformVideo } from '../../services/api';
import { getPopularVideos, getVideoComments, getVideoDetails, YouTubeComment, Video } from '../../backend/youtube';
import { AppIcon } from '../../components/Icon';

const playerAssets = {
  collapse: require('../../../assets/player-controls/collapse.png'), play: require('../../../assets/player-controls/play.png'), cast: require('../../../assets/player-controls/cast.png'), cc: require('../../../assets/player-controls/cc.png'), settings: require('../../../assets/player-controls/settings.png'), previous: require('../../../assets/player-controls/previous.png'), rewind: require('../../../assets/player-controls/rewind10.png'), pause: require('../../../assets/player-controls/pause.png'), forward: require('../../../assets/player-controls/forward10.png'), next: require('../../../assets/player-controls/next.png'), volume: require('../../../assets/player-controls/volumeMedium.png'), mute: require('../../../assets/player-controls/volumeMute.png'), quality: require('../../../assets/player-controls/quality.png'), speed: require('../../../assets/player-controls/speed.png'), fullscreen: require('../../../assets/player-controls/fullscreen.png'), lock: require('../../../assets/player-controls/lock.png'), unlock: require('../../../assets/player-controls/unlock.png'), brightness: require('../../../assets/player-controls/brightnessHigh.png'), fit: require('../../../assets/player-controls/fit.png'), fill: require('../../../assets/player-controls/fill.png'), pip: require('../../../assets/player-controls/pip.png'), mini: require('../../../assets/player-controls/miniPlayer.png'), seekHandle: require('../../../assets/player-controls/seekHandle.png'),
} as const;

type Sheet = 'more' | 'comments' | 'ask' | null;
type CommentTab = 'Top' | 'Newest';

export default function WatchScreen() {
  const params = useLocalSearchParams<{ videoId: string; title?: string; channel?: string; source?: string }>();
  const videoId = Array.isArray(params.videoId) ? params.videoId[0] : params.videoId;
  const routeTitle = Array.isArray(params.title) ? params.title[0] : params.title;
  const routeChannel = Array.isArray(params.channel) ? params.channel[0] : params.channel;
  const isPlatform = params.source === 'platform';
  const appId = 'com.deepumehra.serein';
  const { colors } = useTheme();
  const { token, user } = useApp();
  const [video, setVideo] = useState<Video | null>(null);
  const [platformVideo, setPlatformVideo] = useState<PlatformVideo | null>(null);
  const [recommendations, setRecommendations] = useState<Video[]>([]);
  const [youtubeComments, setYoutubeComments] = useState<YouTubeComment[]>([]);
  const [platformComments, setPlatformComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [commentTab, setCommentTab] = useState<CommentTab>('Top');
  const [commentText, setCommentText] = useState('');
  const [askText, setAskText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const webRef = useRef<WebView>(null);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [playhead, setPlayhead] = useState({ current: 0, duration: 0 });
  const [playerWidth, setPlayerWidth] = useState(1);
  const [trackWidth, setTrackWidth] = useState(1);
  const [playerMenu, setPlayerMenu] = useState<'settings' | 'speed' | 'quality' | 'captions' | 'view' | 'brightness' | 'more' | null>(null);
  const hideControls = useRef<ReturnType<typeof setTimeout> | null>(null);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapAt = useRef(0);

  const title = video?.title ?? routeTitle ?? 'Video';
  const channel = video?.channel ?? routeChannel ?? 'Creator';
  const uploaded = video?.published ?? (platformVideo?.createdAt ? new Date(platformVideo.createdAt).toLocaleDateString() : '');
  const videoUrl = `${API_URL}/api/videos/${encodeURIComponent(videoId ?? '')}/media`;
  const externalUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId ?? '')}`;
  const playerHtml = useMemo(() => isPlatform
    ? `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,video{margin:0;width:100%;height:100%;background:#000}video{object-fit:contain}</style></head><body><video id="v" autoplay playsinline src="${videoUrl}"></video><script>const v=document.getElementById('v');window.serein={cmd:(a,b)=>{if(a==='seek')v.currentTime=Math.max(0,Math.min(v.duration||0,v.currentTime+b));if(a==='seekTo')v.currentTime=Math.max(0,Math.min(v.duration||0,b));if(a==='play')v.play();if(a==='pause')v.pause();if(a==='toggle')v.paused?v.play():v.pause();if(a==='mute'){v.muted=!v.muted;return v.muted}if(a==='volume')v.volume=b;if(a==='rate')v.playbackRate=b;if(a==='quality'){}if(a==='view')v.style.objectFit=b==='Fill'||b==='Crop'?'cover':'contain';if(a==='brightness')v.style.filter='brightness('+({Low:.65,Medium:.85,High:1.1,Auto:1}[b]||1)+')';if(a==='cc'){for(const t of v.textTracks)t.mode=b?'showing':'disabled'}if(a==='pip'){if(document.pictureInPictureEnabled)v.requestPictureInPicture()}if(a==='fullscreen'){if(v.requestFullscreen)v.requestFullscreen()}if(a==='state')return JSON.stringify({current:v.currentTime||0,duration:v.duration||0,playing:!v.paused,muted:v.muted})}};setInterval(()=>{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(window.serein.cmd('state'))},500);</script></body></html>`
    : `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>html,body,#player{margin:0;width:100%;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head><body><div id="player"></div><script src="https://www.youtube.com/iframe_api"></script><script>let p;window.onYouTubeIframeAPIReady=()=>{p=new YT.Player('player',{videoId:'${encodeURIComponent(videoId ?? '')}',playerVars:{playsinline:1,controls:0,rel:0},events:{onReady:()=>{setInterval(()=>{try{window.ReactNativeWebView.postMessage(JSON.stringify({current:p.getCurrentTime(),duration:p.getDuration(),playing:p.getPlayerState()===1,muted:p.isMuted()}))}catch(e){}},500)}}})};window.serein={cmd:(a,b)=>{if(!p)return;if(a==='seek')p.seekTo(Math.max(0,p.getCurrentTime()+b),true);if(a==='seekTo')p.seekTo(Math.max(0,b),true);if(a==='play')p.playVideo();if(a==='pause')p.pauseVideo();if(a==='toggle')p.getPlayerState()===1?p.pauseVideo():p.playVideo();if(a==='mute')p.isMuted()?p.unMute():p.mute();if(a==='volume')p.setVolume(b);if(a==='rate')p.setPlaybackRate(b);if(a==='quality')p.setPlaybackQuality(b);if(a==='cc')p.loadModule('captions');if(a==='ccoff')p.unloadModule('captions');if(a==='brightness')document.getElementById('player').style.filter='brightness('+({Low:.65,Medium:.85,High:1.1,Auto:1}[b]||1)+')';if(a==='fullscreen')document.getElementById('player').requestFullscreen?.();if(a==='pip')document.querySelector('iframe')?.requestPictureInPicture?.();if(a==='state')return '{}'}};</script></body></html>`, [appId, isPlatform, videoId, videoUrl]);

  const command = useCallback((action: string, value?: string | number | boolean) => {
    const arg = value === undefined ? '' : `,${JSON.stringify(value)}`;
    webRef.current?.injectJavaScript(`window.serein&&window.serein.cmd(${JSON.stringify(action)}${arg});true;`);
  }, []);
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControls.current) clearTimeout(hideControls.current);
    hideControls.current = setTimeout(() => setControlsVisible(false), 1000);
  }, []);
  const handlePlayerTouch = useCallback((event: { nativeEvent: { locationX: number } }) => {
    if (controlsVisible) { showControls(); return; }
    const now = Date.now();
    if (now - lastTapAt.current < 300) {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      command('seek', event.nativeEvent.locationX < playerWidth / 2 ? -10 : 10);
      lastTapAt.current = 0;
      setControlsVisible(false);
      if (hideControls.current) clearTimeout(hideControls.current);
      return;
    }
    lastTapAt.current = now;
    singleTapTimer.current = setTimeout(() => { showControls(); lastTapAt.current = 0; }, 300);
  }, [command, controlsVisible, playerWidth, showControls]);
  useEffect(() => () => { if (hideControls.current) clearTimeout(hideControls.current); if (singleTapTimer.current) clearTimeout(singleTapTimer.current); }, []);
  const selectPlayerOption = (menu: typeof playerMenu, value: string) => {
    setPlayerMenu(null);
    if (menu === 'speed') command('rate', Number(value));
    else if (menu === 'quality') command('quality', ({ auto: 'default', '144p': 'small', '240p': 'medium', '360p': 'large', '480p': 'large', '720p': 'hd720', '1080p': 'hd1080' } as Record<string, string>)[value] ?? 'default');
    else if (menu === 'captions') command(value === 'Off' ? 'ccoff' : 'cc', value !== 'Off');
    else if (menu === 'view') command('view', value);
    else if (menu === 'brightness') command('brightness', value);
    else if (menu === 'more' && value === 'Picture-in-picture') command('pip');
    else if (menu === 'more' && value === 'Lock controls') setLocked(!locked);
    else if (menu === 'more' && value === 'Mini-player') Alert.alert('Mini-player', 'Mini-player is not available on this device.');
    else if (menu === 'more' && value === 'Cast / devices') Alert.alert('Cast', 'No cast devices are connected.');
  };

  const loadComments = useCallback(async (tab: CommentTab) => {
    if (!videoId) return;
    if (isPlatform) {
      const data = await fetchComments(videoId, token);
      setPlatformComments(tab === 'Newest' ? [...data].reverse() : data);
    } else {
      setYoutubeComments(await getVideoComments(videoId, tab === 'Newest' ? 'time' : 'relevance'));
    }
  }, [isPlatform, token, videoId]);

  useEffect(() => {
    let active = true;
    if (!videoId) return () => { active = false; };
    if (!isPlatform) {
      void getVideoDetails(videoId).then((data) => { if (active && data) setVideo(data); }).catch(() => {});
      void getPopularVideos().then((data) => { if (active) setRecommendations(data.filter((item) => item.id !== videoId).slice(0, 8)); }).catch(() => {});
      void getVideoComments(videoId).then((data) => { if (active) setYoutubeComments(data); }).catch(() => {});
    } else {
      void apiRequest<{ video: PlatformVideo; liked: boolean; saved: boolean }>(`/api/videos/${encodeURIComponent(videoId)}`, token).then((data) => {
        if (!active) return;
        setPlatformVideo(data.video);
        setLiked(data.liked);
        setSaved(data.saved);
        setSubscribed(false);
      }).catch(() => {});
      void fetchComments(videoId, token).then((data) => { if (active) setPlatformComments(data); }).catch(() => {});
    }
    return () => { active = false; };
  }, [isPlatform, token, videoId]);

  const toggle = async (kind: 'like' | 'save') => {
    if (isPlatform) {
      if (!token || !videoId) { setError('Sign in to save your activity.'); return; }
      setBusy(true); setError('');
      try {
        await apiRequest(`/api/videos/${encodeURIComponent(videoId)}/${kind}`, token, { method: 'POST' });
        if (kind === 'like') setLiked(!liked); else setSaved(!saved);
      } catch { setError('That action couldn’t be completed. Please try again.'); }
      finally { setBusy(false); }
      return;
    }
    if (kind === 'like') { setLiked(!liked); setDisliked(false); }
    else { setSaved(!saved); Alert.alert(saved ? 'Removed from Watch later' : 'Saved to Watch later'); }
  };

  const toggleDislike = () => { setDisliked(!disliked); setLiked(false); };
  const toggleSubscribe = async () => {
    if (!isPlatform) {
      const channelUrl = video?.channelId ? `https://www.youtube.com/channel/${encodeURIComponent(video.channelId)}?sub_confirmation=1` : externalUrl;
      void Linking.openURL(channelUrl).catch(() => Alert.alert('Could not open YouTube', 'Try again when you have an internet connection.'));
      return;
    }
    if (!token) { router.push('/auth'); return; }
    if (!platformVideo?.channel.username) return;
    setBusy(true);
    try {
      const result = await apiRequest<{ subscribed: boolean }>(`/api/channels/${encodeURIComponent(platformVideo.channel.username)}/subscribe`, token, { method: 'POST' });
      setSubscribed(result.subscribed);
    } catch { setError('Your subscription could not be updated.'); }
    finally { setBusy(false); }
  };
  const postComment = async () => {
    if (!token || !videoId || !commentText.trim()) { setError('Sign in and enter a comment first.'); return; }
    setBusy(true); setError('');
    try {
      const data = await apiRequest<{ comment: Comment }>(`/api/videos/${encodeURIComponent(videoId)}/comments`, token, { method: 'POST', body: JSON.stringify({ body: commentText.trim() }) });
      setPlatformComments((current) => [data.comment, ...current]); setCommentText('');
    } catch { setError('Your comment couldn’t be posted. Please try again.'); }
    finally { setBusy(false); }
  };

  const openDownload = () => {
    setSheet(null);
    if (isPlatform) void Linking.openURL(videoUrl).catch(() => Alert.alert('Download unavailable', 'This video could not be opened for download.'));
    else Alert.alert('Watch on YouTube', 'Downloads for YouTube videos are managed in the YouTube app.', [{ text: 'Open YouTube', onPress: () => void Linking.openURL(externalUrl) }, { text: 'Cancel', style: 'cancel' }]);
  };
  const openAsk = (question: string) => { setAskText(question); setSheet('ask'); };
  const askGemini = () => {
    const prompt = askText.trim() || `Summarise this video: ${title} ${externalUrl}`;
    const url = `https://gemini.google.com/app?q=${encodeURIComponent(`${prompt}\nVideo: ${title}\n${externalUrl}`)}`;
    void Linking.openURL(url).catch(() => Alert.alert('Could not open Gemini', 'Try again when you have an internet connection.'));
  };

  const commentsCount = isPlatform ? platformComments.length : youtubeComments.length;
  const preview = isPlatform ? platformComments.slice(0, 1).map((comment) => ({ id: comment.id, author: comment.author.displayName, avatar: undefined as string | undefined, text: comment.body })) : youtubeComments.slice(0, 1);

  return <View style={[s.screen, { backgroundColor: colors.background }]}>
    <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
    <View style={s.playerArea}>
        {Platform.OS === 'web' ? <View style={[s.webFallback, { backgroundColor: colors.surface }]}><Text style={[s.title, { color: colors.text }]}>Open this video on YouTube</Text><Text style={{ color: colors.accent }} onPress={() => void Linking.openURL(isPlatform ? videoUrl : externalUrl)}>Play video</Text></View> : <>
          <WebView ref={webRef} source={{ html: playerHtml, baseUrl: isPlatform ? API_URL : `https://${appId}/` }} style={s.player} allowsFullscreenVideo javaScriptEnabled domStorageEnabled mediaPlaybackRequiresUserAction={false} setSupportMultipleWindows={false} originWhitelist={['*']} onMessage={(event) => { try { const state = JSON.parse(event.nativeEvent.data); setPlayhead({ current: state.current || 0, duration: state.duration || 0 }); if (typeof state.playing === 'boolean') setPlaying(state.playing); if (typeof state.muted === 'boolean') setMuted(state.muted); } catch { /* Ignore non-player messages. */ } }} />
          <View onLayout={(event) => setPlayerWidth(event.nativeEvent.layout.width)} style={[s.playerOverlay, locked && s.playerLocked]} pointerEvents="box-none" onTouchStart={handlePlayerTouch}>
            {!locked && controlsVisible && <>
              <View style={s.playerTopControls}>
                <PlayerButton image={playerAssets.collapse} label="Collapse player" onPress={() => safeBack()} />
                <View style={{ flex: 1 }} />
                <PlayerButton image={playerAssets.cast} label="Cast" onPress={() => Alert.alert('Cast', 'No cast devices are connected.')} />
                <PlayerButton image={playerAssets.cc} label="Subtitles" onPress={() => setPlayerMenu('captions')} />
                <PlayerButton image={playerAssets.settings} label="Player settings" onPress={() => setPlayerMenu('settings')} />
              </View>
              <View style={s.playerCenterControls}>
                <PlayerButton image={playerAssets.rewind} label="Rewind 10 seconds" onPress={() => command('seek', -10)} />
                <PlayerButton image={playing ? playerAssets.pause : playerAssets.play} label={playing ? 'Pause' : 'Play'} large onPress={() => command('toggle')} />
                <PlayerButton image={playerAssets.forward} label="Forward 10 seconds" onPress={() => command('seek', 10)} />
              </View>
              <View style={s.playerBottomControls}>
                <PlayerButton image={muted ? playerAssets.mute : playerAssets.volume} label={muted ? 'Unmute' : 'Mute'} onPress={() => { command('mute'); setMuted(!muted); }} />
                <View style={s.playerTimeline} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={(event) => command('seekTo', Math.max(0, event.nativeEvent.locationX / trackWidth * playhead.duration))} onResponderMove={(event) => command('seekTo', Math.max(0, event.nativeEvent.locationX / trackWidth * playhead.duration))}>
                  <View style={s.playerTrack}><View style={[s.playerProgress, { width: `${playhead.duration ? Math.min(100, playhead.current / playhead.duration * 100) : 0}%` }]} /><Image source={playerAssets.seekHandle} style={[s.playerSeekHandle, { left: `${playhead.duration ? Math.min(100, playhead.current / playhead.duration * 100) : 0}%` }]} /></View>
                </View>
                <Text style={s.playerTime}>{formatTime(playhead.current)} / {formatTime(playhead.duration)}</Text>
                <PlayerButton image={playerAssets.fullscreen} label="Fullscreen" onPress={() => command('fullscreen')} />
              </View>
            </>}
            {locked && <PlayerButton image={playerAssets.unlock} label="Unlock controls" onPress={() => setLocked(false)} />}
            {!controlsVisible && !locked && <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} accessibilityLabel="Player video surface" />}
          </View>
        </>}
    </View>

    <ScrollView style={s.detailsScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={[s.details, { backgroundColor: colors.background }]}>
        <Text numberOfLines={2} style={[s.title, { color: colors.text }]}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.metadata}>
          <Text numberOfLines={1} style={[s.metaText, s.metaChannel, { color: colors.text }]}>@{channel}</Text>
          {!!video?.likes && <><Text numberOfLines={1} style={[s.metaText, { color: colors.secondary }]}>{video.likes}</Text><Text style={[s.metaDot, { color: colors.muted }]}>·</Text></>}
          <Text numberOfLines={1} style={[s.metaText, { color: colors.secondary }]}>{video?.views ?? (isPlatform ? `${platformVideo?.views ?? 0} views` : '')}</Text>
          {!!uploaded && <><Text style={[s.metaDot, { color: colors.muted }]}>·</Text><Text numberOfLines={1} style={[s.metaText, { color: colors.secondary }]}>{uploaded}</Text></>}
          <Pressable onPress={() => Alert.alert('Video details', video?.description || platformVideo?.description || 'No description available.')}><Text style={[s.metaMore, { color: colors.text }]}>more</Text></Pressable>
        </ScrollView>
        <View style={s.channelRow}>
          <View style={[s.avatar, { backgroundColor: colors.accentSoft }]}><Text style={[s.avatarLetter, { color: colors.accent }]}>{channel.slice(0, 1).toUpperCase()}</Text></View>
          <Pressable onPress={() => void toggleSubscribe()} style={[s.subscribe, { backgroundColor: subscribed ? colors.elevated : colors.text }]}><Text style={{ color: subscribed ? colors.text : colors.background, fontWeight: '700', fontSize: 13 }}>{subscribed ? 'Subscribed' : 'Subscribe'}</Text></Pressable>
          <View style={s.watchActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={liked ? 'Unlike' : 'Like'} onPress={() => isPlatform ? void toggle('like') : (setLiked(!liked), setDisliked(false))} style={s.watchAction}><AppIcon name="like" color={liked ? colors.accent : colors.text} size={22} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Dislike" onPress={toggleDislike} style={s.watchAction}><AppIcon name="dislike" color={disliked ? colors.accent : colors.text} size={22} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Ask about this video" onPress={() => openAsk('')} style={s.watchAction}><AppIcon name="sparkles" color={colors.text} size={22} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={() => setSheet('more')} style={s.watchAction}><AppIcon name="more" color={colors.text} size={22} /></Pressable>
          </View>
        </View>
        {!!error && <Text style={{ color: colors.danger, fontSize: 12, paddingTop: 8 }}>{error}</Text>}
      </View>

      <Pressable accessibilityRole="button" onPress={() => setSheet('comments')} style={[s.commentPreview, { backgroundColor: colors.surface }]}>
        <View style={s.commentHeading}><Text style={[s.commentsTitle, { color: colors.text }]}>Comments</Text><Text style={[s.commentCount, { color: colors.muted }]}>{commentsCount ? compact(commentsCount) : 'View all'}</Text><View style={{ flex: 1 }} /><View style={s.commentDots}><View style={[s.dot, { backgroundColor: colors.text }]} /><View style={[s.dot, { backgroundColor: colors.border }]} /><View style={[s.dot, { backgroundColor: colors.border }]} /></View></View>
        {preview.length ? <View style={s.commentTeaser}>{preview[0].avatar ? <Image source={{ uri: preview[0].avatar }} style={s.commentAvatar} /> : <View style={[s.commentAvatar, { backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: colors.accent, fontWeight: '700' }}>{preview[0].author.slice(0, 1).toUpperCase()}</Text></View>}<Text numberOfLines={2} style={[s.commentTeaserText, { color: colors.secondary }]}>{preview[0].text}</Text></View> : <Text style={[s.emptyComment, { color: colors.muted }]}>Be the first to comment</Text>}
      </Pressable>

      {!isPlatform && recommendations.length > 0 && <View style={s.recommendedSection}><Text style={[s.sectionTitle, { color: colors.text }]}>Up next</Text>{recommendations.map((item) => <Pressable key={item.id} onPress={() => router.replace({ pathname: '/watch/[videoId]', params: { videoId: item.id, title: item.title, channel: item.channel } })} style={s.recommendation}><View style={s.recThumbWrap}><Image source={{ uri: item.thumbnail }} style={s.recThumb} /><Text style={s.durationBadge}>{item.duration ? displayDuration(item.duration) : 'Video'}</Text></View><View style={s.recMeta}><Text numberOfLines={2} style={[s.recTitle, { color: colors.text }]}>{item.title}</Text><Text numberOfLines={1} style={[s.recSub, { color: colors.muted }]}>{item.channel}</Text><Text numberOfLines={1} style={[s.recSub, { color: colors.muted }]}>{item.views} · {item.published}</Text></View><Pressable onPress={() => setSheet('more')} hitSlop={8} style={s.recMore}><AppIcon name="more" color={colors.muted} size={18} /></Pressable></Pressable>)}</View>}
      {isPlatform && <View style={[s.commentsInline, { borderTopColor: colors.border }]}><View style={s.commentInput}><TextInput value={commentText} onChangeText={setCommentText} placeholder={user ? 'Add a comment' : 'Sign in to comment'} placeholderTextColor={colors.muted} style={[s.input, { color: colors.text, backgroundColor: colors.surface }]} /><Pressable disabled={busy} onPress={() => void postComment()}><Text style={{ color: colors.accent, fontWeight: '700' }}>Post</Text></Pressable></View>{platformComments.slice(0, 4).map((comment) => <CommentRow key={comment.id} author={comment.author.displayName} text={comment.body} colors={colors} />)}</View>}
      {busy && <ActivityIndicator color={colors.accent} style={{ margin: 16 }} />}
    </ScrollView>

    <SheetModal visible={sheet !== null} onClose={() => setSheet(null)} colors={colors}>
      {sheet === 'more' && <><View style={s.handle} /><MenuRow icon="download" label="Download" colors={colors} onPress={openDownload} /><MenuRow icon="save" label={saved ? 'Remove from Watch later' : 'Save to Watch later'} colors={colors} onPress={() => void toggle('save')} /><MenuRow icon="flag" label="Report" colors={colors} onPress={() => { setSheet(null); Alert.alert('Report video', 'To report this video, open it on YouTube.', [{ text: 'Open YouTube', onPress: () => void Linking.openURL(externalUrl) }, { text: 'Cancel', style: 'cancel' }]); }} /></>}
      {sheet === 'comments' && <><View style={s.sheetHeader}><View style={s.handle} /><Text style={[s.sheetTitle, { color: colors.text }]}>Comments <Text style={{ color: colors.muted, fontWeight: '400' }}>{commentsCount ? compact(commentsCount) : ''}</Text></Text><Pressable onPress={() => setSheet(null)}><AppIcon name="close" color={colors.text} size={22} /></Pressable></View><View style={[s.commentTabs, { borderBottomColor: colors.border }]}>{(['Top', 'Newest'] as CommentTab[]).map((tab) => <Pressable key={tab} onPress={() => { setCommentTab(tab); void loadComments(tab); }} style={[s.commentTab, { backgroundColor: commentTab === tab ? colors.text : colors.elevated }]}><Text style={{ color: commentTab === tab ? colors.background : colors.text, fontWeight: '600' }}>{tab}</Text></Pressable>)}</View><ScrollView style={s.sheetScroll} contentContainerStyle={{ paddingBottom: 22 }}>{isPlatform ? platformComments.map((comment) => <CommentRow key={comment.id} author={comment.author.displayName} text={comment.body} colors={colors} />) : youtubeComments.map((comment) => <CommentRow key={comment.id} author={`${comment.author} · ${comment.published}`} text={comment.text} colors={colors} />)}{!commentsCount && <Text style={[s.sheetEmpty, { color: colors.muted }]}>Comments are turned off or unavailable for this video.</Text>}</ScrollView>{isPlatform ? <View style={[s.sheetInputWrap, { borderTopColor: colors.border }]}><TextInput value={commentText} onChangeText={setCommentText} placeholder={user ? 'Comment…' : 'Sign in to comment'} placeholderTextColor={colors.muted} style={[s.input, { color: colors.text, backgroundColor: colors.surface }]} /><Pressable onPress={() => void postComment()}><Text style={{ color: colors.accent, fontWeight: '700' }}>Post</Text></Pressable></View> : <Text style={[s.readOnlyNote, { color: colors.muted }]}>YouTube comments are read only here.</Text>}</>}
      {sheet === 'ask' && <><View style={s.sheetHeader}><View style={s.handle} /><Text style={[s.sheetTitle, { color: colors.text }]}>Ask about this video</Text><Pressable onPress={() => setSheet(null)}><AppIcon name="close" color={colors.text} size={22} /></Pressable></View><View style={[s.sheetRule, { backgroundColor: colors.border }]} /><ScrollView contentContainerStyle={s.askOptions}>{[`Summarise the video`, `Recommend related content`, `What is this video about?`, `Key points from ${channel}?`].map((prompt, index) => <Pressable key={prompt} onPress={() => openAsk(prompt)} style={[s.askOption, { borderColor: colors.border }]}><AppIcon name={index === 0 ? 'library' : index === 1 ? 'play' : 'comment'} color={colors.text} size={20} /><Text style={[s.askOptionText, { color: colors.text }]}>{prompt}</Text></Pressable>)}</ScrollView><Text style={[s.aiNote, { color: colors.muted }]}>Ask Gemini about this video</Text><View style={[s.askInputRow, { backgroundColor: colors.surface }]}><TextInput value={askText} onChangeText={setAskText} placeholder="Ask a question…" placeholderTextColor={colors.muted} style={[s.askInput, { color: colors.text }]} /><Pressable accessibilityRole="button" accessibilityLabel="Ask Gemini" onPress={askGemini} style={s.sendButton}><AppIcon name="send" color={colors.accent} size={23} /></Pressable></View><Pressable onPress={askGemini} style={[s.geminiButton, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>Ask ✦ Gemini</Text></Pressable></>}
    </SheetModal>
    <Modal visible={playerMenu !== null} transparent animationType="fade" onRequestClose={() => setPlayerMenu(null)}>
      <View style={s.playerMenuBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setPlayerMenu(null)} /><View style={[s.playerMenu, { backgroundColor: colors.background }]}><Text style={[s.playerMenuTitle, { color: colors.text }]}>{playerMenu === 'settings' ? 'Player settings' : playerMenu === 'speed' ? 'Playback speed' : playerMenu === 'quality' ? 'Video quality' : playerMenu === 'captions' ? 'Subtitles / CC' : playerMenu === 'view' ? 'Screen ratio / view' : playerMenu === 'brightness' ? 'Brightness' : 'More player options'}</Text>
        {(playerMenu === 'settings' ? [['Playback speed', 'speed'], ['Video quality', 'quality'], ['Subtitles / CC', 'captions'], ['Screen ratio / view', 'view'], ['Brightness', 'brightness'], ['More options', 'more']] : playerMenu === 'speed' ? ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'].map((v) => [`${v}x`, v]) : playerMenu === 'quality' ? ['auto', '144p', '240p', '360p', '480p', '720p', '1080p'].map((v) => [v, v]) : playerMenu === 'captions' ? [['Off', 'Off'], ['On', 'English']] : playerMenu === 'view' ? [['Fit', 'Fit'], ['Fill', 'Fill'], ['16:9', '16:9'], ['4:3', '4:3'], ['Crop', 'Crop']] : playerMenu === 'brightness' ? [['Low', 'Low'], ['Medium', 'Medium'], ['High', 'High'], ['Auto', 'Auto']] : [['Volume / mute', 'volume'], ['Picture-in-picture', 'Picture-in-picture'], ['Lock controls', 'Lock controls'], ['Mini-player', 'Mini-player'], ['Cast / devices', 'Cast / devices'], ['Screen view', 'Screen view']]).map(([label, value]) => <Pressable key={value} style={[s.playerMenuRow, { borderBottomColor: colors.border }]} onPress={() => { if (value === 'volume') { setMuted(!muted); command('mute'); setPlayerMenu(null); } else selectPlayerOption(playerMenu, value); }}><Text style={[s.playerMenuText, { color: colors.text }]}>{label}</Text></Pressable>)}
      </View></View>
    </Modal>
  </View>;
}

function displayDuration(value: string) {
  if (!value.startsWith('PT')) return value;
  const hours = Number(value.match(/(\d+)H/)?.[1] ?? 0);
  const minutes = Number(value.match(/(\d+)M/)?.[1] ?? 0);
  const seconds = Number(value.match(/(\d+)S/)?.[1] ?? 0);
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function compact(value: number) { return new Intl.NumberFormat('en', { notation: 'compact' }).format(value); }
function formatTime(seconds: number) { if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'; const value = Math.floor(seconds); return `${Math.floor(value / 3600) ? `${Math.floor(value / 3600)}:` : ''}${String(Math.floor(value / 60) % 60).padStart(Math.floor(value / 3600) ? 2 : 1, '0')}:${String(value % 60).padStart(2, '0')}`; }

function PlayerButton({ image, label, onPress, large = false }: { image: number; label: string; onPress: () => void; large?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={4} onPress={onPress} style={[s.playerIconButton, large && s.playerIconLarge]}><Image source={image} resizeMode="contain" style={[s.playerIconImage, large && s.playerIconImageLarge]} /></Pressable>;
}

function MenuRow({ icon, label, colors, onPress }: { icon: 'download' | 'save' | 'flag'; label: string; colors: ThemeColors; onPress: () => void }) {
  return <Pressable onPress={onPress} style={s.menuRow}><AppIcon name={icon} color={colors.text} size={23} /><Text style={[s.menuText, { color: colors.text }]}>{label}</Text></Pressable>;
}

function CommentRow({ author, text, colors }: { author: string; text: string; colors: ThemeColors }) {
  return <View style={s.commentRow}><View style={[s.commentAvatar, { backgroundColor: colors.accentSoft }]}><Text style={{ color: colors.accent, fontWeight: '700' }}>{author.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={[s.commentAuthor, { color: colors.muted }]}>{author}</Text><Text style={[s.commentBody, { color: colors.text }]}>{text}</Text><View style={s.commentActions}><AppIcon name="like" color={colors.text} size={16} /><AppIcon name="dislike" color={colors.text} size={16} /><AppIcon name="comment" color={colors.text} size={16} /></View></View><AppIcon name="more" color={colors.muted} size={18} /></View>;
}

function SheetModal({ visible, onClose, colors, children }: { visible: boolean; onClose: () => void; colors: ThemeColors; children: ReactNode }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent><View style={s.modalRoot}><Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={onClose} style={s.scrim} /><View style={[s.sheet, { backgroundColor: colors.background }]}>{children}</View></View></Modal>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, playerArea: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', position: 'relative' }, detailsScroll: { flex: 1 }, playerHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 6 }, playerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, playerHeaderTitle: { color: '#fff', flex: 1, fontSize: 13, fontWeight: '600' }, player: { ...StyleSheet.absoluteFill, backgroundColor: '#000' }, playerOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' }, playerLocked: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 12 }, playerTopControls: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, backgroundColor: 'transparent' }, playerCenterControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', backgroundColor: 'transparent' }, playerBottomControls: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, gap: 5, backgroundColor: 'transparent' }, playerIconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, playerIconLarge: { width: 54, height: 54 }, playerIconImage: { width: 23, height: 23 }, playerIconImageLarge: { width: 33, height: 33 }, playerTimeline: { height: 35, flex: 1, justifyContent: 'center', paddingHorizontal: 6 }, playerTrack: { height: 4, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.78)' }, playerProgress: { height: 4, borderRadius: 3, backgroundColor: '#ff0033' }, playerSeekHandle: { position: 'absolute', width: 17, height: 17, top: -7, marginLeft: -8, resizeMode: 'contain' }, playerTime: { minWidth: 82, color: '#fff', fontSize: 11, fontVariant: ['tabular-nums'] }, playerMenuBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.62)', padding: 26 }, playerMenu: { width: '100%', maxWidth: 360, maxHeight: '80%', borderRadius: 14, paddingHorizontal: 17, paddingTop: 16, overflow: 'hidden' }, playerMenuTitle: { fontSize: 17, fontWeight: '700', paddingBottom: 10 }, playerMenuRow: { minHeight: 45, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth }, playerMenuText: { fontSize: 14 }, webFallback: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 15 },
  details: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 13, gap: 8 }, title: { fontSize: 18, lineHeight: 24, fontWeight: '700' }, metadata: { flexDirection: 'row', alignItems: 'center', gap: 7 }, metaText: { fontSize: 12 }, metaDot: { fontSize: 12 }, metaMore: { fontSize: 12, fontWeight: '700', marginLeft: 3 }, channelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }, avatar: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, avatarImage: { width: '100%', height: '100%' }, avatarLetter: { fontSize: 16, fontWeight: '800' }, channelCopy: { flex: 1, minWidth: 0, gap: 2 }, channelName: { fontSize: 14, fontWeight: '700' }, subCount: { fontSize: 11 }, subscribe: { minHeight: 38, minWidth: 98, paddingHorizontal: 15, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, actionRow: { alignItems: 'center', gap: 8, paddingTop: 11, paddingBottom: 1 }, votePill: { height: 40, borderRadius: 21, flexDirection: 'row', alignItems: 'center' }, voteButton: { height: '100%', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 }, dislikeButton: { height: '100%', minWidth: 43, alignItems: 'center', justifyContent: 'center' }, voteDivider: { width: StyleSheet.hairlineWidth, height: 22 }, action: { height: 40, borderRadius: 21, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 }, actionText: { fontSize: 12, fontWeight: '600' },
  metaChannel: { fontWeight: '700' }, watchActions: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: 2 }, watchAction: { width: 28, height: 40, alignItems: 'center', justifyContent: 'center' },
  commentPreview: { marginHorizontal: 12, marginTop: 7, marginBottom: 18, borderRadius: 17, paddingHorizontal: 15, paddingVertical: 13 }, commentHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, commentsTitle: { fontSize: 15, fontWeight: '700' }, commentCount: { fontSize: 13 }, commentDots: { flexDirection: 'row', gap: 6 }, dot: { width: 8, height: 8, borderRadius: 4 }, commentTeaser: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 }, commentAvatar: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden' }, commentTeaserText: { flex: 1, fontSize: 13, lineHeight: 19 }, emptyComment: { fontSize: 12, paddingTop: 10 },
  recommendedSection: { paddingTop: 3 }, sectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 15, paddingBottom: 10 }, recommendation: { marginBottom: 16 }, recThumbWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#111' }, recThumb: { width: '100%', height: '100%' }, durationBadge: { position: 'absolute', right: 9, bottom: 8, paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden', borderRadius: 4, color: '#fff', fontSize: 10, fontWeight: '700', backgroundColor: 'rgba(0,0,0,.8)' }, recMeta: { paddingHorizontal: 14, paddingTop: 9, paddingRight: 48, gap: 3 }, recTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19 }, recSub: { fontSize: 11 }, recMore: { position: 'absolute', right: 13, top: undefined, bottom: 24, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }, commentsInline: { borderTopWidth: StyleSheet.hairlineWidth, padding: 15 }, commentInput: { flexDirection: 'row', alignItems: 'center', gap: 12 }, input: { flex: 1, minHeight: 42, borderRadius: 22, paddingHorizontal: 15, fontSize: 13 }, commentAuthor: { fontSize: 11 }, commentBody: { fontSize: 13, lineHeight: 19, marginTop: 3 }, commentActions: { flexDirection: 'row', gap: 23, marginTop: 12 }, commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 17, paddingVertical: 16 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' }, scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.58)' }, sheet: { maxHeight: '88%', minHeight: 90, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingBottom: Platform.OS === 'android' ? 16 : 28, overflow: 'hidden' }, handle: { width: 42, height: 5, borderRadius: 4, alignSelf: 'center', backgroundColor: '#D8D8D8', marginBottom: 17 }, menuRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 19, paddingHorizontal: 27 }, menuText: { fontSize: 16 }, sheetHeader: { minHeight: 59, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 15 }, sheetTitle: { flex: 1, fontSize: 20, fontWeight: '700' }, sheetRule: { height: StyleSheet.hairlineWidth, marginTop: 5 }, commentTabs: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 17, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth }, commentTab: { paddingHorizontal: 17, paddingVertical: 10, borderRadius: 20 }, sheetScroll: { minHeight: 120 }, sheetEmpty: { textAlign: 'center', padding: 30, fontSize: 13 }, sheetInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderTopWidth: StyleSheet.hairlineWidth }, readOnlyNote: { textAlign: 'center', fontSize: 11, paddingVertical: 13 }, askOptions: { paddingHorizontal: 16, paddingTop: 12, gap: 10 }, askOption: { minHeight: 62, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 17 }, askOptionText: { fontSize: 14, flex: 1 }, aiNote: { textAlign: 'center', fontSize: 12, paddingTop: 13, paddingBottom: 9 }, askInputRow: { marginHorizontal: 16, minHeight: 52, borderRadius: 26, paddingLeft: 16, paddingRight: 8, flexDirection: 'row', alignItems: 'center' }, askInput: { flex: 1, fontSize: 14 }, sendButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, geminiButton: { alignSelf: 'center', minWidth: 145, minHeight: 36, borderWidth: 1, borderRadius: 20, marginTop: 11, marginBottom: 4, alignItems: 'center', justifyContent: 'center' },
});
