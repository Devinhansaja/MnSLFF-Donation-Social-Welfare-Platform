import { NextResponse, type NextRequest } from "next/server";

// Optimistic gate only: real authorization happens in each page/action via
// requireStaff()/requireDonor(), which verify the signed session and role.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("mnslff_session");
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
