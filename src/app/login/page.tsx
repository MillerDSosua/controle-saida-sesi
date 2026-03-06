"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Sucesso",
        description: "Bem-vindo de volta!",
      });
      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na autenticação",
        description: "Verifique suas credenciais e tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-headline font-bold tracking-tight text-primary">SESI</h1>
          <p className="text-muted-foreground font-medium">Controle de Saída Inteligente</p>
        </div>

        <Card className="premium-card overflow-hidden">
          <CardHeader className="space-y-1 text-center pb-8 pt-10">
            <CardTitle className="text-2xl font-semibold">Portal de Acesso Seguro</CardTitle>
            <CardDescription>Insira suas credenciais para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@fiemg.com.br"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/50 focus:bg-background transition-colors"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary/50 focus:bg-background transition-colors"
                />
              </div>
              <Button type="submit" className="w-full py-6 text-lg font-medium shadow-md shadow-primary/20" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Entrando...
                  </span>
                ) : (
                  "Acessar Sistema"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pb-10 pt-4">
            <p className="text-xs text-center text-muted-foreground">
              Precisa de ajuda? Entre em contato com o{" "}
              <a href="mailto:m.daniel@fiemg.com.br" className="text-primary font-semibold hover:underline">
                administrador
              </a>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}