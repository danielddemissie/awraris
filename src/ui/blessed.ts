import blessed from "blessed";
import chalk from "chalk";
import boxen from "boxen";

import { QueueItem } from "../types";

let currentQueue: QueueItem[] = [];
let currentQueueIndex = 0;

export async function interactivePlayUI(initialQueue: QueueItem[] = []) {
  const screen = blessed.screen({
    smartCSR: true,
    title: "AWRARIS Music Player",
  });

  const queueBox = blessed.box({
    top: "0%",
    left: "0%",
    width: "70%",
    height: "80%",
    content: "Song Queue:\n",
    tags: true,
    border: { type: "line" },
    style: { border: { fg: "cyan" } },
    scrollable: true,
    scrollbar: { style: { bg: "blue" } },
    alwaysScroll: true,
  });

  const statusBox = blessed.box({
    top: "80%",
    left: "0%",
    width: "100%",
    height: "20%",
    content: "Status: Idle",
    tags: true,
    border: { type: "line" },
    style: { border: { fg: "green" } },
  });

  screen.append(queueBox);
  screen.append(statusBox);

  let queue: QueueItem[] = [...initialQueue];
  let currentSongIndex = -1;

  function updateQueueDisplay() {
    let content = "Song Queue:\n";
    queue.forEach((item, index) => {
      const prefix = index === currentSongIndex ? "{green-fg}▶{/}" : "  ";
      content += `${prefix} ${index + 1}. ${item.title}\n`;
    });
    queueBox.setContent(content);
    queueBox.setScrollPerc(100);
    screen.render();
  }

  function playNextSong() {
    if (currentSongIndex < queue.length - 1) {
      currentSongIndex++;
      const currentSong = queue[currentSongIndex];
      statusBox.setContent(`Status: Playing "${currentSong.title}"`);
      updateQueueDisplay();
      // TODO: Integrate actual playback logic here
    } else {
      statusBox.setContent("Status: Queue finished");
      currentSongIndex = -1;
      updateQueueDisplay();
    }
    screen.render();
  }

  function addSong(title: string) {
    queue.push({ url: "", title, duration: "", isPlaying: false });
    updateQueueDisplay();
    if (currentSongIndex === -1 && queue.length === 1) {
      playNextSong();
    }
  }

  // Key bindings
  screen.key(["q", "C-c"], () => process.exit(0));
  screen.key(["n"], () => {
    addSong(`Song ${queue.length + 1}`);
  });
  screen.key(["p"], () => {
    playNextSong();
  });

  // Initial render
  updateQueueDisplay();
  statusBox.setContent("Status: Idle");
  screen.render();
}

function renderQueueBox(queue: QueueItem[], currentIdx: number) {
  let queueStr = chalk.bold("Song Queue:") + "\n";
  queue.forEach((item, idx) => {
    const prefix = idx === currentIdx ? chalk.green("►") : " ";
    queueStr += `| ${prefix} ${idx + 1}. ${item.title}\n`;
  });
  return boxen(queueStr.trim(), {
    padding: 1,
    borderStyle: "round",
    borderColor: "cyan",
    margin: 1,
  });
}

function renderStatusBox(song: QueueItem) {
  const statusStr = `Status: Playing \"${song.title}\"`;
  return boxen(statusStr, {
    padding: 1,
    borderStyle: "round",
    borderColor: "green",
    margin: 1,
  });
}

// Example usage (simulate queue UI)
export function showQueueUI() {
  if (!currentQueue.length) {
    console.log(chalk.yellow("No songs in queue."));
    return;
  }
  console.clear();
  console.log(renderQueueBox(currentQueue, currentQueueIndex));
  console.log(renderStatusBox(currentQueue[currentQueueIndex]));
}
