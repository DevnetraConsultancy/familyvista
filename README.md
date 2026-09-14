# 🖼️ FamilyVista — Family Album Web App

A gorgeous, modern family album website built with Next.js 16, Supabase, and Tailwind CSS 4.

## ✨ Features

- **Google Login** via Supabase Auth
- **Albums & Sub-albums** (2-level hierarchy) with sidebar tree
- **Bulk photo upload** — direct to Supabase Storage, with progress
- **Drag & drop ordering** of photos (dnd-kit, buttery smooth)
- **4 view modes**: Small tiles / Large tiles / List / Slideshow
- **Photo groups** — organize photos within an album
- **Photo tools**: rename + caption, duplicate, move to another album, trash
- **White borders** — inside or outside, adjustable width, per-app preference
- **Trash system** — restore anything; permanent delete requires typing a phrase
- **Dark / light theme** toggle
- **Full-screen slideshow** with keyboard navigation and thumbnail strip

## 🚀 Deploy to Production

### 1. Supabase Setup (5 min)

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → New query
3. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and **Run**
4. Go to **Authentication → Providers → Google**:
   - Enable it
   - Paste your Google Client ID + Secret (see step 2)
5. Go to **Authentication → URL Configuration**:
   - Site URL: your Vercel URL (e.g. `https://familyvista.vercel.app`)
   - Add Redirect URLs: `https://your-app.vercel.app/auth/callback`
6. Copy from **Project Settings → API**:
   - Project URL
   - anon public key

### 2. Google OAuth Setup (5 min)

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create **OAuth consent screen** (External, add app name + support email)
3. Create **OAuth Client ID** → Web application:
   - Authorized JavaScript origins: your Vercel URL + `http://localhost:3000`
   - Authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
4. Copy the Client ID + Secret into Supabase → Authentication → Providers → Google

### 3. Deploy to Vercel (2 min)

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
   - Framework preset: **Next.js** (auto-detected)
   - Root directory: `family-vista` if repo root has other folders
   - Environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon public key
3. Deploy!
4. Update Supabase **URL Configuration** with your final Vercel URL

### 4. Local Development

```bash
npm install
cp .env.example .env.local  # fill in real values
npm run dev
```

## 🗂️ Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing page
│   ├── login/              # Google login
│   ├── auth/callback/      # OAuth callback
│   └── dashboard/          # Main app
│       ├── page.tsx        # Album grid
│       ├── album/[id]/     # Album detail
│       └── trash/          # Trash management
├── components/
│   ├── ui/                 # Primitives (shadcn-style)
│   ├── layout/             # Shell + sidebar
│   ├── images/             # Grid, viewer, upload
│   └── auth-provider.tsx
├── lib/
│   ├── supabase/           # Clients (browser + server)
│   ├── hooks/              # useAlbums, useImages, useTrash
│   ├── store.ts            # UI state (Zustand)
│   └── types.ts            # DB types
└── supabase/schema.sql     # Paste into Supabase SQL Editor
```

## 🔒 Security

- Row Level Security on every table — users only see their own data
- Storage path-scoped to `user_id/album_id/...` with ownership policies
- Destructive actions (permanent delete, empty trash) require typing a confirmation phrase
- Soft deletes — nothing is lost immediately

## 📝 License

MIT
