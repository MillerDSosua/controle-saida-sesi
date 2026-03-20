"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, LogOut, Monitor, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type AppRole = "operator" | "viewer";

function roleLabel(role: AppRole) {
  return role === "operator" ? "Modo Operador" : "Modo Visualizador";
}

export function DashboardHeader() {
  const router = useRouter();
  const { user, roles, activeRole, setActiveRole, loading } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);

  const canSwitchRole = roles.length > 1;

  const sortedRoles = useMemo(() => {
    const order: AppRole[] = ["operator", "viewer"];
    return [...roles].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [roles]);

  const handleRoleChange = async (nextRole: AppRole) => {
    if (nextRole === activeRole || isSwitching) return;

    setIsSwitching(true);

    try {
      setActiveRole(nextRole);

      if (nextRole === "operator") {
        router.push("/operator");
      } else {
        router.push("/viewer");
      }

      router.refresh();
    } finally {
      setTimeout(() => setIsSwitching(false), 250);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const emailLabel = user?.email ?? "Usuário";
  const currentBadge =
    activeRole === "operator"
      ? "ADMINISTRATIVO"
      : activeRole === "viewer"
      ? "VISUALIZADOR"
      : "ACESSO";

  const displayRole = activeRole ?? sortedRoles[0] ?? null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-primary text-primary-foreground shadow-sm">
      <div className="relative flex h-20 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 shadow-inner">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-black md:text-2xl">
              Controle de Saída SESI
            </h1>

            <div className="mt-1">
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                {displayRole === "operator"
                  ? "Modo Operador"
                  : displayRole === "viewer"
                  ? "Modo Visualizador"
                  : "Modo de Acesso"}
              </span>
            </div>
          </div>
        </div>

        {!loading && canSwitchRole && (
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex">
            <div className="inline-flex items-center rounded-2xl border border-white/15 bg-white/10 p-1 shadow-lg backdrop-blur">
              {sortedRoles.map((role) => {
                const isActive = displayRole === role;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleChange(role)}
                    disabled={isSwitching}
                    className={cn(
                      "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-all",
                      "disabled:cursor-not-allowed disabled:opacity-70",
                      isActive
                        ? "bg-white text-primary shadow"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {role === "operator" ? (
                      <Monitor className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {roleLabel(role)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="max-w-[220px] truncate text-sm font-bold">
              {emailLabel}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/75">
              {currentBadge}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-11 w-11 rounded-2xl bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {!loading && canSwitchRole && (
        <div className="border-t border-white/10 px-4 pb-3 pt-3 md:hidden">
          <div className="grid grid-cols-2 gap-2">
            {sortedRoles.map((role) => {
              const isActive = displayRole === role;

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  disabled={isSwitching}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-all",
                    isActive
                      ? "bg-white text-primary shadow"
                      : "bg-white/10 text-white hover:bg-white/15"
                  )}
                >
                  {role === "operator" ? (
                    <Monitor className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {role === "operator" ? "Operador" : "Visualizador"}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}