"use client";

type BogCalculatorSelected = { amount?: number; month?: number; discount_code?: string };

export function openBogInstallmentCalculator(input: {
  clientId: string;
  amount: number;
  bnpl?: boolean;
}): Promise<{ month: number; discount_code: string; amount?: number }> {
  return new Promise((resolve, reject) => {
    const src = `https://webstatic.bog.ge/bog-sdk/bog-sdk.js?version=2&client_id=${encodeURIComponent(input.clientId)}`;
    const existing = document.querySelector(`script[src="${src}"]`);
    const start = () => {
      const bog = (window as unknown as { BOG?: { Calculator?: { open: (opts: Record<string, unknown>) => void } } }).BOG;
      if (!bog?.Calculator) {
        reject(new Error("BOG calculator is unavailable"));
        return;
      }
      bog.Calculator.open({
        amount: input.amount,
        bnpl: input.bnpl,
        onClose: () => reject(new Error("closed")),
        onRequest: (selected: BogCalculatorSelected, _successCb: unknown, closeCb: () => void) => {
          const month = Number(selected.month);
          const discount_code = String(selected.discount_code ?? "");
          if (!month || !discount_code) {
            closeCb();
            reject(new Error("missing terms"));
            return false;
          }
          closeCb();
          resolve({ month, discount_code, amount: selected.amount });
          return false;
        },
      });
    };
    if (existing) {
      start();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = start;
    script.onerror = () => reject(new Error("BOG SDK failed"));
    document.head.appendChild(script);
  });
}
