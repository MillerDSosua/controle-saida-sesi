
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, where } from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User as UserIcon, Users, Bus, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";

export default function ViewerPage() {
  const { user, role, loading } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState("all");
  const [diaRef, setDiaRef] = useState<string | null>(null);

  // Estabiliza a data de referência no lado do cliente para evitar erros de hidratação
  useEffect(() => {
    setDiaRef(format(new Date(), "yyyy-MM-dd"));
  }, []);

  useEffect(() => {
    if (!loading && (!user || role !== "viewer")) {
      router.push("/");
    }
  }, [user, role, loading, router]);

  // Query memoizada. 
  // NOTA: Removemos o orderBy para evitar a necessidade de Índice Composto no Firestore.
  // A ordenação será feita em memória para garantir funcionamento imediato.
  const callsQuery = useMemoFirebase(() => {
    if (!firestore || !diaRef) return null;
    return query(
      collection(firestore, "calls"),
      where("diaRef", "==", diaRef),
      where("status", "==", "Chamado")
    );
  }, [firestore, diaRef]);

  // Query para a lista de turmas (filtros)
  const classesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "classes"));
  }, [firestore]);

  const { data: calls, isLoading: callsLoading, error: callsError } = useCollection(callsQuery);
  const { data: classes } = useCollection(classesQuery);

  // Lógica de filtragem e ordenação local
  const processedCalls = useMemo(() => {
    if (!calls) return [];

    const filtered = calls.filter(call => {
      if (selectedClass === "all") return true;
      if (call.tipo === "escolar") {
        return call.turmasRelacionadas?.includes(selectedClass);
      }
      return call.turmaId === selectedClass;
    });

    // Ordenação manual por dataHoraChamado desc
    return [...filtered].sort((a, b) => {
      const timeA = a.dataHoraChamado?.toMillis?.() || 0;
      const timeB = b.dataHoraChamado?.toMillis?.() || 0;
      return timeB - timeA;
    });
  }, [calls, selectedClass]);

  if (loading || !user || role !== "viewer" || !diaRef) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

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
            <div className="flex items-center gap-3 bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <span className="block text-2xl font-bold text-primary leading-none">{processedCalls.length}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chamados</span>
              </div>
            </div>

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full sm:w-64 h-14 bg-white border-2 rounded-2xl text-lg font-bold shadow-sm focus:ring-primary/20 transition-all">
                <SelectValue placeholder="Filtrar por Turma" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">Todas as Turmas</SelectItem>
                {(classes || []).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {callsError && (
          <div className="mb-8 p-6 bg-red-50 text-red-600 rounded-2xl border-2 border-red-100 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} />
              <p className="font-bold text-lg">Erro ao carregar chamadas em tempo real.</p>
            </div>
            <p className="text-sm opacity-80">Por favor, verifique sua conexão ou contate o administrador de TI.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {callsLoading ? (
            <div className="col-span-full py-24 flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
            </div>
          ) : processedCalls.length > 0 ? (
            processedCalls.map((call) => (
              <Card 
                key={call.id} 
                className={cn(
                  "premium-card border-t-[10px] animate-in fade-in zoom-in slide-in-from-bottom-8 duration-700 h-[320px]",
                  call.tipo === 'escolar' ? "border-t-orange-500 bg-orange-50/10" : "border-t-primary"
                )}
              >
                <CardContent className="p-8 flex flex-col items-center text-center justify-between h-full">
                  <div className="space-y-6 flex flex-col items-center w-full">
                    <div className={cn(
                      "h-20 w-20 rounded-full flex items-center justify-center shadow-inner relative",
                      call.tipo === 'escolar' ? "bg-orange-100 text-orange-600" : "bg-primary/5 text-primary"
                    )}>
                      {call.tipo === 'escolar' ? <Bus size={40} /> : <UserIcon size={40} />}
                      <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-green-500 border-4 border-white flex items-center justify-center animate-pulse">
                        <div className="h-2 w-2 rounded-full bg-white"></div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 w-full">
                      <h3 className={cn(
                        "text-xl font-black leading-tight tracking-tight line-clamp-2 min-h-[3rem] flex items-center justify-center",
                        call.tipo === 'escolar' ? "text-orange-700" : "text-primary"
                      )}>
                        {call.tipo === 'escolar' ? call.escolarNome : call.nomeExibicao}
                      </h3>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                        {call.tipo === 'escolar' ? "Transporte Escolar" : call.turmaNome}
                      </p>
                    </div>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="w-full h-px bg-slate-100"></div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Chamado às</span>
                      <div className={cn(
                        "flex items-center justify-center gap-2 font-black tabular-nums text-4xl",
                        call.tipo === 'escolar' ? "text-orange-600" : "text-primary"
                      )}>
                        {call.dataHoraChamado ? format(call.dataHoraChamado.toDate(), "HH:mm") : "--:--"}
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
                <p className="text-xl max-w-sm mx-auto font-medium">Aguardando as próximas liberações de saída para exibição.</p>
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
          <span className="text-xs font-medium text-muted-foreground">© {new Date().getFullYear()} SESI</span>
        </div>
      </footer>
    </div>
  );
}
