import { File, UploadType, type UploadProgress } from 'expo-file-system';

export type User = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  role: 'user' | 'admin';
  createdAt: string;
};

export type PlatformVideo = {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  visibility: 'public' | 'unlisted' | 'private';
  views: number;
  likeCount: number;
  commentCount: number;
  mediaUrl: string | null;
  createdAt: string;
  channel: { id: string; username: string; displayName: string };
  source: 'platform';
};

export type SubscribedChannel = { id: string; username: string; displayName: string; bio: string; subscriberCount: number };

export async function fetchMySubscriptions(token: string) {
  const data = await apiRequest<{ items: SubscribedChannel[] }>('/api/users/me/subscriptions', token);
  return data.items;
}

export async function fetchChannelVideos(username: string, token: string) {
  const data = await apiRequest<{ items: PlatformVideo[] }>(`/api/channels/${encodeURIComponent(username)}/videos?limit=20`, token);
  return data.items.map((video) => ({ ...video, source: 'platform' as const }));
}

export async function fetchMyLibrary(token: string, section: 'history' | 'saved' | 'liked' | 'videos') {
  const data = await apiRequest<{ items: PlatformVideo[] }>(`/api/users/me/${section}?limit=30`, token);
  return data.items.map((video) => ({ ...video, source: 'platform' as const }));
}

export type Comment = {
  id: string;
  videoId: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  updatedAt?: string;
  author: { id: string; username: string; displayName: string };
};

export type AdminDashboard = {
  users: number;
  usersActive: number;
  usersDisabled: number;
  videos: number;
  videosHidden: number;
  reportsOpen: number;
  comments: number;
};

export type AdminReport = {
  id: string;
  reporterId: string;
  reporterUsername: string;
  reporterDisplayName: string;
  videoId: string;
  videoTitle: string;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
};

export type AdminVideo = PlatformVideo & {
  moderationStatus: 'published' | 'hidden' | 'removed';
  hasMedia: boolean;
  owner: { id: string; username: string; displayName: string };
};

export type AdminUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: 'user' | 'admin';
  status: 'active' | 'disabled';
  createdAt: string;
  videoCount: number;
};

export type AdminPage<T> = { items: T[]; total: number; limit: number; offset: number };

type ApiEnvelope<T> = { data: T; error: null } | { data: null; error: { code: string; message: string } };

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

export function mediaUrl(path?: string | null) {
  return path ? `${API_URL}${path}` : null;
}

export async function apiRequest<T>(path: string, token?: string | null, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body && typeof options.body === 'string' ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Can't reach the Serein server at ${API_URL}. Start the backend and check EXPO_PUBLIC_API_URL.`);
  }
  const envelope = await response.json().catch(() => null) as ApiEnvelope<T> | null;
  if (!response.ok || !envelope || envelope.error) {
    throw new Error(envelope?.error?.message ?? `Server request failed (${response.status}).`);
  }
  return envelope.data;
}

export async function listPlatformVideos(token?: string | null, query = '') {
  const path = query ? `/api/search?q=${encodeURIComponent(query)}` : '/api/videos?limit=20';
  const data = await apiRequest<{ items?: PlatformVideo[]; videos?: PlatformVideo[] }>(path, token);
  return (data.items ?? data.videos ?? []).map((video) => ({ ...video, source: 'platform' as const }));
}

export type NewVideo = { title: string; description: string; category: string; visibility: 'public' | 'unlisted' | 'private'; tags: string[] };

export async function createPlatformVideo(token: string, values: NewVideo) {
  const data = await apiRequest<{ video: PlatformVideo }>('/api/videos', token, { method: 'POST', body: JSON.stringify(values) });
  return { ...data.video, source: 'platform' as const };
}

export async function uploadPlatformMedia(token: string, videoId: string, uri: string, mimeType: string, onProgress?: (progress: number) => void) {
  const file = new File(uri);
  const result = await file.upload(`${API_URL}/api/videos/${encodeURIComponent(videoId)}/media`, {
    httpMethod: 'PUT',
    uploadType: UploadType.BINARY_CONTENT,
    mimeType,
    headers: { authorization: `Bearer ${token}` },
    onProgress: (event: UploadProgress) => onProgress?.(event.totalBytes > 0 ? event.bytesSent / event.totalBytes : 0),
  });
  const envelope = JSON.parse(result.body) as ApiEnvelope<{ video: PlatformVideo }>;
  if (result.status < 200 || result.status >= 300 || envelope.error) throw new Error(envelope.error?.message ?? `Upload failed (${result.status}).`);
  return { ...envelope.data.video, source: 'platform' as const };
}

export async function fetchComments(videoId: string, token?: string | null) {
  const data = await apiRequest<{ items: Comment[] }>(`/api/videos/${encodeURIComponent(videoId)}/comments?limit=30`, token);
  return data.items;
}

export function fetchAdminDashboard(token: string) {
  return apiRequest<AdminDashboard>('/api/admin/dashboard', token);
}

export function fetchAdminReports(token: string, status: AdminReport['status'] | 'all', offset = 0) {
  const params = new URLSearchParams({ status, limit: '20', offset: `${offset}` });
  return apiRequest<AdminPage<AdminReport>>(`/api/admin/reports?${params}`, token);
}

export function updateAdminReport(token: string, id: string, status: AdminReport['status']) {
  return apiRequest<{ updated: boolean; status: AdminReport['status'] }>(`/api/admin/reports/${encodeURIComponent(id)}`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function fetchAdminVideos(token: string, status: AdminVideo['moderationStatus'] | 'all', query: string, offset = 0) {
  const params = new URLSearchParams({ status, limit: '20', offset: `${offset}` });
  if (query.trim()) params.set('q', query.trim());
  return apiRequest<AdminPage<AdminVideo>>(`/api/admin/videos?${params}`, token);
}

export function updateAdminVideo(token: string, id: string, moderationStatus: AdminVideo['moderationStatus']) {
  return apiRequest<{ updated: boolean }>(`/api/admin/videos/${encodeURIComponent(id)}`, token, { method: 'PATCH', body: JSON.stringify({ moderationStatus }) });
}

export function fetchAdminUsers(token: string, status: AdminUser['status'] | 'all', query: string, offset = 0) {
  const params = new URLSearchParams({ status, limit: '20', offset: `${offset}` });
  if (query.trim()) params.set('q', query.trim());
  return apiRequest<AdminPage<AdminUser>>(`/api/admin/users?${params}`, token);
}

export function updateAdminUser(token: string, id: string, status: AdminUser['status']) {
  return apiRequest<{ updated: boolean }>(`/api/admin/users/${encodeURIComponent(id)}`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function formatCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return `${value}`;
}

