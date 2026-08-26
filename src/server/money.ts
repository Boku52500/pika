import { Prisma } from "@/generated/prisma/client";

/** Prisma Decimal used for GEL amounts (2 fractional digits / tetri). */
export type Money = Prisma.Decimal;

const GEL_SCALE = 2;

export function numberToMoney(value: number): Money {
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot convert non-finite number ${value} to money.`);
  }
  return new Prisma.Decimal(value.toFixed(GEL_SCALE));
}

export function decimalToNumber(value: Prisma.Decimal | string | number): number {
  return new Prisma.Decimal(value).toNumber();
}

export function moneyToNumber(value: Prisma.Decimal | string | number): number {
  return new Prisma.Decimal(value).toDecimalPlaces(GEL_SCALE).toNumber();
}

/** Integer tetri (1 GEL = 100 tetri). Prefer this when doing arithmetic in JS. */
export function moneyToTetri(value: Prisma.Decimal | string | number): number {
  return new Prisma.Decimal(value).mul(100).toDecimalPlaces(0).toNumber();
}

export function tetriToMoney(tetri: number): Money {
  if (!Number.isInteger(tetri)) {
    throw new Error("Tetri amounts must be integers.");
  }
  return new Prisma.Decimal(tetri).div(100).toDecimalPlaces(GEL_SCALE);
}

export function tetriToNumber(tetri: number): number {
  return moneyToNumber(tetriToMoney(tetri));
}

const MONEY_INPUT_RE = /^\d+(\.\d{1,2})?$/;

/** Parse a user-typed GEL amount (`12` / `12.5` / `12.50`) into Decimal. Commas allowed. */
export function parseMoneyInput(raw: string): Money {
  const value = raw.trim().replace(",", ".");
  if (!MONEY_INPUT_RE.test(value)) {
    throw new Error(`Invalid money input: ${raw}`);
  }
  return new Prisma.Decimal(value).toDecimalPlaces(GEL_SCALE);
}

export function isValidMoneyInput(raw: string): boolean {
  return MONEY_INPUT_RE.test(raw.trim().replace(",", "."));
}

export function moneyToInput(value: Prisma.Decimal | string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const n = moneyToNumber(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(GEL_SCALE);
}
