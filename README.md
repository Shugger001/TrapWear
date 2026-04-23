# TrapWear monorepo

TrapWear is a production-shaped ecommerce monorepo: a **Next.js storefront** (`apps/web`), a **separate admin app** (`apps/admin`), shared **Postgres schema** (`packages/db`), and **domain pricing logic** (`packages/core`).

## Prerequisites

- Node.js 20+
- `corepack enable` (recommended) to activate the pinned pnpm version from `package.json`
- Docker (optional, for local Postgres/Redis)

### Using Supabase instead of Docker Postgres

1. Create a project in [Supabase](https://supabase.com) and open **Project Settings → Database**.
2. Copy the **URI** under **Connection string** (choose **Transaction pooler** for `DATABASE_URL` in the Next.js apps — it matches the `postgres.js` pool in `packages/db`).
3. Set **`DATABASE_URL`** in the repo root **`.env`** (for `pnpm db:push` / `pnpm db:seed`). If the database password contains `@`, `#`, or other reserved characters, **URL-encode** it in the URI.
4. Run **`pnpm env:sync-db`** to copy that **`DATABASE_URL`** into **`apps/web/.env.local`** and **`apps/admin/.env.local`** (or paste the same URI into both files by hand).
5. If **`pnpm db:push`** fails against the pooler, set **`DATABASE_URL`** in the root **`.env`** only to the **Direct** connection (port `5432`) for that command, then return to the pooler URL for runtime and run **`pnpm env:sync-db`** again.

Skip **docker compose** for Postgres in the steps below if you use Supabase.

### Supabase Storage (admin product images)

When **`NEXT_PUBLIC_SUPABASE_URL`**, **`SUPABASE_SERVICE_ROLE_KEY`**, and a **`SUPABASE_PRODUCT_IMAGES_BUCKET`** (default `product-images`) are set in **`apps/admin/.env.local`**, the admin **Products** screen can upload JPEG/PNG/Webp files to that bucket. Product `images` in the database must be either **site-relative paths** (e.g. `/images/...`) or **HTTPS URLs** on your Supabase project’s **public** storage objects (`/storage/v1/object/public/...`), plus any optional **`ALLOWED_IMAGE_URL_PREFIXES`**.

In the Supabase dashboard: **Storage → New bucket** (name matches env). For catalog images, enable **public read** on that bucket so the storefront can load URLs without signing; restrict **writes** to the service role (no anonymous insert). The admin app uploads **through** `POST /api/uploads/product-image` using the service role key only on the server.

## Quick start

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start Postgres (skip if you use Supabase):

```bash
docker compose up -d postgres
```

3. Install dependencies:

```bash
pnpm install
```

4. Push the database schema (Drizzle):

```bash
export $(grep -v '^#' .env | xargs)
pnpm db:push
pnpm db:seed
```

5. Copy env files for each Next.js app (they load `.env.local` from their own directory):

```bash
cp .env apps/web/.env.local
cp .env apps/admin/.env.local
```

If you maintain env by hand, keep **`DATABASE_URL`** and **`STALE_CHECKOUT_MINUTES`** identical between `apps/web/.env.local` and `apps/admin/.env.local` so the manual sweep matches the cron window.

6. Run dev servers:

```bash
pnpm dev
```

- Storefront: `http://localhost:3000` — customer **Sign up / Sign in** (`/sign-up`, `/sign-in`), **Account** (`/account`) when `CUSTOMER_JWT_SECRET` is set in `apps/web/.env.local`
- Admin: `http://localhost:3001/login` (root redirects to `/login`)
- Super admin (log in as `super@trapwear.dev`): `http://localhost:3001/super/flags`, `http://localhost:3001/super/coupons`, `http://localhost:3001/super/operations` (manual stale-checkout sweep)

### First-time setup checklist

1. Root **`.env`** from **`.env.example`** (used for `pnpm db:push` / `pnpm db:seed`); set **`DATABASE_URL`** (e.g. Supabase URI) then **`pnpm env:sync-db`**.
2. **`apps/web/.env.local`**: **`PAYSTACK_SECRET_KEY`**, **`PAYSTACK_CURRENCY`**, **`CUSTOMER_JWT_SECRET`** (≥32 chars), optional **`RESEND_API_KEY`** / **`RESEND_FROM`**, **`CRON_SECRET`** if you call the sweep HTTP endpoint. **`DATABASE_URL`** is synced from root **`.env`** via **`pnpm env:sync-db`**.
3. **`apps/admin/.env.local`**: **`ADMIN_JWT_SECRET`**, same **`STALE_CHECKOUT_MINUTES`** as web for Operations sweep; **`DATABASE_URL`** synced like above. Optional: **Supabase image** vars (`NEXT_PUBLIC_SUPABASE_URL`, **`SUPABASE_SERVICE_ROLE_KEY`**, bucket name) for product uploads — see **Supabase Storage** above.
4. **Paystack dashboard** → **Settings → API Keys & Webhooks** — add webhook URL `https://your-domain/api/webhooks/paystack` and enable **`charge.success`**. Signatures use the same **`PAYSTACK_SECRET_KEY`** as the API.

## Demo accounts (seed)

- Admin: `admin@trapwear.dev` / `TrapWear!Admin99` (override with `SEED_ADMIN_PASSWORD`)
- Super admin: `super@trapwear.dev` / `TrapWear!Super99` (override with `SEED_SUPER_PASSWORD`)

## Paystack

Checkout uses [Paystack](https://paystack.com) **Transaction Initialize** (hosted payment page). Set **`PAYSTACK_SECRET_KEY`** and **`PAYSTACK_CURRENCY`** (e.g. `NGN` or `USD`). Order totals are stored as **minor units** (kobo, cents, etc.) matching that currency — align product prices in the DB with how you display money.

For local webhook testing, use **ngrok** (or similar) to expose `https://…/api/webhooks/paystack` and register that URL in the Paystack dashboard.

## Demo script

1. Add a jersey (and optional customization layers) so merchandise subtotal is at least **$50** — required for the seeded **`WELCOME10`** code.
2. Optional: enter **`WELCOME10`** on the cart and **Apply** for 10% off (validated on the server; checkout must send the same code).
3. Checkout redirects to Paystack — use **Paystack test cards** from their docs for your environment.
4. Confirm the order appears as **paid** in **Admin → Orders** after **`charge.success`** (and/or the return to `/checkout/success` verifies the transaction).
5. Toggle **Super admin → Feature flags** and refresh the storefront home page ribbon.

## Stale checkout sweeper

Abandoned Paystack sessions leave orders in `pending_payment`, which still count against coupon caps. Call:

```bash
curl -X POST "http://localhost:3000/api/cron/sweep-stale-orders" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Set `CRON_SECRET` and optionally `STALE_CHECKOUT_MINUTES` (default `60`, minimum `5`) in `apps/web/.env.local`. The job cancels stale `pending_payment` orders (Paystack has no server-side “expire checkout” API). Schedule it (e.g. hourly) on your host or Vercel Cron.

Super admins can also run the same logic from **Admin → Operations** (`/super/operations`) if they are logged in as `super@trapwear.dev`.

### Inventory (admin)

Under **Inventory** (`/inventory`), staff can adjust variant stock by SKU with a required reason. Updates are audited (`inventory.adjust`).

### Customer accounts & email

- Shoppers can **register and sign in** on the storefront; checkout attaches **`user_id`** to new orders when logged in.
- After a successful Paystack charge, if **`RESEND_API_KEY`** (and optionally **`RESEND_FROM`**) is set, TrapWear sends an **order confirmation** email. Without Resend, checkout still works; email is skipped.

## Scripts

- `pnpm env:sync-db` — copy **`DATABASE_URL`** from root **`.env`** into **`apps/web/.env.local`** and **`apps/admin/.env.local`**
- `pnpm db:push` — apply schema to `DATABASE_URL`
- `pnpm db:seed` — seed demo products + admin users + feature flag
- `pnpm db:studio` — open Drizzle Studio
- `pnpm e2e` — Playwright smoke tests (requires dev servers + DB)

## Deploying on Vercel (pnpm monorepo)

Create **one Vercel project per app** and connect the **same Git repository** to each project (e.g. storefront **`trap-wear-web`**, admin **`trapwear-admin`**).

### Vercel dashboard (each project)

1. Open the project → **Settings** → **General**.
2. Under **Root Directory**, set:
   - **Storefront project:** `apps/web`
   - **Admin project:** `apps/admin`
3. **Build & Development Settings:** leave **Framework Preset** as **Next.js**, and either:
   - leave **Install Command** and **Build Command** empty so Vercel uses the **`vercel.json`** next to that app, or  
   - turn **Override** on and paste the same commands as in that app’s **`vercel.json`** (they must match).

**Why `cd ../..`:** Install and build commands start from the app directory (`apps/web` or `apps/admin`). They **`cd`** to the **repository root** so pnpm sees **`pnpm-workspace.yaml`** and **`pnpm-lock.yaml`** and can resolve **`workspace:*`** packages (`@trapwear/db`, etc.). That only works when Vercel clones the **full repo** and **Root Directory** is that app folder (so the parent chain reaches the workspace root).

**Copy-paste commands** (if you override in the UI):

**`apps/web`**

```bash
cd ../.. && pnpm install --frozen-lockfile
```

```bash
cd ../.. && NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @trapwear/web run build
```

**`apps/admin`**

```bash
cd ../.. && pnpm install --frozen-lockfile
```

```bash
cd ../.. && NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @trapwear/admin run build
```

Do **not** rely on a default install that runs only inside `apps/web` or `apps/admin` without reaching the repo root — it will break **`workspace:*`** dependencies.

The repo root **`.npmrc`** sets **`node-linker=hoisted`**, which matches how Vercel’s Linux builders expect **`node_modules`** and avoids many **`sharp`** / native postinstall failures with pnpm. The storefront **`next.config.ts`** sets **`images.unoptimized: true`** so production does not depend on Sharp-based optimization.

In each Vercel project, add the same env vars you use locally (at minimum **`DATABASE_URL`**, **`ADMIN_JWT_SECRET`** for admin, **`PAYSTACK_*`** / **`CUSTOMER_JWT_SECRET`** for web, etc.) for **Production** and **Preview**, and ensure they are available at **build** time where the app reads them (Next loads `apps/<app>/.env.local` only on your machine; use the Vercel Environment Variables UI instead).

### Git vs `vercel deploy --prebuilt`

- **Git:** Vercel clones the whole repository, then runs install/build from **`apps/web`** or **`apps/admin`** with your commands → correct layout for **`cd ../..`**.
- **`vercel deploy --prebuilt`:** easy to get wrong paths (missing Next server files, wrong cwd). Prefer **Git-triggered deployments** until builds are consistently green; only use **`--prebuilt`** after **`vercel build`** and deploy from the **same directory layout** you use in production.

### Apply settings via API (optional)

If the Cursor **browser** tab is not logged into Vercel (it uses a separate session from Chrome/Safari), you can PATCH both projects from your machine:

1. Create a token: [Vercel → Account → Tokens](https://vercel.com/account/tokens).
2. Run (team id defaults from `apps/admin/.vercel/project.json` → `orgId`):

```bash
export VERCEL_TOKEN="…your token…"
node scripts/vercel-apply-monorepo-settings.mjs
```

Override the team with `VERCEL_TEAM_ID` if needed. The script updates both **`web`** and **`trap-wear-web`** if those projects exist (CLI `vercel link` from `apps/web` often uses the name **`web`**). Repo path is always **`apps/web`**. Then verify with `pnpm exec vercel project inspect` from `apps/admin` or `apps/web`.

### Verify settings (CLI)

After you save the dashboard, from the linked app folder run:

```bash
pnpm exec vercel project inspect
```

**Root Directory** should read **`apps/web`** or **`apps/admin`** (not **`.`** at the repository root if your install command uses **`cd ../..`** — that pattern assumes the build cwd is the app directory). **Install Command** and **Build Command** should match the **`vercel.json`** in that same folder (same commit you deploy).

### If the deploy UI says “Detected Turbo” but the build still fails

Vercel may **ignore** `vercel.json` and run its own install. Use the override steps above and paste the **`installCommand`** then **`buildCommand`** from the matching app’s **`vercel.json`**. The install line must start with **`cd ../.. &&`** so pnpm runs from the monorepo root.

## Security notes

- Admin sessions are **signed JWTs** in an httpOnly cookie (`trapwear_admin`). Set a strong `ADMIN_JWT_SECRET` in production.
- Paystack webhooks are **idempotent** via the `paystack_events` table (`charge.success` uses Paystack’s transaction id).
- Coupon **redemption limits** use `max_redemptions` + `redemption_count`; the count increments when Paystack marks an order **paid** (not when checkout starts).
- Checkout **locks the coupon row** (`SELECT … FOR UPDATE`) and counts **unpaid** orders (`pending_payment`) using that coupon so concurrent sessions cannot oversubscribe a capped code.
- Admin mutations for orders and super-admin flags write **audit log** rows.
