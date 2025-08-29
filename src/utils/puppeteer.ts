import puppeteer, { type Browser, type Page } from "puppeteer";
import chalk from "chalk";
import ora from "ora";
interface SongResult {
  title: string;
  artist: string;
  url: string;
  index: number;
}

export class PuppeteerYouTubeMusic {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    const spinner = ora("Initialize puppeteer");

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--autoplay-policy=no-user-gesture-required",
      ],
    });

    this.page = await this.browser.newPage();

    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    this.isInitialized = true;
    spinner.succeed(chalk.green("✅ YouTube Music browser ready!"));
  }

  async searchMusic(query: string): Promise<SongResult[]> {
    if (!this.page) throw new Error("Browser not initialized");
    const spinner = ora(chalk.blue(`🔍 Searching for: ${query}`)).start();

    const url = `https://music.youtube.com/search?q=${encodeURIComponent(
      query
    )}`;
    try {
      await this.page.goto(url, {
        waitUntil: "networkidle2",
      });

      try {
        const acceptButtonSelector =
          'form[action="https://consent.youtube.com/save"] button[aria-label="Accept all"]';
        await this.page.waitForSelector(acceptButtonSelector, {
          timeout: 5000,
        });
        await this.page.click(acceptButtonSelector);
        await this.page.waitForNavigation({ waitUntil: "networkidle2" });
      } catch (error) {}

      const songResultsSelector = 'a[title="Show song results"]';
      await this.page.waitForSelector(songResultsSelector);
      await Promise.all([
        this.page.click(songResultsSelector),
        this.page.waitForNavigation({ waitUntil: "networkidle2" }),
      ]);

      const searchResultsSelector = "ytmusic-tabbed-search-results-renderer";
      await this.page.waitForSelector(searchResultsSelector);

      const results = await this.page.evaluate(() => {
        const songs = [];
        const selector = "#contents.ytmusic-shelf-renderer";
        const songElements = document.querySelectorAll(selector);

        if (songElements.length === 0) {
          ``;
          return [];
        }

        for (let i = 0; i < Math.min(songElements.length, 10); i++) {
          const element = songElements[i];

          const titleElement = element.querySelector(".title-column");
          const artistElement = element.querySelector(".byline");
          const urlElement = element.querySelector("a.yt-simple-endpoint");

          if (titleElement && urlElement) {
            songs.push({
              title: titleElement.textContent?.trim() || "Unknown Title",
              artist: artistElement?.textContent?.trim() || "Unknown Artist",
              url:
                `https://music.youtube.com/${urlElement.getAttribute("href")}` ||
                "",
              index: i,
            });
          }
        }
        return songs;
      });

      if (results.length === 0) {
        spinner.fail(chalk.yellow("⚠️ No songs found for this query."));
      } else {
        spinner.succeed(chalk.green(`✅ Found ${results.length} songs`));
      }

      return results;
    } catch (error) {
      spinner.fail(chalk.red("❌ Search failed:"));
      throw new Error(`Search failed: ${error}`);
    }
  }

  async playMusic(videoId: string): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const spinner = ora(
      chalk.blue(`🎵 Playing song from URL: ${videoId}`)
    ).start();

    await this.page.goto(url, {
      waitUntil: "networkidle2",
    });

    try {
      const acceptButtonSelector =
        'form[action="https://consent.youtube.com/save"] button[aria-label="Accept all"]';
      await this.page.waitForSelector(acceptButtonSelector, {
        timeout: 5000,
      });
      await this.page.click(acceptButtonSelector);
      await this.page.waitForNavigation({ waitUntil: "networkidle2" });
    } catch (error) {}

    try {
      const isPlaying = await this.page.evaluate(() => {
        const playButton = document.querySelector(
          "button.play-pause-button"
        ) as HTMLButtonElement;
        return playButton?.title === "Pause";
      });

      if (!isPlaying) {
        await this.page.click("button.play-pause-button");
      }

      await this.page.waitForSelector("ytmusic-player-bar", { timeout: 15000 });
      spinner.succeed(
        chalk.green("🎶 Music is now playing in the background!")
      );
    } catch (error) {
      throw new Error(`Failed to start playback: ${error}`);
    }
  }

  async getCurrentSong(): Promise<{ title: string; artist: string } | null> {
    if (!this.page) return null;

    try {
      const songInfo = await this.page.evaluate(() => {
        const titleElement = document.querySelector(
          ".title.ytmusic-player-bar"
        );
        const artistElement = document.querySelector(
          ".byline.ytmusic-player-bar"
        );

        return {
          title: titleElement?.textContent?.trim() || "",
          artist: artistElement?.textContent?.trim() || "",
        };
      });

      return songInfo.title ? songInfo : null;
    } catch {
      return null;
    }
  }

  async pauseResume(): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");
    await this.page.click("#play-pause-button");
  }

  async nextSong(): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");
    await this.page.click(".next-button");
  }

  async previousSong(): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");
    await this.page.click(".previous-button");
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.isInitialized = false;
    }
  }
}
