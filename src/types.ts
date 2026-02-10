export type SongStatus = 'pending' | 'kept' | 'removed'

export type KeepReason = 'perfect-mood' | 'love-genre' | 'great-tempo' | 'love-artist' | 'good-discovery' | 'nostalgic'

export type RemoveReason = 'wrong-mood' | 'wrong-genre' | 'wrong-era' | 'too-popular' | 'too-obscure' | 'dislike-artist' | 'too-fast' | 'too-slow' | 'too-intense' | 'too-soft'

export interface ClaudeSong {
  title: string
  artist: string
  reason: string
}

export interface AppleMusicMatch {
  id: string
  title: string
  artist: string
  album: string
  artworkUrl: string
  previewUrl: string | null
}

export interface Song {
  claude: ClaudeSong
  match: AppleMusicMatch | null
  status: SongStatus
  keepReasons: KeepReason[]
  removeReasons: RemoveReason[]
}

export type Screen = 'setup' | 'prompt' | 'results'

export interface SessionSong {
  claude: ClaudeSong
  status: SongStatus
  keepReasons: KeepReason[]
  removeReasons: RemoveReason[]
}

export interface SessionState {
  prompt: string
  suggestions: SessionSong[]
  savedSongs: SessionSong[]
  allRemoved: { title: string; artist: string; reasons: string[] }[]
  updatedAt: number
}
