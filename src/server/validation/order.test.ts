import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { orderSubmissionSchema } from "./order";
import { MAX_CART_LINES } from "@/lib/cart";
import { isCheckoutIdempotencyKey } from "@/lib/checkoutIdempotency";

const CHECKOUT_KEY = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const baseItem = { productId: "prod-1", quantity: 1 };

function payload(overrides: Record<string, unknown> = {}) {
  return {
    checkoutIdempotencyKey: CHECKOUT_KEY,
    customer: {
      firstName: "გიორგი",
      lastName: "ბერიძე",
      email: "giorgi@example.com",
      phone: "599123456",
    },
    address: { city: "თბილისი", street: "რუსთაველის 1" },
    deliveryMethod: "standard",
    paymentMethod: "cash_on_delivery",
    items: [baseItem],
    ...overrides,
  };
}

describe("checkoutIdempotencyKey", () => {
  it("accepts a UUID v4 and rejects missing or malformed keys", () => {
    assert.equal(isCheckoutIdempotencyKey(CHECKOUT_KEY), true);
    assert.equal(isCheckoutIdempotencyKey("not-a-uuid"), false);
    assert.equal(orderSubmissionSchema.safeParse(payload()).success, true);
    assert.equal(orderSubmissionSchema.safeParse(payload({ checkoutIdempotencyKey: "abc" })).success, false);
    const withoutKey = { ...payload() };
    delete (withoutKey as { checkoutIdempotencyKey?: string }).checkoutIdempotencyKey;
    assert.equal(orderSubmissionSchema.safeParse(withoutKey).success, false);
  });

  it("treats the same key as a durable client nonce (not a 20s hash of the cart)", () => {
    const first = orderSubmissionSchema.safeParse(payload({ items: [{ productId: "a", quantity: 1 }] }));
    const second = orderSubmissionSchema.safeParse(payload({ items: [{ productId: "b", quantity: 2 }] }));
    assert.equal(first.success && second.success, true);
    if (first.success && second.success) {
      assert.equal(first.data.checkoutIdempotencyKey, second.data.checkoutIdempotencyKey);
    }
  });
});

describe("orderSubmissionSchema cart size", () => {
  it(`rejects more than ${MAX_CART_LINES} lines`, () => {
    const items = Array.from({ length: MAX_CART_LINES + 1 }, (_, index) => ({
      ...baseItem,
      productId: `prod-${index}`,
    }));
    assert.equal(orderSubmissionSchema.safeParse(payload({ items })).success, false);
  });

  it(`accepts ${MAX_CART_LINES} lines`, () => {
    const items = Array.from({ length: MAX_CART_LINES }, (_, index) => ({
      ...baseItem,
      productId: `prod-${index}`,
    }));
    assert.equal(orderSubmissionSchema.safeParse(payload({ paymentMethod: "card", items })).success, true);
  });

  it("accepts BOG online methods and recurrent save-card consent", () => {
    assert.equal(orderSubmissionSchema.safeParse(payload({ paymentMethod: "google_pay" })).success, true);
    assert.equal(orderSubmissionSchema.safeParse(payload({ paymentMethod: "apple_pay" })).success, true);
    assert.equal(orderSubmissionSchema.safeParse(payload({ paymentMethod: "bog_loan", loanMonth: 12, loanDiscountCode: "X" })).success, true);
    assert.equal(orderSubmissionSchema.safeParse(payload({ paymentMethod: "card", saveCardConsent: "recurrent" })).success, true);
    assert.equal(orderSubmissionSchema.safeParse(payload({ paymentMethod: "card", saveCardConsent: "subscription" })).success, false);
  });
});
