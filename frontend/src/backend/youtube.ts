export type Video = {
  id: string;
  title: string;
  channel: string;
  channelId: string;
  views: string;
  published: string;
  thumbnail: string;
  duration?: string;
};

type YouTubeItem = {
  id: string | { videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
  };
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
};

type YouTubeResponse = { items?: YouTubeItem[]; error?: { message?: string } };

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
    published: timeSince(item.snippet.publishedAt),
    thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    duration: item.contentDetails?.duration,
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

export function searchVideos(query: string, region = 'IN') {
  const params = new URLSearchParams({ part: 'snippet', q: query, type: 'video', regionCode: region, maxResults: '20', safeSearch: 'moderate' });
  return request(`search?${params.toString()}`);
}
