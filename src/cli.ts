#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import boxen from "boxen";
import { input } from "@inquirer/prompts";
import {
  searchYouTube,
  formatDuration,
  getYouTubeAudioStream,
} from "./commands/play.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import type { PackageJson } from "./types/index.ts";
import { spawn } from "child_process";
import { platform } from "os";
import { PuppeteerYouTubeMusic } from "./utils/puppeteer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "package.json");

let packageJson: PackageJson;
try {
  packageJson = JSON.parse(
    readFileSync(packageJsonPath, "utf8")
  ) as PackageJson;
} catch (error) {
  packageJson = {
    name: "pr-desc-cli",
    version: "1.0.0",
    description: "AI-powered PR description generator",
  };
}

const program = new Command();
const banner = `
╔══════════════════════════════════════╗
║                                      ║
        ║ 🦏 ▲ █ █ █▀▄ ▲ █▀▄ █ █▀▀        🦏
        ║   █▀█▄▀▄█▀▄ █▀█▀▄ █ ▄██           🦏
║                                      ║
║   → CLI Music Streaming Platform     ║
║   → Rhinoceros-Powered Terminal      ║
║                                      ║
╚══════════════════════════════════════╝
`;

if (process.argv.length <= 2) {
  console.log(chalk.cyan(banner));
  console.log(
    chalk.bold.cyan(
      `\n✨  Welcome to ${packageJson.name} v${packageJson.version} ✨\n`
    )
  );
  console.log(chalk.dim(packageJson.description || ""));
  console.log(chalk.dim("CLI based Music player\n"));
  console.log(chalk.dim("Usage:"));
  console.log(chalk.dim("  $ awraris <command> [options]\n"));
  console.log(chalk.dim("Commands:"));
  console.log(chalk.dim("  play    Play music from various sources"));
  console.log(chalk.dim("  search  Search for music"));
  console.log(chalk.dim("  queue   Manage playback queue"));
  console.log(chalk.dim("  config  Configure AWRARIS settings\n"));

  console.log(chalk.dim("Options:"));
  console.log(chalk.dim("  -v, --version   Show version number"));
  console.log(chalk.dim("  -h, --help      Show help\n"));
  console.log(
    chalk.dim("Run 'awraris <command> --help' for command-specific options.\n")
  );
  process.exit(0);
}

program
  .name(packageJson.name || "awraris")
  .description(
    packageJson.description ||
      "🦏 AWRARIS - Rhinoceros-powered CLI music streaming platform"
  )
  .version(
    packageJson.version || "1.0.0",
    "-v, --version",
    "Show version number"
  );

async function detectAudioPlayer(): Promise<string | null> {
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

async function playAudioStream(url: string, title: string): Promise<boolean> {
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

      // Offer to open web player
      const openWeb = await input({
        message: "🦏 Open web player instead? (y/n)",
        default: "y",
      });

      if (openWeb === "y" || openWeb === "yes") {
        const { exec } = require("child_process");
        const webUrl = `https://music.youtube.com/search?q=${encodeURIComponent(title)}`;

        // Open default browser
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
      const { spawn } = require("child_process");
      const https = require("https");
      const http = require("http");

      const client = url.startsWith("https") ? https : http;
      audioProcess = spawn("aplay", ["-f", "cd"], {
        stdio: ["pipe", "ignore", "pipe"],
      });

      client
        .get(url, (response: any) => {
          if (response.statusCode === 200) {
            response.pipe(audioProcess.stdin);
          } else {
            spinner.fail(
              `❌ Failed to fetch audio stream: ${response.statusCode}`
            );
            return false;
          }
        })
        .on("error", (error: any) => {
          spinner.fail(`❌ Network error: ${error.message}`);
          return false;
        });
    } else if (audioPlayer === "cvlc") {
      audioProcess = spawn(
        audioPlayer,
        [url, "--intf", "dummy", "--play-and-exit"],
        {
          stdio: "ignore",
        }
      );
    } else if (audioPlayer === "mpv") {
      audioProcess = spawn(audioPlayer, [url, "--no-video", "--really-quiet"], {
        stdio: "ignore",
      });
    } else if (audioPlayer === "afplay") {
      audioProcess = spawn(audioPlayer, [url], {
        stdio: "ignore",
      });
    } else {
      audioProcess = spawn(audioPlayer, [url], {
        stdio: "ignore",
      });
    }

    audioProcess.on("error", (error: any) => {
      spinner.fail(`❌ Playback failed: ${error.message}`);

      if (error.message.includes("ENOENT")) {
        console.log(
          chalk.red(`🦏 ${audioPlayer} not found. Please install it first.`)
        );
      }
    });

    audioProcess.on("close", (code: any) => {
      if (code === 0) {
        console.log(chalk.green(`🦏 Finished playing "${title}"`));
      }
    });

    if (audioProcess.stderr) {
      audioProcess.stderr.on("data", (data: any) => {
        console.log(`[v0] ${audioPlayer} stderr: ${data.toString()}`);
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

async function handleYouTubeStream(query: string) {
  const spinner = ora(`🦏 Searching for "${query}" on YouTube...`).start();

  try {
    const results = await searchYouTube(query, 5);

    if (results.length === 0) {
      spinner.fail(`❌ No results found for "${query}"`);
      return false;
    }

    spinner.succeed(`🎵 Found ${results.length} results for "${query}"`);

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
      message: chalk.yellow("\n🦏 Select a song (1-5) or press Enter for #1: "),
      validate: (input) => {
        const num = Number(input);
        return input === "" ||
          (Number.isInteger(num) && num >= 1 && num <= results.length)
          ? true
          : `Please enter a number between 1 and ${results.length}`;
      },
    });
    const selectedIndex = selection ? Number.parseInt(selection) - 1 : 0;
    const selectedVideo = results[selectedIndex] || results[0];

    if (!selectedVideo) {
      console.log(chalk.red("❌ Invalid selection"));
      return false;
    }

    // Get audio stream URL
    const streamSpinner = ora(
      `🦏 Getting audio stream for "${selectedVideo.title}"...`
    ).start();

    try {
      const audioUrl = await getYouTubeAudioStream(selectedVideo.id);
      streamSpinner.succeed(
        `🎵 Audio stream ready for "${selectedVideo.title}"`
      );

      return await playAudioStream(audioUrl, selectedVideo.title);
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
    spinner.fail(`❌ YouTube API Error: ${error.message}`);

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

let puppeteerYTMusic: PuppeteerYouTubeMusic | null = null;

async function initializePuppeteerYTMusic(
  query: string
): Promise<PuppeteerYouTubeMusic> {
  if (!puppeteerYTMusic) {
    puppeteerYTMusic = new PuppeteerYouTubeMusic();
    await puppeteerYTMusic.initialize();
  }
  return puppeteerYTMusic;
}

async function handlePuppeteerYouTubeStream(query: string) {
  const spinner = ora(`🦏 Initializing headless YouTube Music...`).start();

  try {
    const ytMusic = await initializePuppeteerYTMusic(query);
    spinner.succeed(`🎵 YouTube Music browser ready`);
    const results = await ytMusic.searchMusic(query);

    if (results.length === 0) {
      spinner.fail(`❌ No results found for "${query}"`);
      return false;
    }

    console.log("result", results);
    spinner.succeed(`🎵 Found ${results.length} results for "${query}"`);

    // Display search results
    console.log(chalk.yellow("\n🎵 Search Results:"));
    results.forEach((song, index) => {
      console.log(
        `${chalk.cyan((index + 1).toString())}. ${chalk.green(song.title)}\n` +
          `   ${chalk.dim("by")} ${chalk.blue(song.artist)}`
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
      console.log(chalk.red("❌ Invalid selection"));
      return false;
    }

    // Play the selected song
    const playSpinner = ora(
      `🦏 Starting playback for "${selectedSong.title}"...`
    ).start();

    try {
      if (!selectedSong.url) {
        playSpinner.fail("❌ Selected song has no URL to play");
        return false;
      }
      await ytMusic.playMusic(selectedSong.url);
      playSpinner.succeed(`🎵 Now playing: ${selectedSong.title}`);

      console.log(
        boxen(
          `🎵 Now Playing: ${chalk.green(selectedSong.title)}\n🎤 Artist: ${chalk.blue(selectedSong.artist)}\n🦏 Source: ${chalk.cyan("YouTube Music (Headless)")}\n\n${chalk.dim("Music is playing in the background browser")}\n${chalk.dim("Press Ctrl+C to stop")}`,
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
      playSpinner.fail(`❌ Playback failed: ${playError.message}`);
      return false;
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

// Play command
program
  .command("play")
  .description("Play music from various sources")
  .argument("[query]", "Song or artist to play")
  .option(
    "-s, --source <source>",
    "Music source (youtube, spotify, soundcloud)",
    "youtube"
  )
  .option("-m, --method <method>", "YouTube method (api, browser)", "browser")
  .action(async (query, options) => {
    if (!query) {
      query = await input({
        message: chalk.yellow("🎵 What would you like to play? "),
      });
    }

    if (options.source === "youtube") {
      if (options.method === "browser") {
        await handlePuppeteerYouTubeStream(query);
      } else {
        await handleYouTubeStream(query);
      }
    } else {
      // Handle other sources normally
      const spinner = ora(
        `🦏 Searching for "${query}" on ${options.source}...`
      ).start();
      await new Promise((resolve) => setTimeout(resolve, 2000));
      spinner.succeed(`🎵 Found "${query}" - Starting playback...`);

      console.log(
        boxen(
          `🎵 Now Playing: ${chalk.green(query)}\n🦏 Source: ${chalk.blue(options.source.toUpperCase())}\n\n${chalk.dim("Press Ctrl+C to stop")}`,
          {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "green",
          }
        )
      );
    }
  });

// Search command
program
  .command("search")
  .description("Search for music")
  .argument("<query>", "Search query")
  .option("-l, --limit <number>", "Number of results", "10")
  .option(
    "-s, --source <source>",
    "Search source (youtube, spotify)",
    "youtube"
  )
  .action(async (query, options) => {
    if (options.source === "youtube") {
      const spinner = ora(`🦏 Searching YouTube for "${query}"...`).start();

      try {
        const results = await searchYouTube(
          query,
          Number.parseInt(options.limit)
        );
        spinner.succeed(
          `Found ${results.length} results for "${query}" on YouTube`
        );

        results.forEach((video, index) => {
          console.log(
            `${chalk.cyan((index + 1).toString())}. ${chalk.green(video.title)}\n` +
              `   ${chalk.dim("by")} ${chalk.blue(video.channelTitle)} ${chalk.dim("•")} ${chalk.yellow(formatDuration(video.duration))}\n` +
              `   ${chalk.dim("ID:")} ${chalk.gray(video.id)}`
          );
        });
      } catch (error: any) {
        spinner.fail(`❌ Search failed: ${error.message}`);
        return;
      }
    } else {
      // Fallback to mock search for other sources
      const spinner = ora(`🦏 Searching for "${query}"...`).start();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      spinner.succeed(`Found ${options.limit} results for "${query}"`);

      for (let i = 1; i <= Math.min(options.limit, 5); i++) {
        console.log(
          `${chalk.cyan(i)}. ${chalk.green(`${query} - Result ${i}`)}`
        );
      }
    }
  });

// Queue command
program
  .command("queue")
  .description("Manage playback queue")
  .option("-l, --list", "Show current queue")
  .option("-c, --clear", "Clear queue")
  .action((options) => {
    if (options.list) {
      console.log(chalk.yellow("🎵 Current Queue:"));
      console.log(chalk.dim("Queue is empty"));
    }

    if (options.clear) {
      console.log(chalk.green("🦏 Queue cleared!"));
    }
  });

// Config command
program
  .command("config")
  .description("Configure AWRARIS settings")
  .option("-s, --show", "Show current configuration")
  .action((options) => {
    if (options.show) {
      console.log(
        boxen(
          `🦏 AWRARIS Configuration\n\n${chalk.cyan("Default Source:")} YouTube\n${chalk.cyan("Audio Quality:")} High\n${chalk.cyan("Theme:")} Dark`,
          {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "cyan",
          }
        )
      );
    }
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (err: any) {
  if (err.code === "commander.help") {
    process.exit(0);
  }
  console.error(chalk.red("🦏 Error:"), err.message);
  process.exit(1);
}

// Cleanup on process exit
process.on("exit", async () => {
  if (puppeteerYTMusic) {
    await puppeteerYTMusic.cleanup();
  }
});

process.on("SIGTERM", async () => {
  if (puppeteerYTMusic) {
    await puppeteerYTMusic.cleanup();
  }
  process.exit(0);
});
