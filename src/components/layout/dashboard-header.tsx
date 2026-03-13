"use client";

import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { LogOut, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DashboardHeader({ title }: { title: string }) {
  const { user, role } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-primary/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white shadow-inner border border-white/10 group hover:scale-105 transition-transform">
            <GraduationCap
              size={22}
              className="transition-transform duration-300 group-hover:-rotate-12"
            />
          </div>

          <div className="hidden sm:block">
            <h1 className="text-lg font-black tracking-tighter text-white leading-none">
              {title}
            </h1>
            <Badge
              variant="secondary"
              className="bg-white/15 text-white border-none px-2 py-0 h-4 text-[8px] uppercase font-black tracking-widest mt-1"
            >
              {role === "operator" ? "Modo Operador" : "Visualização"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-xs font-bold text-white tracking-tight">
              {user?.email}
            </span>
            <span className="text-[8px] text-white/50 font-black uppercase tracking-[0.2em]">
              {role === "operator" ? "Administrativo" : "Visitante"}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="rounded-lg h-9 w-9 bg-white/10 text-white hover:bg-red-500 hover:text-white transition-all duration-300 border border-white/5"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
}