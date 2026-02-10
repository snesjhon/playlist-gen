import { Song } from '../types'
import { generatePlaylist, regeneratePlaylist } from './claude'
import { matchSongs } from './musickit'

export async function generateAndMatch(
  apiKey: string,
  prompt: string,
  kept: { title: string; artist: string; reasons: string[] }[],
  removed: { title: string; artist: string; reasons: string[] }[],
  count: number,
  isInitial: boolean,
  maxRetries = 3,
): Promise<Song[]> {
  const allMatched: Song[] = []
  const avoid: { title: string; artist: string }[] = []
  let remaining = count

  for (let attempt = 0; attempt <= maxRetries && remaining > 0; attempt++) {
    const claudeSongs = isInitial
      ? await generatePlaylist(apiKey, prompt, avoid)
      : await regeneratePlaylist(
          apiKey,
          prompt,
          kept,
          [...removed, ...avoid.map(s => ({ ...s, reasons: [] as string[] }))],
          remaining,
        )

    const matched = await matchSongs(claudeSongs)

    for (const song of matched) {
      if (song.match) {
        allMatched.push(song)
      } else {
        avoid.push({ title: song.claude.title, artist: song.claude.artist })
      }
    }

    remaining = count - allMatched.length
  }

  return allMatched.slice(0, count)
}
