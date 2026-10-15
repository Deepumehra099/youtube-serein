import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, View,
} from 'react-native';
import { useApp } from '../context/AppProvider';
import { useTheme } from '../context/ThemeProvider';
import { safeBack } from '../navigation';
import {
  AdminDashboard, AdminReport, AdminUser, AdminVideo, fetchAdminDashboard,
  fetchAdminReports, fetchAdminUsers, fetchAdminVideos, updateAdminReport,
  updateAdminUser, updateAdminVideo,
} from '../services/api';

type Section = 'overview' | 'reports' | 'videos' | 'users';
type ReportFilter = AdminReport['status'] | 'all';
type VideoFilter = AdminVideo['moderationStatus'] | 'all';
type UserFilter = AdminUser['status'] | 'all';

const sections: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Overview' }, { id: 'reports', label: 'Reports' },
  { id: 'videos', label: 'Videos' }, { id: 'users', label: 'Users' },
];
const pageSize = 20;

function confirmAction(title: string, message: string, action: string) {
  if (Platform.OS === 'web') {
    const confirmFn = (globalThis as typeof globalThis & { confirm?: (text: string) => boolean }).confirm;
    return Promise.resolve(confirmFn?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise<boolean>((resolve) => Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: action, style: 'destructive', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

export default function AdminScreen() {
  const { colors } = useTheme();
  const { user, token, ready } = useApp();
  const [section, setSection] = useState<Section>('overview');
  const [reportFilter, setReportFilter] = useState<ReportFilter>('open');
  const [videoFilter, setVideoFilter] = useState<VideoFilter>('all');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    if (!token || user?.role !== 'admin') return;
    setLoading(true);
    setError('');
    try {
      if (section === 'overview') setDashboard(await fetchAdminDashboard(token));
      if (section === 'reports') {
        const page = await fetchAdminReports(token, reportFilter, offset);
        setReports(page.items); setTotal(page.total);
      }
      if (section === 'videos') {
        const page = await fetchAdminVideos(token, videoFilter, search, offset);
        setVideos(page.items); setTotal(page.total);
      }
      if (section === 'users') {
        const page = await fetchAdminUsers(token, userFilter, search, offset);
        setUsers(page.items); setTotal(page.total);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Admin data could not be loaded.');
    } finally { setLoading(false); }
  }, [token, user?.role, section, reportFilter, videoFilter, userFilter, search, offset]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(id); setError(''); setNotice('');
    try { await action(); setNotice(success); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The action could not be completed.'); }
    finally { setBusyId(''); }
  };

  const setSectionAndReset = (next: Section) => { setSection(next); setOffset(0); setSearchInput(''); setSearch(''); setNotice(''); };
  const applySearch = () => { setSearch(searchInput.trim()); setOffset(0); };
  const changeReportFilter = (value: ReportFilter) => { setReportFilter(value); setOffset(0); };
  const changeVideoFilter = (value: VideoFilter) => { setVideoFilter(value); setOffset(0); };
  const changeUserFilter = (value: UserFilter) => { setUserFilter(value); setOffset(0); };

  const updateReport = (report: AdminReport, status: Exclude<ReportFilter, 'all'>) =>
    runAction(report.id, () => updateAdminReport(token!, report.id, status), `Report ${status}.`);

  const updateVideo = async (video: AdminVideo, moderationStatus: Exclude<VideoFilter, 'all'>) => {
    if (moderationStatus === 'removed' && !await confirmAction('Remove this video?', 'It will disappear from viewer feeds. You can restore it later from this panel.', 'Remove video')) return;
    await runAction(video.id, () => updateAdminVideo(token!, video.id, moderationStatus), `Video marked ${moderationStatus}.`);
  };

  const updateUser = async (target: AdminUser) => {
    const status: AdminUser['status'] = target.status === 'active' ? 'disabled' : 'active';
    if (status === 'disabled' && !await confirmAction('Disable this account?', 'The user will be signed out and will not be able to use the service until restored.', 'Disable account')) return;
    await runAction(target.id, () => updateAdminUser(token!, target.id, status), `Account ${status}.`);
  };

  const colorsStyle = { backgroundColor: colors.background };
  const panelStyle = { backgroundColor: colors.surface, borderColor: colors.border };
  const textStyle = { color: colors.text };

  if (!ready) return <View style={[s.center, colorsStyle]}><ActivityIndicator color={colors.accent} /></View>;
  if (!user || !token) return (
    <View style={[s.center, colorsStyle]}>
      <Text style={[s.deniedTitle, textStyle]}>Sign in to continue</Text>
      <Text style={[s.sub, { color: colors.muted }]}>Admin access requires an authorized Serein account.</Text>
      <Pressable onPress={() => router.push('/auth')} style={[s.primaryButton, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentText, fontWeight: '800' }}>Sign in</Text></Pressable>
      <Pressable onPress={() => safeBack('/(tabs)/library')}><Text style={[s.backText, { color: colors.muted }]}>Go back</Text></Pressable>
    </View>
  );
  if (user.role !== 'admin') return (
    <View style={[s.center, colorsStyle]}>
      <Text style={[s.deniedTitle, textStyle]}>Admin access required</Text>
      <Text style={[s.sub, { color: colors.muted }]}>This account does not have permission to open the admin panel.</Text>
      <Pressable onPress={() => safeBack('/(tabs)/library')}><Text style={[s.backText, { color: colors.accent }]}>Go back</Text></Pressable>
    </View>
  );

  const choices = <T extends string>(values: T[], selected: T, onSelect: (value: T) => void) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {values.map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: selected === value }} onPress={() => onSelect(value)} style={[s.chip, { backgroundColor: selected === value ? colors.accent : colors.elevated }]}><Text style={[s.chipText, { color: selected === value ? colors.accentText : colors.secondary }]}>{value[0].toUpperCase() + value.slice(1)}</Text></Pressable>)}
    </ScrollView>
  );

  const actionButton = (label: string, onPress: () => void, options: { danger?: boolean; disabled?: boolean } = {}) => (
    <Pressable accessibilityRole="button" disabled={options.disabled} onPress={onPress} style={[s.action, { borderColor: options.danger ? colors.danger : colors.border, opacity: options.disabled ? 0.45 : 1 }]}><Text style={{ color: options.danger ? colors.danger : colors.text, fontSize: 11, fontWeight: '700' }}>{label}</Text></Pressable>
  );

  return (
    <View style={[s.screen, colorsStyle]}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Pressable accessibilityRole="button" onPress={() => safeBack('/(tabs)/library')} style={[s.back, { backgroundColor: colors.elevated }]}><Text style={textStyle}>‹</Text></Pressable>
        <View style={s.headerCopy}><Text style={[s.eyebrow, { color: colors.accent }]}>SEREIN CONTROL</Text><Text style={[s.title, textStyle]}>Admin panel</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh admin data" onPress={() => void load()} style={[s.refresh, { backgroundColor: colors.elevated }]}><Text style={[s.refreshText, { color: colors.accent }]}>↻</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sectionRow}>
        {sections.map((item) => <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: section === item.id }} onPress={() => setSectionAndReset(item.id)} style={[s.sectionTab, { backgroundColor: section === item.id ? colors.accent : colors.elevated }]}><Text style={{ color: section === item.id ? colors.accentText : colors.secondary, fontSize: 12, fontWeight: '800' }}>{item.label}</Text></Pressable>)}
      </ScrollView>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.accent} colors={[colors.accent]} />}
        keyboardShouldPersistTaps="handled"
      >
        {!!error && <View style={[s.message, { backgroundColor: colors.dangerSoft }]}><Text style={{ color: colors.danger, flex: 1, fontSize: 12 }}>{error}</Text><Pressable onPress={() => void load()}><Text style={{ color: colors.danger, fontWeight: '800' }}>Retry</Text></Pressable></View>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={[s.notice, { color: colors.accent }]}>{notice}</Text>}
        {section === 'overview' && <>
          <Text style={[s.sectionTitle, textStyle]}>Platform overview</Text>
          <Text style={[s.sub, { color: colors.muted }]}>Signed in as {user.displayName} · administrator</Text>
          {dashboard ? <View style={s.statsGrid}>
            <Stat label="Users" value={dashboard.users} colors={colors} />
            <Stat label="Active users" value={dashboard.usersActive} colors={colors} />
            <Stat label="Disabled users" value={dashboard.usersDisabled} colors={colors} />
            <Stat label="Videos" value={dashboard.videos} colors={colors} />
            <Stat label="Open reports" value={dashboard.reportsOpen} colors={colors} />
            <Stat label="Hidden or removed" value={dashboard.videosHidden} colors={colors} />
            <Stat label="Comments" value={dashboard.comments} colors={colors} />
          </View> : loading ? <ActivityIndicator style={s.loader} color={colors.accent} /> : <Empty text="Overview data is unavailable." colors={colors} />}
          <Text style={[s.sectionTitle, { color: colors.text, marginTop: 22 }]}>Manage the platform</Text>
          <View style={s.quickGrid}>{sections.filter((item) => item.id !== 'overview').map((item) => <Pressable key={item.id} onPress={() => setSectionAndReset(item.id)} style={[s.quick, panelStyle]}><Text style={[s.quickTitle, textStyle]}>{item.label}</Text><Text style={[s.quickSub, { color: colors.muted }]}>{item.id === 'reports' ? `${dashboard?.reportsOpen ?? '—'} awaiting review` : item.id === 'videos' ? 'Visibility and moderation' : 'Account access controls'}</Text></Pressable>)}</View>
        </>}

        {section === 'reports' && <>
          <Text style={[s.sectionTitle, textStyle]}>Content reports</Text>
          {choices(['open', 'resolved', 'dismissed', 'all'] as ReportFilter[], reportFilter, changeReportFilter)}
          {reports.map((report) => <View key={report.id} style={[s.card, panelStyle]}>
            <View style={s.cardTop}><Text style={[s.cardTitle, textStyle]}>{report.videoTitle}</Text><Badge label={report.status} colors={colors} /></View>
            <Text style={[s.cardBody, { color: colors.secondary }]}>Reason: {report.reason}</Text>
            <Text style={[s.meta, { color: colors.muted }]}>Reported by {report.reporterDisplayName} (@{report.reporterUsername}) · Creator @{report.ownerUsername}</Text>
            <Text style={[s.meta, { color: colors.muted }]}>{dateLabel(report.createdAt)}</Text>
            <View style={s.actions}>
              {report.status !== 'resolved' && actionButton('Resolve', () => void updateReport(report, 'resolved'), { disabled: busyId === report.id })}
              {report.status !== 'dismissed' && actionButton('Dismiss', () => void updateReport(report, 'dismissed'), { danger: true, disabled: busyId === report.id })}
              {report.status !== 'open' && actionButton('Reopen', () => void updateReport(report, 'open'), { disabled: busyId === report.id })}
              <Pressable onPress={() => { setSectionAndReset('videos'); setSearchInput(report.videoTitle); setSearch(report.videoTitle); }} style={s.linkButton}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>Review video</Text></Pressable>
            </View>
          </View>)}
          {!loading && reports.length === 0 && !error && <Empty text="No reports in this view." colors={colors} />}
        </>}

        {section === 'videos' && <>
          <Text style={[s.sectionTitle, textStyle]}>Video moderation</Text>
          {choices(['all', 'published', 'hidden', 'removed'] as VideoFilter[], videoFilter, changeVideoFilter)}
          <SearchBox value={searchInput} onChangeText={setSearchInput} onSubmit={applySearch} colors={colors} />
          {videos.map((video) => <View key={video.id} style={[s.card, panelStyle]}>
            <View style={s.cardTop}><Text numberOfLines={2} style={[s.cardTitle, { color: colors.text, flex: 1 }]}>{video.title}</Text><Badge label={video.moderationStatus} colors={colors} /></View>
            <Text style={[s.meta, { color: colors.muted }]}>@{video.owner.username} · {video.visibility} · {video.views} views · {video.hasMedia ? 'media uploaded' : 'draft without media'}</Text>
            <Text numberOfLines={3} style={[s.cardBody, { color: colors.secondary }]}>{video.description || 'No description'}</Text>
            <View style={s.actions}>
              {video.moderationStatus !== 'published' && actionButton('Publish', () => void updateVideo(video, 'published'), { disabled: busyId === video.id })}
              {video.moderationStatus !== 'hidden' && actionButton('Hide', () => void updateVideo(video, 'hidden'), { disabled: busyId === video.id })}
              {video.moderationStatus !== 'removed' && actionButton('Remove', () => void updateVideo(video, 'removed'), { danger: true, disabled: busyId === video.id })}
            </View>
          </View>)}
          {!loading && videos.length === 0 && !error && <Empty text="No videos match this filter." colors={colors} />}
        </>}

        {section === 'users' && <>
          <Text style={[s.sectionTitle, textStyle]}>User accounts</Text>
          {choices(['all', 'active', 'disabled'] as UserFilter[], userFilter, changeUserFilter)}
          <SearchBox value={searchInput} onChangeText={setSearchInput} onSubmit={applySearch} colors={colors} />
          {users.map((target) => <View key={target.id} style={[s.card, panelStyle]}>
            <View style={s.cardTop}><View style={{ flex: 1 }}><Text style={[s.cardTitle, textStyle]}>{target.displayName}</Text><Text style={[s.meta, { color: colors.muted }]}>@{target.username} · {target.role}</Text></View><Badge label={target.status} colors={colors} /></View>
            <Text style={[s.cardBody, { color: colors.secondary }]}>{target.email}</Text>
            <Text style={[s.meta, { color: colors.muted }]}>{target.videoCount} videos · Joined {dateLabel(target.createdAt)}</Text>
            <View style={s.actions}>{actionButton(target.status === 'active' ? 'Disable account' : 'Restore account', () => void updateUser(target), { danger: target.status === 'active', disabled: busyId === target.id || target.id === user.id })}{target.id === user.id && <Text style={[s.meta, { color: colors.muted }]}>You cannot disable your own account.</Text>}</View>
          </View>)}
          {!loading && users.length === 0 && !error && <Empty text="No accounts match this filter." colors={colors} />}
        </>}

        {section !== 'overview' && total > 0 && <View style={s.pagination}>
          <Pressable disabled={offset === 0 || loading} onPress={() => setOffset(Math.max(0, offset - pageSize))} style={[s.pageButton, panelStyle, { opacity: offset === 0 ? 0.45 : 1 }]}><Text style={textStyle}>Previous</Text></Pressable>
          <Text style={[s.meta, { color: colors.muted }]}>{offset + 1}–{Math.min(offset + pageSize, total)} of {total}</Text>
          <Pressable disabled={offset + pageSize >= total || loading} onPress={() => setOffset(offset + pageSize)} style={[s.pageButton, panelStyle, { opacity: offset + pageSize >= total ? 0.45 : 1 }]}><Text style={textStyle}>Next</Text></Pressable>
        </View>}
        {loading && <ActivityIndicator style={s.loader} color={colors.accent} />}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, colors }: { label: string; value: number; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <View style={[s.stat, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[s.statValue, { color: colors.text }]}>{value.toLocaleString()}</Text><Text style={[s.statLabel, { color: colors.muted }]}>{label}</Text></View>;
}

function Badge({ label, colors }: { label: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  const attention = ['open', 'hidden', 'removed', 'disabled'].includes(label);
  return <Text style={[s.badge, { backgroundColor: attention ? colors.dangerSoft : colors.accentSoft, color: attention ? colors.danger : colors.accent }]}>{label}</Text>;
}

function SearchBox({ value, onChangeText, onSubmit, colors }: { value: string; onChangeText: (value: string) => void; onSubmit: () => void; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <View style={[s.search, { backgroundColor: colors.surface, borderColor: colors.border }]}><TextInput value={value} onChangeText={onChangeText} onSubmitEditing={onSubmit} returnKeyType="search" placeholder="Search name, email or title" placeholderTextColor={colors.muted} style={[s.searchInput, { color: colors.text }]} /><Pressable accessibilityRole="button" onPress={onSubmit} style={[s.searchButton, { backgroundColor: colors.accent }]}><Text style={{ color: colors.accentText, fontWeight: '800', fontSize: 11 }}>Search</Text></Pressable></View>;
}

function Empty({ text, colors }: { text: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return <View style={[s.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center' }}>{text}</Text></View>;
}

function dateLabel(value: string) {
  const date = new Date(value.replace(' ', 'T') + (value.includes('Z') ? '' : 'Z'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const s = StyleSheet.create({
  screen: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  header: { minHeight: 72, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, backText: { padding: 10, fontSize: 13 },
  headerCopy: { flex: 1 }, eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.4 }, title: { fontSize: 20, fontWeight: '900', marginTop: 2 }, refresh: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, refreshText: { fontSize: 23, fontWeight: '800' },
  sectionRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 }, sectionTab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 36 }, sectionTitle: { fontSize: 19, fontWeight: '900', marginBottom: 4 }, sub: { fontSize: 12, lineHeight: 18 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }, stat: { width: '31.5%', minHeight: 80, borderWidth: 1, borderRadius: 14, padding: 12, justifyContent: 'center' }, statValue: { fontSize: 21, fontWeight: '900' }, statLabel: { fontSize: 10, marginTop: 5 },
  quickGrid: { gap: 9, marginTop: 10 }, quick: { borderWidth: 1, borderRadius: 13, padding: 14 }, quickTitle: { fontSize: 13, fontWeight: '800' }, quickSub: { fontSize: 11, marginTop: 4 },
  chips: { gap: 7, paddingVertical: 10 }, chip: { borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 }, chipText: { fontSize: 11, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 15, padding: 14, marginTop: 10, gap: 8 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }, cardTitle: { fontSize: 14, fontWeight: '800', flexShrink: 1 }, cardBody: { fontSize: 12, lineHeight: 18 }, meta: { fontSize: 10, lineHeight: 15 }, badge: { fontSize: 9, fontWeight: '800', overflow: 'hidden', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 4 }, action: { minHeight: 33, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, linkButton: { minHeight: 33, justifyContent: 'center', paddingHorizontal: 7 },
  search: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, alignItems: 'center', padding: 5, marginBottom: 4 }, searchInput: { flex: 1, height: 40, paddingHorizontal: 10, fontSize: 12 }, searchButton: { borderRadius: 9, paddingHorizontal: 13, height: 36, alignItems: 'center', justifyContent: 'center' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 18 }, pageButton: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 }, loader: { marginVertical: 20 }, empty: { minHeight: 80, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 10 },
  message: { padding: 12, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }, notice: { fontSize: 11, fontWeight: '700', marginVertical: 6 }, deniedTitle: { fontSize: 19, fontWeight: '900', textAlign: 'center' }, primaryButton: { minHeight: 42, minWidth: 130, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 8 },
});
