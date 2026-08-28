import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCheckoutIdempotencyKey } from "./checkoutIdempotency";

describe("isCheckoutIdempotencyKey", () => {
  it("accepts UUID v4 only", () => {
    assert.equal(isCheckoutIdempotencyKey("2c1f8e4a-9b3d-4e71-a1c2-0f6d8b7a5c43"), true);
    assert.equal(isCheckoutIdempotencyKey("2c1f8e4a-9b3d-3e71-a1c2-0f6d8b7a5c43"), false);
    assert.equal(isCheckoutIdempotencyKey(""), false);
  });
});
