"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log("[Home] Nenhum usuário autenticado. Redirecionando para login.");
        router.push("/login");
      } else if (role === "operator") {
        console.log("[Home] Usuário operador detectado. Redirecionando para /operator.");
        router.push("/operator");
      } else if (role === "viewer") {
        console.log("[Home] Usuário visitante detectado. Redirecionando para /viewer.");
        router.push("/viewer");
      } else {
        console.log("[Home] Usuário autenticado mas sem role definida. Redirecionando para login.");
        router.push("/login");
      }
    }
  }, [user, role, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  );
}