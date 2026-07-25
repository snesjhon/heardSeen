// Free, keyless iTunes Search API. Used only offline by the seed script
// (run standalone via tsx, outside the Next.js build -- so this deliberately
// does not `import "server-only"`, which only works inside Next's webpack
// pipeline) -- the running app never calls this at request time (see
// MediaItem in database.ts, populated once at seed time).
const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";
const ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup";

interface ItunesAlbumResult {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100?: string;
  releaseDate?: string;
  collectionViewUrl?: string;
}

export interface NormalizedAlbum {
  type: "album";
  external_id: string;
  title: string;
  creator: string;
  artwork_url: string | null;
  release_year: number | null;
  apple_url: string | null;
  raw_metadata: ItunesAlbumResult;
}

function upscaleArtwork(url: string | undefined): string | null {
  if (!url) return null;
  // iTunes artwork URLs end in e.g. /100x100bb.jpg -- swap for a larger size.
  return url.replace(/\/\d+x\d+bb\.jpg$/, "/600x600bb.jpg");
}

function normalize(result: ItunesAlbumResult): NormalizedAlbum {
  return {
    type: "album",
    external_id: String(result.collectionId),
    title: result.collectionName,
    creator: result.artistName,
    artwork_url: upscaleArtwork(result.artworkUrl100),
    release_year: result.releaseDate
      ? new Date(result.releaseDate).getUTCFullYear()
      : null,
    apple_url: result.collectionViewUrl ?? null,
    raw_metadata: result,
  };
}

// Best-effort search by "title artist" -- the seed script picks the closest
// match; there's no exact-ID lookup without already knowing the collection ID.
export async function searchAlbum(
  title: string,
  artist: string,
): Promise<NormalizedAlbum | null> {
  const term = `${artist} ${title}`;
  const url = `${ITUNES_SEARCH_URL}?term=${encodeURIComponent(term)}&entity=album&limit=5&country=us`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`iTunes Search failed: ${response.status}`);
  }

  const data = (await response.json()) as { results: ItunesAlbumResult[] };
  if (data.results.length === 0) return null;

  // Prefer a result whose artist matches case-insensitively; else take the top hit.
  const best =
    data.results.find(
      (r) => r.artistName.toLowerCase() === artist.toLowerCase(),
    ) ?? data.results[0];

  return normalize(best);
}

export async function lookupAlbumById(
  collectionId: string,
): Promise<NormalizedAlbum | null> {
  const url = `${ITUNES_LOOKUP_URL}?id=${encodeURIComponent(collectionId)}&entity=album`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`iTunes Lookup failed: ${response.status}`);
  }

  const data = (await response.json()) as { results: ItunesAlbumResult[] };
  const match = data.results.find((r) => "collectionId" in r);
  return match ? normalize(match) : null;
}
