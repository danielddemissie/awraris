import puppeteer, { type Browser, type Page } from "puppeteer";
import chalk from "chalk";
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

  /**
   * Initializes the headless browser and navigates to the YouTube Music search page.
   * Handles the cookie consent prompt.
   * @param query The initial search query.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log(
      chalk.blue("🦏 Initializing headless YouTube Music browser...")
    );

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
    console.log(chalk.green("✅ YouTube Music browser ready!"));
  }

  /**
   * Searches for music on YouTube Music and returns a list of results.
   * @param query The song or artist to search for.
   * @returns An array of song objects with title, artist, and URL.
   */
  async searchMusic(query: string): Promise<SongResult[]> {
    if (!this.page) throw new Error("Browser not initialized");

    console.log(chalk.blue(`🔍 Searching for: ${query}`));

    const url = `https://music.youtube.com/search?q=${encodeURIComponent(
      query
    )}`;
    try {
      console.log(chalk.blue("🌐 Navigating to", url));
      // Go to the search page
      await this.page.goto(url, {
        waitUntil: "networkidle2",
      });

      // Handle cookie consent prompt if it appears
      console.log(chalk.yellow("⏳ Checking for cookie consent prompt..."));
      try {
        const acceptButtonSelector =
          'form[action="https://consent.youtube.com/save"] button[aria-label="Accept all"]';
        await this.page.waitForSelector(acceptButtonSelector, {
          timeout: 5000,
        });
        await this.page.click(acceptButtonSelector);
        console.log(chalk.green("✅ Accepted cookies."));
        await this.page.waitForNavigation({ waitUntil: "networkidle2" });
      } catch (error) {
        console.log(
          chalk.yellow("⚠️ No cookie consent prompt found, proceeding...")
        );
      }
      console.log(chalk.blue("🎯 Navigating to video results..."));

      const songResultsSelector = 'a[title="Show song results"]';

      // Make sure we get only songs. Give up after four seconds.
      await this.page.waitForSelector(songResultsSelector);

      await Promise.all([
        this.page.click(songResultsSelector),
        this.page.waitForNavigation({ waitUntil: "networkidle2" }),
      ]);

      console.log(chalk.blue("📄 Extracting search results..."));
      const searchResultsSelector = "ytmusic-tabbed-search-results-renderer";

      //Wait for search results to load
      await this.page.waitForSelector(searchResultsSelector);

      const results = await this.page.evaluate(() => {
        const songs = [];

        // inside div with id content and class style-scope ytmusic-shelf-renderer
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
        console.log(chalk.yellow("⚠️ No songs found for this query."));
      } else {
        console.log(chalk.green(`✅ Found ${results.length} songs`));
      }

      return results;
    } catch (error) {
      console.error(chalk.red("❌ Search failed:"), error);
      throw new Error(`Search failed: ${error}`);
    }
  }

  /**
   * Navigates to a specific song's URL and starts playback.
   * @param songUrl The URL of the song from the search results.
   */
  async playMusic(songUrl: string): Promise<void> {
    if (!this.page) throw new Error("Browser not initialized");

    console.log(chalk.blue(`🎵 Playing song from URL: ${songUrl}`));

    // --- IMPROVEMENT: Navigate directly to the song URL ---
    await this.page.goto(songUrl, {
      waitUntil: "networkidle2",
    });

    // Wait for the player bar to appear to ensure the page has loaded
    await this.page.waitForSelector("ytmusic-player-bar", { timeout: 15000 });

    console.log(chalk.green("🎶 Music is now playing in the background!"));
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
