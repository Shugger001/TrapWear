#!/usr/bin/env node
/**
 * PATCH Vercel project settings for TrapWear monorepo apps (root directory + install/build).
 *
 * Auth (first match):
 *   VERCEL_TOKEN or VERCEL_AUTH_TOKEN — or a token from `vercel login` in:
 *   - macOS: ~/Library/Application Support/com.vercel.cli/auth.json
 *   - other: ~/.vercel/auth.json (if present)
 *
 * Optional:
 *   VERCEL_TEAM_ID — defaults to orgId in apps/admin/.vercel/project.json
 *
 * Usage:
 *   node scripts/vercel-apply-monorepo-settings.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function readCliToken() {
  const candidates = [
    join(homedir(), "Library", "Application Support", "com.vercel.cli", "auth.json"),
    join(homedir(), ".vercel", "auth.json"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const { token: t } = JSON.parse(readFileSync(p, "utf8"));
      if (typeof t === "string" && t.length > 0) return t.trim();
    } catch {
      /* ignore */
    }
  }
  return null;
}

const token = (process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN || readCliToken())?.trim();
let teamId = process.env.VERCEL_TEAM_ID?.trim();

if (!token) {
  console.error("No token: set VERCEL_TOKEN or run: vercel login");
  process.exit(1);
}

if (!teamId) {
  try {
    const pj = JSON.parse(readFileSync(join(repoRoot, "apps/admin/.vercel/project.json"), "utf8"));
    teamId = pj.orgId;
  } catch {
    console.error("Set VERCEL_TEAM_ID or link admin: cd apps/admin && vercel link");
    process.exit(1);
  }
}

const webSettings = {
  rootDirectory: "apps/web",
  installCommand: "cd ../.. && pnpm install --frozen-lockfile",
  buildCommand:
    "cd ../.. && NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @trapwear/web run build",
};

/** `web` is the usual `vercel link` name from `apps/web`; `trap-wear-web` may be a second project / production name. */
const projects = [
  {
    idOrName: "trapwear-admin",
    rootDirectory: "apps/admin",
    installCommand: "cd ../.. && pnpm install --frozen-lockfile",
    buildCommand:
      "cd ../.. && NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @trapwear/admin run build",
  },
  { idOrName: "web", ...webSettings },
  { idOrName: "trap-wear-web", ...webSettings },
];

async function patchProject(cfg) {
  const url = new URL(`https://api.vercel.com/v9/projects/${encodeURIComponent(cfg.idOrName)}`);
  url.searchParams.set("teamId", teamId);

  const body = {
    rootDirectory: cfg.rootDirectory,
    framework: "nextjs",
    installCommand: cfg.installCommand,
    buildCommand: cfg.buildCommand,
  };

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    if (res.status === 404) {
      console.warn(`Skip ${cfg.idOrName}: project not found (404)`);
      return true;
    }
    console.error(`PATCH ${cfg.idOrName} failed (${res.status}):`, json);
    process.exitCode = 1;
    return false;
  }

  console.log(`OK ${cfg.idOrName}: rootDirectory=${json.rootDirectory ?? cfg.rootDirectory}`);
  return true;
}

let ok = true;
for (const p of projects) {
  if (!(await patchProject(p))) ok = false;
}

if (!ok) process.exit(1);
console.log("Done. Run: cd apps/admin && pnpm exec vercel project inspect");
