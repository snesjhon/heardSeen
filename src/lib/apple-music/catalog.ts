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

function getDeveloperToken(): string {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyPath = process.env.APPLE_PRIVATE_KEY_PATH;

  if (!teamId || !keyId || !privateKeyPath) {
    throw new Error(
      "APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY_PATH must all be set to call the Apple Music Catalog API",
    );
  }

  const privateKey = readFileSync(resolve(privateKeyPath), "utf-8");

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
