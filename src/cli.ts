#!/usr/bin/env node

import { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import boxen from "boxen"
import { createInterface } from "readline"

const program = new Command()

// ASCII Art Banner
const banner = `
╔══════════════════════════════════════╗
║                                      ║
║ 🦏 ▲ █ █ █▀▄ ▲ █▀▄ █ █▀▀        🦏 ║
║   █▀█▄▀▄█▀▄ █▀█▀▄ █ ▄██             ║
║                                      ║
║                 🦏                   ║
║                                      ║
║   → CLI Music Streaming Platform     ║
║   → Rhinoceros-Powered Terminal      ║
║                                      ║
╚══════════════════════════════════════╝
`

// Display banner
console.log(chalk.cyan(banner))

program.name("awraris").description("🦏 AWRARIS - Rhinoceros-powered CLI music streaming platform").version("1.0.0")

// Play command
program
  .command("play")
  .description("Play music from various sources")
  .argument("[query]", "Song or artist to play")
  .option("-s, --source <source>", "Music source (youtube, spotify)", "youtube")
  .action(async (query, options) => {
    if (!query) {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      query = await new Promise((resolve) => {
        rl.question(chalk.yellow("🎵 What would you like to play? "), resolve)
      })
      rl.close()
    }

    const spinner = ora(`🦏 Searching for "${query}" on ${options.source}...`).start()

    // Simulate search delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    spinner.succeed(`🎵 Found "${query}" - Starting playback...`)

    console.log(
      boxen(
        `🎵 Now Playing: ${chalk.green(query)}\n🦏 Source: ${chalk.blue(options.source.toUpperCase())}\n\n${chalk.dim("Press Ctrl+C to stop")}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "green",
        },
      ),
    )
  })

// Search command
program
  .command("search")
  .description("Search for music")
  .argument("<query>", "Search query")
  .option("-l, --limit <number>", "Number of results", "10")
  .action(async (query, options) => {
    const spinner = ora(`🦏 Searching for "${query}"...`).start()

    // Simulate search
    await new Promise((resolve) => setTimeout(resolve, 1500))

    spinner.succeed(`Found ${options.limit} results for "${query}"`)

    // Mock results
    for (let i = 1; i <= Math.min(options.limit, 5); i++) {
      console.log(`${chalk.cyan(i)}. ${chalk.green(`${query} - Result ${i}`)}`)
    }
  })

// Queue command
program
  .command("queue")
  .description("Manage playback queue")
  .option("-l, --list", "Show current queue")
  .option("-c, --clear", "Clear queue")
  .action((options) => {
    if (options.list) {
      console.log(chalk.yellow("🎵 Current Queue:"))
      console.log(chalk.dim("Queue is empty"))
    }

    if (options.clear) {
      console.log(chalk.green("🦏 Queue cleared!"))
    }
  })

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
          },
        ),
      )
    }
  })

// Error handling
program.exitOverride()

try {
  program.parse()
} catch (err: any) {
  if (err.code === "commander.help") {
    process.exit(0)
  }
  console.error(chalk.red("🦏 Error:"), err.message)
  process.exit(1)
}
