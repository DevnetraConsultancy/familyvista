"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Route-level error boundary: keeps the page shell and offers a retry. */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      id="main"
      className="flex flex-1 flex-col items-center justify-center px-5 py-20 text-center"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-text">
        Something went wrong
      </p>
      <h1 className="font-display mt-2 text-3xl font-semibold">We hit a snag.</h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        Your photos are safe. Try again, or head back to your albums.
      </p>
      <div className="mt-7 flex gap-2">
        <Button onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">My albums</Link>
        </Button>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-[11px] text-muted-foreground">Ref: {error.digest}</p>
      )}
    </div>
  );
}
