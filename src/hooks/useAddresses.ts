"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createAddress,
  deleteAddress,
  listMyAddresses,
  setDefaultAddress,
  updateAddress,
} from "@/server/actions/addresses";
import type { SavedAddress } from "@/types/account";
import { useAuth } from "./useAuth";

export function useAddresses(initial: SavedAddress[] = []) {
  const { isLoggedIn } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>(initial);
  const [ready, setReady] = useState(initial.length > 0);

  const reload = useCallback(async () => {
    if (!isLoggedIn) return;
    const rows = await listMyAddresses();
    setAddresses(rows);
    setReady(true);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    void listMyAddresses().then((rows) => {
      if (cancelled) return;
      setAddresses(rows);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const defaultAddress = useMemo(() => addresses.find((row) => row.isDefault) ?? null, [addresses]);

  const addAddress = useCallback(
    async (data: Omit<SavedAddress, "id" | "customerId" | "isDefault">) => {
      const result = await createAddress(data);
      if (result.ok) await reload();
      return result;
    },
    [reload],
  );

  const updateSavedAddress = useCallback(
    async (id: string, patch: Omit<SavedAddress, "id" | "customerId" | "isDefault"> & { isDefault?: boolean }) => {
      const result = await updateAddress(id, patch);
      if (result.ok) await reload();
      return result;
    },
    [reload],
  );

  const removeAddress = useCallback(
    async (id: string) => {
      const result = await deleteAddress(id);
      if (result.ok) await reload();
      return result;
    },
    [reload],
  );

  const makeDefault = useCallback(
    async (id: string) => {
      const result = await setDefaultAddress(id);
      if (result.ok) await reload();
      return result;
    },
    [reload],
  );

  return {
    addresses,
    defaultAddress,
    ready,
    addAddress,
    updateAddress: updateSavedAddress,
    removeAddress,
    setDefaultAddress: makeDefault,
  };
}
