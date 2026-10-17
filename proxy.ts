import { NextRequest, NextResponse } from "next/server";
import { getAuth, authConfigured } from "@/lib/auth-server";
export function proxy(request: NextRequest) {
  if (!authConfigured) return NextResponse.next();
  // The submission form remains public; refresh sessions for signed-in visitors.
  if (
    request.nextUrl.pathname.startsWith("/titip-properti") &&
    !request.cookies.has("__Secure-neon-auth.session_token")
  )
    return NextResponse.next();
  return getAuth().middleware({ loginUrl: "/login" })(request);
}
export const config = {
  matcher: ["/akun/:path*", "/admin/:path*", "/titip-properti/:path*"],
};
