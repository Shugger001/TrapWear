/**
 * Reads DATABASE_URL from repo root .env and writes it into
 * apps/web/.env.local and apps/admin/.env.local (single place to edit for Supabase).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env — copy .env.example to .env and set DATABASE_URL.");
  process.exit(1);
}

const envText = fs.readFileSync(envPath, "utf8");
const line = envText.split("\n").find((l) => l.startsWith("DATABASE_URL="));
if (!line) {
  console.error(".env must contain a line: DATABASE_URL=...");
  process.exit(1);
}

const eq = line.indexOf("=");
const databaseUrl = line.slice(eq + 1).trim();
if (!databaseUrl) {
  console.error("DATABASE_URL in .env is empty.");
  process.exit(1);
}

function upsertKey(filePath, key, value) {
  const nl = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const replacement = `${key}=${value}`;
  if (new RegExp(`^${key}=`, "m").test(nl)) {
    fs.writeFileSync(
      filePath,
      nl.replace(new RegExp(`^${key}=.*$`, "m"), () => replacement),
    );
  } else {
    fs.writeFileSync(filePath, nl.trimEnd() + (nl.endsWith("\n") ? "" : "\n") + replacement + "\n");
  }
}

const webEnv = path.join(root, "apps/web/.env.local");
const adminEnv = path.join(root, "apps/admin/.env.local");

upsertKey(webEnv, "DATABASE_URL", databaseUrl);
upsertKey(adminEnv, "DATABASE_URL", databaseUrl);

console.log("Synced DATABASE_URL from .env → apps/web/.env.local, apps/admin/.env.local");
