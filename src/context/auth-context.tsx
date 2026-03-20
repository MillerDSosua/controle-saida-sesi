"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type AppRole = "operator" | "viewer";

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  roles: AppRole[];
  activeRole: AppRole | null;
  setActiveRole: (role: AppRole) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  roles: [],
  activeRole: null,
  setActiveRole: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const setActiveRole = (nextRole: AppRole) => {
    setActiveRoleState(nextRole);
    localStorage.setItem("activeRole", nextRole);
  };

  const loadUserRole = async (supabaseUser: User | null) => {
    if (!supabaseUser) {
      setRole(null);
      setRoles([]);
      setActiveRoleState(null);
      return;
    }

    try {
      const { data: userRow, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", supabaseUser.id)
        .single();

      if (error || !userRow) {
        console.warn("AuthContext: User document not found for UID:", supabaseUser.id);
        setRole(null);
        setRoles([]);
        setActiveRoleState(null);
        return;
      }

      const userData = userRow.data || {};

      const dbRole = (userData.role as AppRole) || null;

      const dbRoles = Array.isArray(userData.roles)
        ? userData.roles.filter(
            (item: unknown): item is AppRole =>
              item === "operator" || item === "viewer"
          )
        : dbRole
        ? [dbRole]
        : [];

      setRole(dbRole);
      setRoles(dbRoles);

      const savedRole =
        typeof window !== "undefined"
          ? (localStorage.getItem("activeRole") as AppRole | null)
          : null;

      const nextActiveRole =
        savedRole && dbRoles.includes(savedRole)
          ? savedRole
          : dbRole && dbRoles.includes(dbRole)
          ? dbRole
          : dbRoles[0] ?? null;

      setActiveRoleState(nextActiveRole);
    } catch (error) {
      console.error("AuthContext: Error fetching user role:", error);
      setRole(null);
      setRoles([]);
      setActiveRoleState(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user ?? null;

      if (!mounted) return;

      setUser(sessionUser);
      await loadUserRole(sessionUser);

      if (mounted) setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;

      if (!mounted) return;

      setUser(sessionUser);
      await loadUserRole(sessionUser);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        roles,
        activeRole,
        setActiveRole,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);