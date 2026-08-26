import type { Metadata } from "next";

export const noIndexRobots = { index: false, follow: false } as const;

export const noIndexMetadata: Pick<Metadata, "robots"> = {
  robots: noIndexRobots,
};

export function pageCanonical(path: string, override?: string | null): Pick<Metadata, "alternates"> {
  const canonical = override?.trim() || path;
  return { alternates: { canonical } };
}
