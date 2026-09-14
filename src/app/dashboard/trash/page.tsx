"use client";

import { useState } from "react";
import {
  Trash2,
  RotateCcw,
  Folder,
  Image as ImageIcon,
  XCircle,
} from "lucide-react";
import { useTrash } from "@/lib/hooks/use-trash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { Album, Image } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function TrashPage() {
  const {
    trashedAlbums,
    trashedImages,
    loading,
    restoreAlbum,
    restoreImages,
    deleteAlbumForever,
    deleteImagesForever,
    emptyTrash,
  } = useTrash();

  const [emptyOpen, setEmptyOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [imagePermTarget, setImagePermTarget] = useState<Image | null>(null);
  const [imagePermPhrase, setImagePermPhrase] = useState("");
  const [albumPermTarget, setAlbumPermTarget] = useState<Album | null>(null);
  const [albumPermPhrase, setAlbumPermPhrase] = useState("");

  const isEmpty = trashedAlbums.length === 0 && trashedImages.length === 0;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Trash2 className="h-6 w-6" />
            Trash
          </h1>
          <p className="text-sm text-muted-foreground">
            Items stay here until restored or permanently deleted.
          </p>
        </div>
        {!isEmpty && (
          <Button variant="destructive" onClick={() => setEmptyOpen(true)}>
            Empty trash
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center">
          <XCircle className="mb-3 h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold">Trash is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleted albums and photos will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Trashed albums */}
          {trashedAlbums.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Albums ({trashedAlbums.length})
              </h2>
              <div className="space-y-2">
                {trashedAlbums.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3"
                  >
                    <Folder className="h-8 w-8 text-primary/60" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Deleted {a.deleted_at ? formatDate(a.deleted_at) : "—"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={async () => {
                        const ok = await restoreAlbum(a.id);
                        if (ok) toast.success(`Restored “${a.name}”`);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setAlbumPermTarget(a);
                        setAlbumPermPhrase("");
                      }}
                    >
                      Delete forever
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trashed images */}
          {trashedImages.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Photos ({trashedImages.length})
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {trashedImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative overflow-hidden rounded-lg border bg-card"
                  >
                    <div className="aspect-square bg-muted">
                      <img
                        src={img.thumbnail_url ?? img.original_url}
                        alt={img.file_name}
                        className="h-full w-full object-cover opacity-60 grayscale-[40%]"
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon-sm"
                        variant="secondary"
                        onClick={async () => {
                          const ok = await restoreImages([img.id]);
                          if (ok) toast.success("Photo restored");
                        }}
                        aria-label="Restore"
                      >
                        <RotateCcw />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        onClick={() => {
                          setImagePermTarget(img);
                          setImagePermPhrase("");
                        }}
                        aria-label="Delete forever"
                      >
                        <XCircle />
                      </Button>
                    </div>
                    <p className="truncate px-2 py-1.5 text-xs">
                      {img.file_name}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Empty trash (phrase) */}
      <AlertDialog open={emptyOpen} onOpenChange={setEmptyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty the trash permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              All trashed albums and photos will be <b>permanently deleted</b>{" "}
              along with their files. This cannot be undone.
              <br />
              <br />
              Type <b>DELETE ALL</b> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="DELETE ALL"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={phrase.trim().toUpperCase() !== "DELETE ALL"}
              onClick={async () => {
                const res = await emptyTrash(phrase);
                if (res.ok) {
                  toast.success("Trash emptied");
                  setEmptyOpen(false);
                  setPhrase("");
                } else {
                  toast.error(res.error ?? "Failed");
                }
              }}
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete album (phrase) */}
      <AlertDialog
        open={!!albumPermTarget}
        onOpenChange={(v) => !v && setAlbumPermTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete “{albumPermTarget?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The album and all of its photos and files will be{" "}
              <b>permanently deleted</b>. This cannot be undone.
              <br />
              <br />
              Type <b>DELETE FOREVER</b> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={albumPermPhrase}
            onChange={(e) => setAlbumPermPhrase(e.target.value)}
            placeholder="DELETE FOREVER"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={albumPermPhrase.trim().toUpperCase() !== "DELETE FOREVER"}
              onClick={async () => {
                if (!albumPermTarget) return;
                const ok = await deleteAlbumForever(albumPermTarget.id);
                if (ok) {
                  toast.success("Album permanently deleted");
                  setAlbumPermTarget(null);
                } else {
                  toast.error("Failed to delete album");
                }
              }}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete image (phrase) */}
      <AlertDialog
        open={!!imagePermTarget}
        onOpenChange={(v) => !v && setImagePermTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete “{imagePermTarget?.file_name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The photo file will be <b>permanently deleted</b> from storage.
              This cannot be undone.
              <br />
              <br />
              Type <b>DELETE FOREVER</b> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={imagePermPhrase}
            onChange={(e) => setImagePermPhrase(e.target.value)}
            placeholder="DELETE FOREVER"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={imagePermPhrase.trim().toUpperCase() !== "DELETE FOREVER"}
              onClick={async () => {
                if (!imagePermTarget) return;
                const ok = await deleteImagesForever([imagePermTarget.id]);
                if (ok) {
                  toast.success("Photo permanently deleted");
                  setImagePermTarget(null);
                } else {
                  toast.error("Failed to delete photo");
                }
              }}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
