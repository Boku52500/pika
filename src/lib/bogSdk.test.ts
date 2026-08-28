import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOG_WEBSTATIC_ORIGIN,
  bogCalculatorCspSources,
  bogCalculatorScriptUrl,
  bogCalculatorUserMessage,
} from "./bogSdk";
describe("bogCalculatorUserMessage", () => {
  it("does not show the internal SDK error until load has actually failed", () => {
    assert.equal(
      bogCalculatorUserMessage(new Error("BOG calculator is unavailable")),
      "საქართველოს ბანკის კალკულატორი ვერ ჩაიტვირთა. სცადეთ თავიდან.",
    );
    assert.equal(
      bogCalculatorUserMessage(new Error("BOG SDK failed")),
      "საქართველოს ბანკის კალკულატორი ვერ ჩაიტვირთა. სცადეთ თავიდან.",
    );
  });
});

describe("bogCalculatorScriptUrl", () => {
  it("builds the documented version=2 SDK URL with client_id and no secret", () => {
    const url = new URL(bogCalculatorScriptUrl("example-client"));
    assert.equal(url.origin, BOG_WEBSTATIC_ORIGIN);
    assert.equal(url.pathname, "/bog-sdk/bog-sdk.js");
    assert.equal(url.searchParams.get("version"), "2");
    assert.equal(url.searchParams.get("client_id"), "example-client");
    assert.equal(url.searchParams.has("client_secret"), false);
    assert.doesNotMatch(url.href, /secret/i);
  });
});

describe("bogCalculatorCspSources", () => {
  it("allows the official SDK host on script-src so the calculator can execute", () => {
    const csp = bogCalculatorCspSources();
    assert.equal(csp.scriptSrc.includes(BOG_WEBSTATIC_ORIGIN), true);
    assert.equal(csp.frameSrc.includes(BOG_WEBSTATIC_ORIGIN), true);
    assert.equal(csp.connectSrc.includes(BOG_WEBSTATIC_ORIGIN), true);
  });
});
