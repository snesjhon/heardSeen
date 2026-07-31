// Hand-written to match supabase/migrations/*.sql. Once a real Supabase
// project exists, regenerate against it with:
//   pnpm exec supabase gen types typescript --linked > src/lib/types/database.ts
// and diff against this file before trusting the regenerated version blindly.
//
// Deliberately `type`, not `interface`, throughout: @supabase/postgrest-js's
// GenericTable/GenericSchema constraints require Row/Insert/Update to be
// structurally assignable to Record<string, unknown>, and a named `interface`
// does NOT satisfy that constraint the way an object-literal `type` does --
// using `interface` here silently collapses every `.from(...)` call's
// argument/return types to `never` instead of raising a visible error.

export type MediaType = "album" | "movie";
export type ListMediaType = "album" | "movie" | "mixed";

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type MediaItem = {
  id: string;
  type: MediaType;
  external_id: string;
  title: string;
  creator: string;
  artwork_url: string | null;
  release_year: number | null;
  apple_url: string | null;
  raw_metadata: Record<string, unknown> | null;
  created_at: string;
};

export type List = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  media_type: ListMediaType;
  source_attribution: string | null;
  created_at: string;
};

export type ListItem = {
  id: string;
  list_id: string;
  media_item_id: string;
  position: number;
  description: string | null;
};

export type DiaryEntry = {
  id: string;
  user_id: string;
  media_item_id: string;
  list_id: string | null;
  rating: number | null;
  notes: string | null;
  logged_at: string | null;
  created_at: string;
};

export type ListProgress = {
  list_id: string;
  slug: string;
  title: string;
  media_type: ListMediaType;
  total_items: number;
  completed_items: number;
};

// `Relationships` is required by @supabase/postgrest-js's GenericTable/
// GenericView constraints -- omitting it makes every client method silently
// fall back to `never` argument/return types instead of a visible type error.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      media_items: {
        Row: MediaItem;
        Insert: Omit<MediaItem, "id" | "created_at"> & { id?: string };
        Update: Partial<MediaItem>;
        Relationships: [];
      };
      lists: {
        Row: List;
        Insert: Omit<List, "id" | "created_at"> & { id?: string };
        Update: Partial<List>;
        Relationships: [];
      };
      list_items: {
        Row: ListItem;
        Insert: Omit<ListItem, "id"> & { id?: string };
        Update: Partial<ListItem>;
        Relationships: [];
      };
      diary_entries: {
        Row: DiaryEntry;
        Insert: Omit<DiaryEntry, "id" | "created_at"> & { id?: string };
        Update: Partial<DiaryEntry>;
        Relationships: [];
      };
    };
    Views: {
      list_progress: {
        Row: ListProgress;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      media_type: MediaType;
      list_media_type: ListMediaType;
    };
    CompositeTypes: Record<string, never>;
  };
};
