import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

/**
 * Drops the session cookie.
 *
 * The client clears its own localStorage copy, but the cookie is httpOnly, so
 * only the server can remove it — without this the proxy would keep treating
 * the visitor as signed in after they log out.
 */
export async function POST() {
  return clearAuthCookie(NextResponse.json({ success: true }));
}
