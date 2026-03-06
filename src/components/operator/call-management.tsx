"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, doc, serverTimestamp, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, PhoneOutgoing, XCircle, User, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function CallManagement() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [calls, setCalls] = useState<Record<string, any>>({});
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const diaRef = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    const unsubS = onSnapshot(collection(db, "students"), (s) => {
      setStudents(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubC = onSnapshot(query(collection(db, "classes"), orderBy("nome", "asc")), (s) => {
      setClasses(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qCalls = query(collection(db, "calls"), where("diaRef", "==", diaRef));
    const unsubCalls = onSnapshot(qCalls, (s) => {
      const callsMap: Record<string, any> = {};
      s.docs.forEach(d => {
        const data = d.data();
        callsMap[data.studentId] = { id: d.id, ...data };
      });
      setCalls(callsMap);
    });

    return () => { unsubS(); unsubC(); unsubCalls(); };
  }, [diaRef]);

  const handleCall = async (student: any) => {
    try {
      await addDoc(collection(db, "calls"), {
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
      });
      toast({ title: "Chamado Realizado", description: `${student.nomeExibicao} foi para o quadro de saída.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao realizar chamada." });
    }
  };

  const handleCancel = async (callId: string, studentName: string) => {
    if (!confirm(`Deseja cancelar a chamada de ${studentName}?`)) return;
    
    try {
      await updateDoc(doc(db, "calls", callId), {
        status: "Cancelado",
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Chamada Cancelada", description: `O registro de ${studentName} foi atualizado.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao cancelar." });
    }
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = s.nomeExibicao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass === "all" || s.turmaId === selectedClass;
    return matchSearch && matchClass;
  });

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border">
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
            const isCanceled = currentCall && currentCall.status === "Cancelado";

            return (
              <Card key={s.id} className={cn(
                "premium-card group overflow-hidden border-2",
                isCalled ? "border-green-500/30 bg-green-50/10" : "border-transparent"
              )}>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-16 w-16 rounded-full flex items-center justify-center shadow-inner transition-colors duration-500",
                      isCalled ? "bg-green-100 text-green-600" : isCanceled ? "bg-red-100 text-red-600" : "bg-secondary text-primary/40"
                    )}>
                      <User size={32} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-primary leading-tight truncate">{s.nomeExibicao}</h3>
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{s.turmaNome}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCalled ? (
                      <span className="status-badge status-called">
                        <CheckCircle2 size={12} className="mr-1" /> Chamado
                      </span>
                    ) : isCanceled ? (
                      <span className="status-badge status-canceled">
                        <XCircle size={12} className="mr-1" /> Cancelado
                      </span>
                    ) : (
                      <span className="status-badge status-waiting">
                        Aguardando
                      </span>
                    )}
                  </div>

                  <div className="pt-2">
                    {isCalled ? (
                      <Button
                        variant="destructive"
                        className="w-full gap-2 h-12 rounded-xl font-bold shadow-md shadow-red-200"
                        onClick={() => handleCancel(currentCall.id, s.nomeExibicao)}
                      >
                        <XCircle size={18} /> Cancelar Chamada
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full gap-2 h-12 rounded-xl font-bold gradient-primary shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                        onClick={() => handleCall(s)}
                      >
                        <PhoneOutgoing size={18} /> Chamar Aluno
                      </Button>
                    )}
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