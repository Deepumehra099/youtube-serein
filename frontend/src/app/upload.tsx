import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppProvider';
import { useTheme } from '../context/ThemeProvider';
import { createPlatformVideo, NewVideo, uploadPlatformMedia } from '../services/api';
import { safeBack } from '../navigation';

const categories = ['Music', 'Gaming', 'Learning', 'Nature', 'Technology', 'General'];
const maxBytes = 50 * 1024 * 1024;

export default function UploadScreen() {
  const { colors } = useTheme();
  const { token, user } = useApp();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [visibility, setVisibility] = useState<NewVideo['visibility']>('public');
  const [progress, setProgress] = useState(0);
  const [draftId, setDraftId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const chooseVideo = async () => {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1, videoMaxDuration: 600 });
    if (result.canceled) return;
    const selected = result.assets[0];
    if (selected.fileSize && selected.fileSize > maxBytes) { setError('Choose a video smaller than 50 MB.'); return; }
    if (selected.mimeType && !['video/mp4', 'video/webm'].includes(selected.mimeType)) { setError('Upload an MP4 or WebM video.'); return; }
    setAsset(selected);
  };

  const publish = async () => {
    setError('');
    if (!token || !user) { router.push('/auth'); return; }
    if (!asset) { setError('Choose a video file first.'); return; }
    if (!title.trim()) { setError('Add a title before publishing.'); return; }
    const mimeType = asset.mimeType ?? (asset.uri.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4');
    if (!['video/mp4', 'video/webm'].includes(mimeType)) { setError('This file is not MP4 or WebM.'); return; }
    setBusy(true);
    try {
      let id = draftId;
      if (!id) {
        const created = await createPlatformVideo(token, { title: title.trim(), description: description.trim(), category, visibility, tags: [] });
        id = created.id;
        setDraftId(id);
      }
      const uploaded = await uploadPlatformMedia(token, id, asset.uri, mimeType, setProgress);
      router.replace({ pathname: '/watch/[videoId]', params: { videoId: uploaded.id, title: uploaded.title, channel: uploaded.channel.displayName, source: 'platform' } });
    } catch {
      setError('Upload didn’t finish. Check your connection and try again.');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={[s.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}><Pressable onPress={() => safeBack('/(tabs)')} style={[s.back, { backgroundColor: colors.elevated }]}><Text style={{ color: colors.text }}>Back</Text></Pressable><Text style={[s.heading, { color: colors.text }]}>Create</Text></View>
      {!token ? <View style={[s.signInCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[s.title, { color: colors.text }]}>Share something good.</Text><Text style={[s.helper, { color: colors.muted }]}>Sign in to publish your own videos to Serein.</Text><Pressable onPress={() => router.push('/auth')} style={[s.primary, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentText, fontWeight: '800' }}>Sign in to upload</Text></Pressable></View> : <>
        <Pressable accessibilityRole="button" onPress={() => void chooseVideo()} style={[s.fileBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[s.fileIcon, { backgroundColor: colors.accentSoft }]}><Text style={{ color: colors.accent, fontSize: 21 }}>+</Text></View>
          <Text style={[s.fileTitle, { color: colors.text }]}>{asset?.fileName ?? 'Choose a video'}</Text>
          <Text style={[s.helper, { color: colors.muted }]}>{asset ? 'Tap to choose a different video' : 'MP4 or WebM · up to 50 MB'}</Text>
        </Pressable>
        <Text style={[s.label, { color: colors.secondary }]}>Title</Text><TextInput accessibilityLabel="Video title" value={title} onChangeText={setTitle} maxLength={120} placeholder="Give your video a title" placeholderTextColor={colors.muted} style={[s.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
        <Text style={[s.label, { color: colors.secondary }]}>Description</Text><TextInput accessibilityLabel="Video description" value={description} onChangeText={setDescription} maxLength={5000} multiline textAlignVertical="top" placeholder="Tell viewers about your video" placeholderTextColor={colors.muted} style={[s.input, s.description, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
        <Text style={[s.label, { color: colors.secondary }]}>Category</Text><View style={s.options}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[s.option, { backgroundColor: category === item ? colors.accent : colors.surface, borderColor: colors.border }]}><Text style={{ color: category === item ? colors.accentText : colors.text, fontSize: 11, fontWeight: '700' }}>{item}</Text></Pressable>)}</View>
        <Text style={[s.label, { color: colors.secondary }]}>Visibility</Text><View style={s.visibility}>{(['public', 'unlisted', 'private'] as const).map((item) => <Pressable key={item} onPress={() => setVisibility(item)} style={[s.visibilityOption, { borderColor: visibility === item ? colors.accent : colors.border, backgroundColor: visibility === item ? colors.accentSoft : colors.surface }]}><Text style={{ color: colors.text, textTransform: 'capitalize', fontSize: 12, fontWeight: '700' }}>{item}</Text></Pressable>)}</View>
        {busy && <View style={s.progress}><View style={[s.progressFill, { width: `${Math.max(4, Math.round(progress * 100))}%`, backgroundColor: colors.accent }]} /><Text style={{ color: colors.muted, fontSize: 11, marginTop: 7 }}>Uploading {Math.round(progress * 100)}%</Text></View>}
        {!!error && <Text accessibilityRole="alert" style={[s.error, { color: colors.danger }]}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void publish()} style={[s.primary, { backgroundColor: colors.accent, opacity: busy ? 0.7 : 1 }]}>{busy ? <ActivityIndicator color={colors.accentText} /> : <Text style={{ color: colors.accentText, fontWeight: '800' }}>{draftId ? 'Retry upload' : 'Publish video'}</Text>}</Pressable>
      </>}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 34 },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }, back: { minWidth: 52, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 }, heading: { fontSize: 22, fontWeight: '800' },
  signInCard: { borderWidth: 1, borderRadius: 17, padding: 18 }, title: { fontSize: 20, fontWeight: '800' }, helper: { fontSize: 11, lineHeight: 17, marginTop: 5 },
  fileBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 16, minHeight: 125, alignItems: 'center', justifyContent: 'center', padding: 13, marginBottom: 20 }, fileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }, fileTitle: { maxWidth: '95%', fontSize: 13, fontWeight: '700' },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 7, marginTop: 12 }, input: { minHeight: 47, borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, fontSize: 13 }, description: { height: 98, paddingTop: 11 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, option: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 }, visibility: { flexDirection: 'row', gap: 8 }, visibilityOption: { flex: 1, alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingVertical: 10 },
  progress: { marginTop: 18 }, progressFill: { height: 4, borderRadius: 4 }, error: { marginTop: 12, lineHeight: 18, fontSize: 12 }, primary: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, marginTop: 18 },
});
