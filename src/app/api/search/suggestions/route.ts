import { NextRequest } from "next/server";
import {
  SEARCH_MIN_QUERY_LENGTH,
  emptySearchSuggestions,
  sanitizeSearchQuery,
} from "@/lib/search";
import { CatalogueUnavailableError, withCatalogQuery } from "@/server/catalog/errors";
import { getSearchSuggestions } from "@/server/search";
import { searchQueryInputSchema } from "@/server/validation/search";
import { clientIpFromHeaders, consumeRateLimit } from "@/server/auth/rateLimit";
import { logError } from "@/server/log";

export const dynamic = "force-dynamic";

function errorStatus(error: unknown): number {
  if (error instanceof CatalogueUnavailableError) return 503;
  return 503;
}

export async function GET(request: NextRequest) {
  const parsed = searchQueryInputSchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
  });

  if (!parsed.success) {
    return Response.json(emptySearchSuggestions, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const query = sanitizeSearchQuery(parsed.data.q ?? "");
  if (query.length < SEARCH_MIN_QUERY_LENGTH) {
    return Response.json(emptySearchSuggestions, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const ip = clientIpFromHeaders(request.headers);
  if (!(await consumeRateLimit(`search:ip:${ip}`, 60, 60 * 1000))) {
    return Response.json(
      { error: "search_unavailable" },
      { status: 429, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const suggestions = await withCatalogQuery(() => getSearchSuggestions(query));
    return Response.json(suggestions, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    logError("search.suggestions_failed", { error });
    return Response.json(
      { error: "search_unavailable" },
      {
        status: errorStatus(error),
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
