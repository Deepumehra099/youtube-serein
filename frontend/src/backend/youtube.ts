export type Video = {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  views: string;
  likes?: string;
  published: string;
  thumbnail: string;
  duration?: string;
  description?: string;
};

export type YouTubeComment = { id: string; author: string; avatar?: string; text: string; likes: number; published: string };

type YouTubeItem = {
  id: string | { videoId?: string };
  snippet: {
    title: string;
    description?: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails?: { maxres?: { url: string }; high?: { url: string }; medium?: { url: string }; default?: { url: string } };
  };
  statistics?: { viewCount?: string; likeCount?: string };
  contentDetails?: { duration?: string };
};

type YouTubeResponse = { items?: YouTubeItem[]; nextPageToken?: string; error?: { message?: string } };
type YouTubeCommentItem = { id: string; snippet: { topLevelComment: { snippet: { authorDisplayName: string; authorProfileImageUrl?: string; textDisplay: string; likeCount: number; publishedAt: string } } } };

const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
const API_ROOT = 'https://www.googleapis.com/youtube/v3';

export const hasYouTubeApiKey = Boolean(API_KEY);

function mapVideo(item: YouTubeItem): Video | null {
  const id = typeof item.id === 'string' ? item.id : item.id.videoId;
  if (!id) return null;
  const views = Number(item.statistics?.viewCount ?? 0);
  return {
    id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    views: views ? `${new Intl.NumberFormat('en', { notation: 'compact' }).format(views)} views` : 'Video',
    likes: item.statistics?.likeCount ? `${new Intl.NumberFormat('en', { notation: 'compact' }).format(Number(item.statistics.likeCount))} likes` : undefined,
    published: timeSince(item.snippet.publishedAt),
    thumbnail: item.snippet.thumbnails?.maxres?.url ?? item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    duration: item.contentDetails?.duration,
    description: item.snippet.description,
  };
}

function timeSince(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days < 1) return 'today';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

async function request(path: string): Promise<Video[]> {
  if (!API_KEY) throw new Error('Add EXPO_PUBLIC_YOUTUBE_API_KEY to frontend/.env to load YouTube videos.');
  const response = await fetch(`${API_ROOT}/${path}&key=${encodeURIComponent(API_KEY)}`);
  const body = (await response.json()) as YouTubeResponse;
  if (!response.ok) throw new Error(body.error?.message ?? `YouTube API error (${response.status})`);
  return (body.items ?? []).map(mapVideo).filter((video): video is Video => video !== null);
}

export function getPopularVideos(region = 'IN') {
  const params = new URLSearchParams({ part: 'snippet,statistics,contentDetails', chart: 'mostPopular', regionCode: region, maxResults: '24' });
  return request(`videos?${params.toString()}`);
}

export async function getPopularVideoPage(region = 'IN', pageToken?: string, categoryId?: string) {
  const values: Record<string, string> = { part: 'snippet,statistics,contentDetails', chart: 'mostPopular', regionCode: region, maxResults: '24' };
  if (pageToken) values.pageToken = pageToken;
  if (categoryId) values.videoCategoryId = categoryId;
  const params = new URLSearchParams(values);
  if (!API_KEY) throw new Error('Add EXPO_PUBLIC_YOUTUBE_API_KEY to frontend/.env to load YouTube videos.');
  const response = await fetch(`${API_ROOT}/videos?${params.toString()}&key=${encodeURIComponent(API_KEY)}`);
  const body = (await response.json()) as YouTubeResponse;
  if (!response.ok) throw new Error(body.error?.message ?? `YouTube API error (${response.status})`);
  return { items: (body.items ?? []).map(mapVideo).filter((video): video is Video => video !== null), nextPageToken: body.nextPageToken };
}

export async function getVideoDetails(videoId: string) {
  const params = new URLSearchParams({ part: 'snippet,statistics,contentDetails', id: videoId, maxResults: '1' });
  return (await request(`videos?${params.toString()}`))[0] ?? null;
}

export async function getVideoComments(videoId: string, order: 'relevance' | 'time' = 'relevance'): Promise<YouTubeComment[]> {
  if (!API_KEY) return [];
  const params = new URLSearchParams({ part: 'snippet', videoId, maxResults: '20', order, textFormat: 'plainText' });
  const response = await fetch(`${API_ROOT}/commentThreads?${params.toString()}&key=${encodeURIComponent(API_KEY)}`);
  const body = (await response.json()) as { items?: YouTubeCommentItem[] };
  if (!response.ok) return [];
  return (body.items ?? []).map((item) => {
    const comment = item.snippet.topLevelComment.snippet;
    return { id: item.id, author: comment.authorDisplayName, avatar: comment.authorProfileImageUrl, text: comment.textDisplay, likes: comment.likeCount, published: timeSince(comment.publishedAt) };
  });
}

export function searchVideos(query: string, region = 'IN') {
  return searchWithDetails(query, region);
}

export async function getShortVideos(region = 'IN'): Promise<Video[]> {
  const videos = await searchWithDetails('#shorts', region, 'short');
  return videos.filter((video) => {
    const duration = video.duration ?? '';
    const hours = Number(duration.match(/(\d+)H/)?.[1] ?? 0);
    const minutes = Number(duration.match(/(\d+)M/)?.[1] ?? 0);
    const seconds = Number(duration.match(/(\d+)S/)?.[1] ?? 0);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds > 0 && totalSeconds <= 180;
  });
}

async function searchWithDetails(query: string, region: string, videoDuration?: 'short'): Promise<Video[]> {
  const values: Record<string, string> = { part: 'snippet', q: query, type: 'video', regionCode: region, maxResults: '20', safeSearch: 'moderate' };
  if (videoDuration) values.videoDuration = videoDuration;
  const params = new URLSearchParams(values);
  const results = await request(`search?${params.toString()}`);
  if (!results.length) return results;
  const ids = results.map((video) => video.id).join(',');
  const detailParams = new URLSearchParams({ part: 'snippet,statistics,contentDetails', id: ids, maxResults: '50' });
  try {
    const details = await request(`videos?${detailParams.toString()}`);
    const byId = new Map(details.map((video) => [video.id, video]));
    return results.map((video) => byId.get(video.id) ?? video);
  } catch {
    // Keep search results visible if the optional stats/detail request fails.
    return results;
  }
}
