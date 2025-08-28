# AWRARIS CLI Music Streaming Application - Agent Guide

```
 🦏 ▲ █ █ █▀▄ ▲ █▀▄ █ █▀▀        🦏 
   █▀█▄▀▄█▀▄ █▀█▀▄ █ ▄██             
                                      
                 🦏                   
                                      
   → CLI Music Streaming Platform     
   → Rhinoceros-Powered Terminal      
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
- **Library**: Commander.js (recommended over yargs)
- **Rationale**: More mature, better documentation, cleaner API, superior TypeScript support
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

#### Visual Feedback & UI
- **Spinner**: Ora (recommended over cli-spinner)
- **Rationale**: More feature-rich, better maintained, supports colors and customization
- **Terminal Colors**: Chalk for styling and colors
- **Interactive Prompts**: Inquirer for user input
- **Terminal Boxes**: Boxen for formatted output
- **ASCII Art**: Figlet for displaying logo

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
npm install commander ora chalk inquirer boxen figlet blessed yt-stream
```

### Phase 2: Core Streaming
```typescript
// Streaming pipeline architecture
const stream = await ytStream.getAudioStream(videoUrl);
const player = spawn('mpv', ['--no-video', '-']);
stream.pipe(player.stdin);
```

### Phase 3: Terminal UI
```typescript
// blessed TUI setup
const screen = blessed.screen({
  smartCSR: true,
  title: 'AWRARIS Music Player'
});

const playlistBox = blessed.list({
  parent: screen,
  label: 'Playlists',
  // ... configuration
});
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

### Command Structure (Commander.js)
```typescript
import { Command } from 'commander';
import figlet from 'figlet';

const program = new Command();

program
  .name('awraris')
  .description('🦏 CLI Music Streaming Platform')
  .version('1.0.0');

program
  .command('play <song>')
  .description('Play a song')
  .action((song) => {
    // Play implementation
  });

program
  .command('search <query>')
  .description('Search for music')
  .action((query) => {
    // Search implementation
  });
```

### Search & Play
```typescript
// Search implementation with ora spinner
import ora from 'ora';

const spinner = ora('Searching for music...').start();
const searchResults = await ytStream.search(query);
spinner.succeed('Found results!');

const audioStream = await ytStream.getAudioStream(selectedResult.url);
```

### Playlist Management
```typescript
// Playlist operations
await db.playlist.create({ name: playlistName });
await db.song.create({ 
  youtube_id: videoId, 
  title, 
  artist, 
  playlist_id 
});
```

### Visual Feedback
```typescript
import ora from 'ora';
import chalk from 'chalk';
import boxen from 'boxen';

const spinner = ora({
  text: chalk.cyan('Streaming music...'),
  spinner: 'dots12'
}).start();

// Display formatted output
console.log(boxen(chalk.green('🦏 Now Playing: Song Title'), {
  padding: 1,
  borderColor: 'green'
}));
```

## Build & Distribution

### Development Scripts
```bash
npm run dev        # Development with hot reload
npm run build      # TypeScript compilation
npm run test       # Run test suite
npm run lint       # Code linting
npm run format     # Code formatting
```

### Production Build Scripts
```bash
# Single platform build
npm run build:single    # Current platform executable

# Cross-platform builds
npm run build:linux     # Linux x64 executable
npm run build:macos     # macOS x64 executable  
npm run build:windows   # Windows x64 executable
npm run build:all       # All platforms

# Distribution
npm run package         # Create release packages
npm run publish:npm     # Publish to npm registry
npm run publish:github  # Create GitHub release
```

### Recommended package.json Scripts Section
```json
{
  "scripts": {
    "dev": "bun run --watch src/cli.ts",
    "build": "bun build src/cli.ts --outdir dist",
    "test": "bun test",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write src/**/*.ts",
    
    "build:single": "bun build src/cli.ts --compile --outfile dist/awraris",
    "build:linux": "bun build src/cli.ts --compile --target=linux-x64 --outfile dist/awraris-linux",
    "build:macos": "bun build src/cli.ts --compile --target=darwin-x64 --outfile dist/awraris-macos", 
    "build:windows": "bun build src/cli.ts --compile --target=windows-x64 --outfile dist/awraris.exe",
    "build:all": "bun run build:linux && bun run build:macos && bun run build:windows",
    
    "package": "bun run build:all && tar -czf dist/awraris-linux.tar.gz -C dist awraris-linux && zip -j dist/awraris-windows.zip dist/awraris.exe && tar -czf dist/awraris-macos.tar.gz -C dist awraris-macos",
    "publish:npm": "npm publish",
    "publish:github": "gh release create v$(node -p "require('./package.json').version") dist/* --generate-notes",
    
    "install:global": "bun run build:single && sudo cp dist/awraris /usr/local/bin/",
    "clean": "rm -rf dist/*"
  }
}
```

## Legal & Compliance Considerations

### Risk Mitigation
- Include explicit disclaimer about personal use only
- Avoid ad-blocking features
- No background playback implementation
- Clear non-commercial use statements

### Recommended Disclaimer
```
⚠️  LEGAL NOTICE: This application is for personal, non-commercial use only. 
Users are responsible for complying with YouTube's Terms of Service and 
applicable copyright laws.
```

## Project Structure
```
awraris/
├── src/
│   ├── index.ts              # Main entry point
│   ├── commands/           # Command implementations
│   ├── streaming/          # YouTube streaming logic
│   ├── ui/                 # Terminal UI components
│   ├── database/           # SQLite operations
│   └── utils/              # Helper functions
├── tests/
├── docs/
├── AGENT.md               
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
6. Prepare for open-source release with MIT license

