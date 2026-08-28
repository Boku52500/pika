/**
 * Official BOG payment and action response codes:
 * https://api.bog.ge/docs/en/payments/response-codes
 *
 * Customer copy is always the documented Georgian text (or a safe generic).
 * Admin diagnostics use the documented English description.
 */

export type BogCodeKind = "payment" | "action";

export type BogCodeClassification = {
  code: string;
  kind: BogCodeKind;
  known: boolean;
  success: boolean;
  retryable: boolean | null;
  customerMessageKa: string;
  adminDiagnosticEn: string;
};

const GENERIC_CUSTOMER_KA = "გადახდა ვერ შესრულდა. სცადეთ სხვა მეთოდი ან დაუკავშირდით ბარათის მომსახურე ბანკს.";
const UNKNOWN_CUSTOMER_KA = "გადახდის სტატუსი დაზუსტებას საჭიროებს. თუ თანხა ჩამოგეჭრათ, დაელოდეთ დადასტურებას.";

type CatalogRow = {
  en: string;
  ka: string;
  success?: boolean;
  retryable?: boolean | null;
};

const PAYMENT_CODES: Record<string, CatalogRow> = {
  "100": { en: "Successful payment", ka: "წარმატებული გადახდა", success: true, retryable: false },
  "101": {
    en: "Payment declined because card usage is limited. For detailed information, contact the card issuer bank",
    ka: "გადახდა უარყოფილია, რადგან ბარათის გამოყენება შეზღუდულია. დეტალური ინფორმაციისთვის დაუკავშირდით ბარათის მომსახურე ბანკს",
    retryable: false,
  },
  "102": { en: "Saved card wasn't found", ka: "დამახსოვრებული ბარათი ვერ მოიძებნა", retryable: false },
  "103": { en: "Payment declined due to invalid card", ka: "გადახდა უარყოფილია, რადგან ბარათი არ არის ვალიდური", retryable: false },
  "104": {
    en: "Payment declined due to exceeding transaction limit",
    ka: "გადახდა უარყოფილია ტრანზაქციის რაოდენობის ლიმიტის გადაჭარბების გამო",
    retryable: false,
  },
  "105": { en: "Payment declined because the card has expired", ka: "გადახდა უარყოფილია, რადგან ბარათი ვადაგასულია", retryable: false },
  "106": {
    en: "Payment declined due to exceeding the limit of the amount",
    ka: "გადახდა უარყოფილია თანხის ლიმიტის გადაჭარბების გამო",
    retryable: false,
  },
  "107": {
    en: "Payment declined due to insufficient funds in the account",
    ka: "გადახდა უარყოფილია ანგარიშზე არასაკმარისი თანხის გამო",
    retryable: true,
  },
  "108": { en: "Authentication Declined", ka: "გადახდის ავტორიზაციის უარყოფა", retryable: true },
  "109": { en: "Technical Issue", ka: "დაფიქსირდა ტექნიკური ხარვეზი", retryable: true },
  "110": { en: "Transaction Expired", ka: "ოპერაციის შესრულების დრო ამოიწურა", retryable: true },
  "111": { en: "Authentication timeout", ka: "გადახდის ავტორიზაციის დრო ამოიწურა", retryable: true },
  "112": { en: "General Error", ka: "საერთო შეცდომა", retryable: true },
  "122": { en: "Payment declined by the acquirer bank", ka: "გადახდა უარყოფილია მომსახურე ბანკის მიერ", retryable: false },
  "199": { en: "Unknown Response", ka: "უცნობი პასუხი", retryable: null },
  "200": { en: "Successful preauthorization", ka: "წარმატებული პრეავტორიზაცია", success: true, retryable: false },
};

const ACTION_CODES: Record<string, CatalogRow> = {
  "161": {
    en: "Refund could not be completed. Please contact the card issuing bank for more details.",
    ka: "თანხის დაბრუნება ვერ მოხერხდა. მეტი დეტალისთვის დაუკავშირდით ბარათის გამცემ ბანკს.",
    retryable: null,
  },
  "162": {
    en: "The card issuing bank declined the refund.",
    ka: "ბარათის გამცემი ბანკი უარყოფს თანხის დაბრუნებას.",
    retryable: false,
  },
  "163": { en: "Not enough funds available in the account", ka: "ანგარიშზე არ გაქვთ საკმარისი ნაშთი.", retryable: true },
  "164": {
    en: "Refund could not be completed. Please contact the card issuing bank for more details.",
    ka: "თანხის დაბრუნება ვერ მოხერხდა. მეტი დეტალისთვის დაუკავშირდით ბარათის გამცემ ბანკს.",
    retryable: null,
  },
  "165": {
    en: "Refund could not be completed. Please contact the card issuing bank for more details.",
    ka: "თანხის დაბრუნება ვერ მოხერხდა. მეტი დეტალისთვის დაუკავშირდით ბარათის გამცემ ბანკს.",
    retryable: null,
  },
  "166": {
    en: "Refund could not be completed. Please contact the card issuing bank for more details.",
    ka: "თანხის დაბრუნება ვერ მოხერხდა. მეტი დეტალისთვის დაუკავშირდით ბარათის გამცემ ბანკს.",
    retryable: null,
  },
  "167": {
    en: "Card expired. Contact the customer and refund the amount to an active card.",
    ka: "ბარათი ვადაგასულია. დაუკავშირდით მომხმარებელს და დაუბრუნეთ თანხა აქტიურ ბარათზე.",
    retryable: false,
  },
  "168": {
    en: "Refund could not be completed. Please contact the card issuing bank for more details.",
    ka: "თანხის დაბრუნება ვერ მოხერხდა. მეტი დეტალისთვის დაუკავშირდით ბარათის გამცემ ბანკს.",
    retryable: null,
  },
  "169": {
    en: "The card is expired or the details are incorrect. Please verify the information with the customer and try again.",
    ka: "ბარათი ვადაგასულია ან მონაცემები არასწორია. გადაამოწმეთ ინფორმაცია მომხმარებელთან და თავიდან ცადეთ.",
    retryable: true,
  },
  "179": { en: "Unknown Response", ka: "უცნობი პასუხი", retryable: null },
};

function normalizeCode(code: string | number | null | undefined): string | null {
  if (code == null) return null;
  const text = String(code).trim();
  return text.length > 0 ? text : null;
}

export function classifyBogPaymentCode(code: string | number | null | undefined): BogCodeClassification {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return {
      code: "",
      kind: "payment",
      known: false,
      success: false,
      retryable: null,
      customerMessageKa: UNKNOWN_CUSTOMER_KA,
      adminDiagnosticEn: "Missing payment response code",
    };
  }
  const row = PAYMENT_CODES[normalized];
  if (!row) {
    return {
      code: normalized,
      kind: "payment",
      known: false,
      success: false,
      retryable: null,
      customerMessageKa: UNKNOWN_CUSTOMER_KA,
      adminDiagnosticEn: `Unknown BOG payment code ${normalized}`,
    };
  }
  return {
    code: normalized,
    kind: "payment",
    known: true,
    success: Boolean(row.success),
    retryable: row.retryable ?? null,
    customerMessageKa: row.success ? row.ka : row.ka || GENERIC_CUSTOMER_KA,
    adminDiagnosticEn: row.en,
  };
}

export function classifyBogActionCode(code: string | number | null | undefined): BogCodeClassification {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return {
      code: "",
      kind: "action",
      known: false,
      success: false,
      retryable: null,
      customerMessageKa: "ოპერაცია ვერ დასრულდა. სტატუსი განახლდება ბანკის პასუხის შემდეგ.",
      adminDiagnosticEn: "Missing action response code",
    };
  }
  const row = ACTION_CODES[normalized];
  if (!row) {
    return {
      code: normalized,
      kind: "action",
      known: false,
      success: false,
      retryable: null,
      customerMessageKa: "ოპერაციის სტატუსი დაზუსტებას საჭიროებს.",
      adminDiagnosticEn: `Unknown BOG action code ${normalized}`,
    };
  }
  return {
    code: normalized,
    kind: "action",
    known: true,
    success: false,
    retryable: row.retryable ?? null,
    customerMessageKa: row.ka,
    adminDiagnosticEn: row.en,
  };
}

export function customerMessageForPaymentCode(code: string | number | null | undefined): string {
  const classified = classifyBogPaymentCode(code);
  if (classified.success) return classified.customerMessageKa;
  return classified.known ? classified.customerMessageKa : UNKNOWN_CUSTOMER_KA;
}

export const DOCUMENTED_PAYMENT_CODES = Object.keys(PAYMENT_CODES);
export const DOCUMENTED_ACTION_CODES = Object.keys(ACTION_CODES);
