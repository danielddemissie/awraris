#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

import type { PackageJson } from "./types/index.ts";
import {
  handleNoArgsAwraris,
  handlePlayCommand,
  handleSearchCommand,
  puppeteerYTMusic,
} from "./commands/index.js";
import { colors } from "./ui/theme.js";

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
if (process.argv.length <= 2) {
  handleNoArgsAwraris(packageJson);
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

// COMMANDS

// Play
program
  .command("play")
  .description("Play music from various sources")
  .argument("[query...]", "Song or artist to play")
  .option("-m, --method <method>", "YouTube method (api, browser)", "api")
  .action(handlePlayCommand);

// Search
program
  .command("search")
  .description("Search for music")
  .argument("<query>", "Search query")
  .option("-l, --limit <number>", "Number of results", "10")
  .action(handleSearchCommand);

// Error handling
program.exitOverride();

try {
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
  program.parse();
} catch (err: any) {
  if (err.code === "commander.help") {
    process.exit(0);
  }
  console.error(colors.error("🦏 Error:"), err.message);
  process.exit(1);
}
