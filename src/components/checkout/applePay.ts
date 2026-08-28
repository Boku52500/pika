"use client";

export async function completeApplePaySheet(input: {
  result: unknown;
  onToken: (token: string) => Promise<void>;
}): Promise<void> {
  const ApplePaySession = (window as unknown as {
    ApplePaySession?: {
      canMakePayments: () => boolean;
      new (version: number, request: object): AppleSession;
    };
  }).ApplePaySession;
  if (!ApplePaySession?.canMakePayments()) {
    throw new Error("Apple Pay is unavailable on this device");
  }
  const request =
    input.result && typeof input.result === "object" ? (input.result as object) : { countryCode: "GE", currencyCode: "GEL" };
  const session = new ApplePaySession(3, request);
  await new Promise<void>((resolve, reject) => {
    session.onvalidatemerchant = () => {
      /* BOG `result` is used to start the sheet; merchant validation is completed by Apple/BOG onboarding. */
    };
    session.onpaymentauthorized = (event: { payment?: { token?: unknown } }) => {
      try {
        const token = JSON.stringify(event.payment?.token ?? event.payment ?? {});
        void input
          .onToken(token)
          .then(() => {
            session.completePayment(0);
            resolve();
          })
          .catch((error: unknown) => {
            session.completePayment(1);
            reject(error);
          });
      } catch (error) {
        session.completePayment(1);
        reject(error);
      }
    };
    session.oncancel = () => reject(new Error("Apple Pay cancelled"));
    session.begin();
  });
}

type AppleSession = {
  onvalidatemerchant: ((event: unknown) => void) | null;
  onpaymentauthorized: ((event: { payment?: { token?: unknown } }) => void) | null;
  oncancel: (() => void) | null;
  begin: () => void;
  completePayment: (status: number) => void;
};
