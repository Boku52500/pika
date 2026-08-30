import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planProductSpecifications } from "./adminProductSpecs";

describe("planProductSpecifications", () => {
  it("keeps complete rows and ignores blank rows", () => {
    const plan = planProductSpecifications([
      { specificationId: "", specificationName: "", value: "" },
      { specificationId: "ram", specificationName: "RAM", value: "16GB" },
      { specificationId: "", specificationName: "", value: "   " },
    ]);
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.clearAll, false);
    assert.deepEqual(plan.rows, [{ specificationId: "ram", specificationName: "RAM", value: "16GB" }]);
  });

  it("rejects incomplete rows instead of silently dropping them", () => {
    const missingValue = planProductSpecifications([
      { specificationId: "ram", specificationName: "RAM", value: "" },
    ]);
    assert.equal(missingValue.ok, false);

    const missingName = planProductSpecifications([{ specificationId: "", specificationName: "", value: "16GB" }]);
    assert.equal(missingName.ok, false);
  });

  it("allows intentionally clearing all specs", () => {
    const plan = planProductSpecifications([]);
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.clearAll, true);
    assert.equal(plan.rows.length, 0);
  });

  it("dedupes the same specification id and keeps the last value", () => {
    const plan = planProductSpecifications([
      { specificationId: "ram", specificationName: "RAM", value: "8GB" },
      { specificationId: "ram", specificationName: "RAM", value: "16GB" },
    ]);
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.rows.length, 1);
    assert.equal(plan.rows[0]?.value, "16GB");
  });
});
