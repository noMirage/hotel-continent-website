# Cutover: public site on Next.js, admin on its own subdomain

Branch `feat/monorepo-site`. Everything below is prepared and tested against the demo
database; these steps switch production. Order matters — do them top to bottom.

## 0. Before you start

- [ ] Preview of the site against the demo DB reviewed (`hotel-continent-site` → latest preview).
- [ ] DNS access for hotel-continent.com.

## 1. Database (production Supabase)

- [ ] Apply the new RPCs (additive, safe while the old site is still live):
      `npx supabase db push` → applies `20261015000001_public_submission_rpcs.sql`.
- [ ] Regenerate nothing — `packages/shared/src/database.types.ts` already matches.

## 2. Site project env (Vercel → hotel-continent-site → Settings → Environment Variables, Production)

- [ ] `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — production project values.
- [ ] `REVALIDATE_SECRET` — new random value (`openssl rand -hex 32`).
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://hotel-continent.com`.
- [ ] Settings → Git: connect `noMirage/hotel-continent-website`, production branch `main`.
- [ ] Settings → Build: Ignored Build Step `npx turbo-ignore @continent/site`.
- [ ] Firewall → enable **BotID Deep Analysis**; add a rate-limit rule for `POST` requests (e.g. 10/min per IP).

## 3. Merge

- [ ] Merge `feat/monorepo-site` into `main`. The admin project keeps building from the root
      `vercel.json`, so hotel-continent.com keeps working; the site project builds `apps/site`.
- [ ] Admin project → Ignored Build Step `npx turbo-ignore @continent/admin`.

## 4. Domains

- [ ] Admin project (`hotel-continent-website`): add `admin.hotel-continent.com`.
- [ ] Supabase → Authentication → URL Configuration: Site URL + Redirect URLs → `https://admin.hotel-continent.com`.
- [ ] Move `hotel-continent.com` (+ `www`) from the admin project to `hotel-continent-site`.
- [ ] Check: `/`, `/en`, `/rooms/<slug>`, a test booking appears in the admin as UNPROCESSED.

## 5. Webhooks + lock down direct writes

- [ ] `psql "$PROD_DB_URL" -v site_url='https://hotel-continent.com' -v secret="$REVALIDATE_SECRET" -f supabase/webhooks/revalidate-site.sql`
- [ ] Change a price in the admin → the room page shows it after a refresh.
- [ ] `git mv supabase/pending/20261015000002_restrict_public_inserts.sql supabase/migrations/` → commit → `npx supabase db push`
      (removes anonymous INSERT; the old SPA pages must no longer be live). Same for the demo DB with `--db-url`.

## 6. Clean up the admin app (separate PR)

- [ ] Remove the public pages/components/hooks from `apps/admin` (`src/pages/*.tsx` outside `admin/`, `components/home`, `components/layout`, `components/rooms`, `useRoomBookingForm`, `useAvailability`, …) and their translations.
- [ ] `vercel.json`: redirect `/` → `/admin`.
- [ ] Site: add redirect `/admin/:path*` → `https://admin.hotel-continent.com/admin/:path*` in `apps/site/next.config.ts`.
- [ ] Admin `vite.config.ts`: fix `manualChunks` (recharts chunk pulls `clsx` into the entry).
