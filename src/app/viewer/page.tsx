"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function ViewerPage() {
  const { user, roles, loading } = useAuth();
  const router = useRouter();

  const [selectedClass, setSelectedClass] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [diaRef, setDiaRef] = useState<string | null>(null);

  const [calls, setCalls] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [callsError, setCallsError] = useState<string | null>(null);

  const mountedRef = useRef(false);
  const reconnectingRef = useRef(false);
  const callsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const classesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const withTimeout = async <T,>(
    operation: () => Promise<T>,
    ms = 10000
  ): Promise<T> => {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("Tempo limite excedido ao consultar o Supabase.")
            ),
          ms
        )
      ),
    ]);
  };

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const mapSupabaseRow = (row: any) => ({
    id: row.id,
    ...(row.data || {}),
    foi_chamado: row.foi_chamado ?? false,
  });

  useEffect(() => {
    setDiaRef(format(new Date(), "yyyy-MM-dd"));
  }, []);

  useEffect(() => {
    if (!loading && (!user || !roles.includes("viewer"))) {
      router.push("/login");
    }
  }, [user, roles, loading, router]);

  const loadCalls = useCallback(
    async (silent = false) => {
      if (!silent) {
        setCallsError(null);
        if (initialLoading) {
          setInitialLoading(true);
        } else {
          setIsRefreshing(true);
        }
      }

      try {
        const { data, error } = await withTimeout(() =>
          Promise.resolve(
            supabase.from("calls").select("*").order("id", { ascending: true })
          )
        );

        if (error) throw error;

        const mapped = (data || []).map(mapSupabaseRow);

        if (mountedRef.current) {
          setCalls(mapped);
        }
      } catch (error: any) {
        console.error("Erro ao carregar calls:", error);

        if (mountedRef.current) {
          setCallsError(error.message || "Falha ao carregar chamadas.");
        }
      } finally {
        if (mountedRef.current) {
          setInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [initialLoading]
  );

  const loadClasses = useCallback(async (silent = false) => {
    if (!silent && mountedRef.current) {
      setIsRefreshing(true);
    }

    try {
      const { data, error } = await withTimeout(() =>
        Promise.resolve(
          supabase.from("classes").select("*").order("id", { ascending: true })
        )
      );

      if (error) throw error;

      const mapped = (data || [])
        .map(mapSupabaseRow)
        .sort((a, b) =>
          (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
            sensitivity: "base",
          })
        );

      if (mountedRef.current) {
        setClasses(mapped);
      }
    } catch (error) {
      console.error("Erro ao carregar classes:", error);
    } finally {
      if (!silent && mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, []);

  const teardownRealtime = useCallback(async () => {
    if (callsChannelRef.current) {
      await supabase.removeChannel(callsChannelRef.current);
      callsChannelRef.current = null;
    }

    if (classesChannelRef.current) {
      await supabase.removeChannel(classesChannelRef.current);
      classesChannelRef.current = null;
    }
  }, []);

  const setupRealtime = useCallback(async () => {
    await teardownRealtime();

    callsChannelRef.current = supabase
      .channel(`viewer-calls-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        async () => {
          if (!mountedRef.current) return;
          await loadCalls(true);
        }
      )
      .subscribe((status) => {
        console.log("[viewer-calls] status:", status);
      });

    classesChannelRef.current = supabase
      .channel(`viewer-classes-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classes" },
        async () => {
          if (!mountedRef.current) return;
          await loadClasses(true);
        }
      )
      .subscribe((status) => {
        console.log("[viewer-classes] status:", status);
      });
  }, [loadCalls, loadClasses, teardownRealtime]);

  const recoverViewerConnection = useCallback(async () => {
    if (reconnectingRef.current) return;

    reconnectingRef.current = true;

    try {
      if (mountedRef.current) {
        setIsRefreshing(true);
        setCallsError(null);
      }

      await teardownRealtime();
      await sleep(300);
      await Promise.all([loadCalls(true), loadClasses(true)]);
      await sleep(250);
      await setupRealtime();
    } catch (error) {
      console.error("[viewer] erro ao recuperar conexão:", error);
    } finally {
      reconnectingRef.current = false;
      if (mountedRef.current) {
        setInitialLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [loadCalls, loadClasses, setupRealtime, teardownRealtime]);

  const handleToggleCalled = useCallback(
    async (callId: string, currentValue: boolean) => {
      try {
        setIsRefreshing(true);

        const { error } = await withTimeout(
          () =>
            Promise.resolve(
              supabase
                .from("calls")
                .update({ foi_chamado: !currentValue })
                .eq("id", callId)
            ),
          12000
        );

        if (error) throw error;

        await loadCalls(true);
      } catch (err) {
        console.error("Erro ao alternar status:", err);
        await recoverViewerConnection();
      } finally {
        if (mountedRef.current) {
          setIsRefreshing(false);
        }
      }
    },
    [loadCalls, recoverViewerConnection]
  );

  useEffect(() => {
    if (!user || !roles.includes("viewer") || !diaRef) return;

    mountedRef.current = true;

    const init = async () => {
      await Promise.all([loadCalls(false), loadClasses(false)]);
      await setupRealtime();
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        await teardownRealtime();
        return;
      }

      if (document.visibilityState === "visible") {
        console.log("[viewer] aba voltou a ficar visível, recuperando...");
        await recoverViewerConnection();
      }
    };

    const handleWindowFocus = async () => {
      console.log("[viewer] janela voltou ao foco, recuperando...");
      await recoverViewerConnection();
    };

    const handleOnline = async () => {
      console.log("[viewer] conexão restabelecida, recuperando...");
      await recoverViewerConnection();
    };

    init();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("online", handleOnline);

    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      await recoverViewerConnection();
    }, 20000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("online", handleOnline);
      teardownRealtime();
    };
  }, [
    user,
    roles,
    diaRef,
    loadCalls,
    loadClasses,
    setupRealtime,
    teardownRealtime,
    recoverViewerConnection,
  ]);

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

  if (loading || !diaRef) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !roles.includes("viewer")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col selection:bg-primary selection:text-white">
      <DashboardHeader />

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

        {isRefreshing && !initialLoading && (
          <div className="fixed top-24 right-6 z-50 rounded-xl bg-white/95 backdrop-blur-sm border border-slate-200 shadow-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">
                Sincronizando quadro...
              </span>
            </div>
          </div>
        )}

        {callsError && (
          <div className="mb-8 p-5 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={20} />
            <p className="text-sm font-bold">
              Não foi possível sincronizar os chamados em tempo real.
            </p>
          </div>
        )}

        {initialLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
            <p className="text-slate-400 font-medium text-sm">Atualizando quadro...</p>
          </div>
        ) : processedCalls.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {processedCalls.map((call) => {
                const isCalled = !!call.foi_chamado;

                return (
                  <Card
                    key={call.id}
                    className={cn(
                      "premium-card border-none overflow-hidden h-[360px] flex flex-col group animate-in fade-in zoom-in duration-500",
                      call.tipo === "escolar"
                        ? "bg-gradient-to-br from-orange-50 to-white"
                        : "bg-white",
                      isCalled && "ring-2 ring-green-500/30"
                    )}
                  >
                    <CardContent className="p-0 flex flex-col h-full">
                      <div
                        className={cn(
                          "h-2 w-full",
                          isCalled
                            ? "bg-green-500"
                            : call.tipo === "escolar"
                              ? "bg-orange-500"
                              : "bg-primary"
                        )}
                      />

                      <div className="p-6 flex flex-col items-center text-center justify-between flex-1">
                        <div className="space-y-4 flex flex-col items-center w-full">
                          <div
                            className={cn(
                              "h-16 w-16 rounded-2xl flex items-center justify-center shadow-sm relative transition-transform duration-300 group-hover:scale-110",
                              isCalled
                                ? "bg-green-100 text-green-600"
                                : call.tipo === "escolar"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-primary/5 text-primary"
                            )}
                          >
                            {call.tipo === "escolar" ? (
                              <Bus size={32} />
                            ) : (
                              <UserIcon size={32} />
                            )}
                            <div
                              className={cn(
                                "absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-white",
                                isCalled ? "bg-green-500" : "bg-blue-500"
                              )}
                            />
                          </div>

                          <div className="space-y-1 w-full">
                            <h3
                              className={cn(
                                "text-lg font-black leading-tight tracking-tight line-clamp-2 min-h-[2.5rem] flex items-center justify-center",
                                isCalled
                                  ? "text-green-800"
                                  : call.tipo === "escolar"
                                    ? "text-orange-900"
                                    : "text-slate-900"
                              )}
                            >
                              {call.tipo === "escolar" ? call.escolarNome : call.nomeExibicao}
                            </h3>

                            <div className="flex items-center justify-center gap-2 flex-wrap">
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

                              {isCalled && (
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-green-100 text-green-700">
                                  Já chamado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="w-full pt-4 border-t border-slate-50 space-y-4">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">
                              Horário de Saída
                            </span>
                            <div
                              className={cn(
                                "text-4xl font-black tabular-nums tracking-tighter",
                                isCalled
                                  ? "text-green-600"
                                  : call.tipo === "escolar"
                                    ? "text-orange-600"
                                    : "text-primary"
                              )}
                            >
                              {call.dataHoraChamado
                                ? format(new Date(call.dataHoraChamado), "HH:mm")
                                : "--:--"}
                            </div>
                          </div>

                          <Button
                            onClick={() => handleToggleCalled(call.id, isCalled)}
                            className={cn(
                              "w-full h-11 rounded-xl font-black tracking-tight transition-all",
                              isCalled
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-primary hover:bg-primary/90 text-white"
                            )}
                          >
                            {isCalled ? "Cancelar chamado" : "Chamado"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 max-w-5xl mx-auto">
              {processedCalls.map((call) => {
                const isCalled = !!call.foi_chamado;

                return (
                  <div
                    key={call.id}
                    className={cn(
                      "flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-left-4 duration-300",
                      call.tipo === "escolar" && "border-l-4 border-l-orange-500",
                      isCalled && "border-green-300 bg-green-50/40"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105",
                          isCalled
                            ? "bg-green-100 text-green-600"
                            : call.tipo === "escolar"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-primary/5 text-primary"
                        )}
                      >
                        {call.tipo === "escolar" ? <Bus size={24} /> : <UserIcon size={24} />}
                      </div>

                      <div>
                        <h4
                          className={cn(
                            "text-base font-black tracking-tight",
                            isCalled ? "text-green-800" : "text-slate-900"
                          )}
                        >
                          {call.tipo === "escolar" ? call.escolarNome : call.nomeExibicao}
                        </h4>

                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {call.tipo === "escolar" ? "Transporte Escolar" : call.turmaNome}
                          </p>

                          {isCalled && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-green-100 text-green-700">
                              Já chamado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                          Saída
                        </span>
                        <span
                          className={cn(
                            "text-2xl font-black tabular-nums tracking-tight",
                            isCalled
                              ? "text-green-600"
                              : call.tipo === "escolar"
                                ? "text-orange-600"
                                : "text-primary"
                          )}
                        >
                          {call.dataHoraChamado
                            ? format(new Date(call.dataHoraChamado), "HH:mm")
                            : "--:--"}
                        </span>
                      </div>

                      <Button
                        onClick={() => handleToggleCalled(call.id, isCalled)}
                        className={cn(
                          "rounded-xl font-black",
                          isCalled
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-primary hover:bg-primary/90 text-white"
                        )}
                      >
                        {isCalled ? "Cancelar Chamado" : "Chamado"}
                      </Button>
                    </div>
                  </div>
                );
              })}
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