import { AppleMusicMatch, ClaudeSong, Song } from "../types";

declare global {
  interface Window {
    MusicKit: {
      configure(config: {
        developerToken: string;
        app: { name: string; build: string };
      }): Promise<MusicKitInstance>;
      getInstance(): MusicKitInstance;
    };
  }
}

interface MusicKitInstance {
  authorize(): Promise<string>;
  isAuthorized: boolean;
  storefrontId: string;
  api: {
    music(
      path: string,
      params?: Record<string, unknown>,
    ): Promise<{
      data: {
        results?: {
          songs?: { data: MusicKitSong[] };
        };
      };
    }>;
  };
  developerToken: string;
  musicUserToken: string;
  setQueue(options: { song: string }): Promise<void>;
  play(): Promise<void>;
  stop(): void;
  playbackState: number;
  addEventListener(event: string, callback: () => void): void;
  removeEventListener(event: string, callback: () => void): void;
}

interface MusicKitSong {
  id: string;
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    artwork: { url: string };
    previews?: { url: string }[];
  };
}

let instance: MusicKitInstance | null = null;

export async function testMusicToken(developerToken: string): Promise<void> {
  if (!window.MusicKit) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("MusicKit failed to load")),
        10000,
      );
      document.addEventListener("musickitloaded", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  try {
    instance = await window.MusicKit.configure({
      developerToken,
      app: { name: "Playlist Generator", build: "1.0.0" },
    });
  } catch (e) {
    console.error("MusicKit.configure failed:", e);
    throw new Error(
      `MusicKit configuration failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export async function initMusicKit(developerToken: string): Promise<void> {
  // Wait for MusicKit to load
  if (!window.MusicKit) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("MusicKit failed to load")),
        10000,
      );
      document.addEventListener("musickitloaded", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  instance = await window.MusicKit.configure({
    developerToken,
    app: { name: "Playlist Generator", build: "1.0.0" },
  });
}

function getArtworkUrl(url: string, size = 80): string {
  return url.replace("{w}", String(size)).replace("{h}", String(size));
}

export async function searchSong(
  title: string,
  artist: string,
): Promise<AppleMusicMatch | null> {
  if (!instance) throw new Error("MusicKit not initialized");

  try {
    const storefront = instance.storefrontId || "us";
    const term = `${title} ${artist}`;
    const response = await instance.api.music(
      `/v1/catalog/${storefront}/search`,
      { term, types: ["songs"], limit: 1 },
    );

    const song = response.data.results?.songs?.data?.[0];
    if (!song) {
      console.log(`[MusicKit] No song found for "${term}"`);
      return null;
    }

    return {
      id: song.id,
      title: song.attributes.name,
      artist: song.attributes.artistName,
      album: song.attributes.albumName,
      artworkUrl: getArtworkUrl(song.attributes.artwork.url),
      previewUrl: song.attributes.previews?.[0]?.url ?? null,
    };
  } catch (e) {
    console.error(`[MusicKit] Search error for "${title} ${artist}":`, e);
    return null;
  }
}

const DELAY_MS = 300;

export async function matchSongs(songs: ClaudeSong[]): Promise<Song[]> {
  const matches: (AppleMusicMatch | null)[] = [];
  for (const s of songs) {
    const match = await searchSong(s.title, s.artist);
    matches.push(match);
    if (songs.indexOf(s) < songs.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return songs.map((claude, i) => ({
    claude,
    match: matches[i],
    status: "pending" as const,
    keepReasons: [],
    removeReasons: [],
  }));
}

export async function authorize(): Promise<string> {
  if (!instance) throw new Error("MusicKit not initialized");
  return instance.authorize();
}

export async function createPlaylist(
  name: string,
  description: string,
  songIds: string[],
): Promise<void> {
  if (!instance) throw new Error("MusicKit not initialized");
  if (!instance.isAuthorized) {
    await instance.authorize();
  }

  const musicUserToken = await instance.authorize();

  // Use fetch directly for library playlist creation
  const res = await fetch(
    "https://api.music.apple.com/v1/me/library/playlists",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${instance.developerToken}`,
        "Music-User-Token": musicUserToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attributes: { name, description },
        relationships: {
          tracks: {
            data: songIds.map((id) => ({
              id,
              type: "songs",
            })),
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create playlist: ${body}`);
  }
}

export async function playSong(songId: string): Promise<void> {
  if (!instance) throw new Error("MusicKit not initialized");
  await instance.setQueue({ song: songId });
  await instance.play();
}

export function stopPlayback(): void {
  if (!instance) return;
  instance.stop();
}

export function onPlaybackStateChange(callback: () => void): () => void {
  if (!instance) return () => {};
  instance.addEventListener("playbackStateDidChange", callback);
  return () =>
    instance?.removeEventListener("playbackStateDidChange", callback);
}

export function isPlaying(): boolean {
  // MusicKit playback states: 2 = playing
  return instance?.playbackState === 2;
}
