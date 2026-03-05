# Qorsheyn Admin

Admin dashboard for the Qorsheyn app: users, subscriptions, revenue, and pricing. Built with Vite, React, TypeScript, Tailwind CSS, and Supabase.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env.local` and set your Supabase project values (same project as the mobile app):

   ```bash
   cp .env.example .env.local
   ```

   Required:

   - `VITE_SUPABASE_URL` – Supabase project URL (e.g. `https://hnflspjejmdwfmztvnpq.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` – Supabase anon (public) key

   Never put the service role key in the front end. The dashboard uses the anon key and RLS so only admins can access sensitive data.

3. **Add the first admin**

   The dashboard only allows users listed in the `public.admins` table. Add your first admin in the Supabase SQL Editor:

   ```sql
   INSERT INTO public.admins (user_id)
   SELECT id FROM auth.users
   WHERE email = 'your-admin@email.com'
   LIMIT 1;
   ```

   Use the email of the account you will use to sign in. You can add more admins the same way.

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open the URL shown (e.g. http://localhost:5173), go to `/login`, sign in with an admin account.

## Build & deploy

- **Build:** `npm run build` → output in `dist/`
- **Preview:** `npm run preview` to test the production build locally.

Deploy the `dist/` folder to any static host (Vercel, Netlify, etc.). Use HTTPS. Ensure all dashboard routes require login (the app redirects unauthenticated users to `/login` and blocks non-admins).

## Supabase tables used

| Table | Dashboard use |
|-------|----------------|
| `auth.users` | Sign-in (via Supabase Auth). Emails shown from `profiles`. |
| `public.profiles` | Read all (admin RLS). Users list and user detail. |
| `public.subscriptions` | Read all, update status/dates (admin RLS). Subscriptions list, detail, support edits. |
| `public.plans` | Read and update (admin RLS). Pricing page: view and change prices. |
| `public.audit_log` | Insert and read (admin RLS). Logs who changed subscription status or plan prices. |
| `public.admins` | Read (RLS: only admins). Used to check if current user is admin. |

Revenue is computed from `subscriptions` (amounts where status is active/expired/canceled). No separate payments table required.

## Routes

- `/login` – Sign in
- `/` – Dashboard overview (counts, recent subscriptions)
- `/users` – Users list (search, pagination)
- `/users/:id` – User detail + their subscriptions
- `/subscriptions` – Subscriptions list (filters, pagination)
- `/subscriptions/:id` – Subscription detail + optional status change (audit logged)
- `/revenue` – Total revenue, by plan, by channel, over time
- `/pricing` – View and edit plan prices (audit logged)

## Security

- Only users in `public.admins` can access dashboard data. RLS and `is_admin()` enforce this.
- Service role key is never used in the front end.
- Sensitive actions (subscription status change, plan price change) are written to `audit_log` with admin id, action, and old/new values.
