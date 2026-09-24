import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_COOKIE } from "@/lib/auth";

/**
 * Route guard for the signed-in area.
 *
 * Next 16 renamed the `middleware` convention to `proxy`; this file must
 * export a function named `proxy` (or a default export).
 *
 * The signature is verified here with `jose` rather than `jsonwebtoken`, which
 * depends on Node built-ins the edge runtime doesn't provide. The API routes
 * still verify independently — this is defence in depth, not a replacement:
 * a request that skips the proxy entirely must never reach data.
 */
const SIGNED_IN_ONLY = ["/recipes", "/meal-plans", "/chat", "/settings"];
const SIGNED_OUT_ONLY = ["/login", "/register"];

const secret = process.env.JWT_SECRET
  ? new TextEncoder().encode(process.env.JWT_SECRET)
  : null;

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token || !secret) return false;

  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    // Expired, tampered with, or signed by a different secret.
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = await hasValidSession(request);

  const needsSession = SIGNED_IN_ONLY.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (needsSession && !signedIn) {
    const login = new URL("/login", request.url);
    // So the user lands where they were headed once they sign in.
    login.searchParams.set("next", pathname + search);

    const response = NextResponse.redirect(login);
    // A token that failed verification is dead weight; don't send it again.
    if (request.cookies.get(AUTH_COOKIE)) response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  if (signedIn && SIGNED_OUT_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL("/recipes", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/recipes/:path*",
    "/meal-plans/:path*",
    "/chat/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
