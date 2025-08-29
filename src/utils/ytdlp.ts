import { YtDlp } from "ytdlp-nodejs";
import { spawn } from "child_process";
import { platform } from "os";
import chalk from "chalk";
import type { VideoFormat } from "../types/index.ts";

export interface AudioStreamOptions {
  quality?: string;
  format?: string;
  audioOnly?: boolean;
  output?: string;
}

export async function getAudioStream(videoId: string) {
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

    const sortedFormats = audioFormats.sort((a, b) => {
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

export async function playAudio(videoId: string): Promise<void> {
  const audioStreamUrl = await getYouTubeAudioStream(videoId);

  return new Promise((resolve, reject) => {
    let player;

    switch (platform()) {
      case "darwin":
        player = spawn("afplay", [audioStreamUrl]);
        break;
      case "win32":
        player = spawn("powershell", [
          "-c",
          `(New-Object Media.SoundPlayer '${audioStreamUrl}').PlaySync()`,
        ]);
        break;
      default: // Linux and others
        player = spawn("play", [audioStreamUrl]);
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

export async function getYouTubeAudioStream(videoId: string): Promise<string> {
  try {
    return await getAudioStream(videoId);
  } catch (error: any) {
    if (
      error.message.includes("Could not extract functions") ||
      error.message.includes("functions")
    ) {
      throw new Error(
        "YouTube stream extraction failed. This may be due to YouTube updates. Try updating ytdl-core or use a different video."
      );
    }
    if (error.message.includes("Sign in to confirm")) {
      throw new Error(
        "YouTube requires sign-in verification. Try using a VPN or different IP address."
      );
    }
    if (error.message.includes("Video unavailable")) {
      throw new Error("This video is not available for streaming.");
    }
    if (error.message.includes("Private video")) {
      throw new Error("This is a private video and cannot be streamed.");
    }
    throw new Error(`Stream extraction error: ${error.message}`);
  }
}

// TODO: update this with ytld checker
export async function detectAudioPlayer(): Promise<string | null> {
  const players = {
    darwin: ["afplay", "cvlc", "mpv"],
    linux: ["cvlc", "mpv", "aplay"],
    win32: ["cvlc", "mpv"],
  };

  const currentPlatform = platform() as keyof typeof players;
  const availablePlayers = players[currentPlatform] || players.linux;

  for (const player of availablePlayers) {
    try {
      await new Promise((resolve, reject) => {
        const test = spawn(player, ["--version"], { stdio: "ignore" });
        test.on("close", (code) => {
          if (code === 0) resolve(player);
          else reject();
        });
        test.on("error", reject);
      });
      return player;
    } catch {
      continue;
    }
  }

  return null;
}
