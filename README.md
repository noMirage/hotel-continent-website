# Hotel Continent

Hotel website and booking admin panel — developed by **noMirage**.

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase (database, auth, storage)

## Getting Started

### Requirements

- Node.js 18+
- npm

### Install & Run

```sh
# Install dependencies
npm install

# Start local development server
npm run dev
```

Then open http://localhost:5173 in your browser.

### Build for Production

```sh
npm run build
```

The output will be in the `dist/` folder — deploy it to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

## Environment Variables

The `.env` file is already configured with your Supabase project credentials:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Admin Panel

Access the admin panel at: `/admin`

Log in with your Supabase admin credentials.

## Database Migrations

To apply database changes (e.g. adding the Standard Room), run the SQL files in `supabase/migrations/` via the Supabase dashboard → SQL Editor, in chronological order.

---

Developed by **noMirage**
