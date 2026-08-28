/** Official installment calculator script host. Never include the client secret. */
export const BOG_WEBSTATIC_ORIGIN = "https://webstatic.bog.ge";
export const BOG_INSTALLMENT_ORIGINS = [
  "https://installment.bog.ge",
  "https://installment-v2.bog.ge",
] as const;
export const BOG_API_ORIGIN = "https://api.bog.ge";

const BOG_CALCULATOR_SCRIPT_ID = "bog-installment-sdk";

export function bogCalculatorScriptId(): string {
  return BOG_CALCULATOR_SCRIPT_ID;
}

/** Documented SDK URL: version=2 + public client_id query param. */
export function bogCalculatorScriptUrl(clientId: string): string {
  return `${BOG_WEBSTATIC_ORIGIN}/bog-sdk/bog-sdk.js?version=2&client_id=${encodeURIComponent(clientId)}`;
}

/** Extra CSP sources the official calculator widget needs on checkout. */
export function bogCalculatorCspSources(): {
  scriptSrc: string[];
  styleSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  frameSrc: string[];
  formAction: string[];
} {
  const widget = [BOG_WEBSTATIC_ORIGIN, ...BOG_INSTALLMENT_ORIGINS];
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
  if (message === "closed") return "განვადების კალკულატორი დაიხურა.";
  if (message === "BOG calculator is unavailable" || message === "BOG SDK failed") {
    return "საქართველოს ბანკის კალკულატორი ვერ ჩაიტვირთა. სცადეთ თავიდან.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "გადახდის დაწყება ვერ მოხერხდა.";
}
