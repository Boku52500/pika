"use client";

import {
  BOG_CALCULATOR_SCRIPT_ID,
  bogCalculatorScriptUrl,
  isValidBogCalculatorAmount,
} from "@/lib/bogSdk";

type BogCalculatorSelected = { amount?: number; month?: number; discount_code?: string };
type BogCalculatorApi = { open: (opts: Record<string, unknown>) => void };

export type BogLoanOrderResult = {
  providerOrderId: string;
  orderNumber: string;
  redirectUrl?: string;
};

export type BogCalculatorSessionResult =
  | { cancelled: true }
  | (BogLoanOrderResult & { cancelled: false; sdkRedirectUrl?: string });

function getBogCalculator(): BogCalculatorApi | undefined {
  const root = globalThis as typeof globalThis & {
    BOG?: { Calculator?: BogCalculatorApi };
    window?: { BOG?: { Calculator?: BogCalculatorApi } };
  };
  return root.BOG?.Calculator ?? root.window?.BOG?.Calculator;
}

function isScriptElement(node: Element | null): node is HTMLScriptElement {
  return Boolean(node && String(node.tagName).toLowerCase() === "script");
}

function findSdkScript(): HTMLScriptElement | null {
  const byId = document.getElementById(BOG_CALCULATOR_SCRIPT_ID);
  if (isScriptElement(byId)) return byId;
  const bySrc = document.querySelector?.("script[src*=\"bog-sdk/bog-sdk.js\"]") ?? null;
  return isScriptElement(bySrc) ? bySrc : null;
}

let loadPromise: Promise<BogCalculatorApi> | null = null;
let loadClientId: string | null = null;

/** Load the official SDK once. Prefer the checkout page script tag if present. */
export function loadBogCalculatorSdk(clientId: string): Promise<BogCalculatorApi> {
  const id = clientId.trim();
  if (!id) return Promise.reject(new Error("BOG calculator is unavailable"));
  if (loadPromise && loadClientId === id) return loadPromise;

  loadClientId = id;
  loadPromise = new Promise((resolve, reject) => {
    let settled = false;
    const readyNow = getBogCalculator();
    if (readyNow?.open) {
      resolve(readyNow);
      return;
    }

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      loadPromise = null;
      loadClientId = null;
      reject(error);
    };

    const finish = () => {
      if (settled) return;
      const calculator = getBogCalculator();
      if (!calculator?.open) return;
      settled = true;
      resolve(calculator);
    };

    const existing = findSdkScript();
    if (existing) {
      if (getBogCalculator()?.open) {
        finish();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => fail(new Error("BOG SDK failed")), { once: true });
      const deadline = Date.now() + 8000;
      const tick = () => {
        if (getBogCalculator()?.open) {
          finish();
          return;
        }
        if (Date.now() > deadline) {
          fail(new Error("BOG calculator is unavailable"));
          return;
        }
        globalThis.setTimeout(tick, 50);
      };
      tick();
      return;
    }

    const script = document.createElement("script");
    script.id = BOG_CALCULATOR_SCRIPT_ID;
    script.src = bogCalculatorScriptUrl(id);
    script.onload = () => {
      script.dataset.bogSdk = "loaded";
      finish();
      if (settled) return;
      const deadline = Date.now() + 8000;
      const tick = () => {
        if (getBogCalculator()?.open) {
          finish();
          return;
        }
        if (Date.now() > deadline) {
          fail(new Error("BOG calculator is unavailable"));
          return;
        }
        globalThis.setTimeout(tick, 50);
      };
      tick();
    };
    script.onerror = () => fail(new Error("BOG SDK failed"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export function resetBogCalculatorSdkLoader(): void {
  loadPromise = null;
  loadClientId = null;
}

/**
 * Official `BOG.Calculator.open` from the modal docs. Only documented fields.
 * selected.amount is monthly and must not be used as the order total.
 */
export function openBogInstallmentCalculator(input: {
  clientId: string;
  amount: number;
  bnpl: boolean;
  onRequest: (selected: { month: number; discount_code: string }) => Promise<BogLoanOrderResult>;
}): Promise<BogCalculatorSessionResult> {
  if (!isValidBogCalculatorAmount(input.amount)) {
    return Promise.reject(new Error("გადახდის დაწყება ვერ მოხერხდა."));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let requesting = false;
    let created: BogLoanOrderResult | null = null;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const cancel = () => {
      if (settled) return;
      settled = true;
      resolve({ cancelled: true });
    };

    void loadBogCalculatorSdk(input.clientId)
      .then((calculator) => {
        if (settled) return;
        calculator.open({
          amount: input.amount,
          bnpl: input.bnpl,
          onClose: () => {
            if (settled || requesting || created) return;
            cancel();
          },
          onRequest: (
            selected: BogCalculatorSelected,
            successCb: (orderId: string) => void,
            closeCb: () => void,
          ) => {
            if (settled) return false;
            if (created) {
              successCb(created.providerOrderId);
              return undefined;
            }
            if (requesting) return undefined;
            const month = Number(selected.month);
            const discount_code = String(selected.discount_code ?? "").trim();
            if (!month || !discount_code) {
              closeCb();
              fail(new Error("აირჩიეთ განვადების პირობები ბანკის კალკულატორიდან."));
              return false;
            }
            requesting = true;
            void input
              .onRequest({ month, discount_code })
              .then((result) => {
                created = result;
                requesting = false;
                successCb(result.providerOrderId);
              })
              .catch((error: unknown) => {
                requesting = false;
                closeCb();
                fail(error instanceof Error ? error : new Error("განვადების შეკვეთა ვერ შეიქმნა."));
              });
            return undefined;
          },
          onComplete: ({ redirectUrl }: { redirectUrl?: string }) => {
            if (!created) {
              fail(new Error("განვადების შეკვეთა ვერ შეიქმნა."));
              return false;
            }
            if (settled) return false;
            settled = true;
            resolve({ cancelled: false, ...created, sdkRedirectUrl: redirectUrl });
            return false;
          },
        });
      })
      .catch((error: unknown) => {
        fail(error instanceof Error ? error : new Error("BOG calculator is unavailable"));
      });
  });
}
