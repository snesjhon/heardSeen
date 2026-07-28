// Apple Music Catalog REST API -- the sanctioned source for album metadata
// and artwork (as opposed to the free-but-legacy/undocumented iTunes Search
// API). Used only offline by the seed script (run standalone via tsx,
// outside the Next.js build -- so this deliberately does not
// `import "server-only"`, which only works inside Next's webpack pipeline).
//
// This calls the Catalog REST endpoint directly with a signed developer
// token -- it does NOT use MusicKit JS, so there's no browser SDK, no
// end-user Apple Music subscription, and no authorize() consent flow. Just
// server-side search/lookup, which is all metadata enrichment needs.
//
// Requires an Apple Developer Program membership (~$99/yr) to generate the
// MusicKit key (Team ID, Key ID, .p8 private key) used to sign the token.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import jwt from "jsonwebtoken";

const CATALOG_API_BASE = "https://api.music.apple.com/v1/catalog";
const DEFAULT_STOREFRONT = "us";
// Apple allows up to 6 months; a short-lived token is safer for a script
// that runs occasionally and always re-signs on a fresh process anyway.
const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

interface AppleMusicArtwork {
  url: string;
  width: number;
  height: number;
}

interface AppleMusicAlbum {
  id: string;
  attributes: {
    name: string;
    artistName: string;
    artwork?: AppleMusicArtwork;
    releaseDate?: string;
    url: string;
  };
}

interface AppleMusicSearchResponse {
  results: {
    albums?: {
      data: AppleMusicAlbum[];
    };
  };
}

interface AppleMusicTrack {
  id: string;
  attributes: {
    name: string;
    durationInMillis?: number;
    trackNumber?: number;
    discNumber?: number;
  };
}

interface AppleMusicAlbumDetail extends AppleMusicAlbum {
  attributes: AppleMusicAlbum["attributes"] & {
    genreNames?: string[];
    trackCount?: number;
    copyright?: string;
    recordLabel?: string;
    editorialNotes?: { standard?: string; short?: string };
  };
  relationships?: {
    tracks?: { data: AppleMusicTrack[] };
  };
}

interface AppleMusicAlbumLookupResponse {
  data: AppleMusicAlbumDetail[];
}

export interface AlbumDetail {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  releaseDate: string | null;
  genres: string[];
  trackCount: number | null;
  recordLabel: string | null;
  copyright: string | null;
  editorialNote: string | null;
  appleUrl: string | null;
  tracks: Array<{
    id: string;
    number: number | null;
    discNumber: number | null;
    name: string;
    durationMs: number | null;
  }>;
}

export interface NormalizedAlbum {
  type: "album";
  external_id: string;
  title: string;
  creator: string;
  artwork_url: string | null;
  release_year: number | null;
  apple_url: string | null;
  raw_metadata: AppleMusicAlbum;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

// Deployed environments (Vercel) have no gitignored .p8 file on disk, so the
// key content itself must come through as an env var there. Local dev/seeding
// keeps using a file path since that's easier to manage than a multi-line
// secret in `.env`.
function loadPrivateKey(): string {
  const keyContent = process.env.APPLE_PRIVATE_KEY;
  if (keyContent) {
    return keyContent.includes("BEGIN PRIVATE KEY")
      ? keyContent.replace(/\\n/g, "\n")
      : Buffer.from(keyContent, "base64").toString("utf-8");
  }

  const privateKeyPath = process.env.APPLE_PRIVATE_KEY_PATH;
  if (privateKeyPath) {
    return readFileSync(resolve(privateKeyPath), "utf-8");
  }

  throw new Error(
    "Either APPLE_PRIVATE_KEY (key contents) or APPLE_PRIVATE_KEY_PATH (local file path) must be set to call the Apple Music Catalog API",
  );
}

function getDeveloperToken(): string {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;

  if (!teamId || !keyId) {
    throw new Error(
      "APPLE_TEAM_ID and APPLE_KEY_ID must be set to call the Apple Music Catalog API",
    );
  }

  const privateKey = loadPrivateKey();

  const token = jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: TOKEN_TTL_SECONDS,
    issuer: teamId,
    header: { alg: "ES256", kid: keyId },
  });

  cachedToken = {
    token,
    expiresAt: Date.now() + (TOKEN_TTL_SECONDS - 60) * 1000,
  };
  return token;
}

function largeArtworkUrl(
  artwork: AppleMusicArtwork | undefined,
): string | null {
  if (!artwork) return null;
  return artwork.url.replace("{w}", "600").replace("{h}", "600");
}

function normalize(album: AppleMusicAlbum): NormalizedAlbum {
  return {
    type: "album",
    external_id: album.id,
    title: album.attributes.name,
    creator: album.attributes.artistName,
    artwork_url: largeArtworkUrl(album.attributes.artwork),
    release_year: album.attributes.releaseDate
      ? new Date(album.attributes.releaseDate).getUTCFullYear()
      : null,
    apple_url: album.attributes.url ?? null,
    raw_metadata: album,
  };
}

// Best-effort search by "artist title" -- the seed script picks the closest
// artist-name match; there's no exact-ID lookup without already knowing the
// catalog id.
export async function searchAlbum(
  title: string,
  artist: string,
  storefront = DEFAULT_STOREFRONT,
): Promise<NormalizedAlbum | null> {
  const token = getDeveloperToken();
  const term = `${artist} ${title}`;
  const url = `${CATALOG_API_BASE}/${storefront}/search?term=${encodeURIComponent(term)}&types=albums&limit=5`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(
      `Apple Music Catalog search failed: ${response.status} ${await response.text()}`,
    );
  }

  const data = (await response.json()) as AppleMusicSearchResponse;
  const results = data.results.albums?.data ?? [];
  if (results.length === 0) return null;

  const best =
    results.find(
      (album) =>
        album.attributes.artistName.toLowerCase() === artist.toLowerCase(),
    ) ?? results[0];

  return normalize(best);
}

// Full-detail lookup by catalog id, including the tracklist -- used by album
// detail pages (called at request time, not just offline by the seed
// script). Cached for a day via Next's fetch cache so repeat visits don't
// re-hit the Catalog API or re-sign a token on every request.
export async function getAlbum(
  catalogId: string,
  storefront = DEFAULT_STOREFRONT,
): Promise<AlbumDetail | null> {
  const token = getDeveloperToken();
  const url = `${CATALOG_API_BASE}/${storefront}/albums/${catalogId}?include=tracks`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Apple Music Catalog album lookup failed: ${response.status} ${await response.text()}`,
    );
  }

  const data = (await response.json()) as AppleMusicAlbumLookupResponse;
  const album = data.data[0];
  if (!album) return null;

  const tracks = (album.relationships?.tracks?.data ?? [])
    .map((track) => ({
      id: track.id,
      number: track.attributes.trackNumber ?? null,
      discNumber: track.attributes.discNumber ?? null,
      name: track.attributes.name,
      durationMs: track.attributes.durationInMillis ?? null,
    }))
    .sort(
      (a, b) =>
        (a.discNumber ?? 0) - (b.discNumber ?? 0) ||
        (a.number ?? 0) - (b.number ?? 0),
    );

  return {
    id: album.id,
    title: album.attributes.name,
    artist: album.attributes.artistName,
    artworkUrl: largeArtworkUrl(album.attributes.artwork),
    releaseDate: album.attributes.releaseDate ?? null,
    genres: album.attributes.genreNames ?? [],
    trackCount: album.attributes.trackCount ?? tracks.length ?? null,
    recordLabel: album.attributes.recordLabel ?? null,
    copyright: album.attributes.copyright ?? null,
    editorialNote:
      album.attributes.editorialNotes?.standard ??
      album.attributes.editorialNotes?.short ??
      null,
    appleUrl: album.attributes.url ?? null,
    tracks,
  };
}
