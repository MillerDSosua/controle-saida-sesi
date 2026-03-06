"use client";

import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LogOut, User, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DashboardHeader({ title }: { title: string }) {
  const { user, role } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <header className="sticky top-0 z-40 w-full apple-blur border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-primary sm:text-xl">
              {title}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold h-4">
                {role === "operator" ? "Operador" : "Visitante"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-medium">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="rounded-full hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </div>
    </header>
  );
}