export interface PackageJson {
  name: string;
  version: string;
  description: string;
  main?: string;
  scripts?: {
    [key: string]: string;
  };
  keywords?: string[];
  author?: string;
  license?: string;
  dependencies?: {
    [key: string]: string;
  };
  devDependencies?: {
    [key: string]: string;
  };
}

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  duration: string;
  thumbnail: string;
}

export interface VideoFormat {
  format_id: string;
  format_note?: string;
  quality?: number;
  abr?: number;
  acodec: string;
  vcodec: string;
  url: string;
  ext?: string;
  filesize?: number;
  tbr?: number;
  asr?: number;
  audio_channels?: number;
}

export interface QueueItem {
  url: string;
  title: string;
  duration: string;
  isPlaying?: boolean;
}
