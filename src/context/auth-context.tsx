"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  role: "operator" | "viewer" | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"operator" | "viewer" | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserRole = async (supabaseUser: User | null) => {
    if (!supabaseUser) {
      setRole(null);
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
        return;
      }

      const userData = userRow.data || {};
      setRole(userData.role || null);
    } catch (error) {
      console.error("AuthContext: Error fetching user role:", error);
      setRole(null);
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
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);