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
import { Search, PhoneOutgoing, XCircle, User, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const [diaRef] = useState(() => format(new Date(), "yyyy-MM-dd"));

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

    console.log(`[CallManagement] ${isActive ? "Cancelando" : "Criando"} chamada para:`, student.nomeExibicao);

    try {
      if (isActive) {
        const callRef = doc(db, "calls", existingCall.id);
        const payload = {
          status: "Cancelado",
          updatedAt: serverTimestamp(),
        };
        
        console.log("[CallManagement] Gravando updateDoc em 'calls'...", callRef.path, payload);
        await updateDoc(callRef, payload);
        console.log("[CallManagement] Sucesso updateDoc.");
        
        toast({ 
          title: "Chamada Cancelada", 
          description: `${student.nomeExibicao} foi removido do quadro.` 
        });
      } else {
        const payload = {
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

        if (existingCall) {
          const callRef = doc(db, "calls", existingCall.id);
          console.log("[CallManagement] Reativando chamada existente via updateDoc...", callRef.path, payload);
          await updateDoc(callRef, payload);
          console.log("[CallManagement] Sucesso updateDoc (reativação).");
        } else {
          console.log("[CallManagement] Criando nova chamada via addDoc em 'calls'...", payload);
          const docRef = await addDoc(collection(db, "calls"), payload);
          console.log("[CallManagement] Sucesso addDoc. ID:", docRef.id);
        }
        
        toast({ 
          title: "Chamado Realizado", 
          description: `${student.nomeExibicao} foi enviado ao quadro.` 
        });
      }
    } catch (error: any) {
      console.error("[CallManagement] FALHA na escrita do Firestore:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao registrar", 
        description: error.message || "Não foi possível gravar no banco de dados." 
      });
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
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Buscar aluno por nome..."
            className="pl-12 h-12 bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-12 bg-secondary/30 border-none rounded-xl">
              <SelectValue placeholder="Todas as Turmas" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todas as turmas</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((s) => {
            const currentCall = calls[s.id];
            const isCalled = currentCall && currentCall.status === "Chamado";
            const isProcessing = processingIds.has(s.id);

            return (
              <Card key={s.id} className={cn(
                "premium-card group overflow-hidden border-2 transition-all duration-300 flex flex-col h-[320px]",
                isCalled ? "border-green-500/30 bg-green-50/10" : "border-transparent"
              )}>
                <CardContent className="p-6 flex flex-col h-full space-y-4">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={cn(
                      "h-20 w-20 rounded-full flex items-center justify-center shadow-inner transition-all duration-500",
                      isCalled ? "bg-green-100 text-green-600 scale-105" : "bg-slate-100 text-slate-400"
                    )}>
                      {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <User size={40} />}
                    </div>
                    
                    <div className="space-y-1 w-full px-2">
                      <h3 className="text-lg font-bold text-primary leading-tight line-clamp-2 min-h-[3rem] flex items-center justify-center">
                        {s.nomeExibicao}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 mt-auto">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-1">
                      {s.turmaNome}
                    </Badge>
                    {isCalled ? (
                      <Badge className="bg-green-500 text-white border-transparent text-[10px] font-black uppercase tracking-wider px-2.5 py-1 animate-pulse">
                        <CheckCircle2 size={10} className="mr-1" /> Chamado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-1">
                        Aguardando
                      </Badge>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      variant={isCalled ? "destructive" : "default"}
                      className={cn(
                        "w-full gap-2 h-12 rounded-xl font-bold shadow-lg transition-all active:scale-95 text-xs",
                        !isCalled && "gradient-primary shadow-primary/20",
                        isCalled && "bg-red-500 hover:bg-red-600 text-white shadow-red-200"
                      )}
                      disabled={isProcessing}
                      onClick={() => handleToggleCall(s)}
                    >
                      {isCalled ? (
                        <><XCircle size={16} /> Cancelar Chamada</>
                      ) : (
                        <><PhoneOutgoing size={16} /> Chamada de Saída</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
            <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center">
              <AlertCircle size={48} className="text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Nenhum aluno encontrado</h3>
              <p className="max-w-xs mx-auto">Tente ajustar seus filtros ou cadastre novos alunos no sistema.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
