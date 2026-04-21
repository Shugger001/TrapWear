import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

let _client: ReturnType<typeof postgres> | null = null;
let _db: Db | null = null;

function isSupabaseHost(url: URL): boolean {
  return /(\.|^)supabase\.co$/i.test(url.hostname);
}

function getDb(): Db {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  let parsed: URL | null = null;
  try {
    parsed = new URL(connectionString);
  } catch {
    parsed = null;
  }

  const useSupabaseDefaults = parsed ? isSupabaseHost(parsed) : false;

  _client = postgres(connectionString, {
    max: 10,
    // Supabase transaction pooler (6543) does not support prepared statements.
    prepare: useSupabaseDefaults ? false : undefined,
    // Supabase requires TLS in hosted environments.
    ssl: useSupabaseDefaults ? "require" : undefined,
  });
  _db = drizzle(_client, { schema });
  return _db;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    return Reflect.get(real as object, prop, receiver);
  },
});
