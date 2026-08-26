"use client";

import { useCallback, useEffect, useMemo } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { registerCustomer } from "@/server/actions/auth";
import { changeCustomerPassword, updateCustomerProfile } from "@/server/actions/profile";
import { GENERIC_LOGIN_ERROR } from "@/server/actions/result";
import { resetWishlistSync } from "@/lib/wishlistSync";
import type { PublicCustomer } from "@/types/account";

export type RegisterInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type AuthResult = { ok: true } | { ok: false; message: string };

const NOT_LOGGED_IN: AuthResult = { ok: false, message: "საჭიროა ავტორიზაცია" };

/**
 * Session-backed customer identity for header, account, and checkout.
 * Mutations go through server actions; Auth.js owns the cookie session.
 */
export function useAuth() {
  const { data, status, update } = useSession();

  const customer = useMemo<PublicCustomer | null>(() => {
    if (!data?.user?.id) return null;
    return {
      id: data.user.id,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      phone: data.user.phone ?? "",
      email: data.user.email ?? "",
    };
  }, [data]);

  // Prefer the session payload over Auth.js `status`. During hydration the
  // provider can still report `loading` even when `layout` already passed a
  // real session — gating on `authenticated` would render the logged-out
  // header on the client and mismatch the server tree.
  const isLoggedIn = customer !== null;

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthResult> => {
      const created = await registerCustomer(input);
      if (!created.ok) return created;
      const signedIn = await loginWithCredentials(input.email, input.password);
      if (signedIn.ok) await update();
      return signedIn;
    },
    [update],
  );

  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const signedIn = await loginWithCredentials(email, password);
      if (signedIn.ok) await update();
      return signedIn;
    },
    [update],
  );

  const logout = useCallback(async () => {
    resetWishlistSync();
    await signOut({ callbackUrl: "/" });
  }, []);

  const updateProfile = useCallback(
    async (patch: { firstName: string; lastName: string; phone: string }): Promise<AuthResult> => {
      if (!customer) return NOT_LOGGED_IN;
      const result = await updateCustomerProfile(patch);
      if (!result.ok) return result;
      await update({
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        phone: result.data.phone,
      });
      return { ok: true };
    },
    [customer, update],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmNewPassword: string): Promise<AuthResult> => {
      if (!customer) return NOT_LOGGED_IN;
      return changeCustomerPassword({ currentPassword, newPassword, confirmNewPassword });
    },
    [customer],
  );

  useEffect(() => {
    if (status === "unauthenticated") resetWishlistSync();
  }, [status]);

  return {
    customer,
    isLoggedIn,
    isLoading: status === "loading",
    register,
    login,
    logout,
    updateProfile,
    changePassword,
  };
}

async function loginWithCredentials(email: string, password: string): Promise<AuthResult> {
  const result = await signIn("credentials", { email, password, redirect: false });
  if (!result || result.error) {
    return { ok: false, message: GENERIC_LOGIN_ERROR };
  }
  return { ok: true };
}
