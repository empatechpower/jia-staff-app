import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, SessionExpiredError, TOKEN_KEY, USER_ID_KEY } from "./api";

type AuthState = {
  loading: boolean;
  signedIn: boolean;
  staffId: string;
  email: string;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Resolves the Employee record id for the signed-in user (same chain the web app uses).
async function resolveStaffId(): Promise<string> {
  const me: any = await api.user.me();
  const userId: string = me?.response?._id ?? me?.response?.user?._id ?? "";
  if (!userId) return "";
  const emp: any = await api.user.employeeId(userId);
  return emp?.response?.employee_id ?? "";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, signedIn: false, staffId: "", email: "" });

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const email = (await SecureStore.getItemAsync("jia_email")) ?? "";
      if (!token) {
        setState({ loading: false, signedIn: false, staffId: "", email: "" });
        return;
      }
      try {
        const staffId = await resolveStaffId();
        setState({ loading: false, signedIn: true, staffId, email });
      } catch (e) {
        if (e instanceof SessionExpiredError) await clearSession();
        setState({ loading: false, signedIn: false, staffId: "", email: "" });
      }
    })();
  }, []);

  async function clearSession() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_ID_KEY);
    await SecureStore.deleteItemAsync("jia_email");
  }

  async function signIn(email: string, password: string) {
    const res: any = await api.auth.login(email, password);
    const data = res?.response;
    if (!data?.token) throw new Error("Login failed");
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(USER_ID_KEY, String(data.user_id ?? ""));
    await SecureStore.setItemAsync("jia_email", email);
    const staffId = await resolveStaffId();
    setState({ loading: false, signedIn: true, staffId, email });
  }

  async function signOut() {
    await clearSession();
    setState({ loading: false, signedIn: false, staffId: "", email: "" });
  }

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
