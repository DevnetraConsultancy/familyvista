"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Album } from "@/lib/types";
import { toast } from "sonner";

interface AlbumShare {
  id: string;
  album_id: string;
  owner_id: string;
  shared_with_email: string;
  shared_with_user_id: string | null;
  status: string;
  created_at: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ShareDialog({
  album,
  open,
  onOpenChange,
}: {
  album: Album | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const supabase = createClient();
  const [shares, setShares] = useState<AlbumShare[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = open && !!album && loadedFor !== album.id;
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const albumId = album?.id ?? null;
  const fetchShares = useCallback(async () => {
    if (!albumId) return null;
    const { data } = await supabase
      .from("album_shares")
      .select("*")
      .eq("album_id", albumId)
      .order("created_at", { ascending: false });
    return { albumId, shares: (data ?? []) as AlbumShare[] };
  }, [albumId, supabase]);

  const loadShares = async () => {
    const r = await fetchShares();
    if (r) {
      setShares(r.shares);
      setLoadedFor(r.albumId);
    }
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    fetchShares().then((r) => {
      if (!active || !r) return;
      setShares(r.shares);
      setLoadedFor(r.albumId);
    });
    return () => {
      active = false;
    };
  }, [open, fetchShares]);

  const invite = async () => {
    if (!album) return;
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      toast.error("Enter a valid email address");
      return;
    }
    setInviting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email && user.email.toLowerCase() === clean) {
      setInviting(false);
      toast.error("That's you. Invite someone else.");
      return;
    }
    const { error } = await supabase.from("album_shares").insert({
      album_id: album.id,
      owner_id: album.user_id,
      shared_with_email: clean,
    });
    setInviting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("That person is already invited");
      } else {
        toast.error("Could not send invite");
        console.error(error);
      }
      return;
    }
    toast.success(`Invite ready for ${clean}. They just need to sign in.`);
    setEmail("");
    loadShares();
  };

  const revoke = async (shareId: string) => {
    const { error } = await supabase.from("album_shares").delete().eq("id", shareId);
    if (error) {
      toast.error("Could not remove access");
    } else {
      toast.success("Access removed");
      loadShares();
    }
  };

  const copyLink = async () => {
    if (!album) return;
    const url = `${window.location.origin}/dashboard/album/${album.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Album link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gold" />
            Share &ldquo;{album?.name}&rdquo;
          </DialogTitle>
          <DialogDescription>
            Invite family by email. Once they sign in with that Google account,
            the album appears under their &ldquo;Shared with me&rdquo; as view only.
          </DialogDescription>
        </DialogHeader>

        {/* Invite form */}
        <div className="space-y-2">
          <Label htmlFor="share-email">Invite by email</Label>
          <div className="flex gap-2">
            <Input
              id="share-email"
              type="email"
              placeholder="name@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && invite()}
            />
            <Button onClick={invite} disabled={inviting || !email.trim()}>
              {inviting ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Invite
            </Button>
          </div>
        </div>

        {/* Existing shares */}
        <div className="max-h-56 space-y-1.5 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Not shared with anyone yet.
            </p>
          ) : (
            shares.map((s) => {
              const accepted = s.status === "accepted";
              return (
                <div
                  key={s.id}
                  className="glass flex items-center gap-2.5 rounded-lg px-3 py-2"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold-soft)] text-gold">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.shared_with_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {accepted
                        ? "Has access. Visible in their Shared with me."
                        : "Pending. Activates when they next sign in."}
                    </p>
                  </div>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                      (accepted
                        ? "bg-[var(--success-soft)] text-success"
                        : "bg-[var(--warning-soft)] text-warning")
                    }
                  >
                    {s.status}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-danger hover:text-danger"
                    onClick={() => revoke(s.id)}
                    aria-label={`Remove access for ${s.shared_with_email}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--line)] pt-3">
          <p className="text-xs text-muted-foreground">
            Only invited people can open this link.
          </p>
          <Button size="sm" variant="outline" onClick={copyLink}>
            <Link2 />
            Copy album link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
