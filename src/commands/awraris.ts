import chalk from "chalk";
import { PackageJson } from "../types/index.js";
import { banner } from "../ui/index.js";

// get detailed info about the app
export function handleNoArgsAwraris(packageJson: PackageJson) {
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

  console.log(chalk.dim("Options:"));
  console.log(chalk.dim("  -v, --version   Show version number"));
  console.log(chalk.dim("  -h, --help      Show help\n"));
  console.log(
    chalk.dim("Run 'awraris <command> --help' for command-specific options.\n")
  );
  process.exit(0);
}
