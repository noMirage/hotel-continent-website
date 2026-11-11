# Cutover: public site on Next.js, admin on its own subdomain

> **Status (2026-11-12): done.** hotel-continent.com is served by `apps/site`, the admin
> panel lives at admin.hotel-continent.com, all migrations (incl. the former `pending/`
> one) are applied to production, the revalidation webhook is installed and verified
> (200), and a test booking from the site arrived in the admin as UNPROCESSED.
> Still open: `www` → apex redirect (Vercel → site project → Domains → Edit),
> the new demo Supabase project (step 1 note), rotating `SUPABASE_SECRET_KEY`,
> and the admin clean-up PR (step 6).

Branch `feat/monorepo-site` (merged as PR #1). Order matters — do them top to bottom.

## 0. Before you start

- [ ] Preview of the site against the demo DB reviewed (`hotel-continent-site` → latest preview).
- [ ] DNS access for hotel-continent.com.
- [ ] Supabase → Settings → API Keys: the project's **secret** key at hand (needed in step 2).

## 1. Database (production Supabase) — do this first, independent of the site

- [ ] Apply the pending migrations (all additive / hardening, safe while the old site is live):
      `npx supabase db push`. Then the same against the demo DB with `--db-url`.
      - `20261031000001_fix_role_rpcs_null_caller.sql` — **security**: closes a bypass that let
        any signed-in user without a role call `grant_admin_role` and make themselves super_admin.
      - `20261110000001_public_rpcs_server_only.sql` — public-form RPCs executable only by
        service_role; 5 submissions / phone / 24 h. The old SPA's public pages are unaffected
        (they insert directly, see step 5).
      - `20261110000002_user_roles_single_role.sql` — one role per user (dedupes first).
      - `20261110000003_prevent_double_booking.sql` — DB-level overlap guard (triggers).
      All of them (plus the two 2026-04-12 files that were applied by hand and are missing
      from the remote history, hence `--include-all`) are verified by `npm run test:db`,
      which applies the whole migration set to an embedded Postgres and exercises the
      grants, role guards, triggers and the rate limit. The command for production is
      `npx supabase db push --linked --include-all` (the CLI is already linked and logged in).
      Note: the demo project `vgqnlnunmxqcwcrtkjuy` in `.env.demo.local` no longer resolves
      (DNS) — it was deleted or paused; recreate it or update `DEMO_DB_URL` before relying
      on previews.
- [ ] Before pushing, look at what the triggers will meet:
      `npx supabase db query --linked "SELECT count(*) FROM public.reservations a JOIN public.reservations b ON a.room_unit_id = b.room_unit_id AND a.id < b.id WHERE a.status IN ('UNPROCESSED','PENDING','CONFIRMED','CHECK_IN') AND b.status IN ('UNPROCESSED','PENDING','CONFIRMED','CHECK_IN') AND a.check_in_date < b.check_out_date AND a.check_out_date > b.check_in_date"`
      Existing overlaps are not blocked retroactively (only edits of unit / dates / status
      re-check), but it is good to know they exist.
      `npx supabase db query --linked "SELECT user_id, count(*) FROM public.user_roles GROUP BY 1 HAVING count(*) > 1"`
      — rows here lose their lower-privilege role in `20261110000002`.
- [ ] The `create-admin` edge function (hard-coded admin credentials, no auth) is deleted from
      the repo; `supabase functions list` shows nothing deployed on production, so there is
      nothing to undeploy. Still check that its user never got created:
      `npx supabase db query --linked "SELECT id, email FROM auth.users WHERE email = 'admin@luxestay.com'"`
      and delete that user if it exists.
- [ ] Review `SELECT u.email, r.role FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id;`
      for accounts you do not recognise.
- [ ] Authentication → Sign In / Providers: **disable new user signups** (staff accounts are
      created by a super admin). Enable **Leaked password protection**. Consider enabling
      **MFA (TOTP)** and asking every admin to enrol.
- [ ] `packages/shared/src/database.types.ts` already matches — nothing to regenerate.

## 2. Site project env (Vercel → hotel-continent-site → Settings → Environment Variables, Production)

- [ ] `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` — production project values.
- [ ] `SUPABASE_SECRET_KEY` — the production **secret** key (server only; used solely for the
      public-form RPCs). Add it to the Preview environment with the demo project's secret key
      and to your local `.env.local` for the demo DB.
- [ ] `REVALIDATE_SECRET` — new random value (`openssl rand -hex 32`).
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://hotel-continent.com`.
- [ ] Settings → Git: connect `noMirage/hotel-continent-website`, production branch `main`.
- [ ] Settings → Build: Ignored Build Step `npx turbo-ignore @continent/site`.
- [ ] Firewall → enable **BotID Deep Analysis**; add a rate-limit rule for `POST` requests (e.g. 10/min per IP).

## 3. Merge

- [ ] CI (`.github/workflows/ci.yml`: typecheck, lint, tests, prod dependency audit) is green.
- [ ] Merge `feat/monorepo-site` into `main`. The admin project keeps building from the root
      `vercel.json`, so hotel-continent.com keeps working; the site project builds `apps/site`.
- [ ] Admin project → Ignored Build Step `npx turbo-ignore @continent/admin`.

## 4. Domains

- [ ] Admin project (`hotel-continent-website`): add `admin.hotel-continent.com`.
- [ ] Supabase → Authentication → URL Configuration: Site URL + Redirect URLs → `https://admin.hotel-continent.com`.
- [ ] Move `hotel-continent.com` (+ `www`) from the admin project to `hotel-continent-site`.
- [ ] Check: `/`, `/en`, `/rooms/<slug>`, a test booking appears in the admin as UNPROCESSED.
- [ ] Check response headers (`curl -I https://hotel-continent.com`): `x-frame-options: DENY`,
      `content-security-policy: frame-ancestors 'none'`, `strict-transport-security`.

## 5. Webhooks + lock down direct writes

- [ ] `psql "$PROD_DB_URL" -v site_url='https://hotel-continent.com' -v secret="$REVALIDATE_SECRET" -f supabase/webhooks/revalidate-site.sql`
- [ ] Change a price in the admin → the room page shows it after a refresh.
- [ ] `git mv supabase/pending/20261015000002_restrict_public_inserts.sql supabase/migrations/` → commit → `npx supabase db push`
      (removes anonymous INSERT; the old SPA pages must no longer be live). Same for the demo DB with `--db-url`.

## 6. Clean up the admin app (separate PR)

- [ ] Remove the public pages/components/hooks from `apps/admin` (`src/pages/*.tsx` outside `admin/`, `components/home`, `components/layout`, `components/rooms`, `useRoomBookingForm`, `useAvailability`, …) and their translations.
- [ ] Move the site's translation strings out of `apps/admin/src/i18n/translations.ts` (today
      `apps/site/scripts/sync-i18n.mjs` generates the site dictionaries from it).
- [ ] `vercel.json`: redirect `/` → `/admin`.
- [ ] Site: add redirect `/admin/:path*` → `https://admin.hotel-continent.com/admin/:path*` in `apps/site/next.config.ts`.
- [ ] Admin `vite.config.ts`: fix `manualChunks` (recharts chunk pulls `clsx` into the entry).

## Known, deliberately not changed

- `zod` 3.x is flagged by `npm audit` (memory exhaustion on oversized arrays; fixed only in
  zod 4). Server Actions cap request bodies at 1 MB and every array schema has `.max()`, so
  the exposure is small. Upgrading needs zod 4 + `@hookform/resolvers` 5 in both apps.
- Phone validation accepts Ukrainian mobile numbers only (`+380…`), in the UI and in the DB.
  Loosen `public_form_check_contact` if foreign guests should be able to book online.
- Owner and super_admin can grant any role, including to themselves and to each other.
