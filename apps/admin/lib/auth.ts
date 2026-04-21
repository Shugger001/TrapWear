import { jwtVerify, SignJWT } from "jose";

const COOKIE = "trapwear_admin";

function secretKey() {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("ADMIN_JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

export async function signAdminSession(userId: string, role: "admin" | "superadmin") {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifyAdminSession(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  const role = payload.role;
  if (role !== "admin" && role !== "superadmin") {
    throw new Error("Invalid role");
  }
  return { userId: payload.sub!, role };
}

export const ADMIN_COOKIE = COOKIE;

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
