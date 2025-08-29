import { google } from "googleapis";
import { config } from "dotenv";

import { getAudioStream, playAudio } from "../utils/ytdlp.js";

config({
  quiet: true,
});

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

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

export async function getYouTubeAudioStream(videoId: string): Promise<string> {
  try {
    return await getAudioStream(videoId, {
      audioOnly: true,
      quality: "0", // best quality
      format: "bestaudio/best",
    });
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

export async function playSong(videoId: string): Promise<void> {
  try {
    const audioUrl = await getYouTubeAudioStream(videoId);
    await playAudio(audioUrl);
  } catch (error: any) {
    throw new Error(`Failed to play song: ${error.message}`);
  }
}
