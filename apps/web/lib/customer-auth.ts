import { jwtVerify, SignJWT } from "jose";

export const CUSTOMER_COOKIE = "trapwear_customer";

function secretKey() {
  const s = process.env.CUSTOMER_JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("CUSTOMER_JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

export async function signCustomerSession(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifyCustomerSession(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  return { userId: payload.sub! };
}

export function customerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
