
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, doc, serverTimestamp, where, orderBy } from "firebase/firestore";
import { useAuth as useFirebaseUser } from "@/context/auth-context";
import { useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, PhoneOutgoing, XCircle, User, CheckCircle2, AlertCircle, Loader2, LayoutGrid, List } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function CallManagement() {
  const { user } = useFirebaseUser();
  const db = useFirestore();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [calls, setCalls] = useState<Record<string, any>>({});
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const [diaRef] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // Persistência da visualização
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

  useEffect(() => {
    if (!db || !user) return;

    console.log("[CallManagement] Iniciando listeners para o dia:", diaRef);

    const unsubS = onSnapshot(
      query(collection(db, "students"), orderBy("nomeExibicao", "asc")), 
      (s) => {
        setStudents(s.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => console.error("[CallManagement] Erro no listener de alunos:", error)
    );

    const unsubC = onSnapshot(
      query(collection(db, "classes"), orderBy("nome", "asc")), 
      (s) => {
        setClasses(s.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => console.error("[CallManagement] Erro no listener de turmas:", error)
    );

    const qCalls = query(
      collection(db, "calls"), 
      where("diaRef", "==", diaRef)
    );

    const unsubCalls = onSnapshot(
      qCalls, 
      (s) => {
        const callsMap: Record<string, any> = {};
        s.docs.forEach((d) => {
          const data = d.data();
          const studentId = data.studentId;
          if (!studentId) return;

          const existing = callsMap[studentId];
          const currentTimestamp = data.updatedAt?.toMillis() || 0;
          const existingTimestamp = existing?.updatedAt?.toMillis() || 0;

          if (!existing || currentTimestamp > existingTimestamp) {
            callsMap[studentId] = { id: d.id, ...data };
          }
        });
        setCalls(callsMap);
      }, 
      (error) => console.error("[CallManagement] Erro no listener de chamadas:", error)
    );

    return () => { unsubS(); unsubC(); unsubCalls(); };
  }, [db, diaRef, user]);

  const toggleProcessing = (id: string, isProcessing: boolean) => {
    setProcessingIds(prev => {
      const next = new Set(prev);
      if (isProcessing) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleCall = async (student: any) => {
    if (!db || processingIds.has(student.id)) return;
    toggleProcessing(student.id, true);

    const existingCall = calls[student.id];
    const isActive = existingCall && existingCall.status === "Chamado";

    try {
      if (isActive) {
        console.log("[CallManagement] Cancelando chamada:", existingCall.id);
        const callRef = doc(db, "calls", existingCall.id);
        const payload = {
          status: "Cancelado",
          updatedAt: serverTimestamp(),
        };
        await updateDoc(callRef, payload);
        toast({ title: "Chamada Cancelada", description: `${student.nomeExibicao} foi removido do quadro.` });
      } else {
        const payload = {
          tipo: "aluno",
          studentId: student.id,
          nomeExibicao: student.nomeExibicao,
          turmaId: student.turmaId,
          turmaNome: student.turmaNome,
          status: "Chamado",
          dataHoraChamado: serverTimestamp(),
          diaRef: diaRef,
          chamadoPorUid: user?.uid,
          chamadoPorEmail: user?.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        console.log("[CallManagement] Criando/Atualizando chamada para:", student.nomeExibicao, payload);

        if (existingCall) {
          await updateDoc(doc(db, "calls", existingCall.id), payload);
        } else {
          await addDoc(collection(db, "calls"), payload);
        }
        toast({ title: "Chamado Realizado", description: `${student.nomeExibicao} foi enviado ao quadro.` });
      }
    } catch (error: any) {
      console.error("[CallManagement] Erro crítico na ação de chamada:", error);
      toast({ variant: "destructive", title: "Erro ao registrar", description: error.message });
    } finally {
      toggleProcessing(student.id, false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.nomeExibicao.toLowerCase().includes(searchTerm.toLowerCase());
      const matchClass = selectedClass === "all" || s.turmaId === selectedClass;
      return matchSearch && matchClass;
    });
  }, [students, searchTerm, selectedClass]);

  return (
    <div className="space-y-8 py-4">
      {/* Toolbar Premium Reorganizada */}
      <div className="flex flex-col lg:flex-row gap-5 items-center justify-between bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:max-w-3xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Buscar aluno por nome..."
              className="pl-12 h-14 bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-primary/10 rounded-2xl text-base transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl text-base font-semibold text-slate-700">
                <SelectValue placeholder="Todas as Turmas" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-xl">
                <SelectItem value="all" className="h-11 rounded-xl">Todas as turmas</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id} className="h-11 rounded-xl">{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 h-14 w-full lg:w-auto">
          <Button
            variant="ghost"
            onClick={() => handleSetViewMode("grid")}
            className={cn(
              "flex-1 lg:flex-none rounded-xl h-11 px-6 gap-2 transition-all font-bold text-xs uppercase tracking-widest",
              viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <LayoutGrid size={16} />
            <span>Quadro</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleSetViewMode("list")}
            className={cn(
              "flex-1 lg:flex-none rounded-xl h-11 px-6 gap-2 transition-all font-bold text-xs uppercase tracking-widest",
              viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <List size={16} />
            <span>Lista</span>
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((s) => {
              const currentCall = calls[s.id];
              const isCalled = currentCall && currentCall.status === "Chamado";
              const isProcessing = processingIds.has(s.id);

              return (
                <Card key={s.id} className={cn(
                  "premium-card group overflow-hidden border-2 transition-all duration-300 flex flex-col h-[320px] justify-between",
                  isCalled ? "border-green-500/30 bg-green-50/10" : "border-transparent"
                )}>
                  <CardContent className="p-8 flex flex-col h-full justify-between">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={cn(
                        "h-20 w-20 rounded-[28px] flex items-center justify-center shadow-inner transition-all duration-500",
                        isCalled ? "bg-green-100 text-green-600 scale-105" : "bg-slate-50 text-slate-300"
                      )}>
                        {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <User size={40} />}
                      </div>
                      
                      <div className="space-y-2 w-full">
                        <h3 className="text-xl font-black text-slate-900 leading-tight line-clamp-2 min-h-[3rem] flex items-center justify-center tracking-tight">
                          {s.nomeExibicao}
                        </h3>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                            {s.turmaNome}
                          </Badge>
                          {isCalled && (
                            <Badge className="bg-green-500 text-white border-none text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                              Chamado
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6">
                      <Button
                        variant={isCalled ? "destructive" : "default"}
                        className={cn(
                          "w-full gap-3 h-14 rounded-2xl font-black shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest",
                          !isCalled && "gradient-primary shadow-primary/20",
                          isCalled && "bg-red-500 hover:bg-red-600 shadow-red-200"
                        )}
                        disabled={isProcessing}
                        onClick={() => handleToggleCall(s)}
                      >
                        {isProcessing ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : isCalled ? (
                          <><XCircle size={18} /> Cancelar</>
                        ) : (
                          <><PhoneOutgoing size={18} /> Chamar Saída</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <EmptyState />
          )}
        </div>
      ) : (
        <div className="space-y-3 max-w-5xl mx-auto">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((s) => {
              const currentCall = calls[s.id];
              const isCalled = currentCall && currentCall.status === "Chamado";
              const isProcessing = processingIds.has(s.id);

              return (
                <div 
                  key={s.id}
                  className={cn(
                    "flex items-center justify-between p-4 bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group h-24",
                    isCalled && "border-l-4 border-l-green-500 bg-green-50/10"
                  )}
                >
                  <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                    <div className={cn(
                      "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                      isCalled ? "bg-green-100 text-green-600" : "bg-slate-50 text-slate-300"
                    )}>
                      {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <User size={28} />}
                    </div>
                    <div className="min-w-0 flex-1 pr-2 sm:pr-4">
                      <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                        {s.nomeExibicao}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{s.turmaNome}</span>
                        {isCalled && <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    {isCalled && (
                      <div className="text-right hidden sm:block">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Chamado às</span>
                        <span className="text-sm font-black text-slate-900 tabular-nums">
                          {currentCall.dataHoraChamado ? format(currentCall.dataHoraChamado.toDate(), "HH:mm") : "--:--"}
                        </span>
                      </div>
                    )}
                    <Button
                      variant={isCalled ? "destructive" : "default"}
                      className={cn(
                        "h-12 w-[90px] sm:w-[140px] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm",
                        !isCalled && "gradient-primary text-white",
                        isCalled && "bg-red-500 hover:bg-red-600 text-white"
                      )}
                      disabled={isProcessing}
                      onClick={() => handleToggleCall(s)}
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={16} /> : isCalled ? "Cancelar" : "Chamar"}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
      <div className="h-24 w-24 rounded-[32px] bg-slate-100 flex items-center justify-center">
        <AlertCircle size={48} className="text-slate-300" />
      </div>
      <div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nenhum aluno encontrado</h3>
        <p className="max-w-xs mx-auto text-slate-500 font-medium">Ajuste os filtros ou verifique o cadastro de alunos.</p>
      </div>
    </div>
  );
}
