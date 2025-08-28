import { google } from "googleapis";
import { Innertube, UniversalCache } from "youtubei.js";
import { config } from "dotenv";

// Load environment variables
config();

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

let youtubeClient: Innertube | null = null;

async function getYouTubeClient(): Promise<Innertube> {
  if (!youtubeClient) {
    youtubeClient = await Innertube.create({ cache: new UniversalCache(true) });
  }
  return youtubeClient;
}

async function getVideoInfo(videoId: string) {
  const client = await getYouTubeClient();
  const info = await client.actions.execute("/player", {
    videoId,
    client: "YTMUSIC",
    parse: true,
  });

  return info;
}
export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  duration: string;
  thumbnail: string;
}

export async function searchYouTube(
  query: string,
  maxResults = 10
): Promise<YouTubeVideo[]> {
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error(
      "YouTube API key not found. Please set YOUTUBE_API_KEY in your .env file"
    );
  }

  try {
    const response = await youtube.search.list({
      part: ["snippet"],
      q: query,
      type: ["video"],
      maxResults,
      videoCategoryId: "10", // Music category
      order: "relevance",
    });

    if (!response.data.items) {
      return [];
    }

    // Get video details for duration
    const videoIds = response.data.items
      .map((item) => item.id?.videoId)
      .filter((id): id is string => typeof id === "string");
    const detailsResponse = await youtube.videos.list({
      part: ["contentDetails"],
      id: videoIds,
    });

    return response.data.items.map((item, index) => {
      const details = detailsResponse.data.items?.[index];
      return {
        id: item.id?.videoId || "",
        title: item.snippet?.title || "Unknown Title",
        channelTitle: item.snippet?.channelTitle || "Unknown Channel",
        duration: details?.contentDetails?.duration || "Unknown",
        thumbnail: item.snippet?.thumbnails?.medium?.url || "",
      };
    });
  } catch (error: any) {
    if (error.code === 403) {
      throw new Error("YouTube API quota exceeded or invalid API key");
    }
    throw new Error(`YouTube API error: ${error.message}`);
  }
}

function parseSignatureCipher(
  signatureCipher: string
): { url: string; signature: string; sp: string } | null {
  try {
    const params = new URLSearchParams(signatureCipher);
    const url = params.get("url");
    const signature = params.get("s");
    const sp = params.get("sp");

    if (!url || !signature || !sp) {
      return null;
    }

    return {
      url: decodeURIComponent(url),
      signature: decodeURIComponent(signature),
      sp: decodeURIComponent(sp),
    };
  } catch (error) {
    console.log("Error parsing signature cipher:", error);
    return null;
  }
}

async function decipherSignature(
  signature: string,
  videoId: string
): Promise<string> {
  try {
    const client = await getYouTubeClient();
    await client.actions.execute("/player", {
      videoId,
      client: "YTMUSIC",
    });

    return signature;
  } catch (error) {
    console.log("[v0] Signature deciphering failed:", error);
    return signature;
  }
}

export async function getYouTubeAudioStream(videoId: string): Promise<string> {
  try {
    const info = await getVideoInfo(videoId);
    if (info.playability_status?.status !== "OK") {
      throw new Error(
        `Video is not playable: ${info.playability_status?.reason || "Unknown reason"}`
      );
    }

    if (!info.streaming_data) {
      throw new Error("No streaming data available for this video");
    }

    const adaptiveAudioFormats =
      info.streaming_data.adaptive_formats?.filter((format) =>
        format.mime_type?.includes("audio")
      ) || [];

    const regularAudioFormats =
      info.streaming_data.formats?.filter((format) =>
        format.mime_type?.includes("audio")
      ) || [];

    const allAudioFormats = [...adaptiveAudioFormats, ...regularAudioFormats];

    if (allAudioFormats.length === 0) {
      if (info.streaming_data.server_abr_streaming_url) {
        return info.streaming_data.server_abr_streaming_url;
      }
      throw new Error("No audio streams available for this video");
    }

    const processedFormats = await Promise.all(
      allAudioFormats.map(async (format) => {
        if (format.url) {
          return { ...format };
        }

        if (format.signature_cipher) {
          const cipherData = parseSignatureCipher(format.signature_cipher);
          if (cipherData) {
            try {
              const decipheredSig = await decipherSignature(
                cipherData.signature,
                videoId
              );
              const finalUrl = `${cipherData.url}&${cipherData.sp}=${encodeURIComponent(decipheredSig)}`;
              return { ...format, url: finalUrl };
            } catch (error) {
              console.log(
                "Failed to decipher signature for format:",
                format.itag,
                error
              );
              return format;
            }
          }
        }

        return format;
      })
    );

    const validFormats = processedFormats.filter((format) => format.url);

    if (validFormats.length === 0) {
      throw new Error(
        "No valid audio streams available after signature processing"
      );
    }

    // Get the best quality audio stream from valid formats
    const bestAudio = validFormats.reduce((best, current) => {
      const bestBitrate = best.bitrate || 0;
      const currentBitrate = current.bitrate || 0;
      return currentBitrate > bestBitrate ? current : best;
    });

    return bestAudio.url!;
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

export function formatDuration(duration: string): string {
  // Convert ISO 8601 duration (PT4M13S) to readable format (4:13)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "Unknown";

  const hours = Number.parseInt(match[1] || "0");
  const minutes = Number.parseInt(match[2] || "0");
  const seconds = Number.parseInt(match[3] || "0");

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
