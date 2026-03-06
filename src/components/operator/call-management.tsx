"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, doc, serverTimestamp, where, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, PhoneOutgoing, XCircle, User, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
    // Listen for all students
    const unsubS = onSnapshot(collection(db, "students"), (s) => {
      setStudents(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for classes
    const unsubC = onSnapshot(query(collection(db, "classes"), orderBy("nome", "asc")), (s) => {
      setClasses(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen for today's calls
    const qCalls = query(collection(db, "calls"), where("diaRef", "==", diaRef));
    const unsubCalls = onSnapshot(qCalls, (s) => {
      const callsMap: Record<string, any> = {};
      s.docs.forEach(d => {
        const data = d.data();
        // If multiple calls exist for same student, take the latest one (simplified)
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
      toast({ title: "Chamado!", description: `${student.nomeExibicao} foi chamado.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível realizar a chamada." });
    }
  };

  const handleCancel = async (callId: string, studentName: string) => {
    try {
      await updateDoc(doc(db, "calls", callId), {
        status: "Cancelado",
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Cancelado", description: `A chamada de ${studentName} foi cancelada.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao cancelar." });
    }
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = s.nomeExibicao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass === "all" || s.turmaId === selectedClass;
    return matchSearch && matchClass;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar aluno por nome..."
            className="pl-10 h-12 apple-blur"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="h-12 apple-blur">
            <SelectValue placeholder="Filtrar por turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((s) => {
            const currentCall = calls[s.id];
            const isCalled = currentCall && currentCall.status === "Chamado";

            return (
              <Card key={s.id} className={`premium-card border-l-4 ${isCalled ? 'border-l-accent' : 'border-l-primary/20'}`}>
                <CardContent className="p-4 pt-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isCalled ? 'bg-accent/20 text-accent' : 'bg-secondary text-primary'}`}>
                        <User size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold leading-tight line-clamp-1">{s.nomeExibicao}</h3>
                        <p className="text-xs text-muted-foreground">{s.turmaNome}</p>
                      </div>
                    </div>
                  </div>

                  {isCalled ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] text-accent font-bold uppercase tracking-wider">
                        <CheckCircle2 size={12} /> Chamado hoje
                      </div>
                      <Button
                        variant="destructive"
                        className="w-full gap-2 h-10 shadow-sm"
                        onClick={() => handleCancel(currentCall.id, s.nomeExibicao)}
                      >
                        <XCircle size={16} /> Cancelar Chamada
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full gap-2 h-10 shadow-md shadow-primary/10"
                      onClick={() => handleCall(s)}
                    >
                      <PhoneOutgoing size={16} /> Chamada de Saída
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center">
            <p className="text-muted-foreground">Nenhum aluno encontrado para os filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
}