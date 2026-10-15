import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { safeBack } from '../navigation';
import { AppIcon } from '../components/Icon';
import { useTheme } from '../context/ThemeProvider';

const topics = ['Video playback', 'Search', 'Comments', 'Account', 'Privacy', 'Suggestions', 'Other'];

export default function FeedbackScreen() {
  const { colors } = useTheme();
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const send = () => void Share.share({ title: 'Serein feedback', message: `Topic: ${selected}\n\n${note.trim()}` });
  return <KeyboardAvoidingView style={[s.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack('/settings')} style={s.back}><AppIcon name="back" color={colors.text} size={21} /></Pressable><Text style={[s.title, { color: colors.text }]}>Feedback</Text></View>
    <Text style={[s.intro, { color: colors.text }]}>How can we improve?</Text><Text style={[s.hint, { color: colors.muted }]}>Choose a topic, then share a note.</Text>
    <View style={[s.list, { borderTopColor: colors.border }]}>{topics.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: selected === item }} onPress={() => setSelected(item)} style={[s.item, { borderBottomColor: colors.border }, selected === item && { backgroundColor: colors.accentSoft }]}><Text style={[s.itemText, { color: selected === item ? colors.accent : colors.text }]}>{item}</Text>{selected === item && <View style={[s.selectedDot, { backgroundColor: colors.accent }]} />}</Pressable>)}</View>
    {!!selected && <><TextInput accessibilityLabel="Feedback note" value={note} onChangeText={setNote} placeholder="Tell us a little more" placeholderTextColor={colors.muted} multiline textAlignVertical="top" style={[s.input, { backgroundColor: colors.surface, color: colors.text }]} /><Pressable disabled={!note.trim()} onPress={send} style={[s.submit, { backgroundColor: colors.accent, opacity: note.trim() ? 1 : 0.45 }]}><Text style={{ color: colors.accentText, fontSize: 12, fontWeight: '700' }}>Share feedback</Text></Pressable></>}
  </ScrollView></KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 32 }, header: { height: 54, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }, back: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 23, fontWeight: '800' },
  intro: { fontSize: 18, fontWeight: '700' }, hint: { fontSize: 12, marginTop: 5, marginBottom: 14 }, list: { borderTopWidth: StyleSheet.hairlineWidth }, item: { minHeight: 49, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, borderRadius: 8 }, itemText: { fontSize: 13 }, selectedDot: { width: 7, height: 7, borderRadius: 4 },
  input: { minHeight: 92, marginTop: 15, borderRadius: 12, padding: 12, fontSize: 13 }, submit: { minHeight: 43, marginTop: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
