# FamilyVista audit and redesign notes

Date: 2026-11-07. Scope: full source review of the Next.js 16 + Supabase app, bug fixes, and a UI/UX redesign on the GodWatch design language (pure black, gold accents, Fraunces display serif + Geist).

## Required action after deploying

Run `supabase/fix-share-policy.sql` in the Supabase SQL editor (or re-run `supabase/all-in-one.sql`). The old `album_shares` policy was a security hole, see Security below.

Storage note: photos now upload a small WebP thumbnail next to the original at `<user>/<album>/thumbs/<file>.webp`. Existing photos keep using the original as their thumbnail until re-uploaded.

## Security

| # | Finding | Fix |
|---|---------|-----|
| S1 | **Anyone could grant themselves read access to any album.** The `shares_owner_all` policy only checked `auth.uid() = owner_id`, so a signed-in user could insert `album_shares(album_id = <any album>, owner_id = <self>, shared_with_email = <self>)` and the "shared" select policies would then expose that album and its photos. | New insert/update policies also require `albums.user_id = auth.uid()` for the shared album. `fix-share-policy.sql` also deletes rows that slipped through. |
| S2 | Storage bucket is public-read by URL (anyone with a link can open a photo). | Not changed. Switching to a private bucket with signed URLs is a larger change; flagged for a follow-up. |

## Data bugs (fixed)

| # | Finding | Fix |
|---|---------|-----|
| D1 | **Deleting a duplicated album or photo forever destroyed the original's files.** Duplicates share the same storage object; "Delete forever" removed the file regardless of other rows referencing it. | `removeOrphanedFiles` only removes a storage object when no remaining `images` row references it (original or thumbnail). |
| D2 | **Trashing an album left its photos and sub-albums live.** Only the album row was flagged, so photos stayed out of Trash, sub-albums became invisible orphans, and "Delete forever" cascaded away their rows while leaking their storage files. | Trash cascades to all descendants and their photos with one shared `deleted_at`. Restore brings back the same set plus the ancestor chain. Permanent delete collects every file in the subtree before deleting. |
| D3 | **Shared albums appeared under "Your albums" with Rename/Trash menus.** The album query relied on RLS, which also returns albums shared with you. The sidebar then listed them twice. | Albums are split by `user_id` into `albums` (owned) and `sharedAlbums`. |
| D4 | **Three disconnected copies of album state.** Sidebar, dashboard and album page each ran their own `useAlbums()`, so creating or renaming an album in one place left the others stale, and the album + image tables were fetched three times per navigation. | One Zustand album store, fetched once, refreshed after every mutation. |
| D5 | **Moving photos to another album did not update the view** until a full reload. | `moveImages()` refetches, appends at the end of the target album's order and clears `group_id`. |
| D6 | **Captions could never be cleared.** Empty caption was coerced to `undefined` and skipped. | Caption is always written. |
| D7 | Sub-sub-albums were invisible. `buildAlbumTree` only handled two levels while the UI allowed unlimited nesting. | Recursive tree builder; orphans (parent not visible) are shown at root. |
| D8 | Reorder used `upsert` with partial rows, which can fail on NOT NULL columns. | Per-row `update` of `sort_order`, with a refetch on failure. |
| D9 | Dimensions were obtained by re-downloading the just-uploaded file from storage. | Read from the local file via `createImageBitmap` (EXIF orientation applied). |
| D10 | Cancelled uploads were re-queued as "queued" and restarted. | Cancelled items are removed. Added "Retry failed" and "Cancel all". |

## UX / UI problems (fixed)

| # | Finding | Fix |
|---|---------|-----|
| U1 | Collapsing the sidebar on desktop also blanked the mobile drawer's contents. | Drawer visibility is `sidebarOpen || mobileOpen`; drawer closes on navigation. |
| U2 | Typing `DELETE <name>` was required for a reversible move-to-trash. | Trash is a plain confirm with an "Open trash" toast action. Typed phrases remain for permanent deletion only. |
| U3 | Album page showed no sub-albums and no way to rename, share, duplicate or trash the album from its own page. | Sub-album strip, album action menu, breadcrumb trail in the header. |
| U4 | Selection mode had no visible checkboxes and no range selection. | Checkbox overlays, Shift-click range, Ctrl/Cmd-click toggle, Ctrl/Cmd-A select all, Esc clears, floating bulk-action bar. |
| U5 | Every thumbnail was the full-resolution original. | Client-side 720px WebP thumbnails generated and uploaded alongside the original. |
| U6 | "White borders" were invisible in light mode and could not be changed. | Colour presets: white, cream, gold, charcoal, black. |
| U7 | Slideshow mode lost the previous view mode on close and did not auto-play. | Returns to the previous mode; auto-plays; chrome auto-hides while playing; `F` for full screen; neighbours preloaded; active thumbnail kept in view. |
| U8 | Radix dialogs/menus used `animate-in` classes from a plugin that was never installed, so nothing animated. | Small keyframe set in `globals.css`. |
| U9 | Theme toggle caused a hydration mismatch (server did not know the theme). | Label is stable until hydrated. |
| U10 | `middleware.ts` is deprecated in Next 16. | Renamed to `proxy.ts`. |
| U11 | Trash page listed photos that belonged to trashed albums as loose items, and had no bulk actions. | Photos inside a trashed album are represented by the album row; loose photos show their source album; multi-select restore/delete. |

## Design system

* Tokens in `src/app/globals.css` mirror GodWatch exactly: `--bg #000`, `--fg #f2f1ec`, gold `#e9bd50` with the `--gold-grad` button gradient, glass surfaces, `--line` borders. Light theme uses GodWatch's warm cream.
* Utilities: `.btn-gold`, `.glass`, `.glass-strong`, `.font-display`, `.text-gold-grad`, `.ambient-gold`, `.dot-grid`.
* `Button` variants: `default` (gold), `outline` (glass), `ghost`, `secondary`, `destructive` (soft red), `link`.
* Shared pieces: `LogoMark`/`Wordmark`, `PageHeader`, `EmptyState`.

## Known gaps / follow-ups

* Private storage bucket with signed URLs (S2).
* HEIC uploads render only in Safari; Chrome cannot decode them, so no thumbnail is produced and the original is used.
* `image_groups` exists in the schema with no UI to create groups. Left as is.
* Google sign-in could not be exercised here (no Supabase credentials in this checkout); dashboard screens were verified with mock data.
