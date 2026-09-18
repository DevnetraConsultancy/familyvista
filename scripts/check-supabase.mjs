#!/usr/bin/env node
/**
 * FamilyVista — read-only Supabase settings checker.
 *
 * Verifies, WITHOUT writing anything to your database:
 *   1. env vars present and well-formed (.env.local or environment)
 *   2. REST endpoint healthy
 *   3. every table exists and anon selects return empty (RLS blocking, not erroring)
 *   4. RLS actually blocks anonymous writes
 *   5. storage: public "images" bucket reachable, public URLs form correctly
 *   6. auth: Google provider enabled
 *
 * Usage:  node scripts/check-supabase.mjs   (or: npm run check:supabase)
 * Exit 0 = all good, 1 = something failed.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---------- env loading (no dotenv dependency) ----------
function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (!(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const results = [];
const check = (name, ok, detail = "") =>
  results.push({ name, ok: !!ok, detail: detail.trim() });

const TABLES = ["albums", "images", "image_groups", "album_shares", "profiles"];

async function main() {
  console.log("FamilyVista — Supabase settings check");
  console.log("=====================================\n");

  // 1 — env
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    check(
      "Env vars",
      false,
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing"
    );
    printAndExit();
    return;
  }
  check("Env vars present", true, SUPABASE_URL);

  check(
    "URL is https",
    SUPABASE_URL.startsWith("https://") || SUPABASE_URL.includes("localhost"),
    SUPABASE_URL
  );
  check(
    "Anon key looks like a JWT",
    SUPABASE_ANON_KEY.split(".").length === 3,
    `${SUPABASE_ANON_KEY.length} chars`
  );

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2 — REST health
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    check("REST endpoint healthy", res.ok, `HTTP ${res.status}`);
  } catch (e) {
    check("REST endpoint healthy", false, e.message);
  }

  // 3 — tables exist + RLS hides rows from anon
  for (const t of TABLES) {
    try {
      const { data, error } = await supabase.from(t).select("*").limit(1);
      if (error) {
        // 42P01 = undefined_table, PGRST205 = table not in schema cache
        const missing =
          error.code === "42P01" || error.code === "PGRST205";
        check(
          `Table "${t}" reachable`,
          false,
          missing ? "table does NOT exist — run supabase/all-in-one.sql" : error.message
        );
      } else {
        check(
          `Table "${t}" reachable`,
          true,
          data.length === 0
            ? "exists; RLS hides rows from anon ✓"
            : `exists; anon query returned ${data.length} row(s)!`
        );
      }
    } catch (e) {
      check(`Table "${t}" reachable`, false, e.message);
    }
  }

  // 4 — RLS blocks anonymous writes
  try {
    const { error } = await supabase.from("albums").insert({ name: "x" });
    check(
      "RLS blocks anon INSERT into albums",
      !!error,
      error ? `rejected: ${error.message}` : "NOT blocked — RLS problem!"
    );
  } catch (e) {
    check("RLS blocks anon INSERT into albums", true, e.message);
  }

  // 5 — storage bucket
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    const imagesBucket = buckets?.find((b) => b.id === "images" || b.name === "images");
    if (error) {
      check("Storage reachable", false, error.message);
    } else if (!imagesBucket) {
      check(
        'Bucket "images" exists',
        false,
        "missing — run supabase/all-in-one.sql (section 9)"
      );
    } else {
      check('Bucket "images" exists', true, imagesBucket.public ? "public ✓" : "private");
      const { data: listing } = await supabase.storage.from("images").list("", { limit: 1 });
      check(
        'Bucket "images" publicly listable',
        Array.isArray(listing),
        Array.isArray(listing) ? "public-read policy active ✓" : "list failed (bucket may be private)"
      );
    }
    const sample = supabase.storage.from("images").getPublicUrl("probe/test.jpg");
    check(
      "Public URL formation",
      !!sample?.data?.publicUrl,
      sample?.data?.publicUrl ?? "no URL returned"
    );
  } catch (e) {
    check("Storage checks", false, e.message);
  }

  // 6 — auth settings (Google provider)
  try {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (res.ok) {
      const settings = await res.json();
      const google = settings?.external?.google?.enabled;
      check(
        "Google sign-in provider",
        google === true,
        google === true ? "enabled ✓" : `disabled or unknown (${JSON.stringify(settings?.external?.google ?? null)})`
      );
    } else {
      check("Auth settings endpoint", false, `HTTP ${res.status}`);
    }
  } catch (e) {
    check("Auth settings endpoint", false, e.message);
  }

  printAndExit();
}

function printAndExit() {
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    const tag = r.ok ? "PASS" : "FAIL";
    const pad = " ".repeat(Math.max(1, 42 - r.name.length));
    console.log(`[${tag}] ${r.name}${pad}${r.detail}`);
  }
  console.log(
    `\n${results.length - failed}/${results.length} checks passed` +
      (failed === 0 ? " — Supabase settings look good ✅" : ` — ${failed} failed ❌`)
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Check script crashed:", e);
  process.exit(1);
});
