
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, Users } from "lucide-react";

export default function ViewerPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [calls, setCalls] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");
  const [diaRef, setDiaRef] = useState<string>("");

  useEffect(() => {
    // Estabiliza a data de hoje para o filtro
    setDiaRef(format(new Date(), "yyyy-MM-dd"));
  }, []);

  useEffect(() => {
    if (!loading && (!user || role !== "viewer")) {
      router.push("/");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    if (!diaRef) return;

    // Monitorar chamadas em tempo real (Apenas Chamados do Dia)
    const qCalls = query(
      collection(db, "calls"),
      where("diaRef", "==", diaRef),
      where("status", "==", "Chamado"),
      orderBy("dataHoraChamado", "desc")
    );
    
    const unsubCalls = onSnapshot(qCalls, (s) => {
      setCalls(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Erro no listener de chamadas do visitante:", error);
    });

    // Monitorar turmas reais para o filtro
    const qC = query(collection(db, "classes"), orderBy("nome", "asc"));
    const unsubC = onSnapshot(qC, (s) => {
      setClasses(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Erro no listener de turmas do visitante:", error);
    });

    return () => { unsubCalls(); unsubC(); };
  }, [diaRef]);

  if (loading || !user || role !== "viewer") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const filteredCalls = selectedClass === "all" 
    ? calls 
    : calls.filter(c => c.turmaId === selectedClass);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader title="Quadro de Saída Inteligente" />

      <main className="flex-1 container mx-auto px-4 py-10 sm:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-12">
          <div className="space-y-2">
            <h2 className="text-4xl sm:text-5xl font-black text-primary tracking-tight">Próximas Saídas</h2>
            <p className="text-lg text-muted-foreground font-semibold flex items-center gap-2">
              <Clock size={20} className="text-primary/40" />
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 w-full lg:w-auto">
            <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <span className="block text-2xl font-bold text-primary leading-none">{calls.length}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chamados Ativos</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full sm:w-64 h-14 bg-white border-2 rounded-2xl text-lg font-bold shadow-sm focus:ring-primary/20 transition-all">
                  <SelectValue placeholder="Filtrar por Turma" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">Todas as Turmas</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredCalls.length > 0 ? (
            filteredCalls.map((call) => (
              <Card key={call.id} className="premium-card border-t-[10px] border-t-primary animate-in fade-in zoom-in slide-in-from-bottom-8 duration-700">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center text-center space-y-6">
                    <div className="h-24 w-24 rounded-full bg-primary/5 text-primary flex items-center justify-center shadow-inner relative">
                      <User size={48} />
                      <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-green-500 border-4 border-white flex items-center justify-center animate-pulse">
                        <div className="h-2 w-2 rounded-full bg-white"></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black text-primary leading-tight tracking-tight line-clamp-2 min-h-[4rem] flex items-center justify-center">
                        {call.nomeExibicao}
                      </h3>
                      <p className="text-sm font-black text-muted-foreground uppercase tracking-[0.2em]">{call.turmaNome}</p>
                    </div>
                    <div className="w-full h-px bg-border"></div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Horário do Chamado</span>
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <span className="text-4xl font-black tabular-nums">
                          {call.dataHoraChamado ? format(call.dataHoraChamado.toDate(), "HH:mm") : "--:--"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-48 flex flex-col items-center justify-center text-center space-y-8 opacity-40">
              <div className="h-32 w-32 rounded-full bg-secondary flex items-center justify-center">
                <Clock size={64} className="text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-primary">Quadro Livre</h3>
                <p className="text-xl max-w-sm mx-auto">Aguardando as próximas liberações de saída para exibição.</p>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="py-8 border-t bg-white/50 backdrop-blur-md mt-auto">
        <div className="container mx-auto px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-black text-primary/60 uppercase tracking-widest">Conexão SESI Ativa</span>
          </div>
          <div className="hidden sm:block">
            <span className="text-xs font-medium text-muted-foreground">© {new Date().getFullYear()} SESI - Saída Inteligente</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
