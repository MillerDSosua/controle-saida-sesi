"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, "users", userCredential.user.uid);
      const userSnap = await getDoc(userRef);
  
      if (!userSnap.exists()) {
        throw new Error("ROLE_NOT_FOUND");
      }
  
      const userData = userSnap.data();
      
      toast({
        title: "Acesso Autorizado",
        description: "Bem-vindo ao sistema SESI.",
      });
  
      if (userData.role === "operator") {
        router.push("/operator");
      } else if (userData.role === "viewer") {
        router.push("/viewer");
      } else {
        throw new Error("INVALID_ROLE");
      }
  
    } catch (error: any) {
      let title = "Erro de Acesso";
      let description = "Verifique suas credenciais.";
  
      if (error?.code === "auth/invalid-credential") {
        description = "E-mail ou senha inválidos.";
      } else if (error?.message === "ROLE_NOT_FOUND") {
        title = "Conta não configurada";
        description = "Sua conta não possui permissões atribuídas.";
      }
  
      toast({
        variant: "destructive",
        title,
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-[420px] space-y-12 animate-in fade-in zoom-in duration-700">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] gradient-primary text-white shadow-2xl shadow-primary/40 rotate-3">
            <GraduationCap size={48} />
          </div>
          <div className="space-y-1">
            <h1 className="text-5xl font-black tracking-tighter text-primary">SESI</h1>
            <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-xs">Saída Inteligente</p>
          </div>
        </div>

        <Card className="premium-card border-none shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-10 pt-12">
            <CardTitle className="text-2xl font-black flex items-center justify-center gap-2">
              <ShieldCheck className="text-primary" size={24} /> Login Seguro
            </CardTitle>
            <CardDescription className="text-sm font-medium">Controle de acesso restrito</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail Corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@fiemg.com.br"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 bg-secondary/50 border-none rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-lg"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Senha de Acesso</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 bg-secondary/50 border-none rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20 transition-all text-lg"
                />
              </div>
              <Button type="submit" className="w-full h-16 text-lg font-black gradient-primary rounded-2xl shadow-xl shadow-primary/30 hover:scale-[1.02] transition-transform" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-3 border-white border-t-transparent"></span>
                    Autenticando...
                  </span>
                ) : (
                  "Entrar no Sistema"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-6 pb-12 pt-6">
            <div className="w-full h-px bg-border/50"></div>
            <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest leading-relaxed">
              Problemas com o acesso?<br />
              Contate o <a href="mailto:suporte@fiemg.com.br" className="text-primary hover:underline">Administrador de TI</a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}