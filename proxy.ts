import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("visiox_session")?.value;
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/home/:path*",
    "/projects/:path*",
    "/datasets/:path*",
    "/teams/:path*",
    "/train/:path*",
    "/deploy/:path*",
    "/workflows/:path*",
    "/overview/:path*",
    "/invite/:path*",
  ],
};
