import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/account")) {
    const secret = process.env.CUSTOMER_JWT_SECRET;
    if (!secret || secret.length < 32) {
      return NextResponse.redirect(
        new URL(`/sign-in?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url),
      );
    }
    const token = req.cookies.get("trapwear_customer")?.value;
    if (!token) {
      return NextResponse.redirect(
        new URL(`/sign-in?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url),
      );
    }
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
    } catch {
      return NextResponse.redirect(
        new URL(`/sign-in?next=${encodeURIComponent(req.nextUrl.pathname)}`, req.url),
      );
    }
  }

  const maintenance = process.env.MAINTENANCE_MODE === "1";
  if (maintenance && !req.nextUrl.pathname.startsWith("/maintenance")) {
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};
