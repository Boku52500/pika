"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_COMBOBOX_OPEN_STACK_CLASS, adminInputClass } from "@/components/admin/adminUi";
import { reusableIdentityKey } from "@/lib/reusableLabel";

export type CreatableOption = { id: string; label: string };

export function AdminCreatableCombobox({
  id,
  valueId,
  options,
  placeholder,
  disabled,
  createLabel,
  onSelect,
  onCreate,
}: {
  id?: string;
  valueId: string;
  options: CreatableOption[];
  placeholder: string;
  disabled?: boolean;
  createLabel?: (query: string) => string;
  onSelect: (option: CreatableOption | null) => void;
  onCreate: (label: string) => Promise<CreatableOption | null>;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === valueId) ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [active, setActive] = useState(0);
  const [flipUp, setFlipUp] = useState(false);
  const display = open ? query : (selected?.label ?? query);

  function openMenu(target?: HTMLElement | null) {
    const el = target ?? rootRef.current?.querySelector("input");
    if (el) {
      const rect = el.getBoundingClientRect();
      setFlipUp(window.innerHeight - rect.bottom < 240);
    }
    setOpen(true);
  }

  const filtered = useMemo(() => {
    const needle = reusableIdentityKey(query);
    if (!needle) return options.slice(0, 12);
    return options.filter((option) => reusableIdentityKey(option.label).includes(needle)).slice(0, 12);
  }, [options, query]);

  const exact = filtered.some((option) => reusableIdentityKey(option.label) === reusableIdentityKey(query));
  const canCreate = Boolean(query.trim()) && !exact && !pending;
  const items = canCreate ? [...filtered, { id: "__create__", label: query.trim() }] : filtered;

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function choose(option: CreatableOption) {
    if (option.id === "__create__") {
      setPending(true);
      const created = await onCreate(option.label);
      setPending(false);
      if (!created) return;
      onSelect(created);
      setQuery(created.label);
      setOpen(false);
      return;
    }
    onSelect(option);
    setQuery(option.label);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={open ? `${ADMIN_COMBOBOX_OPEN_STACK_CLASS} scroll-mb-36` : "relative scroll-mb-36"}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled || pending}
        value={display}
        placeholder={placeholder}
        onFocus={(event) => {
          setQuery(selected?.label ?? "");
          openMenu(event.currentTarget);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          openMenu(event.currentTarget);
          setActive(0);
          if (!event.target.value.trim()) onSelect(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openMenu(event.currentTarget);
            setActive((index) => Math.min(index + 1, Math.max(items.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
          } else if (event.key === "Enter" && open && items[active]) {
            event.preventDefault();
            void choose(items[active]);
          }
        }}
        className={adminInputClass}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-30 max-h-56 w-full overflow-y-auto rounded-[var(--radius-sm)] border border-border bg-surface shadow-md",
            flipUp ? "bottom-full mb-1" : "mt-1",
          )}
        >
          {items.length === 0 ? (
            <li className="px-3 py-2 text-small text-text-muted">ჩანაწერი ვერ მოიძებნა</li>
          ) : (
            items.map((option, index) => (
              <li key={`${option.id}-${option.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={cn(
                    "flex w-full px-3 py-2 text-left text-small",
                    index === active ? "bg-brand-50 text-brand-800" : "text-text hover:bg-surface-2",
                  )}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => void choose(option)}
                >
                  {option.id === "__create__" ? (createLabel ? createLabel(option.label) : `+ დამატება „${option.label}“`) : option.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
