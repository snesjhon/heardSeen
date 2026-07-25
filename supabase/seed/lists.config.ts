export interface ListConfig {
  slug: string;
  title: string;
  description: string;
  mediaType: "album" | "movie";
  sourceAttribution: string;
  sourceFile: string;
  outputFile: string;
}

// A small representative SAMPLE of each list (~20 items), not the full
// 500-1001-item canon -- see supabase/seed/README.md for why, and for how
// to extend these once the real credentials/time exist to do it properly.
export const LISTS: ListConfig[] = [
  {
    slug: "1001-albums",
    title: "1001 Albums You Must Hear Before You Die",
    description:
      "A sample from the classic music-criticism anthology of essential albums.",
    mediaType: "album",
    sourceAttribution:
      "1001 Albums You Must Hear Before You Die (ed. Robert Dimery)",
    sourceFile: "sources/1001-albums.source.json",
    outputFile: "data/1001-albums.json",
  },
  {
    slug: "rolling-stone-500",
    title: "Rolling Stone's 500 Greatest Albums of All Time",
    description: "A sample from Rolling Stone magazine's ranked list.",
    mediaType: "album",
    sourceAttribution: "Rolling Stone",
    sourceFile: "sources/rolling-stone-500.source.json",
    outputFile: "data/rolling-stone-500.json",
  },
  {
    slug: "afi-100",
    title: "AFI's 100 Years...100 Movies",
    description:
      "A sample from the American Film Institute's list of great American films.",
    mediaType: "movie",
    sourceAttribution: "American Film Institute",
    sourceFile: "sources/afi-100.source.json",
    outputFile: "data/afi-100.json",
  },
];
