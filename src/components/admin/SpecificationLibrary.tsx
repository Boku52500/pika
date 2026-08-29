"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { adminCardClass, adminInputClass } from "@/components/admin/adminUi";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import {
  createAdminSpecification,
  createAdminSpecificationValue,
  deleteAdminSpecification,
  deleteAdminSpecificationValue,
  renameAdminSpecification,
  renameAdminSpecificationValue,
} from "@/server/actions/admin";
import type { AdminSpecLibraryRow } from "@/server/admin/specifications";

export function SpecificationLibrary({ initialRows }: { initialRows: AdminSpecLibraryRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [newSpec, setNewSpec] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rename, setRename] = useState<{ kind: "spec" | "value"; id: string; name: string } | null>(null);
  const [remove, setRemove] = useState<{ kind: "spec" | "value"; id: string; name: string } | null>(null);
  const [newValues, setNewValues] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ka");
    if (!needle) return initialRows;
    return initialRows.filter(
      (row) =>
        row.name.toLocaleLowerCase("ka").includes(needle) ||
        row.values.some((value) => value.name.toLocaleLowerCase("ka").includes(needle)),
    );
  }, [initialRows, query]);

  function run(action: () => Promise<{ ok: true } | { ok: false; message: string }>, okMessage: string) {
    setMessage(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setSuccess(okMessage);
      setRename(null);
      setRemove(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {message ? <p role="alert" className="rounded-[var(--radius-sm)] bg-danger-50 px-3 py-2 text-small text-danger-600">{message}</p> : null}
      {success ? <p role="status" className="rounded-[var(--radius-sm)] bg-success-50 px-3 py-2 text-small text-success-600">{success}</p> : null}

      <section className={adminCardClass}>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <FormField id="spec-search" label="ძიება">
            <input id="spec-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="RAM, Processor..." className={adminInputClass} />
          </FormField>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <FormField id="spec-new" label="ახალი სპეციფიკაცია">
            <input id="spec-new" value={newSpec} onChange={(e) => setNewSpec(e.target.value)} placeholder="მაგ: Refresh Rate" className={adminInputClass} />
          </FormField>
          <Button
            type="button"
            disabled={pending || !newSpec.trim()}
            onClick={() =>
              run(async () => {
                const result = await createAdminSpecification({ name: newSpec });
                if (result.ok) setNewSpec("");
                return result;
              }, "სპეციფიკაცია შენახულია")
            }
          >
            დამატება
          </Button>
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="text-small text-text-muted">სპეციფიკაციები ვერ მოიძებნა.</p>
      ) : (
        rows.map((row) => (
          <section key={row.id} className={adminCardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text">{row.name}</h2>
                <p className="text-label mt-1 text-text-faint">
                  {row.usageCount} პროდუქტი · {row.values.length} მნიშვნელობა
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setRename({ kind: "spec", id: row.id, name: row.name })}>
                  სახელის შეცვლა
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={row.usageCount > 0}
                  onClick={() => setRemove({ kind: "spec", id: row.id, name: row.name })}
                >
                  წაშლა
                </Button>
              </div>
            </div>

            <ul className="mt-4 divide-y divide-border">
              {row.values.map((value) => (
                <li key={value.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-small">
                    {value.name}
                    <span className="text-label ml-2 text-text-faint">{value.usageCount} პროდუქტი</span>
                  </span>
                  <div className="flex gap-2">
                    <button type="button" className="text-small font-medium text-brand-700" onClick={() => setRename({ kind: "value", id: value.id, name: value.name })}>
                      სახელის შეცვლა
                    </button>
                    <button
                      type="button"
                      className="text-small font-medium text-danger-600 disabled:text-text-faint"
                      disabled={value.usageCount > 0}
                      onClick={() => setRemove({ kind: "value", id: value.id, name: value.name })}
                    >
                      წაშლა
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <FormField id={`val-new-${row.id}`} label="ახალი მნიშვნელობა">
                <input
                  id={`val-new-${row.id}`}
                  value={newValues[row.id] ?? ""}
                  onChange={(e) => setNewValues((current) => ({ ...current, [row.id]: e.target.value }))}
                  placeholder="მაგ: 16GB"
                  className={adminInputClass}
                />
              </FormField>
              <Button
                type="button"
                variant="secondary"
                disabled={pending || !(newValues[row.id] ?? "").trim()}
                onClick={() =>
                  run(async () => {
                    const result = await createAdminSpecificationValue({ specificationId: row.id, name: newValues[row.id] ?? "" });
                    if (result.ok) setNewValues((current) => ({ ...current, [row.id]: "" }));
                    return result;
                  }, "მნიშვნელობა შენახულია")
                }
              >
                მნიშვნელობის დამატება
              </Button>
            </div>
          </section>
        ))
      )}

      <AdminConfirmDialog
        open={Boolean(rename)}
        title={rename?.kind === "spec" ? "სპეციფიკაციის სახელი" : "მნიშვნელობის სახელი"}
        description="ცვლილება გამოჩნდება ყველა პროდუქტზე, სადაც ეს ჩანაწერი გამოიყენება."
        confirmLabel="შენახვა"
        pending={pending}
        onClose={() => setRename(null)}
        onConfirm={() => {
          if (!rename) return;
          run(async () => {
            return rename.kind === "spec"
              ? renameAdminSpecification({ id: rename.id, name: rename.name })
              : renameAdminSpecificationValue({ id: rename.id, name: rename.name });
          }, "შენახულია");
        }}
      >
        <input
          value={rename?.name ?? ""}
          onChange={(e) => setRename((current) => (current ? { ...current, name: e.target.value } : current))}
          className={adminInputClass}
        />
      </AdminConfirmDialog>

      <AdminConfirmDialog
        open={Boolean(remove)}
        title="წაშლა"
        description={
          remove?.kind === "spec"
            ? "სპეციფიკაცია წაიშლება მხოლოდ თუ არც ერთ პროდუქტზე არ გამოიყენება."
            : "მნიშვნელობა წაიშლება მხოლოდ თუ არც ერთ პროდუქტზე არ გამოიყენება."
        }
        confirmLabel="წაშლა"
        danger
        pending={pending}
        onClose={() => setRemove(null)}
        onConfirm={() => {
          if (!remove) return;
          run(async () => {
            return remove.kind === "spec"
              ? deleteAdminSpecification({ id: remove.id })
              : deleteAdminSpecificationValue({ id: remove.id });
          }, "წაიშალა");
        }}
      />
    </div>
  );
}
