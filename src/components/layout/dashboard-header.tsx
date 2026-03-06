"use client";

import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LogOut, GraduationCap, ShieldCheck, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DashboardHeader({ title }: { title: string }) {
  const { user, role } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header className="sticky top-0 z-40 w-full gradient-primary shadow-lg">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md shadow-inner border border-white/10">
            <GraduationCap size={28} />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl flex items-center gap-2">
              {title}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none px-3 py-0.5 h-auto text-[10px] uppercase font-black tracking-widest">
                {role === "operator" ? (
                  <span className="flex items-center gap-1.5"><ShieldCheck size={10} /> Operador</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Eye size={10} /> Visitante</span>
                )}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-white/90">{user?.email}</span>
            <span className="text-[10px] text-white/60 font-medium">{role === 'operator' ? 'Acesso Administrativo' : 'Modo Visualização'}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="rounded-xl h-12 w-12 bg-white/10 text-white hover:bg-red-500/80 hover:text-white transition-all duration-300 border border-white/5"
          >
            <LogOut size={22} />
          </Button>
        </div>
      </div>
    </header>
  );
}