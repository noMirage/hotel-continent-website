# Hotel Continent — Setup Guide

Developed by **noMirage**

---

## 1. Run database migrations (REQUIRED)

All SQL files in `supabase/migrations/` must be applied to your Supabase project **in chronological order** before the admin panel will work.

### Steps:
1. Open your project at https://supabase.com/dashboard/project/rjwlxjvusjdohsarmmai
2. Go to **SQL Editor** (left sidebar)
3. Open and run each file in `supabase/migrations/` in this order:

```
20260202160604_...  ← Creates all tables + base RLS policies
20260202160619_...  ← Additional setup
20260203133518_...  ← Adds super_admin role
20260203133549_...  ← Super admin policies + commission_rate
20260204125239_...  ← Booking source tracking
20260208193512_...  ← Latest fixes
20260411000000_...  ← Adds Standard Room category
20260411000001_...  ← CRITICAL: Fixes admin write permissions ← run this last
```

> ⚠️ **If admin panel changes are not saving**, the most common cause is that
> `20260411000001_fix_has_role_super_admin.sql` has not been applied.
> This fixes the `has_role()` function so that `super_admin` users
> also pass the `admin` permission checks.

---

## 2. Create your first admin user

### Step 1 — Register the user
Go to https://supabase.com/dashboard/project/rjwlxjvusjdohsarmmai/auth/users
→ Click **Add user** → **Create new user**
→ Enter email + password
→ Click **Create user**

### Step 2 — Assign super_admin role
In Supabase **SQL Editor**, run:

```sql
-- Replace the email with the one you just created
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'your-admin@email.com';
```

### Step 3 — Log in
Go to `/admin` on your website and log in with those credentials.

---

## 3. Accessing the admin panel

The admin panel link is **intentionally hidden** from the public footer.
Access it directly via the URL:

```
https://your-domain.com/admin
```

Or locally:

```
http://localhost:5173/admin
```

**Demonstrating to a client:** You can show the admin panel by:
- Opening the URL directly in a browser
- Or temporarily adding a link anywhere in the site (e.g. in `/contact` or `/about`) just for the demo, then removing it

---

## 4. Local development

```sh
npm install
npm run dev
```

Open http://localhost:5173

---

## 5. Deploy to production

### Vercel (recommended)
```sh
npm install -g vercel
vercel
```

### Netlify
```sh
npm run build
# Upload the dist/ folder via Netlify dashboard
```

### Cloudflare Pages
Connect your GitHub repo in the Cloudflare Pages dashboard.
Build command: `npm run build`
Output directory: `dist`

---

## 6. Troubleshooting admin saves

| Symptom | Cause | Fix |
|---------|-------|-----|
| Bookings not updating | `has_role()` bug with super_admin | Run migration `20260411000001_fix_has_role_super_admin.sql` |
| Calendar not saving | Same as above | Same fix |
| Room changes not saving | Same as above | Same fix |
| Settings not saving | Same as above | Same fix |
| Login fails | User not in `user_roles` table | Run the INSERT above in SQL Editor |
| "Access denied" in Users page | Not logged in as super_admin | Assign super_admin role via SQL |

---

Developed by **noMirage** | hotel-continent project
