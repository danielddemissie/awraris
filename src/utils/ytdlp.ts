import { YtDlp } from "ytdlp-nodejs";
import { spawn } from "child_process";
import { platform } from "os";
import chalk from "chalk";
import type { VideoFormat } from "../types/ytdlp";

export interface AudioStreamOptions {
  quality?: string;
  format?: string;
  audioOnly?: boolean;
  output?: string;
}

export async function getAudioStream(
  videoId: string,
  options: AudioStreamOptions = {}
) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const ytdlp = new YtDlp();
    const info = await ytdlp.getInfoAsync(url, {});
    if (!info._type || info._type !== "video") {
      throw new Error("Invalid video information received");
    }

    const audioFormats = (info.formats as VideoFormat[]).filter(
      (format) => format.acodec !== "none" && format.vcodec === "none"
    );
    if (audioFormats.length === 0) {
      throw new Error("No audio-only formats found");
    }

    // Sort formats by quality and bitrate
    const sortedFormats = audioFormats.sort((a, b) => {
      // First compare by quality (higher is better)
      const aQuality = a.quality ?? 0;
      const bQuality = b.quality ?? 0;
      const qualityDiff = bQuality - aQuality;

      if (qualityDiff !== 0) return qualityDiff;

      // If quality is the same, compare by bitrate
      const aBitrate = a.abr ?? 0;
      const bBitrate = b.abr ?? 0;
      return bBitrate - aBitrate;
    });

    if (sortedFormats.length === 0) {
      throw new Error("No suitable audio format found");
    }

    return sortedFormats[0].url;
  } catch (error: any) {
    throw new Error(`Failed to get audio stream: ${error.message}`);
  }
}

export function playAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let player;

    switch (platform()) {
      case "darwin":
        player = spawn("afplay", [url]);
        break;
      case "win32":
        player = spawn("powershell", [
          "-c",
          `(New-Object Media.SoundPlayer '${url}').PlaySync()`,
        ]);
        break;
      default: // Linux and others
        player = spawn("play", [url]);
        break;
    }

    player.on("error", (err) => {
      console.error(chalk.red("Error playing audio:"), err);
      reject(err);
    });

    player.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Player exited with code ${code}`));
      }
    });
  });
}
