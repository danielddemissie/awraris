import ora from "ora";
import { searchYouTube } from "../utils/google-apis";
import chalk from "chalk";
import { formatDuration } from "../utils";

export async function handleSearchCommand(
  query: string,
  options: { limit: string }
) {
  const spinner = ora(`🦏 Searching YouTube for "${query}"...`).start();

  try {
    const results = await searchYouTube(query, Number.parseInt(options.limit));
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
}
