# Hotel Continent

Hotel website and booking admin panel — developed by **noMirage**.

## Monorepo

```
apps/site        Public website — Next.js 16 (App Router, Cache Components), SSR/ISR, uk + en
apps/admin       Admin panel — React 18 + Vite SPA
packages/shared  Code used by both: Supabase DB types, domain types, pricing, dates, phone, hotel config
supabase/        Migrations (shared DB), demo seed, webhook SQL
```

npm workspaces + Turborepo. Both apps talk to the same Supabase project.

| | URL | Vercel project |
|---|---|---|
| Public site | hotel-continent.com (uk at `/`, en at `/en`) | `hotel-continent-site` (Root Directory `apps/site`) |
| Admin | admin.hotel-continent.com/admin | `hotel-continent-website` (root `vercel.json` builds `apps/admin`) |
| Client demo (admin) | hotel-continent-demo.vercel.app | `hotel-continent-demo` — see `supabase/demo/README.md` |

Until the domain switch in [`docs/cutover.md`](docs/cutover.md) is done, hotel-continent.com is still served by the admin app, which also contains the old public pages.

## Getting started

Requirements: Node.js 22+, npm.

```sh
npm install                 # installs all workspaces
npm run dev:admin           # admin on http://localhost:8080
npm run dev -w @continent/site   # site on http://localhost:3000
npm test                    # all unit tests (turbo)
npm run build               # build everything (turbo)
```

Environment variables live in the root `.env` (both apps read it):

```
VITE_SUPABASE_URL=...              # admin (browser) — the site falls back to these on the server
VITE_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...            # site (server only): public-form RPCs run as service_role
SUPABASE_URL=...                   # site (server only), optional locally
SUPABASE_PUBLISHABLE_KEY=...
REVALIDATE_SECRET=...              # site: secret of the Supabase → /api/revalidate webhook
NEXT_PUBLIC_SITE_URL=https://hotel-continent.com
```

Run either app against the demo database: put the demo values in `.env.demo.local` and use
`npm run dev -w @continent/admin -- --mode demo`, or `set -a; source .env.demo.local; set +a` before `npm run dev -w @continent/site`.

## How the public site works

- Pages are prerendered (Cache Components, `'use cache'` in `apps/site/src/lib/data.ts`) and served from the CDN with room/price/promotion data already in the HTML.
- When the admin changes rooms, prices, photos, settings or promotions, Postgres triggers call `POST /api/revalidate` (`supabase/webhooks/revalidate-site.sql`) and the affected pages refresh.
- Availability is live: `GET /api/availability` (uses the `get_blocked_unit_ids` RPC).
- Forms (booking, banquet, promotion, group request) are Server Actions in `apps/site/src/app/actions.ts`, protected by Vercel BotID. They call SECURITY DEFINER RPCs (`supabase/migrations/20261015000001_public_submission_rpcs.sql`) that validate input and compute prices / pick rooms in one transaction.
- Translations: generated from the admin translations with `npm run i18n:sync -w @continent/site`.

## Database migrations

```sh
npx supabase db push                       # linked (production) project
npx supabase db push --db-url "$DB_URL"    # any other database, e.g. the demo
```

`supabase/pending/` holds migrations that must wait for a deployment step (see `docs/cutover.md`).

---

Developed by **noMirage**
