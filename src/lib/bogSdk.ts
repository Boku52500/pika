/** Official installment calculator script host. Never include the client secret. */
export const BOG_WEBSTATIC_ORIGIN = "https://webstatic.bog.ge";
export const BOG_INSTALLMENT_ORIGIN = "https://installment.bog.ge";
export const BOG_INSTALLMENT_V2_ORIGIN = "https://installment-v2.bog.ge";
export const BOG_API_ORIGIN = "https://api.bog.ge";
export const BOG_INSTALLMENT_ORIGINS = [BOG_INSTALLMENT_ORIGIN, BOG_INSTALLMENT_V2_ORIGIN] as const;

export const BOG_CALCULATOR_SCRIPT_ID = "bog-installment-sdk";

/**
 * Official calculator script. The HTML snippet in BOG's modal docs includes
 * `version=2`, but the live SDK reads that query param as an API selector:
 * `version=2` POSTs calculate to api.bog.ge (v2); omitting it uses
 * installment.bog.ge (v1). Same merchant client_id works on v1 elsewhere.
 */
export function bogCalculatorScriptUrl(clientId: string): string {
  return `${BOG_WEBSTATIC_ORIGIN}/bog-sdk/bog-sdk.js?client_id=${encodeURIComponent(clientId.trim())}`;
}

/** Documented Calculator.open fields. Do not add undocumented SDK options. */
export const BOG_CALCULATOR_OPEN_OPTION_KEYS = ["amount", "bnpl", "onClose", "onRequest", "onComplete"] as const;

export function isValidBogCalculatorAmount(amount: number): boolean {
  return typeof amount === "number" && Number.isFinite(amount) && amount > 0;
}

/** Maps official SDK `onRequest` selection to BOG create-order `config.loan`. */
export function bogCalculatorLoanFromSdkSelection(selected: { month: number; discount_code: string }): {
  month: number;
  type: string;
} {
  return { month: selected.month, type: selected.discount_code };
}

/**
 * Prefer the calculator selection from this request. If checkout is replaying
 * an existing unpaid order, keep the stored loan so create-order still sends
 * `config.loan`.
 */
export function resolveBogCreateOrderLoan(input: {
  fromCalculator?: { month: number; type: string };
  storedMonth?: number | null;
  storedType?: string | null;
}): { month: number; type: string } | undefined {
  if (input.fromCalculator) return input.fromCalculator;
  if (input.storedMonth && input.storedType) {
    return { month: input.storedMonth, type: input.storedType };
  }
  return undefined;
}

/** CSP sources the official calculator widget needs on checkout. */
export function bogCalculatorCspSources(): {
  scriptSrc: string[];
  styleSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  frameSrc: string[];
  formAction: string[];
} {
  const widget = [BOG_WEBSTATIC_ORIGIN, BOG_INSTALLMENT_ORIGIN, BOG_INSTALLMENT_V2_ORIGIN];
  return {
    scriptSrc: [BOG_WEBSTATIC_ORIGIN],
    styleSrc: [BOG_WEBSTATIC_ORIGIN],
    fontSrc: [BOG_WEBSTATIC_ORIGIN],
    connectSrc: [...widget, BOG_API_ORIGIN],
    frameSrc: widget,
    formAction: widget,
  };
}

export function bogCalculatorUserMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "BOG calculator is unavailable" || message === "BOG SDK failed") {
    return "საქართველოს ბანკის კალკულატორი ვერ ჩაიტვირთა. სცადეთ თავიდან.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "გადახდის დაწყება ვერ მოხერხდა.";
}

export function isBogCalculatorCancelled(error: unknown): boolean {
  return error instanceof Error && error.message === "closed";
}
