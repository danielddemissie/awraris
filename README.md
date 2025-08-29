```
╔══════════════════════════════════════╗
║                                      ║
        ║ 🦏 ▲ █ █ █▀▄ ▲ █▀▄ █ █▀▀        🦏
        ║   █▀█▄▀▄█▀▄ █▀█▀▄ █ ▄██           🦏
║                                      ║
║   → CLI Music Streaming Platform     ║
║   → Rhinoceros-Powered Terminal      ║
║                                      ║
╚══════════════════════════════════════╝
```

# AWRARIS

AWRARIS is a TypeScript-based, zero-setup CLI music streaming application. It provides an "out-of-the-box" experience—no Node.js installation or manual dependency management required.

## Features

- Stream music from YouTube directly in your terminal
- Interactive terminal UI (TUI) with playlists and controls
- Fast, single binary executable (powered by Bun)
- Local persistence for playlists and settings

## Technology Stack

- **CLI Framework:** Yargs
- **Streaming Engine:** yt-stream (no API key required)
- **Audio Playback:** MPV or VLC (pipes audio to system player)
- **Terminal UI:** blessed
- **Visual Feedback:** ora, cli-spinners
- **Persistence:** SQLite (via Sequelize)

## Quick Start

### Install dependencies

```bash
bun install
```

### Build the CLI executable

```bash
bun run build
# Output: bin/awraris (single binary)
```

### Run in development

```bash
bun start
```

## Download Binaries

Pre-built binaries are available for:

- **MacOS**: [awraris-macos](https://github.com/danielddemissie/awraris/releases/latest)
- **Linux**: [awraris-linux](https://github.com/danielddemissie/awraris/releases/latest)
- **Windows**: [awraris.exe](https://github.com/danielddemissie/awraris/releases/latest)

Download the appropriate binary from the [Releases page](https://github.com/danielddemissie/awraris/releases/latest) and run:

```bash
# MacOS/Linux
chmod +x awraris-macos   # or awraris-linux
./awraris-macos [command]

# Windows
awraris.exe [command]
```

## Usage

After building, run the CLI:

```bash
./awraris [command]
```

## Development

- All commands/scripts are in `package.json`
- Source code in `src/` and CLI entry in `bin/run.ts`

## Contributing

PRs and issues welcome! See `.github/workflows` for CI/CD and dependency review.

## License

MIT
