import { reusableIdentityKey } from "@/lib/reusableLabel";

export type AdminProductSpecInput = {
  specificationId?: string;
  specificationName?: string;
  valueId?: string;
  value?: string;
};

export type PreparedProductSpec = {
  specificationId: string;
  specificationName: string;
  value: string;
};

export type ProductSpecPlan =
  | { ok: true; rows: PreparedProductSpec[]; clearAll: boolean }
  | { ok: false; message: string };

/**
 * Normalize editor specification rows before DB writes.
 * - Blank rows are ignored.
 * - Incomplete rows (name/id without value, or value without name/id) fail loudly
 *   so save never silently shrinks the resolved set and wipe other specs.
 * - Duplicate specification ids keep the last value.
 */
export function planProductSpecifications(inputs: AdminProductSpecInput[]): ProductSpecPlan {
  const prepared: PreparedProductSpec[] = [];
  const seen = new Map<string, number>();

  for (const [index, spec] of inputs.entries()) {
    const value = (spec.value ?? "").trim();
    const specificationId = (spec.specificationId ?? "").trim();
    const specificationName = (spec.specificationName ?? "").trim();
    const blank = !specificationId && !specificationName && !value;
    if (blank) continue;

    if (!value || (!specificationId && !specificationName)) {
      return {
        ok: false,
        message: `სპეციფიკაცია #${index + 1} არასრულია — აირჩიეთ დასახელება და მნიშვნელობა, ან წაშალეთ ცარიელი რიგი.`,
      };
    }

    const row: PreparedProductSpec = {
      specificationId,
      specificationName,
      value,
    };

    if (specificationId) {
      const prior = seen.get(specificationId);
      if (prior != null) {
        prepared[prior] = row;
        continue;
      }
      seen.set(specificationId, prepared.length);
    } else {
      const key = reusableIdentityKey(specificationName);
      const prior = [...seen.entries()].find(([id]) => id.startsWith(`name:${key}`))?.[1];
      if (prior != null) {
        prepared[prior] = row;
        continue;
      }
      seen.set(`name:${key}`, prepared.length);
    }

    prepared.push(row);
  }

  return { ok: true, rows: prepared, clearAll: prepared.length === 0 };
}
