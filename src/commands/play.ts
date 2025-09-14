import ora from "ora";
import chalk from "chalk";
import boxen from "boxen";
import { input, select } from "@inquirer/prompts";
import { platform } from "os";
import { spawn } from "child_process";

import { PuppeteerYouTubeMusic } from "../utils/puppeteer.js";
import { formatDuration } from "../utils/index.js";
import { searchYouTube } from "../utils/google-apis.js";
import { detectAudioPlayer, getYouTubeAudioStream } from "../utils/ytdlp.js";
import { listPlaylists } from "../utils/playlists.js";

export async function playAudioStream(
  url: string,
  title: string
): Promise<boolean> {
  const spinner = ora(`🦏 Initializing audio player...`).start();
  try {
    const audioPlayer = await detectAudioPlayer();

    if (!audioPlayer) {
      spinner.fail("❌ No audio player found");

      console.log(
        boxen(
          `🦏 ${chalk.red("Audio Player Required")}\n\n` +
            `${chalk.yellow("Please install one of the following:")}\n` +
            `• ${chalk.cyan("VLC Media Player")} - https://www.videolan.org/vlc/\n` +
            `• ${chalk.cyan("MPV")} - https://mpv.io/\n\n` +
            `${chalk.yellow("Installation commands:")}\n` +
            `• ${chalk.dim("macOS:")} brew install vlc\n` +
            `• ${chalk.dim("Ubuntu:")} sudo apt install vlc\n` +
            `• ${chalk.dim("Windows:")} Download from VLC website\n\n` +
            `${chalk.blue("Alternative:")} Use web player at https://music.youtube.com`,
          {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "red",
          }
        )
      );

      const openWeb = await input({
        message: "🦏 Open web player instead? (y/n)",
        default: "y",
      });

      if (openWeb === "y" || openWeb === "yes") {
        const { exec } = require("child_process");
        const webUrl = `https://music.youtube.com/search?q=${encodeURIComponent(title)}`;
        const openCmd =
          platform() === "darwin"
            ? "open"
            : platform() === "win32"
              ? "start"
              : "xdg-open";

        exec(`${openCmd} "${webUrl}"`);
        console.log(chalk.green(`🦏 Opening web player for "${title}"`));
      }

      return false;
    }

    spinner.text = `🎵 Starting playback with ${audioPlayer}...`;

    // Start audio playback
    let audioProcess: any;
    if (audioPlayer === "aplay") {
      audioProcess = spawn("aplay", ["-f", "cd"], {
        stdio: ["pipe", "ignore", "pipe"],
      });
    } else if (audioPlayer === "cvlc") {
      audioProcess = spawn(
        audioPlayer,
        [url, "--intf", "dummy", "--play-and-exit"],
        { stdio: "ignore" }
      );
    } else if (audioPlayer === "mpv") {
      audioProcess = spawn(audioPlayer, [url, "--no-video", "--really-quiet"], {
        stdio: "ignore",
      });
    } else if (audioPlayer === "afplay") {
      audioProcess = spawn(audioPlayer, [url], { stdio: "ignore" });
    } else {
      audioProcess = spawn(audioPlayer, [url], { stdio: "ignore" });
    }

    audioProcess.on("error", (error: any) => {
      spinner.fail(`❌ Playback failed: ${error.message}`);
      if (error.message.includes("ENOENT")) {
        console.log(
          chalk.red(`🦏 ${audioPlayer} not found. Please install it first.`)
        );
      }
      throw error;
    });

    audioProcess.on("close", async (code: any) => {
      if (code === 0) {
        console.log(chalk.green(`🦏 Finished playing "${title}"`));
      }
    });

    if (audioProcess.stderr) {
      audioProcess.stderr.on("data", (data: any) => {
        console.error(chalk.red(`🦏 ${data.toString()}`));
      });
    }

    spinner.succeed(`🎵 Now playing: ${title}`);

    console.log(
      boxen(
        `🎵 Now Playing: ${chalk.green(title)}\n🦏 Player: ${chalk.blue(audioPlayer.toUpperCase())}\n\n${chalk.dim("Press Ctrl+C to stop")}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "green",
        }
      )
    );

    return true;
  } catch (error: any) {
    spinner.fail(`❌ Audio setup failed: ${error.message}`);
    return false;
  }
}

export async function playAndAwait(
  url: string,
  title: string
): Promise<boolean> {
  try {
    const audioPlayer = await detectAudioPlayer();
    if (!audioPlayer) {
      console.error("No audio player found");
      return false;
    }

    let child: any;
    if (audioPlayer === "aplay") {
      child = spawn("aplay", ["-f", "cd"], {
        stdio: ["pipe", "ignore", "pipe"],
      });
    } else if (audioPlayer === "cvlc") {
      child = spawn(audioPlayer, [url, "--intf", "dummy", "--play-and-exit"], {
        stdio: "ignore",
      });
    } else if (audioPlayer === "mpv") {
      child = spawn(audioPlayer, [url, "--no-video", "--really-quiet"], {
        stdio: "ignore",
      });
    } else if (audioPlayer === "afplay") {
      child = spawn(audioPlayer, [url], { stdio: "ignore" });
    } else {
      child = spawn(audioPlayer, [url], { stdio: "ignore" });
    }

    return await new Promise<boolean>((resolve) => {
      let finished = false;
      child.on("error", (err: any) => {
        if (!finished) {
          finished = true;
          console.error(`Playback failed: ${err.message}`);
          resolve(false);
        }
      });
      child.on("close", (code: number) => {
        if (!finished) {
          finished = true;
          resolve(code === 0);
        }
      });
      child.on("exit", (code: number) => {
        if (!finished) {
          finished = true;
          resolve(code === 0);
        }
      });
    });
  } catch (err: any) {
    console.error(`Playback error: ${err.message}`);
    return false;
  }
}

async function handleYouTubeStream(query: string) {
  const spinner = ora(`🦏 Searching for "${query}" on YouTube...`).start();

  try {
    const results = await searchYouTube(query, 5);

    if (results.length === 0) {
      throw new Error(`No results found for "${query}"`);
    }

    spinner.succeed(`🦏 🎵 Found ${results.length} results for "${query}"`);
    const selectedId = await select({
      message: chalk.blue("🦏 Select a song to play:"),
      choices: results.map((video, idx) => ({
        name: `${chalk.green(video.title)} ${chalk.dim("by")} ${chalk.blue(video.channelTitle)} ${chalk.dim("•")} ${chalk.yellow(formatDuration(video.duration))}`,
        value: video.id,
        short: video.title,
      })),
      pageSize: 5,
      theme: {
        icon: {
          cursor: "🦏 ▶",
        },
      },
    });

    const selectedVideo =
      results.find((v) => v.id === selectedId) || results[0];
    if (!selectedVideo) {
      throw new Error(`❌ Invalid selection`);
    }

    // Get audio stream URL
    const streamSpinner = ora(
      `🦏 Getting audio stream for "${selectedVideo.title}"...`
    ).start();

    try {
      const audioUrl = await getYouTubeAudioStream(selectedVideo.id);
      streamSpinner.succeed(
        `🦏 🎵 Audio stream ready to play "${selectedVideo.title}"`
      );

      // Check playlists: if this video exists in a playlist, after the current item finishes play the rest of the playlist
      let played = await playAndAwait(audioUrl, selectedVideo.title);

      try {
        const playlists = await listPlaylists();
        const containing = playlists.find((pl) =>
          pl.tracks.some((t) => t.id === selectedVideo.id)
        );
        if (containing) {
          const idx = containing.tracks.findIndex(
            (t) => t.id === selectedVideo.id
          );
          if (idx >= 0 && idx < containing.tracks.length - 1) {
            console.log(
              `\n🦏 Continuing playlist "${containing.name}" after current track...`
            );
            for (let i = idx + 1; i < containing.tracks.length; i++) {
              const t = containing.tracks[i];
              let url = t.url;
              if (!url && t.id) {
                try {
                  url = await getYouTubeAudioStream(t.id);
                } catch (e: any) {
                  console.error(
                    `Failed to resolve ${t.title}: ${e.message}. Skipping.`
                  );
                  continue;
                }
              }
              if (!url) {
                console.error(`No playable URL for ${t.title}, skipping.`);
                continue;
              }
              // Wait for each track to finish before proceeding
              await playAndAwait(url, t.title);
            }
            console.log(chalk.green("Playlist finished."));
          }
        }
      } catch (e: any) {
        // If playlist continuation fails, just ignore and finish
      }

      return played;
    } catch (streamError: any) {
      streamSpinner.fail(`❌ Stream Error: ${streamError.message}`);

      if (streamError.message.includes("Sign in to confirm")) {
        console.log(
          boxen(
            `🦏 ${chalk.red("YouTube Stream Access Issue")}\n\n` +
              `${chalk.yellow("The official API found the video, but streaming is blocked.")}\n\n` +
              `${chalk.yellow("Solutions:")}\n` +
              `• Use a VPN to change your IP address\n` +
              `• Try YouTube Premium account\n` +
              `• Use alternative sources\n\n` +
              `${chalk.cyan("Alternative:")} Try 'awraris play --source spotify "${query}"'`,
            {
              padding: 1,
              margin: 1,
              borderStyle: "round",
              borderColor: "red",
            }
          )
        );
      }

      return false;
    }
  } catch (error: any) {
    spinner.fail(`❌ Error: ${error.message}`);

    if (error.message.includes("API key")) {
      console.log(
        boxen(
          `🦏 ${chalk.red("YouTube API Setup Required")}\n\n` +
            `${chalk.yellow("To use YouTube search, you need:")}\n` +
            `1. Go to https://console.cloud.google.com/\n` +
            `2. Create a project and enable YouTube Data API v3\n` +
            `3. Create an API key\n` +
            `4. Create a .env file with: YOUTUBE_API_KEY=your_key\n\n` +
            `${chalk.cyan("Alternative:")} Use 'awraris play --source spotify "${query}"'`,
          {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "red",
          }
        )
      );
    }

    return false;
  }
}

// puppeteer based
export let puppeteerYTMusic: PuppeteerYouTubeMusic | null = null;

async function initializePuppeteerYTMusic(): Promise<PuppeteerYouTubeMusic> {
  if (!puppeteerYTMusic) {
    puppeteerYTMusic = new PuppeteerYouTubeMusic();
    await puppeteerYTMusic.initialize();
  }
  return puppeteerYTMusic;
}

async function handlePuppeteerYouTubeStream(query: string) {
  const spinner = ora(`🦏 Initializing headless YouTube Music...`).start();

  try {
    const ytMusic = await initializePuppeteerYTMusic();
    spinner.succeed(`🎵 YouTube Music browser ready`);
    spinner.info(`🦏 Searching for "${query}" on YouTube Music...`);
    const results = await searchYouTube(query, 5);

    if (results.length === 0) {
      throw new Error(`🦏 No results found for "${query}"`);
    }
    spinner.succeed(
      chalk.blue(`🎵 Found ${results.length} results for "${query}"`)
    );

    // Display search results
    console.log(chalk.yellow("\n🎵 Search Results:"));
    results.forEach((video, index) => {
      console.log(
        `${chalk.cyan((index + 1).toString())}. ${chalk.green(video.title)}\n` +
          `   ${chalk.dim("by")} ${chalk.blue(video.channelTitle)} ${chalk.dim("•")} ${chalk.yellow(formatDuration(video.duration))}`
      );
    });

    // Let user select which song to play
    const selection = await input({
      message: `\n🦏 Select a song (1-${results.length}) or press Enter for #1: `,
      validate: (input) => {
        const num = Number(input);
        return input === "" ||
          (Number.isInteger(num) && num >= 1 && num <= results.length)
          ? true
          : `Please enter a number between 1 and ${results.length}`;
      },
    });

    const selectedIndex = selection ? Number.parseInt(selection) - 1 : 0;
    const selectedSong = results[selectedIndex] || results[0];

    if (!selectedSong) {
      throw new Error("❌ Invalid selection");
    }

    // Create queue with selected song and next 4 songs
    const queue = [];
    for (
      let i = selectedIndex;
      i < Math.min(selectedIndex + 5, results.length);
      i++
    ) {
      if (results[i].id) {
        queue.push({
          url: await getYouTubeAudioStream(results[i].id),
          title: results[i].title,
        });
      }
    }

    // Play the selected song
    const playSpinner = ora(
      `🦏 Starting playback for "${selectedSong.title}"...`
    ).start();

    try {
      if (!selectedSong.id) {
        playSpinner.fail("❌ Selected song has no ID to play");
        return false;
      }

      // Show queue information
      console.log(chalk.yellow("\n🎵 Up Next:"));
      queue.slice(1).forEach((song, index) => {
        console.log(`${chalk.cyan(index + 1)}. ${chalk.green(song.title)}`);
      });

      await ytMusic.playMusic(selectedSong.id);
      playSpinner.succeed(`🎵 Now playing: ${selectedSong.title}`);

      console.log(
        boxen(
          `🎵 Now Playing: ${chalk.green(selectedSong.title)}\n🎤 Source: ${chalk.cyan("YouTube Music (Headless)")}\n\n${chalk.dim("Music is playing in the background browser")}\n${chalk.dim("Press Ctrl+C to stop")}`,
          {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "green",
          }
        )
      );

      // Keep the process alive and show current song info
      const updateInterval = setInterval(async () => {
        const currentSong = await ytMusic.getCurrentSong();
        if (currentSong && currentSong.title) {
          process.stdout.write(
            `\r🎵 ${chalk.green(currentSong.title)} - ${chalk.blue(currentSong.artist)}`
          );
        }
      }, 5000);

      // Handle Ctrl+C gracefully
      process.on("SIGINT", async () => {
        clearInterval(updateInterval);
        console.log(chalk.yellow("\n🦏 Stopping playback..."));
        await ytMusic.cleanup();
        process.exit(0);
      });

      return true;
    } catch (playError: any) {
      throw playError;
    }
  } catch (error: any) {
    spinner.fail(`❌ Puppeteer YouTube Music Error: ${error.message}`);
    console.log(
      boxen(
        `🦏 ${chalk.red("Headless Browser Issue")}\n\n` +
          `${chalk.yellow("The headless browser approach failed.")}\n\n` +
          `${chalk.yellow("Possible solutions:")}\n` +
          `• Install Chrome/Chromium browser\n` +
          `• Check internet connection\n` +
          `• Try fallback: 'awraris play --method api "${query}"'\n\n` +
          `${chalk.cyan("Error:")} ${error.message}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "red",
        }
      )
    );
    return false;
  }
}

// command action
export async function handlePlayCommand(
  query: string,
  options: {
    method: "browser" | "api";
  }
) {
  try {
    if (!query) {
      query = await input({
        message: chalk.yellow("🎵 What would you like to play? "),
      });
    }

    if (options.method === "browser") {
      await handlePuppeteerYouTubeStream(query);
    } else {
      await handleYouTubeStream(query);
    }
  } catch (error: any) {
    console.error(chalk.red("🦏 Error during playback:"), error.message);
    process.exit(1);
  }
}
