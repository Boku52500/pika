import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { safeInternalPath } from "@/lib/authValidation";
import { getAppOrigin, shouldRedirectToCanonical } from "@/lib/appUrl";

function canonicalRedirect(request: NextRequest): NextResponse | null {
  const configured = (process.env.APP_ORIGIN ?? "").trim();
  if (!configured) return null;
  const canonical = getAppOrigin();
  const host = request.headers.get("host") ?? "";
  if (!shouldRedirectToCanonical(host, canonical)) return null;

  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical);
  return NextResponse.redirect(destination, 308);
}

export async function proxy(request: NextRequest) {
  const redirected = canonicalRedirect(request);
  if (redirected) return redirected;

  const { pathname, search } = request.nextUrl;
  const isAccount = pathname.startsWith("/account");
  const isAdmin = pathname.startsWith("/admin");

  if (!isAccount && !isAdmin) {
    return NextResponse.next();
  }

  const session = await auth();
  if (session?.user?.id) {
    return NextResponse.next();
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set(
    "redirect",
    safeInternalPath(`${pathname}${search}`, isAdmin ? "/admin" : "/account"),
  );
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
