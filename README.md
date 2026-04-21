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
3. **`apps/admin/.env.local`**: **`ADMIN_JWT_SECRET`**, same **`STALE_CHECKOUT_MINUTES`** as web for Operations sweep; **`DATABASE_URL`** synced like above.
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

## Security notes

- Admin sessions are **signed JWTs** in an httpOnly cookie (`trapwear_admin`). Set a strong `ADMIN_JWT_SECRET` in production.
- Paystack webhooks are **idempotent** via the `paystack_events` table (`charge.success` uses Paystack’s transaction id).
- Coupon **redemption limits** use `max_redemptions` + `redemption_count`; the count increments when Paystack marks an order **paid** (not when checkout starts).
- Checkout **locks the coupon row** (`SELECT … FOR UPDATE`) and counts **unpaid** orders (`pending_payment`) using that coupon so concurrent sessions cannot oversubscribe a capped code.
- Admin mutations for orders and super-admin flags write **audit log** rows.
