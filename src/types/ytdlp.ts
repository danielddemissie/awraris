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
