export type ExerciseVideoLink = {
  watchUrl: string;
  thumbnailUrl?: string;
  isYouTube: boolean;
};

const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;

export function getExerciseVideoLink(url?: string | null): ExerciseVideoLink | null {
  if (!url) return null;

  const match = url.match(YOUTUBE_ID_PATTERN);
  if (!match?.[1]) {
    return {
      watchUrl: url,
      isYouTube: false,
    };
  }

  const videoId = match[1];

  return {
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    isYouTube: true,
  };
}
