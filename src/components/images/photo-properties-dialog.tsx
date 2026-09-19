"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Image } from "@/lib/types";
import { formatBytes, formatDate, stripExtension } from "@/lib/utils";

interface Props {
  image: Image | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 1-based position within the album's current view. */
  position?: number;
  total?: number;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium">
        {value}
      </span>
    </div>
  );
}

/** e.g. 4032×3024 → "4:3" (reduced by GCD; returns "—" when unknown). */
function aspectRatio(w: number | null, h: number | null): string {
  if (!w || !h) return "—";
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  let a = w,
    b = h;
  while (b) {
    [a, b] = [b, a % b];
  }
  const ratio = a > 0 && b >= 0 ? `${w / a}:${h / a}` : "—";
  return ratio;
}

function formatTypeName(mime: string | null, fileName: string): string {
  const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toUpperCase();
  if (!mime) return ext || "Unknown";
  const sub = mime.split("/")[1]?.toUpperCase() ?? mime.toUpperCase();
  return sub === ext ? sub : `${sub} (${ext || "?"})`;
}

export function PhotoPropertiesDialog({
  image,
  open,
  onOpenChange,
  position,
  total,
}: Props) {
  if (!image) return null;

  const megapixels =
    image.width && image.height
      ? ((image.width * image.height) / 1_000_000).toFixed(1)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Photo properties</DialogTitle>
          <DialogDescription className="truncate">
            {image.file_name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center overflow-hidden rounded-lg bg-muted p-2">
          <img
            src={image.thumbnail_url ?? image.original_url}
            alt={image.file_name}
            className="max-h-56 rounded object-contain"
          />
        </div>

        <div className="divide-y divide-border/60">
          <Row label="Name" value={stripExtension(image.file_name)} />
          {image.caption && <Row label="Caption" value={image.caption} />}
          <Row
            label="Dimensions"
            value={
              image.width && image.height
                ? `${image.width.toLocaleString()} × ${image.height.toLocaleString()} px`
                : "—"
            }
          />
          {megapixels && (
            <Row
              label="Megapixels"
              value={`${megapixels} MP${aspectRatio(image.width, image.height) !== "—" ? ` · ${aspectRatio(image.width, image.height)}` : ""}`}
            />
          )}
          <Row label="File size" value={formatBytes(image.file_size)} />
          <Row
            label="Format"
            value={formatTypeName(image.mime_type, image.file_name)}
          />
          <Row
            label="Uploaded"
            value={
              <>
                {formatDate(image.created_at)}
                <span className="ml-1 font-normal text-muted-foreground">
                  {new Date(image.created_at).toLocaleTimeString()}
                </span>
              </>
            }
          />
          <Row
            label="Modified"
            value={
              <>
                {formatDate(image.updated_at)}
                <span className="ml-1 font-normal text-muted-foreground">
                  {new Date(image.updated_at).toLocaleTimeString()}
                </span>
              </>
            }
          />
          {position !== undefined && (
            <Row
              label="Position in album"
              value={total !== undefined ? `${position} of ${total}` : position}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
