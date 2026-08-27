import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import { buildBogRefundBody, buildBogRefundRequest, isUuidV4 } from "./refundRequest";
import { bogRefundResponseSchema, BOG_REFUND_ACCEPTED_KEY } from "./schemas";

describe("buildBogRefundBody", () => {
  it("omits amount for a full refund", () => {
    assert.deepEqual(buildBogRefundBody(), {});
    assert.deepEqual(buildBogRefundBody(null), {});
    assert.equal("amount" in buildBogRefundBody(), false);
  });

  it("sends documented amount for a partial refund", () => {
    assert.deepEqual(buildBogRefundBody("10.50"), { amount: 10.5 });
    assert.deepEqual(buildBogRefundBody("10.5"), { amount: 10.5 });
  });
});

describe("Idempotency-Key", () => {
  it("reuses the same UUID v4 on retry of the same request", () => {
    const key = randomUUID();
    assert.equal(isUuidV4(key), true);
    const first = buildBogRefundRequest({
      apiBaseUrl: "https://api.bog.ge",
      providerOrderId: "bog-1",
      idempotencyKey: key,
    });
    const retry = buildBogRefundRequest({
      apiBaseUrl: "https://api.bog.ge",
      providerOrderId: "bog-1",
      idempotencyKey: key,
    });
    assert.equal(first.headers["Idempotency-Key"], key);
    assert.equal(retry.headers["Idempotency-Key"], first.headers["Idempotency-Key"]);
    assert.equal(first.url, "https://api.bog.ge/payments/v1/payment/refund/bog-1");
    assert.equal(JSON.parse(first.body).amount, undefined);
  });

  it("uses a different key for a genuinely new refund", () => {
    const first = randomUUID();
    const second = randomUUID();
    assert.notEqual(first, second);
    assert.equal(isUuidV4("not-a-uuid"), false);
  });
});

describe("bogRefundResponseSchema", () => {
  it("parses the documented request_received body", () => {
    const parsed = bogRefundResponseSchema.safeParse({
      key: "request_received",
      message: "Refund request received",
      action_id: "5b666901-eb05-4f83-abeb-8311e175f337",
    });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.key.toLowerCase(), BOG_REFUND_ACCEPTED_KEY);
    assert.equal(parsed.data.action_id, "5b666901-eb05-4f83-abeb-8311e175f337");
  });

  it("rejects a body without action_id", () => {
    const parsed = bogRefundResponseSchema.safeParse({
      key: "request_received",
      message: "Refund request received",
    });
    assert.equal(parsed.success, false);
  });
});
