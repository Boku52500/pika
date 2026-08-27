import type { PaymentAttemptStatus } from "@/generated/prisma/client";

export const PAYMENT_STATUS_COPY: Record<
  "unpaid" | "pending" | "processing" | "paid" | "failed" | "refunded" | "partially_refunded",
  { label: string; title: string; body: string }
> = {
  unpaid: {
    label: "გადაუხდელია",
    title: "შეკვეთა მიღებულია",
    body: "გადახდა ჯერ არ დამუშავებულა.",
  },
  pending: {
    label: "გადახდა მუშავდება",
    title: "გადახდა მუშავდება",
    body: "გადახდის დადასტურებას ველოდებით. ეს გვერდი არ ნიშნავს, რომ თანხა უკვე ჩამოგეჭრათ.",
  },
  processing: {
    label: "გადახდა მუშავდება",
    title: "გადახდა მუშავდება",
    body: "ბანკი ამუშავებს გადახდას. გთხოვთ, დაელოდოთ — თანხის ჩამოჭრა ჯერ დადასტურებული არ არის.",
  },
  paid: {
    label: "გადახდილია",
    title: "გადახდა წარმატებით დასრულდა",
    body: "თანხა წარმატებით ჩაირიცხა. შეკვეთას მალე დავამუშავებთ.",
  },
  failed: {
    label: "გადახდა ვერ შესრულდა",
    title: "გადახდა ვერ შესრულდა",
    body: "გადახდა არ დასრულებულა. შეკვეთა შენარჩუნებულია — შეგიძლიათ ხელახლა სცადოთ იმავე შეკვეთაზე.",
  },
  refunded: {
    label: "თანხა დაბრუნებულია",
    title: "თანხა დაბრუნებულია",
    body: "ამ გადახდაზე თანხა დაბრუნებულია.",
  },
  partially_refunded: {
    label: "თანხა ნაწილობრივ დაბრუნებულია",
    title: "თანხა ნაწილობრივ დაბრუნებულია",
    body: "ამ გადახდაზე თანხის ნაწილი დაბრუნებულია.",
  },
};

export function paymentCopyFor(
  status: string | null | undefined,
): (typeof PAYMENT_STATUS_COPY)[keyof typeof PAYMENT_STATUS_COPY] {
  if (status && status in PAYMENT_STATUS_COPY) {
    return PAYMENT_STATUS_COPY[status as keyof typeof PAYMENT_STATUS_COPY];
  }
  return PAYMENT_STATUS_COPY.pending;
}

export function attemptStatusLabel(status: PaymentAttemptStatus): string {
  return PAYMENT_STATUS_COPY[status]?.label ?? status;
}
