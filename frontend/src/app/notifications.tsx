import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppProvider';
import { useTheme } from '../context/ThemeProvider';
import { apiRequest } from '../services/api';
import { safeBack } from '../navigation';
import { AppIcon } from '../components/Icon';

type NotificationItem = { id: string; message: string; kind: string; videoId: string | null; readAt: string | null; createdAt: string };

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { token, user } = useApp();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void apiRequest<{ items: NotificationItem[] }>('/api/notifications?limit=30', token).then((data) => setItems(data.items)).catch(() => setError('Notifications couldn’t load. Check your connection and try again.')).finally(() => setLoading(false));
  }, [token]);
  const readAll = async () => {
    if (!token) return;
    await apiRequest('/api/notifications/read-all', token, { method: 'POST' });
    setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
  };
  const markRead = async (item: NotificationItem) => {
    if (!token || item.readAt) return;
    await apiRequest(`/api/notifications/${encodeURIComponent(item.id)}/read`, token, { method: 'POST' });
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
  };
  return <View style={[s.screen, { backgroundColor: colors.background }]}><View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => safeBack('/(tabs)')} style={s.back}><AppIcon name="back" color={colors.text} size={21} /></Pressable><Text style={[s.title, { color: colors.text }]}>Notifications</Text>{!!items.length && <Pressable onPress={() => void readAll()}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>Mark all read</Text></Pressable>}</View>
    {!user && <View style={s.empty}><Text style={[s.heading, { color: colors.text }]}>Sign in to see notifications</Text><Text style={[s.body, { color: colors.muted }]}>Creator updates and replies will appear here.</Text><Pressable onPress={() => router.push('/auth')} style={[s.button, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentText, fontWeight: '700' }}>Sign in</Text></Pressable></View>}
    {user && loading && <ActivityIndicator style={{ marginTop: 30 }} color={colors.accent} />}{!!error && <Text style={[s.body, { color: colors.danger }]}>{error}</Text>}
    {user && !loading && !error && items.length === 0 && <View style={s.empty}><Text style={[s.heading, { color: colors.text }]}>You’re all caught up</Text><Text style={[s.body, { color: colors.muted }]}>New subscriptions, likes, and comments will show up here.</Text></View>}
    <ScrollView>{items.map((item) => <Pressable key={item.id} onPress={() => void markRead(item)} style={[s.item, { backgroundColor: item.readAt ? colors.background : colors.surface, borderBottomColor: colors.border }]}><View style={[s.dot, { backgroundColor: item.readAt ? colors.muted : colors.accent }]} /><View style={{ flex: 1 }}><Text style={[s.body, { color: colors.text }]}>{item.message}</Text><Text style={[s.time, { color: colors.muted }]}>{new Date(item.createdAt).toLocaleString()}</Text></View></Pressable>)}</ScrollView>
  </View>;
}

const s = StyleSheet.create({ screen: { flex: 1, paddingHorizontal: 18 }, header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 }, back: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, title: { flex: 1, fontSize: 21, fontWeight: '800' }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 45 }, heading: { fontSize: 18, fontWeight: '800', textAlign: 'center' }, body: { fontSize: 12, lineHeight: 18 }, button: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 17, borderRadius: 12 }, item: { minHeight: 68, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 11 }, dot: { width: 8, height: 8, borderRadius: 4 }, time: { marginTop: 5, fontSize: 10 } });
