"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const loadShares = async () => {
    if (!album) return;
    setLoading(true);
    const { data } = await supabase
      .from("album_shares")
      .select("*")
      .eq("album_id", album.id)
      .order("created_at", { ascending: false });
    setShares(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) loadShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, album?.id]);

  const invite = async () => {
    if (!album) return;
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      toast.error("Enter a valid email address");
      return;
    }
    setInviting(true);
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
    toast.success(`Invite ready for ${clean} — they just need to log in`);
    setEmail("");
    loadShares();
  };

  const revoke = async (shareId: string) => {
    const { error } = await supabase
      .from("album_shares")
      .delete()
      .eq("id", shareId);
    if (error) {
      toast.error("Could not remove access");
    } else {
      toast.success("Access removed");
      loadShares();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Share “{album?.name}”
          </DialogTitle>
          <DialogDescription>
            Invite family members by email. Once they log in with the same
            Google account, this album appears in their “Shared with me” —
            view only.
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
            <Button onClick={invite} disabled={inviting || !email.trim()} className="gap-1.5">
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
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
            shares.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.shared_with_email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.status === "accepted"
                      ? "Has access — visible in their Shared with me"
                      : "Pending — activates when they next log in"}
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                    (s.status === "accepted"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400")
                  }
                >
                  {s.status}
                </span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => revoke(s.id)}
                  aria-label={`Remove access for ${s.shared_with_email}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
