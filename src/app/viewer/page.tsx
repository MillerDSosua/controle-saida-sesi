"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  User as UserIcon,
  Bus,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function ViewerPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [selectedClass, setSelectedClass] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [diaRef, setDiaRef] = useState<string | null>(null);

  const [calls, setCalls] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);
  const [callsError, setCallsError] = useState<string | null>(null);

  const mapSupabaseRow = (row: any) => ({
    id: row.id,
    ...(row.data || {}),
  });

  useEffect(() => {
    setDiaRef(format(new Date(), "yyyy-MM-dd"));
  }, []);

  useEffect(() => {
    if (!loading && (!user || role !== "viewer")) {
      router.push("/");
    }
  }, [user, role, loading, router]);

  const loadCalls = async () => {
    setCallsLoading(true);
    setCallsError(null);

    try {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map(mapSupabaseRow);
      setCalls(mapped);
    } catch (error: any) {
      console.error("Erro ao carregar calls:", error);
      setCallsError(error.message || "Falha ao carregar chamadas.");
    } finally {
      setCallsLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("id", { ascending: true });

      if (error) throw error;

      const mapped = (data || [])
        .map(mapSupabaseRow)
        .sort((a, b) =>
          (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
            sensitivity: "base",
          })
        );

      setClasses(mapped);
    } catch (error) {
      console.error("Erro ao carregar classes:", error);
    }
  };

  useEffect(() => {
    if (!user || role !== "viewer" || !diaRef) return;

    let callsChannel: ReturnType<typeof supabase.channel> | null = null;
    let classesChannel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;

    const setupRealtime = async () => {
      if (!isMounted) return;

      await Promise.all([loadCalls(), loadClasses()]);

      if (!isMounted) return;

      callsChannel = supabase
        .channel(`viewer-calls-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "calls" },
          async () => {
            if (!isMounted) return;
            await loadCalls();
          }
        )
        .subscribe((status) => {
          console.log("[viewer-calls] status:", status);
          if (status === "SUBSCRIBED" && isMounted) {
            loadCalls();
          }
        });

      classesChannel = supabase
        .channel(`viewer-classes-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "classes" },
          async () => {
            if (!isMounted) return;
            await loadClasses();
          }
        )
        .subscribe((status) => {
          console.log("[viewer-classes] status:", status);
          if (status === "SUBSCRIBED" && isMounted) {
            loadClasses();
          }
        });
    };

    const teardownRealtime = async () => {
      if (callsChannel) {
        await supabase.removeChannel(callsChannel);
        callsChannel = null;
      }

      if (classesChannel) {
        await supabase.removeChannel(classesChannel);
        classesChannel = null;
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        console.log("[viewer] aba voltou a ficar visível, recriando canais...");
        await teardownRealtime();
        await setupRealtime();
      }
    };

    const handleWindowFocus = async () => {
      console.log("[viewer] janela voltou ao foco, recarregando...");
      await loadCalls();
      await loadClasses();
    };

    setupRealtime();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      teardownRealtime();
    };
  }, [user, role, diaRef]);

  const processedCalls = useMemo(() => {
    if (!calls || !diaRef) return [];

    const activeCalls = calls.filter(
      (call) => call.diaRef === diaRef && call.status === "Chamado"
    );

    const filtered = activeCalls.filter((call) => {
      if (selectedClass === "all") return true;

      if (call.tipo === "escolar") {
        return call.turmasRelacionadas?.includes(selectedClass);
      }

      return call.turmaId === selectedClass;
    });

    return [...filtered].sort((a, b) => {
      const timeA = a.dataHoraChamado ? new Date(a.dataHoraChamado).getTime() : 0;
      const timeB = b.dataHoraChamado ? new Date(b.dataHoraChamado).getTime() : 0;
      return timeB - timeA;
    });
  }, [calls, selectedClass, diaRef]);

  if (loading || !user || role !== "viewer" || !diaRef) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col selection:bg-primary selection:text-white">
      <DashboardHeader title="Quadro de Saída Inteligente" />

      <main className="flex-1 container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col gap-8 mb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-1.5">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
                Próximas Saídas
              </h2>
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Clock size={16} className="text-primary/60" />
                <span className="text-sm capitalize">
                  {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-white p-1 rounded-xl shadow-sm border border-slate-200 h-12">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "rounded-lg h-10 px-3 gap-2 transition-all duration-200",
                    viewMode === "grid"
                      ? "bg-primary text-white shadow-md hover:bg-primary/90"
                      : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <LayoutGrid size={18} />
                  <span className="text-xs font-bold hidden sm:inline">Quadro</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "rounded-lg h-10 px-3 gap-2 transition-all duration-200",
                    viewMode === "list"
                      ? "bg-primary text-white shadow-md hover:bg-primary/90"
                      : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  <List size={18} />
                  <span className="text-xs font-bold hidden sm:inline">Lista</span>
                </Button>
              </div>

              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full sm:w-56 h-12 bg-white border-slate-200 rounded-xl text-sm font-bold shadow-sm hover:border-primary/30 transition-all">
                  <SelectValue placeholder="Todas as Turmas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                  <SelectItem value="all" className="font-bold">
                    Todas as Turmas
                  </SelectItem>
                  {(classes || []).map((c) => (
                    <SelectItem key={c.id} value={c.id} className="font-medium">
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="hidden lg:flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 h-12">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-black text-slate-700 tracking-tight">
                  {processedCalls.length} ATIVOS
                </span>
              </div>
            </div>
          </div>
        </div>

        {callsError && (
          <div className="mb-8 p-5 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">
              Não foi possível sincronizar os chamados em tempo real.
            </p>
          </div>
        )}

        {callsLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
            <p className="text-slate-400 font-medium text-sm">Atualizando quadro...</p>
          </div>
        ) : processedCalls.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {processedCalls.map((call) => (
                <Card
                  key={call.id}
                  className={cn(
                    "premium-card border-none overflow-hidden h-[300px] flex flex-col group animate-in fade-in zoom-in duration-500",
                    call.tipo === "escolar"
                      ? "bg-gradient-to-br from-orange-50 to-white"
                      : "bg-white"
                  )}
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    <div
                      className={cn(
                        "h-2 w-full",
                        call.tipo === "escolar" ? "bg-orange-500" : "bg-primary"
                      )}
                    />

                    <div className="p-6 flex flex-col items-center text-center justify-between flex-1">
                      <div className="space-y-4 flex flex-col items-center w-full">
                        <div
                          className={cn(
                            "h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm relative transition-transform duration-300 group-hover:scale-110",
                            call.tipo === "escolar"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-primary/5 text-primary"
                          )}
                        >
                          {call.tipo === "escolar" ? (
                            <Bus size={32} />
                          ) : (
                            <UserIcon size={32} />
                          )}
                          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white" />
                        </div>

                        <div className="space-y-1 w-full">
                          <h3
                            className={cn(
                              "text-lg font-black leading-tight tracking-tight line-clamp-2 min-h-[2.5rem] flex items-center justify-center",
                              call.tipo === "escolar" ? "text-orange-900" : "text-slate-900"
                            )}
                          >
                            {call.tipo === "escolar" ? call.escolarNome : call.nomeExibicao}
                          </h3>
                          <div className="flex items-center justify-center gap-2">
                            <span
                              className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                call.tipo === "escolar"
                                  ? "bg-orange-200/50 text-orange-700"
                                  : "bg-slate-100 text-slate-500"
                              )}
                            >
                              {call.tipo === "escolar" ? "Transporte Escolar" : call.turmaNome}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full pt-4 border-t border-slate-50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">
                          Horário de Saída
                        </span>
                        <div
                          className={cn(
                            "text-4xl font-black tabular-nums tracking-tighter",
                            call.tipo === "escolar" ? "text-orange-600" : "text-primary"
                          )}
                        >
                          {call.dataHoraChamado
                            ? format(new Date(call.dataHoraChamado), "HH:mm")
                            : "--:--"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3 max-w-5xl mx-auto">
              {processedCalls.map((call) => (
                <div
                  key={call.id}
                  className={cn(
                    "flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-left-4 duration-300",
                    call.tipo === "escolar" && "border-l-4 border-l-orange-500"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
                        call.tipo === "escolar"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-primary/5 text-primary"
                      )}
                    >
                      {call.tipo === "escolar" ? <Bus size={24} /> : <UserIcon size={24} />}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 tracking-tight">
                        {call.tipo === "escolar" ? call.escolarNome : call.nomeExibicao}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {call.tipo === "escolar" ? "Transporte Escolar" : call.turmaNome}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        Saída
                      </span>
                      <span
                        className={cn(
                          "text-2xl font-black tabular-nums tracking-tight",
                          call.tipo === "escolar" ? "text-orange-600" : "text-primary"
                        )}
                      >
                        {call.dataHoraChamado
                          ? format(new Date(call.dataHoraChamado), "HH:mm")
                          : "--:--"}
                      </span>
                    </div>
                    <ArrowRight
                      className="text-slate-200 group-hover:text-primary transition-colors"
                      size={20}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-1000">
            <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center shadow-inner mb-6 border border-slate-100">
              <Clock size={40} className="text-slate-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Nenhuma Saída Ativa
              </h3>
              <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">
                Aguardando a liberação das próximas saídas para exibição no quadro.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 border-t border-slate-200 bg-white/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Conexão Sesi Inteligente Ativa
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            © CRIADO POR MILLER DANIEL
          </span>
        </div>
      </footer>
    </div>
  );
}