"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "glass-strong !rounded-lg",
          style: {
            background: "var(--glass-strong)",
            color: "var(--foreground)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(16px)",
          },
        }}
      />
    </NextThemesProvider>
  );
}
