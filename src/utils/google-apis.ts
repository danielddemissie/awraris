import { google } from "googleapis";
import { config } from "dotenv";
import { YouTubeVideo } from "../types";

config({
  quiet: true,
});

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

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
