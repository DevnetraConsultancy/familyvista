export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Album {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  sort_order: number;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  image_count?: number;
  children?: Album[];
}

export interface ImageGroup {
  id: string;
  album_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Image {
  id: string;
  album_id: string;
  group_id: string | null;
  user_id: string;
  file_name: string;
  original_url: string;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  mime_type: string | null;
  caption: string | null;
  sort_order: number;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ViewMode = "small" | "large" | "list" | "play";

export interface BorderSettings {
  enabled: boolean;
  width: number; // px
  inside: boolean; // true = inside image, false = outside
  color: string;
}
