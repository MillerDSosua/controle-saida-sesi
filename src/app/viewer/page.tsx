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
import { Clock, User, Filter } from "lucide-react";

export default function ViewerPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [calls, setCalls] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("all");

  const diaRef = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!loading && (!user || role !== "viewer")) {
      router.push("/");
    }
  }, [user, role, loading, router]);

  useEffect(() => {
    const qCalls = query(
      collection(db, "calls"),
      where("diaRef", "==", diaRef),
      where("status", "==", "Chamado"),
      orderBy("dataHoraChamado", "desc")
    );
    const unsubCalls = onSnapshot(qCalls, (s) => {
      setCalls(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qC = query(collection(db, "classes"), orderBy("nome", "asc"));
    const unsubC = onSnapshot(qC, (s) => setClasses(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubCalls(); unsubC(); };
  }, [diaRef]);

  if (loading || !user || role !== "viewer") {
    return null;
  }

  const filteredCalls = selectedClass === "all" ? calls : calls.filter(c => c.turmaId === selectedClass);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader title="Quadro de Saída" />

      <main className="flex-1 container mx-auto px-4 py-8 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-primary tracking-tight">Alunos Chamados</h2>
            <p className="text-muted-foreground font-medium">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter size={20} className="text-muted-foreground hidden sm:block" />
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full md:w-64 h-12 apple-blur border-2">
                <SelectValue placeholder="Todas as Turmas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Turmas</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCalls.length > 0 ? (
            filteredCalls.map((call) => (
              <Card key={call.id} className="premium-card border-t-8 border-t-accent animate-in fade-in slide-in-from-top-4 duration-500">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-full bg-accent/10 text-accent flex items-center justify-center shadow-inner">
                      <User size={40} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-primary leading-tight">{call.nomeExibicao}</h3>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mt-1">{call.turmaNome}</p>
                    </div>
                    <div className="w-full h-px bg-border my-2"></div>
                    <div className="flex items-center gap-2 text-primary/80 font-medium">
                      <Clock size={18} />
                      <span className="text-2xl font-bold tabular-nums">
                        {call.dataHoraChamado ? format(call.dataHoraChamado.toDate(), "HH:mm") : "--:--"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-40 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center">
                <Clock size={48} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold">Nenhum aluno chamado</h3>
                <p>Aguardando liberações da secretaria...</p>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <footer className="py-6 border-t apple-blur mt-auto">
        <div className="container mx-auto px-6 flex justify-center items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Atualização em Tempo Real Ativa</span>
          </div>
        </div>
      </footer>
    </div>
  );
}