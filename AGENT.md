# AWRARIS CLI Music Streaming Application - Agent Guide

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

## Project Overview

AWRARIS is a TypeScript-based, zero-setup CLI music streaming application that provides an "out-of-the-box" experience without requiring Node.js installation or manual dependency management.

## Core Architecture Decisions

### 1. Single Executable Strategy

- **Primary Choice**: Bun's `--compile` feature
- **Rationale**: Creates self-contained binary with runtime included
- **Command**: `bun build ./cli.ts --compile --outfile awraris`
- **Benefits**: Zero setup, improved start times, cross-platform support

### 2. Technology Stack

#### CLI Framework

- **Library**: Yargs
- **Purpose**: Command parsing, help generation, complex command structures

#### Streaming Engine

- **Library**: yt-stream
- **Key Feature**: Scrape methods (no API key required)
- **Function**: Search and stream audio from YouTube

#### Audio Playback

- **Approach**: Pipe to system media player
- **Players**: VLC or MPV as child processes
- **Command**: `mpv --no-video -` (stdin piping)

#### Terminal UI

- **Library**: blessed
- **Features**: Interactive menus, real-time updates, widget-based system

#### Visual Feedback

- **Spinner**: ora + cli-spinners
- **Animation**: Wave-like loading indicators
- **Multi-task**: @topcli/spinner for concurrent operations

#### Data Persistence

- **Database**: SQLite (file-based)
- **ORM**: Sequelize for type-safe operations
- **Storage**: Local playlists, settings, song metadata

## Implementation Phases

### Phase 1: Project Foundation

```bash

# Initialize with starter kit

npx create-cli-typescript awraris
cd awraris

# Core dependencies

bun add yargs blessed ora cli-spinners yt-stream
bun add -d @types/yargs @types/blessed
```

### Phase 2: Core Streaming

```typescript
// Streaming pipeline architecture
const stream = await ytStream.getAudioStream(videoUrl)
const player = spawn('mpv', ['--no-video', '-'])
stream.pipe(player.stdin)
```

### Phase 3: Terminal UI

```typescript
// blessed TUI setup
const screen = blessed.screen({
  smartCSR: true,
  title: 'AWRARIS Music Player',
})

const playlistBox = blessed.list({
  parent: screen,
  label: 'Playlists',
  // ... configuration
})
```

### Phase 4: Data Layer

```sql
-- SQLite schema
CREATE TABLE playlists (
id INTEGER PRIMARY KEY,
name TEXT NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE songs (
id INTEGER PRIMARY KEY,
youtube_id TEXT NOT NULL,
title TEXT NOT NULL,
artist TEXT,
duration INTEGER,
playlist_id INTEGER,
FOREIGN KEY (playlist_id) REFERENCES playlists(id)
);
```

## Key Features Implementation

### Search & Play

```typescript
// Search implementation
const searchResults = await ytStream.search(query)
const audioStream = await ytStream.getAudioStream(selectedResult.url)
```

### Playlist Management

```typescript
// Playlist operations
await db.playlist.create({ name: playlistName })
await db.song.create({
  youtube_id: videoId,
  title,
  artist,
  playlist_id,
})
```

### Visual Feedback

```typescript
// Spinner implementation
const spinner = ora({
  text: 'Streaming music...',
  spinner: 'dots12', // or 'wave' style
}).start()
```

## Build & Distribution

### Development

```bash
bun run dev # Development with hot reload
bun run build # TypeScript compilation
bun run test # Run test suite
```

### Production Build

```bash

# Create single executable

bun build ./src/cli.ts --compile --outfile ./dist/awraris

# Cross-platform builds

bun build --compile --target=linux-x64 --outfile ./dist/awraris-linux
bun build --compile --target=darwin-x64 --outfile ./dist/awraris-macos
bun build --compile --target=windows-x64 --outfile ./dist/awraris.exe
```

## Legal & Compliance Considerations

### Risk Mitigation

- Include explicit disclaimer about personal use only
- Avoid ad-blocking features
- No background playback implementation
- Clear non-commercial use statements

### Recommended Disclaimer

```
⚠️ LEGAL NOTICE: This application is for personal, non-commercial use only.
Users are responsible for complying with YouTube's Terms of Service and
applicable copyright laws.
```

## Project Structure

```
awraris/
├── src/
│ ├── cli.ts # Main entry point
│ ├── commands/ # Command implementations
│ ├── streaming/ # YouTube streaming logic
│ ├── ui/ # Terminal UI components
│ ├── database/ # SQLite operations
│ └── utils/ # Helper functions
├── tests/
├── docs/
├── AGENT.md # This file
├── README.md
├── package.json
└── tsconfig.json
```

## Success Metrics

- Zero-setup installation (single executable)
- Sub-3 second startup time
- Smooth audio streaming without interruption
- Intuitive terminal interface
- Reliable playlist management

## Next Steps

1. Set up project foundation with TypeScript starter
2. Implement basic YouTube streaming with yt-stream
3. Create blessed-based terminal interface
4. Add SQLite database for persistence
5. Build and test single executable with Bun
   - **Distribution:**
     - Download pre-built binaries for your OS from the [Releases page](https://github.com/danielddemissie/awraris/releases/latest):
       - **MacOS:** awraris-macos
       - **Linux:** awraris-linux
       - **Windows:** awraris.exe
     - Usage:
       - MacOS/Linux: `chmod +x awraris-macos` then `./awraris-macos [command]`
       - Windows: `awraris.exe [command]`
6. Prepare for open-source release with MIT license

---

_Built with 🦏 power - AWRARIS (Rhinoceros) CLI Music Streaming_
