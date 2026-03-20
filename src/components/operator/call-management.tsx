"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth as useFirebaseUser } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  User,
  Loader2,
  LayoutGrid,
  List,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type RealtimeStatus = "connecting" | "subscribed" | "error" | "closed";

export function CallManagement() {
  const { user } = useFirebaseUser();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [calls, setCalls] = useState<Record<string, any>>({});
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connecting");

  const { toast } = useToast();
  const [diaRef] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const studentsChannelRef = useRef<any>(null);
  const classesChannelRef = useRef<any>(null);
  const callsChannelRef = useRef<any>(null);
  const mountedRef = useRef(false);

  const loadingStudentsRef = useRef(false);
  const loadingClassesRef = useRef(false);
  const loadingCallsRef = useRef(false);

  const realtimeStatusRef = useRef<RealtimeStatus>("connecting");

  const updateRealtimeStatus = useCallback((status: RealtimeStatus) => {
    realtimeStatusRef.current = status;
    setRealtimeStatus(status);
  }, []);

  const nowIso = () => new Date().toISOString();

  const generateId = () => {
    if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  };

  const mapSupabaseRow = (row: any) => ({
    id: row.id,
    ...(row.data || {}),
    foi_chamado: row.foi_chamado ?? false,
  });

  const withTimeout = async <T,>(
    operation: () => Promise<T>,
    ms = 8000
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

  const resetLoadingLocks = useCallback(() => {
    loadingStudentsRef.current = false;
    loadingClassesRef.current = false;
    loadingCallsRef.current = false;

    if (mountedRef.current) {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem("operatorViewMode");
    if (savedMode === "grid" || savedMode === "list") {
      setViewMode(savedMode);
    }
  }, []);

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    localStorage.setItem("operatorViewMode", mode);
  };

  const loadStudents = useCallback(
    async (silent = false) => {
      if (loadingStudentsRef.current && silent) return;

      loadingStudentsRef.current = true;
      if (!silent) setIsSyncing(true);

      try {
        const { data, error } = await withTimeout(() =>
          Promise.resolve(
            supabase.from("students").select("*").order("id", { ascending: true })
          )
        );

        if (error) throw error;

        const mapped = (data || [])
          .map(mapSupabaseRow)
          .sort((a, b) =>
            (a.nomeExibicao || "").localeCompare(
              b.nomeExibicao || "",
              "pt-BR",
              {
                sensitivity: "base",
              }
            )
          );

        if (mountedRef.current) {
          setStudents(mapped);
        }
      } catch (error) {
        console.error("Erro ao buscar students:", error);

        if (!silent) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível carregar os alunos.",
          });
        }
      } finally {
        loadingStudentsRef.current = false;
        if (!silent && mountedRef.current) setIsSyncing(false);
      }
    },
    [toast]
  );

  const loadClasses = useCallback(
    async (silent = false) => {
      if (loadingClassesRef.current && silent) return;

      loadingClassesRef.current = true;
      if (!silent) setIsSyncing(true);

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
        console.error("Erro ao buscar classes:", error);

        if (!silent) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível carregar as turmas.",
          });
        }
      } finally {
        loadingClassesRef.current = false;
        if (!silent && mountedRef.current) setIsSyncing(false);
      }
    },
    [toast]
  );

  const loadCalls = useCallback(
    async (silent = false) => {
      if (loadingCallsRef.current && silent) return;

      loadingCallsRef.current = true;
      if (!silent) setIsSyncing(true);

      try {
        const { data, error } = await withTimeout(() =>
          Promise.resolve(
            supabase.from("calls").select("*").order("id", { ascending: true })
          )
        );

        if (error) throw error;

        const mapped = (data || []).map(mapSupabaseRow);

        const filtered = mapped.filter(
          (call) => call.diaRef === diaRef && call.tipo === "aluno"
        );

        const callsMap: Record<string, any> = {};

        filtered.forEach((call) => {
          const studentId = call.studentId;
          if (!studentId) return;

          const existing = callsMap[studentId];

          const currentTimestamp = call.updatedAt
            ? new Date(call.updatedAt).getTime()
            : 0;

          const existingTimestamp = existing?.updatedAt
            ? new Date(existing.updatedAt).getTime()
            : 0;

          if (!existing || currentTimestamp > existingTimestamp) {
            callsMap[studentId] = call;
          }
        });

        if (mountedRef.current) {
          setCalls(callsMap);
        }
      } catch (error) {
        console.error("Erro ao buscar calls:", error);

        if (!silent) {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Não foi possível carregar as chamadas.",
          });
        }
      } finally {
        loadingCallsRef.current = false;
        if (!silent && mountedRef.current) setIsSyncing(false);
      }
    },
    [diaRef, toast]
  );

  const refreshAll = useCallback(
    async (silent = false) => {
      await Promise.all([
        loadStudents(silent),
        loadClasses(silent),
        loadCalls(silent),
      ]);
    },
    [loadStudents, loadClasses, loadCalls]
  );

  const cleanupChannels = useCallback(() => {
    if (studentsChannelRef.current) {
      supabase.removeChannel(studentsChannelRef.current);
      studentsChannelRef.current = null;
    }

    if (classesChannelRef.current) {
      supabase.removeChannel(classesChannelRef.current);
      classesChannelRef.current = null;
    }

    if (callsChannelRef.current) {
      supabase.removeChannel(callsChannelRef.current);
      callsChannelRef.current = null;
    }
  }, []);

  const setupChannels = useCallback(() => {
    cleanupChannels();
    updateRealtimeStatus("connecting");

    studentsChannelRef.current = supabase
      .channel(`operator-students-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "students" },
        async () => {
          await loadStudents(true);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          updateRealtimeStatus("error");
        } else if (status === "CLOSED") {
          updateRealtimeStatus("closed");
        }
      });

    classesChannelRef.current = supabase
      .channel(`operator-classes-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "classes" },
        async () => {
          await loadClasses(true);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          updateRealtimeStatus("error");
        } else if (status === "CLOSED") {
          updateRealtimeStatus("closed");
        }
      });

    callsChannelRef.current = supabase
      .channel(`operator-calls-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        async () => {
          await loadCalls(true);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          updateRealtimeStatus("subscribed");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          updateRealtimeStatus("error");
        } else if (status === "CLOSED") {
          updateRealtimeStatus("closed");
        }
      });
  }, [
    cleanupChannels,
    loadStudents,
    loadClasses,
    loadCalls,
    updateRealtimeStatus,
  ]);

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const recoverOperatorConnection = useCallback(async () => {
    resetLoadingLocks();
    cleanupChannels();
    updateRealtimeStatus("connecting");

    await sleep(400);
    await refreshAll(true);
    await sleep(300);
    setupChannels();
  }, [
    resetLoadingLocks,
    cleanupChannels,
    updateRealtimeStatus,
    refreshAll,
    setupChannels,
  ]);

  useEffect(() => {
    if (!user) return;

    mountedRef.current = true;

    const init = async () => {
      await refreshAll();
      setupChannels();
    };

    init();

    const handleVisibilityChange = async () => {
  if (document.visibilityState === "hidden") {
    cleanupChannels();
    updateRealtimeStatus("closed");
    return;
  }

  if (document.visibilityState === "visible") {
    await recoverOperatorConnection();
  }
};

const handleOnline = async () => {
  await recoverOperatorConnection();
};

    document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("focus", handleVisibilityChange);
window.addEventListener("online", handleOnline);

    const interval = setInterval(async () => {
      resetLoadingLocks();

      await loadCalls(true);

      if (
        realtimeStatusRef.current === "error" ||
        realtimeStatusRef.current === "closed" ||
        document.visibilityState === "visible"
      ) {
        cleanupChannels();
        setupChannels();
      }
    }, 20000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
window.removeEventListener("focus", handleVisibilityChange);
window.removeEventListener("online", handleOnline);
      cleanupChannels();
    };
  }, [
    user,
    refreshAll,
    setupChannels,
    cleanupChannels,
    loadCalls,
    resetLoadingLocks,
    updateRealtimeStatus,
    recoverOperatorConnection,
  ]);

  const handleToggleCall = async (student: any) => {
  if (processingIds.has(student.id)) return;

  setProcessingIds((prev) => new Set(prev).add(student.id));

  try {
    await recoverOperatorConnection();

    const existingCall = calls[student.id];
    const isActive = existingCall && existingCall.status === "Chamado";
    const { foi_chamado: _ignorarFoiChamado, ...existingCallData } =
      existingCall || {};

    if (isActive) {
      const { error } = await withTimeout(
        () =>
          Promise.resolve(
            supabase
              .from("calls")
              .update({
                foi_chamado: false,
                data: {
                  ...existingCallData,
                  status: "Cancelado",
                  updatedAt: nowIso(),
                },
              })
              .eq("id", existingCall.id)
          ),
        12000
      );

      if (error) throw error;

      toast({
        title: "Cancelado",
        description: `${student.nomeExibicao} removido.`,
      });
    } else {
      const payload = {
        tipo: "aluno",
        studentId: student.id,
        nomeExibicao: student.nomeExibicao,
        turmaId: student.turmaId,
        turmaNome: student.turmaNome,
        status: "Chamado",
        dataHoraChamado: nowIso(),
        diaRef,
        chamadoPorUid: user?.id || null,
        chamadoPorEmail: user?.email || null,
        updatedAt: nowIso(),
      };

      if (existingCall) {
        const { error } = await withTimeout(
          () =>
            Promise.resolve(
              supabase
                .from("calls")
                .update({
                  foi_chamado: false,
                  data: {
                    ...existingCallData,
                    ...payload,
                  },
                })
                .eq("id", existingCall.id)
            ),
          12000
        );

        if (error) throw error;
      } else {
        const newId = generateId();

        const { error } = await withTimeout(
          () =>
            Promise.resolve(
              supabase.from("calls").insert([
                {
                  id: newId,
                  foi_chamado: false,
                  data: {
                    id: newId,
                    ...payload,
                    createdAt: nowIso(),
                  },
                },
              ])
            ),
          12000
        );

        if (error) throw error;
      }

      toast({
        title: "Chamado",
        description: `${student.nomeExibicao} enviado ao quadro.`,
      });
    }

    await loadCalls(true);
  } catch (error: any) {
    await recoverOperatorConnection();

    toast({
      variant: "destructive",
      title: "Erro",
      description: error.message || "Falha ao processar chamada.",
    });
  } finally {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      next.delete(student.id);
      return next;
    });
  }
};

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = (s.nomeExibicao || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchClass = selectedClass === "all" || s.turmaId === selectedClass;

      return matchSearch && matchClass;
    });
  }, [students, searchTerm, selectedClass]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col lg:flex-row gap-5 items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:max-w-3xl">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <Input
              placeholder="Buscar aluno..."
              className="pl-10 h-11 bg-slate-50 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary/10 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-64">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-10 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all">
                <SelectValue placeholder="Todas as Turmas" />
              </SelectTrigger>
              <SelectContent className="rounded-xl shadow-xl border-slate-100 p-1">
                <SelectItem value="all" className="font-bold rounded-lg h-10">
                  Todas as turmas
                </SelectItem>
                {classes.map((c) => (
                  <SelectItem
                    key={c.id}
                    value={c.id}
                    className="font-semibold rounded-lg h-10"
                  >
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <Badge
            variant="outline"
            className={cn(
              "bg-white font-black uppercase text-[9px] tracking-[0.2em] px-3 py-1 rounded-md shadow-xs",
              realtimeStatus === "subscribed"
                ? "border-green-200 text-green-600"
                : "border-amber-200 text-amber-600"
            )}
          >
            {isSyncing ? (
              <span className="flex items-center gap-1">
                <RefreshCw size={10} className="animate-spin" />
                Sync
              </span>
            ) : realtimeStatus === "subscribed" ? (
              "Online"
            ) : (
              <span className="flex items-center gap-1">
                <WifiOff size={10} />
                Reconectando
              </span>
            )}
          </Badge>

          <div className="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-100 h-10 w-full lg:w-auto">
            <Button
              variant="ghost"
              onClick={() => handleSetViewMode("grid")}
              className={cn(
                "flex-1 lg:flex-none rounded-lg h-8 px-4 gap-2 transition-all font-black text-[10px] uppercase tracking-[0.15em]",
                viewMode === "grid"
                  ? "bg-white shadow-sm text-primary"
                  : "text-slate-400 hover:bg-white/50"
              )}
            >
              <LayoutGrid size={14} /> Quadro
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleSetViewMode("list")}
              className={cn(
                "flex-1 lg:flex-none rounded-lg h-8 px-4 gap-2 transition-all font-black text-[10px] uppercase tracking-[0.15em]",
                viewMode === "list"
                  ? "bg-white shadow-sm text-primary"
                  : "text-slate-400 hover:bg-white/50"
              )}
            >
              <List size={14} /> Lista
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((s) => {
            const currentCall = calls[s.id];
            const isActive = currentCall && currentCall.status === "Chamado";
            const isConfirmedCalled = !!currentCall?.foi_chamado;
            const isProcessing = processingIds.has(s.id);

            return (
              <Card
                key={s.id}
                className={cn(
                  "rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all duration-300 h-[320px] flex flex-col justify-between overflow-hidden",
                  isConfirmedCalled
                    ? "border-green-500/40 bg-green-50/30 ring-2 ring-green-500/10"
                    : isActive
                      ? "border-green-500/30 bg-green-50/10"
                      : "hover:bg-slate-50/30 hover:shadow-md"
                )}
              >
                <CardContent className="p-8 flex flex-col h-full justify-between items-center text-center">
                  <div className="space-y-4">
                    <div
                      className={cn(
                        "h-20 w-20 rounded-full mx-auto flex items-center justify-center border transition-all duration-300",
                        isConfirmedCalled
                          ? "bg-green-100 text-green-600 border-green-200"
                          : isActive
                            ? "bg-green-100 text-green-600 border-green-200"
                            : "bg-slate-50 text-slate-300 border-slate-100"
                      )}
                    >
                      {isProcessing ? (
                        <Loader2 className="animate-spin" size={32} />
                      ) : (
                        <User size={40} />
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight line-clamp-2 min-h-[3rem]">
                        {s.nomeExibicao}
                      </h3>

                      <div className="flex justify-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.1em] py-0.5 px-2.5 rounded-md border-none"
                        >
                          {s.turmaNome}
                        </Badge>

                        {isActive && !isConfirmedCalled && (
                          <Badge className="bg-yellow-400 text-yellow-900 text-[10px] font-black uppercase tracking-[0.1em] py-0.5 px-2.5 rounded-md border-none shadow-sm">
                            No quadro
                          </Badge>
                        )}

                        {isConfirmedCalled && (
                          <Badge className="bg-green-600 text-white text-[10px] font-black uppercase tracking-[0.1em] py-0.5 px-2.5 rounded-md border-none shadow-sm">
                            Já chamado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant={isActive ? "destructive" : "default"}
                    className={cn(
                      "w-full h-11 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95",
                      !isActive ? "gradient-primary" : "bg-red-500"
                    )}
                    disabled={isProcessing}
                    onClick={() => handleToggleCall(s)}
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" />
                    ) : isActive ? (
                      "Cancelar"
                    ) : (
                      "Chamar Saída"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((s) => {
            const currentCall = calls[s.id];
            const isActive = currentCall && currentCall.status === "Chamado";
            const isConfirmedCalled = !!currentCall?.foi_chamado;
            const isProcessing = processingIds.has(s.id);

            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all h-24 sm:h-28 hover:bg-slate-50/50",
                  isConfirmedCalled
                    ? "border-l-4 border-l-green-600 bg-green-50/30"
                    : isActive
                      ? "border-l-4 border-l-green-500 bg-green-50/10"
                      : ""
                )}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={cn(
                      "h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center border shrink-0 transition-all duration-300",
                      isConfirmedCalled
                        ? "bg-green-100 text-green-600 border-green-200"
                        : isActive
                          ? "bg-green-100 text-green-600 border-green-200"
                          : "bg-slate-50 text-slate-300 border-slate-100"
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      <User size={28} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate pr-4">
                      {s.nomeExibicao}
                    </h4>

                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-600 border-none px-2 py-0.5 font-black text-[11px] uppercase tracking-widest rounded-md"
                      >
                        {s.turmaNome}
                      </Badge>

                      {isActive && !isConfirmedCalled && (
                        <Badge className="bg-yellow-400 text-yellow-900 border-none px-2 py-0.5 font-black text-[10px] uppercase tracking-widest rounded-md">
                          No quadro
                        </Badge>
                      )}

                      {isConfirmedCalled && (
                        <Badge className="bg-green-600 text-white border-none px-2 py-0.5 font-black text-[10px] uppercase tracking-widest rounded-md">
                          Já chamado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant={isActive ? "destructive" : "default"}
                  className={cn(
                    "h-10 w-[90px] sm:w-[120px] rounded-xl font-black text-[11px] uppercase tracking-[0.15em] shadow-sm transition-all active:scale-95",
                    !isActive ? "gradient-primary text-white" : "bg-red-500 text-white"
                  )}
                  disabled={isProcessing}
                  onClick={() => handleToggleCall(s)}
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" />
                  ) : isActive ? (
                    "Cancelar"
                  ) : (
                    "Chamar"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}