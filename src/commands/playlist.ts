import chalk from "chalk";
import { input, select } from "@inquirer/prompts";
import {
  createPlaylist,
  listPlaylists,
  addTrackToPlaylist,
  getPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist,
} from "../utils/playlists.js";
import { detectAudioPlayer, getYouTubeAudioStream } from "../utils/ytdlp.js";
import { spawn } from "child_process";
import { searchYouTube } from "../utils/google-apis.js";

export async function handlePlaylistCommand(action?: string, name?: string) {
  action = action || "list";

  if (action === "list") {
    const lists = await listPlaylists();
    if (lists.length === 0) {
      console.log(
        chalk.yellow(
          "No playlists found. Create one with 'awraris playlist create <name>'"
        )
      );
      return;
    }
    lists.forEach((p) => {
      console.log(
        `${chalk.cyan(p.id)}  ${chalk.green(p.name)}  ${chalk.dim(p.tracks.length + " tracks")}`
      );
    });
    return;
  }

  if (action === "create") {
    if (!name) {
      name = await input({ message: "Playlist name:" });
    }
    const p = await createPlaylist(name!);
    console.log(chalk.green(`Created playlist ${p.name} (${p.id})`));
    return;
  }

  if (action === "add") {
    if (!name) {
      name = await input({ message: "Playlist to add to (name or id):" });
    }
    const query = await input({ message: "Song or artist to search and add:" });
    const limitInput = await input({
      message: "How many results to add? (default 5)",
      default: "5",
    });
    const limit = Math.max(
      1,
      Math.min(50, parseInt(limitInput || "5", 10) || 5)
    );
    const results = await searchYouTube(query, limit);
    if (results.length === 0) {
      console.log(chalk.red("No results found."));
      return;
    }

    console.log(
      chalk.yellow(`Adding ${results.length} results to playlist ${name}...`)
    );
    let added = 0;
    let skipped = 0;
    for (const r of results) {
      try {
        const url = await getYouTubeAudioStream(r.id);
        await addTrackToPlaylist(name, {
          id: r.id,
          title: r.title,
          url,
          addedAt: new Date().toISOString(),
        });
        added++;
        console.log(chalk.green(`+ ${r.title}`));
      } catch (e: any) {
        skipped++;
        console.log(chalk.red(`! Failed to add ${r.title}: ${e.message}`));
        continue;
      }
    }

    console.log(
      chalk.green(`Done. Added ${added} tracks, skipped ${skipped}.`)
    );
    return;
  }

  if (action === "play") {
    if (!name) {
      name = await input({ message: "Playlist name or id to play:" });
    }
    const p = await getPlaylist(name);
    if (!p) {
      console.log(chalk.red("Playlist not found"));
      return;
    }
    if (!p.tracks || p.tracks.length === 0) {
      console.log(chalk.yellow("Playlist is empty"));
      return;
    }

    // Choose start index
    p.tracks.forEach((t, idx) =>
      console.log(`${chalk.cyan((idx + 1).toString())}. ${t.title}`)
    );
    const startInput = await input({
      message: `Start at track (1-${p.tracks.length}), Enter for 1:`,
    });
    const startIndex = startInput
      ? Math.max(0, parseInt(startInput, 10) - 1)
      : 0;

    let currentChild: any = null;
    let stopRequested = false;

    process.on("SIGINT", () => {
      stopRequested = true;
      if (currentChild) {
        try {
          currentChild.kill("SIGINT");
        } catch (e) {
          // ignore
        }
      }
      console.log(chalk.yellow("\nStopping playback..."));
    });

    for (let i = startIndex; i < p.tracks.length; i++) {
      if (stopRequested) break;
      const track = p.tracks[i];
      console.log(
        chalk.green(`Now playing (${i + 1}/${p.tracks.length}): ${track.title}`)
      );

      let url = track.url;
      if (!url && track.id) {
        try {
          url = await getYouTubeAudioStream(track.id);
        } catch (err: any) {
          console.log(
            chalk.red(
              `Failed to resolve stream for ${track.title}: ${err.message}`
            )
          );
          continue;
        }
      }

      if (!url) {
        console.log(chalk.red(`No playable URL for ${track.title}, skipping.`));
        continue;
      }

      const player = await detectAudioPlayer();
      if (!player) {
        console.log(chalk.red("No audio player found on system"));
        return;
      }

      const args: string[] = [];
      if (player === "cvlc") {
        args.push(url, "--intf", "dummy", "--play-and-exit");
      } else if (player === "mpv") {
        args.push(url, "--no-video", "--really-quiet");
      } else if (player === "afplay") {
        args.push(url);
      } else if (player === "aplay") {
        args.push("-f", "cd");
      } else {
        args.push(url);
      }

      try {
        if (player === "aplay") {
          currentChild = spawn(player, args, {
            stdio: ["pipe", "ignore", "pipe"],
          });
        } else {
          currentChild = spawn(player, args, { stdio: "ignore" });
        }

        await new Promise<void>((resolve) => {
          currentChild.on("close", () => resolve());
          currentChild.on("exit", () => resolve());
          currentChild.on("error", () => resolve());
        });
      } catch (err: any) {
        console.log(
          chalk.red(`Playback error for ${track.title}: ${err.message}`)
        );
      } finally {
        currentChild = null;
      }
    }

    console.log(chalk.green("Playlist finished or stopped."));
    return;
  }

  if (action === "show") {
    if (!name) {
      name = await input({ message: "Playlist name or id to show:" });
    }
    const p = await getPlaylist(name);
    if (!p) {
      console.log(chalk.red("Playlist not found"));
      return;
    }
    console.log(chalk.green(`${p.name} — ${p.tracks.length} tracks`));
    p.tracks.forEach((t, idx) =>
      console.log(
        `${chalk.cyan((idx + 1).toString())}. ${t.title} ${chalk.dim(t.id || "")}`
      )
    );
    return;
  }

  if (action === "remove") {
    if (!name) {
      name = await input({ message: "Playlist name or id to remove from:" });
    }
    const p = await getPlaylist(name);
    if (!p) {
      console.log(chalk.red("Playlist not found"));
      return;
    }
    p.tracks.forEach((t, idx) =>
      console.log(`${chalk.cyan((idx + 1).toString())}. ${t.title}`)
    );
    const choice = await input({
      message: `Track number to remove (1-${p.tracks.length}):`,
    });
    const num = parseInt(choice, 10) - 1;
    if (isNaN(num) || num < 0 || num >= p.tracks.length) {
      console.log(chalk.red("Invalid track number"));
      return;
    }
    await removeTrackFromPlaylist(name, num);
    console.log(chalk.green("Track removed"));
    return;
  }

  if (action === "delete") {
    if (!name) {
      name = await input({ message: "Playlist name or id to delete:" });
    }
    await deletePlaylist(name);
    console.log(chalk.green("Playlist deleted"));
    return;
  }

  console.log(
    chalk.red(
      "Unknown playlist action. Use: list, create, add, show, remove, delete"
    )
  );
}
