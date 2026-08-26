import type { Locale } from "@/generated/prisma/client";

export const DEFAULT_LOCALE: Locale = "ka";

export const SUPPORTED_LOCALES: readonly Locale[] = ["ka", "en", "ru"];

export type AppLocale = Locale;

export function resolveLocale(locale?: string | null): Locale {
  if (locale === "en" || locale === "ru" || locale === "ka") return locale;
  return DEFAULT_LOCALE;
}

export function pickTranslation<T extends { locale: Locale }>(
  translations: T[],
  locale: Locale = DEFAULT_LOCALE,
): T {
  const requested = translations.find((row) => row.locale === locale);
  if (requested) return requested;

  const fallback = translations.find((row) => row.locale === DEFAULT_LOCALE);
  if (fallback) return fallback;

  if (translations[0]) return translations[0];
  throw new Error("Missing required translation (Georgian `ka` is mandatory).");
}
