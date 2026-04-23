import { createClient } from "@supabase/supabase-js";
import { isAllowedProductImageUrl } from "@trapwear/core";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-guard";
import { getProductImageUrlRulesFromEnv } from "@/lib/product-image-rules";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function sniffImageKind(buf: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    const webp = String.fromCharCode(buf[8] ?? 0, buf[9] ?? 0, buf[10] ?? 0, buf[11] ?? 0);
    if (webp === "WEBP") return "image/webp";
  }
  return null;
}

function sanitizeBaseName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "image";
  const stripped = base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^\.+/, "").slice(0, 80);
  return stripped.length > 0 ? stripped : "image";
}

const uploadCounts = new Map<string, { n: number; reset: number }>();
const WINDOW_MS = 60_000;
const MAX_UPLOADS_PER_WINDOW = 30;

function rateLimitOk(userId: string): boolean {
  const now = Date.now();
  const cur = uploadCounts.get(userId);
  if (!cur || now > cur.reset) {
    uploadCounts.set(userId, { n: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (cur.n >= MAX_UPLOADS_PER_WINDOW) return false;
  cur.n += 1;
  return true;
}

export async function POST(req: Request) {
  const auth = await requireAdminSession("admin");
  if ("error" in auth) return auth.error;

  if (!rateLimitOk(auth.session.userId)) {
    return NextResponse.json({ error: "Too many uploads. Try again in a minute." }, { status: 429 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET?.trim() || "product-images";

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Uploads are not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB).` }, { status: 400 });
  }

  const declared = file.type?.toLowerCase() ?? "";
  if (!ALLOWED_TYPES.has(declared)) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are allowed." }, { status: 400 });
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageKind(buf);
  if (!sniffed || sniffed !== declared) {
    return NextResponse.json({ error: "File content does not match an allowed image type." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES.get(declared)!;
  const safeBase = sanitizeBaseName(file.name).replace(/\.(jpe?g|png|webp)$/i, "");
  const objectPath = `catalog/${randomUUID()}-${safeBase}${ext}`;

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, buf, {
    contentType: declared,
    upsert: false,
  });

  if (upErr) {
    return NextResponse.json({ error: upErr.message || "Upload failed." }, { status: 502 });
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  const publicUrl = pub.publicUrl;

  const rules = getProductImageUrlRulesFromEnv();
  if (!isAllowedProductImageUrl(publicUrl, rules)) {
    return NextResponse.json(
      {
        error:
          "Upload succeeded but public URL is not allowed by current image rules. Check NEXT_PUBLIC_SUPABASE_URL and ALLOWED_IMAGE_URL_PREFIXES.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, url: publicUrl });
}
