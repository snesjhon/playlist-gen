# Playlist Generator - Apple Music + Claude

An AI-powered playlist generator that uses Claude to recommend songs and Apple Music to source, preview, and export them.

## How It Works

1. Enter a text prompt describing the playlist you want (e.g., "upbeat indie rock for a road trip")
2. Claude generates 10 song recommendations
3. Each song is matched against the Apple Music catalog with artwork, artist, and album info
4. **Keep** songs you like, **remove** ones you don't
5. **Regenerate** to fill gaps — Claude uses your kept/removed songs as context to refine recommendations
6. **Export** the final playlist directly to your Apple Music library

## Architecture

- **Stack:** Vite + React + TypeScript
- **Claude API:** Called directly via `fetch` from the browser (no backend needed)
- **Apple Music:** MusicKit JS v3 loaded from Apple's CDN
- **API Keys:** BYO-key pattern — you enter your own Claude API key and Apple Music developer token, stored in localStorage

## Prerequisites

- **Apple Developer Program membership** ($99/year) — required to generate a MusicKit developer token (JWT signed with your private key from Apple Developer portal)
  - Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources)
  - Create a MusicKit identifier
  - Generate a private key (`.p8` file)
  - Sign a JWT with claims: `iss` (Team ID), `iat`, `exp` (up to 6 months), algorithm ES256
- **Claude API key** from [console.anthropic.com](https://console.anthropic.com)

## File Structure

```
playlist-gen/
  index.html                        # App shell, MusicKit JS CDN script tag
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.tsx                        # React entry point
    App.tsx                         # Root component, screen routing
    types.ts                        # Shared TypeScript types
    lib/
      claude.ts                     # Claude API integration
      musickit.ts                   # MusicKit JS wrapper
      storage.ts                    # localStorage helpers
    components/
      SetupScreen.tsx               # API key + Apple Music token inputs
      PromptScreen.tsx              # Prompt textarea + generate button
      ResultsScreen.tsx             # Song list with keep/remove/regenerate/export
      SongCard.tsx                  # Individual song card with artwork + actions
      ExportModal.tsx               # Playlist name input + export confirmation
    styles/
      index.css                     # Global styles, CSS variables, dark theme
```

## Types (`src/types.ts`)

```ts
export type SongStatus = "pending" | "kept" | "removed";

export interface ClaudeSong {
  title: string;
  artist: string;
  reason: string; // 1-sentence explanation of why this song fits the prompt
}

export interface AppleMusicMatch {
  id: string; // Apple Music catalog song ID
  title: string; // Apple Music's canonical title
  artist: string;
  album: string;
  artworkUrl: string; // 200x200 artwork URL
  previewUrl: string | null; // 30-second preview audio URL
}

export interface Song {
  claude: ClaudeSong; // What Claude recommended
  match: AppleMusicMatch | null; // null = not found on Apple Music
  status: SongStatus;
}

export type Screen = "setup" | "prompt" | "results";
```

---

## Implementation Plan

### Step 1: Project Setup

```bash
npm create vite@latest playlist-gen -- --template react-ts
cd playlist-gen
npm install
```

**`index.html`** — Add MusicKit JS v3 before the closing `</head>`:

```html
<script
  src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"
  data-web-components
  crossorigin
></script>
```

**MusicKit type declarations** — Create `src/musickit.d.ts`:

```ts
declare namespace MusicKit {
  function configure(config: {
    developerToken: string;
    app: { name: string; build: string };
  }): Promise<void>;
  function getInstance(): MusicKitInstance;

  interface MusicKitInstance {
    authorize(): Promise<string>;
    musicUserToken: string;
    developerToken: string;
    storefrontId: string;
    api: {
      music(
        path: string,
        params?: Record<string, any>,
        options?: any,
      ): Promise<any>;
    };
  }
}
```

**CSS variables** in `src/styles/index.css`:

```css
:root {
  --bg: #0a0a0a;
  --surface: #1a1a1a;
  --surface-hover: #252525;
  --accent: #fa2d48; /* Apple Music red */
  --kept: #34c759; /* Green for kept songs */
  --removed: #ff453a; /* Red for removed songs */
  --text: #f5f5f7;
  --text-muted: #86868b;
  --radius: 12px;
}
```

### Step 2: Storage + Setup Screen

**`src/lib/storage.ts`**

```ts
const CLAUDE_KEY = "playlist_gen_claude_key";
const APPLE_TOKEN = "playlist_gen_apple_token";

export const getClaudeKey = () => localStorage.getItem(CLAUDE_KEY);
export const setClaudeKey = (key: string) =>
  localStorage.setItem(CLAUDE_KEY, key);
export const getAppleToken = () => localStorage.getItem(APPLE_TOKEN);
export const setAppleToken = (token: string) =>
  localStorage.setItem(APPLE_TOKEN, token);
export const clearKeys = () => {
  localStorage.removeItem(CLAUDE_KEY);
  localStorage.removeItem(APPLE_TOKEN);
};
export const hasKeys = () => !!getClaudeKey() && !!getAppleToken();
```

**`src/components/SetupScreen.tsx`**

- Two password-type inputs: Claude API key, Apple Music developer token
- "Get Started" button — validates both fields are non-empty, saves to localStorage, navigates to prompt screen
- Links to Apple Developer docs and Anthropic console for help

### Step 3: Claude API Integration

**`src/lib/claude.ts`**

Call Claude via `fetch` directly — no SDK dependency needed.

````ts
const SYSTEM_PROMPT = `You are a music recommendation engine. The user will describe the kind of playlist they want. Return EXACTLY the requested number of song recommendations as a JSON array. Each element must have these fields:
- "title" (string): the song title
- "artist" (string): the artist name
- "reason" (string): 1 sentence explaining why this song fits

Return ONLY the JSON array. No markdown fences, no preamble, no explanation.`;

async function callClaude(
  apiKey: string,
  userMessage: string,
): Promise<ClaudeSong[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid Claude API key");
    if (res.status === 429)
      throw new Error("Rate limited. Please wait a moment and try again.");
    throw new Error(`Claude API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.content[0].text;
  // Strip markdown fences if present
  const cleaned = text
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();
  return JSON.parse(cleaned);
}
````

**Two exported functions:**

```ts
export async function generatePlaylist(
  apiKey: string,
  prompt: string,
): Promise<ClaudeSong[]> {
  return callClaude(apiKey, `Create a playlist of 10 songs: "${prompt}"`);
}

export async function regeneratePlaylist(
  apiKey: string,
  prompt: string,
  kept: ClaudeSong[],
  removed: ClaudeSong[],
  count: number,
): Promise<ClaudeSong[]> {
  const message = `Create a playlist: "${prompt}"

The user already has these songs and wants to KEEP them (do NOT suggest these again):
${JSON.stringify(kept.map((s) => ({ title: s.title, artist: s.artist })))}

The user REMOVED these songs (they did not like them — avoid similar style/vibe):
${JSON.stringify(removed.map((s) => ({ title: s.title, artist: s.artist })))}

Suggest ${count} NEW songs that complement the kept songs and avoid the style of the removed songs. Return ONLY those ${count} new songs as a JSON array.`;

  return callClaude(apiKey, message);
}
```

### Step 4: MusicKit JS Integration

**`src/lib/musickit.ts`**

```ts
let musicInstance: MusicKit.MusicKitInstance | null = null;

export async function initMusicKit(developerToken: string) {
  await MusicKit.configure({
    developerToken,
    app: { name: "Playlist Generator", build: "1.0.0" },
  });
  musicInstance = MusicKit.getInstance();
}

export function getInstance() {
  if (!musicInstance) throw new Error("MusicKit not initialized");
  return musicInstance;
}

export async function authorize(): Promise<string> {
  return getInstance().authorize();
}
```

**Song search:**

```ts
export async function searchSong(
  title: string,
  artist: string,
): Promise<AppleMusicMatch | null> {
  const music = getInstance();
  const query = `${title} ${artist}`;

  const result = await music.api.music("/v1/catalog/us/search", {
    term: query,
    types: "songs",
    limit: 3,
  });

  const songs = result?.data?.results?.songs?.data;
  if (!songs || songs.length === 0) return null;

  const song = songs[0];
  return {
    id: song.id,
    title: song.attributes.name,
    artist: song.attributes.artistName,
    album: song.attributes.albumName,
    artworkUrl: song.attributes.artwork.url
      .replace("{w}", "200")
      .replace("{h}", "200"),
    previewUrl: song.attributes.previews?.[0]?.url || null,
  };
}
```

**Batch matching (concurrent):**

```ts
export async function matchSongs(claudeSongs: ClaudeSong[]): Promise<Song[]> {
  const results = await Promise.allSettled(
    claudeSongs.map((s) => searchSong(s.title, s.artist)),
  );

  return claudeSongs.map((song, i) => ({
    claude: song,
    match: results[i].status === "fulfilled" ? results[i].value : null,
    status: "pending" as SongStatus,
  }));
}
```

**Playlist creation:**

```ts
export async function createPlaylist(
  name: string,
  description: string,
  songIds: string[],
): Promise<void> {
  const music = getInstance();

  await fetch("https://api.music.apple.com/v1/me/library/playlists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${music.developerToken}`,
      "Music-User-Token": music.musicUserToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      attributes: { name, description },
      relationships: {
        tracks: {
          data: songIds.map((id) => ({ id, type: "songs" })),
        },
      },
    }),
  });
}
```

### Step 5: UI Components

**`src/App.tsx`** — State machine with three screens:

- `setup` → `prompt` → `results`
- State: `{ screen, userPrompt, songs: Song[], allRemovedSongs: ClaudeSong[], loading, error }`

**`src/components/PromptScreen.tsx`**

- Large textarea (4-5 rows) for the prompt
- "Generate Playlist" button
- Small "Change API keys" link in corner

**`src/components/SongCard.tsx`**

- Layout: artwork (80x80) | song info (title, artist, album, reason) | action buttons (keep/remove)
- Visual states:
  - `pending` — default card styling
  - `kept` — green left border, check icon highlighted
  - `removed` — opacity 0.4, title strikethrough, X icon highlighted
  - No Apple Music match — "Not found on Apple Music" badge, greyed out

**`src/components/ResultsScreen.tsx`**

- Header: shows the prompt text + "Edit prompt" link
- Song list: 10 `SongCard` components
- Action bar at bottom:
  - "Regenerate" button (disabled if all 10 are kept)
  - "Export to Apple Music" button with count: "Export N songs"
- Loading state: 10 skeleton shimmer cards

### Step 6: Regeneration Flow

When user clicks "Regenerate":

1. Collect kept songs (`status === 'kept'`) and newly removed songs
2. Add newly removed songs to `allRemovedSongs` (accumulates across rounds)
3. Call `regeneratePlaylist(apiKey, prompt, keptSongs, allRemovedSongs, 10 - keptCount)`
4. Match new songs against Apple Music via `matchSongs()`
5. Merge: kept songs stay in their positions, new songs fill remaining slots
6. All new songs start as `status: 'pending'`
7. Re-render

### Step 7: Export Flow

**`src/components/ExportModal.tsx`**

1. Modal overlay with editable playlist name (defaults to prompt text, max 100 chars)
2. On confirm:
   - Call `authorize()` if not yet authorized (Apple Music sign-in popup)
   - Collect songs: all `kept` + `pending` status songs that have a valid `match`
   - Call `createPlaylist(name, prompt, songIds)`
   - Show success message: "Playlist created! Open Apple Music to listen."
   - Show error with retry button if it fails

### Step 8: Polish & Error Handling

**Error handling:**

- Invalid Claude API key → inline error on setup screen
- Claude rate limit (429) → toast message, suggest waiting
- Unparseable JSON from Claude → retry once with correction prompt
- Apple Music token expired → redirect to setup screen
- Song not found → "Not found" badge on card, excluded from export count
- Playlist creation failed → error modal with details + retry

**Responsive design:**

- Desktop: max-width 800px centered, comfortable card layout
- Mobile (<768px): full-width, stacked layout, larger touch targets

**Animations:**

- Song cards: `transition: opacity 0.2s ease, transform 0.2s ease` on status changes
- Loading skeleton: shimmer animation (CSS keyframes)
- Screen transitions: fade in/out

---

## Development

```bash
npm install
npm run dev        # Start dev server at localhost:5173
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

## Tech Notes

- **No backend needed:** Claude API supports browser CORS with the `anthropic-dangerous-direct-browser-access` header. Apple Music catalog search only requires a developer token (no user auth needed for search).
- **User auth deferred:** `music.authorize()` is only called when the user clicks Export, not on app load. This avoids unnecessary sign-in friction.
- **Storefront:** Defaults to `us`. Could be improved to detect user's storefront after authorization via `musicInstance.storefrontId`.
- **Model:** Uses `claude-sonnet-4-20250514` for fast, cost-effective recommendations. Could be changed to a different model in `claude.ts`.
