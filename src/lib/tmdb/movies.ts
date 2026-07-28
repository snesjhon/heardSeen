// Run standalone via tsx (outside the Next.js build), so this deliberately
// does not `import "server-only"` -- see the note in lib/itunes/albums.ts.
// TMDB is the movie metadata source (see .env.example for why: the iTunes
// Search API's movie index is effectively empty as of 2026). Used only
// offline by the seed script, same as the iTunes album wrapper.
const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const TMDB_PROFILE_BASE = "https://image.tmdb.org/t/p/w185";

interface TmdbMovieResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
}

interface TmdbCreditsResponse {
  crew: Array<{ job: string; name: string }>;
}

interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

interface TmdbMovieDetailResponse {
  id: number;
  title: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  credits?: {
    cast: TmdbCastMember[];
    crew: Array<{ job: string; name: string }>;
  };
}

export interface MovieDetail {
  id: number;
  title: string;
  tagline: string | null;
  overview: string | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number | null;
  director: string | null;
  cast: Array<{
    id: number;
    name: string;
    character: string;
    photoUrl: string | null;
  }>;
  tmdbUrl: string;
}

export interface NormalizedMovie {
  type: "movie";
  external_id: string;
  title: string;
  creator: string;
  artwork_url: string | null;
  release_year: number | null;
  // No official API maps a TMDB id to an Apple TV catalog id, so this links
  // to the movie's TMDB page rather than tv.apple.com directly -- TMDB's
  // "Where to Watch" section links out to Apple TV (via JustWatch) when the
  // title is available there, which a constructed tv.apple.com/search guess
  // can't reliably do.
  apple_url: string | null;
  raw_metadata: TmdbMovieResult & { director: string | null };
}

function requireApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set");
  return key;
}

async function fetchDirector(movieId: number): Promise<string | null> {
  const url = `${TMDB_API_BASE}/movie/${movieId}/credits?api_key=${requireApiKey()}`;
  const response = await fetch(url);
  if (!response.ok) return null;

  const data = (await response.json()) as TmdbCreditsResponse;
  return data.crew.find((member) => member.job === "Director")?.name ?? null;
}

function tmdbMoviePageUrl(id: number): string {
  return `https://www.themoviedb.org/movie/${id}`;
}

export async function searchMovie(
  title: string,
): Promise<NormalizedMovie | null> {
  const url = `${TMDB_API_BASE}/search/movie?query=${encodeURIComponent(title)}&api_key=${requireApiKey()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB search failed: ${response.status}`);
  }

  const data = (await response.json()) as { results: TmdbMovieResult[] };
  if (data.results.length === 0) return null;

  const best = data.results[0];
  const director = await fetchDirector(best.id);

  return {
    type: "movie",
    external_id: String(best.id),
    title: best.title,
    creator: director ?? "Unknown",
    artwork_url: best.poster_path
      ? `${TMDB_IMAGE_BASE}${best.poster_path}`
      : null,
    release_year: best.release_date
      ? new Date(best.release_date).getUTCFullYear()
      : null,
    apple_url: tmdbMoviePageUrl(best.id),
    raw_metadata: { ...best, director },
  };
}

// Full-detail lookup by TMDB id, including cast/crew -- used by movie detail
// pages (called at request time, not just offline by the seed script).
// Cached for a day via Next's fetch cache so repeat visits don't re-hit
// TMDB. append_to_response=credits folds the separate /credits call the
// seed-time searchMovie() needs into this single request.
export async function getMovie(
  tmdbId: string | number,
): Promise<MovieDetail | null> {
  const url = `${TMDB_API_BASE}/movie/${tmdbId}?api_key=${requireApiKey()}&append_to_response=credits`;

  const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`TMDB movie lookup failed: ${response.status}`);
  }

  const data = (await response.json()) as TmdbMovieDetailResponse;

  const cast = (data.credits?.cast ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, 12)
    .map((member) => ({
      id: member.id,
      name: member.name,
      character: member.character,
      photoUrl: member.profile_path
        ? `${TMDB_PROFILE_BASE}${member.profile_path}`
        : null,
    }));

  const director =
    data.credits?.crew.find((member) => member.job === "Director")?.name ??
    null;

  return {
    id: data.id,
    title: data.title,
    tagline: data.tagline || null,
    overview: data.overview || null,
    releaseDate: data.release_date ?? null,
    runtimeMinutes: data.runtime ?? null,
    genres: (data.genres ?? []).map((genre) => genre.name),
    posterUrl: data.poster_path
      ? `${TMDB_IMAGE_BASE}${data.poster_path}`
      : null,
    backdropUrl: data.backdrop_path
      ? `${TMDB_BACKDROP_BASE}${data.backdrop_path}`
      : null,
    voteAverage: data.vote_average ?? null,
    director,
    cast,
    tmdbUrl: tmdbMoviePageUrl(data.id),
  };
}
