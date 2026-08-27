import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { interpretResendResponse, notConfiguredResult } from "./providerResult";

describe("provider results", () => {
  it("does not treat missing config as a successful send", () => {
    const result = notConfiguredResult();
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.reason, "not_configured");
  });

  it("persists the Resend message id on success", () => {
    const result = interpretResendResponse({ data: { id: "msg-1" }, error: null }, "buyer@example.com");
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("unreachable");
    assert.equal(result.messageId, "msg-1");
  });

  it("normalizes provider rejection without inventing success", () => {
    const result = interpretResendResponse({ data: null, error: { message: "rate limited" } }, "buyer@example.com");
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("unreachable");
    assert.equal(result.reason, "provider");
    assert.equal(result.message, "rate limited");
  });
});
