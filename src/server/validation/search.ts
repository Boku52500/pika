import { z } from "zod";
import { SEARCH_MAX_QUERY_LENGTH } from "@/lib/search";

export const searchQueryInputSchema = z.object({
  q: z.string().max(SEARCH_MAX_QUERY_LENGTH * 2).optional(),
});

export type SearchQueryInput = z.infer<typeof searchQueryInputSchema>;
