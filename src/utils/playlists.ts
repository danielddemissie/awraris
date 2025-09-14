import { homedir } from "os";
import { join } from "path";
import { promises as fs } from "fs";

export interface StoredTrack {
  id?: string;
  title: string;
  url?: string;
  addedAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: StoredTrack[];
  createdAt: string;
}

const CONFIG_DIR = join(homedir(), ".awraris");
const PLAYLISTS_FILE = join(CONFIG_DIR, "playlists.json");

async function ensureConfigDir() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

export async function loadPlaylists(): Promise<Playlist[]> {
  await ensureConfigDir();
  try {
    const raw = await fs.readFile(PLAYLISTS_FILE, "utf8");
    return JSON.parse(raw) as Playlist[];
  } catch (err) {
    return [];
  }
}

export async function savePlaylists(playlists: Playlist[]) {
  await ensureConfigDir();
  await fs.writeFile(
    PLAYLISTS_FILE,
    JSON.stringify(playlists, null, 2),
    "utf8"
  );
}

export async function createPlaylist(name: string): Promise<Playlist> {
  const lists = await loadPlaylists();
  const id = Date.now().toString(36);
  const p: Playlist = {
    id,
    name,
    tracks: [],
    createdAt: new Date().toISOString(),
  };
  lists.push(p);
  await savePlaylists(lists);
  return p;
}

export async function listPlaylists(): Promise<Playlist[]> {
  return await loadPlaylists();
}

export async function getPlaylist(
  idOrName: string
): Promise<Playlist | undefined> {
  const lists = await loadPlaylists();
  return lists.find((p) => p.id === idOrName || p.name === idOrName);
}

export async function addTrackToPlaylist(
  playlistIdOrName: string,
  track: StoredTrack
): Promise<Playlist> {
  const lists = await loadPlaylists();
  const idx = lists.findIndex(
    (p) => p.id === playlistIdOrName || p.name === playlistIdOrName
  );
  if (idx === -1) throw new Error("Playlist not found");
  lists[idx].tracks.push({ ...track, addedAt: new Date().toISOString() });
  await savePlaylists(lists);
  return lists[idx];
}

export async function removeTrackFromPlaylist(
  playlistIdOrName: string,
  trackIndex: number
) {
  const lists = await loadPlaylists();
  const idx = lists.findIndex(
    (p) => p.id === playlistIdOrName || p.name === playlistIdOrName
  );
  if (idx === -1) throw new Error("Playlist not found");
  if (trackIndex < 0 || trackIndex >= lists[idx].tracks.length)
    throw new Error("Track index out of range");
  lists[idx].tracks.splice(trackIndex, 1);
  await savePlaylists(lists);
}

export async function deletePlaylist(playlistIdOrName: string) {
  const lists = await loadPlaylists();
  const remaining = lists.filter(
    (p) => p.id !== playlistIdOrName && p.name !== playlistIdOrName
  );
  await savePlaylists(remaining);
}
