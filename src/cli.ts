#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import boxen from "boxen";
import { select, confirm, input } from "@inquirer/prompts";
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
    linux: ["cvlc", "mpv", "aplay", "ffplay"],
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
        message: "Would you like to open the web player instead? (y/n)",
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
    const audioProcess = spawn(audioPlayer, [url, "--intf", "dummy"], {
      stdio: "ignore",
    });

    audioProcess.on("error", (error) => {
      spinner.fail(`❌ Playback failed: ${error.message}`);

      if (error.message.includes("ENOENT")) {
        console.log(
          chalk.red(`🦏 ${audioPlayer} not found. Please install it first.`)
        );
      }
    });

    audioProcess.on("close", (code) => {
      if (code === 0) {
        console.log(chalk.green(`🦏 Finished playing "${title}"`));
      }
    });

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
      message: `Select a track to play (1-${results.length}, default 1):`,
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
      console.log("selectedVideo", selectedVideo);
      const audioUrl = await getYouTubeAudioStream(selectedVideo.id);
      streamSpinner.succeed(
        `🎵 Audio stream ready for "${selectedVideo.title}"`
      );

      console.log("audioUrl", audioUrl);

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

// Play command
program
  .command("play")
  .description("Play music from various sources")
  .argument("[query]", "Song or artist to play")
  .action(async (query, options) => {
    if (!query) {
      query = await input({ message: "Enter a song or artist to play:" });
      if (!query) {
        console.log(chalk.red("❌ No query provided, exiting."));
        process.exit(1);
      }
    }

    await handleYouTubeStream(query);
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
