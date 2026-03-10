
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
import { Search, User, Loader2, LayoutGrid, List } from "lucide-react";
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

    const unsubS = onSnapshot(query(collection(db, "students"), orderBy("nomeExibicao", "asc")), (s) => {
      setStudents(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubC = onSnapshot(query(collection(db, "classes"), orderBy("nome", "asc")), (s) => {
      setClasses(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qCalls = query(collection(db, "calls"), where("diaRef", "==", diaRef));
    const unsubCalls = onSnapshot(qCalls, (s) => {
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
    });

    return () => { unsubS(); unsubC(); unsubCalls(); };
  }, [db, diaRef, user]);

  const handleToggleCall = async (student: any) => {
    if (!db || processingIds.has(student.id)) return;
    setProcessingIds(prev => new Set(prev).add(student.id));

    const existingCall = calls[student.id];
    const isActive = existingCall && existingCall.status === "Chamado";

    try {
      if (isActive) {
        await updateDoc(doc(db, "calls", existingCall.id), { status: "Cancelado", updatedAt: serverTimestamp() });
        toast({ title: "Cancelado", description: `${student.nomeExibicao} removido.` });
      } else {
        const payload = {
          tipo: "aluno",
          studentId: student.id,
          nomeExibicao: student.nomeExibicao,
          turmaId: student.turmaId,
          turmaNome: student.turmaNome,
          status: "Chamado",
          dataHoraChamado: serverTimestamp(),
          diaRef,
          chamadoPorUid: user?.uid,
          chamadoPorEmail: user?.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (existingCall) await updateDoc(doc(db, "calls", existingCall.id), payload);
        else await addDoc(collection(db, "calls"), payload);
        toast({ title: "Chamado", description: `${student.nomeExibicao} enviado ao quadro.` });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(student.id);
        return next;
      });
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col lg:flex-row gap-5 items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:max-w-3xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                <SelectItem value="all" className="font-bold rounded-lg h-10">Todas as turmas</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id} className="font-semibold rounded-lg h-10">{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-100 h-10 w-full lg:w-auto">
          <Button 
            variant="ghost" 
            onClick={() => handleSetViewMode("grid")} 
            className={cn(
              "flex-1 lg:flex-none rounded-lg h-8 px-4 gap-2 transition-all font-black text-[10px] uppercase tracking-[0.15em]", 
              viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:bg-white/50"
            )}
          >
            <LayoutGrid size={14} /> Quadro
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => handleSetViewMode("list")} 
            className={cn(
              "flex-1 lg:flex-none rounded-lg h-8 px-4 gap-2 transition-all font-black text-[10px] uppercase tracking-[0.15em]", 
              viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-slate-400 hover:bg-white/50"
            )}
          >
            <List size={14} /> Lista
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((s) => {
            const currentCall = calls[s.id];
            const isCalled = currentCall && currentCall.status === "Chamado";
            const isProcessing = processingIds.has(s.id);
            return (
              <Card key={s.id} className={cn("rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all duration-300 h-[320px] flex flex-col justify-between overflow-hidden", isCalled ? "border-green-500/30 bg-green-50/10" : "hover:bg-slate-50/30 hover:shadow-md")}>
                <CardContent className="p-8 flex flex-col h-full justify-between items-center text-center">
                  <div className="space-y-4">
                    <div className={cn("h-20 w-20 rounded-full mx-auto flex items-center justify-center border transition-all duration-300", isCalled ? "bg-green-100 text-green-600 border-green-200" : "bg-slate-50 text-slate-300 border-slate-100")}>
                      {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <User size={40} />}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight line-clamp-2 min-h-[3rem]">{s.nomeExibicao}</h3>
                      <div className="flex justify-center gap-2">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.1em] py-0.5 px-2.5 rounded-md border-none">{s.turmaNome}</Badge>
                        {isCalled && <Badge className="bg-green-500 text-white text-[10px] font-black uppercase tracking-[0.1em] py-0.5 px-2.5 rounded-md border-none shadow-sm">Chamado</Badge>}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant={isCalled ? "destructive" : "default"} 
                    className={cn("w-full h-11 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95", !isCalled ? "gradient-primary" : "bg-red-500")} 
                    disabled={isProcessing} 
                    onClick={() => handleToggleCall(s)}
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : isCalled ? "Cancelar" : "Chamar Saída"}
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
            const isCalled = currentCall && currentCall.status === "Chamado";
            const isProcessing = processingIds.has(s.id);
            return (
              <div key={s.id} className={cn("flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all h-24 sm:h-28 hover:bg-slate-50/50", isCalled && "border-l-4 border-l-green-500 bg-green-50/10")}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={cn("h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center border shrink-0 transition-all duration-300", isCalled ? "bg-green-100 text-green-600 border-green-200" : "bg-slate-50 text-slate-300 border-slate-100")}>
                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <User size={28} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate pr-4">{s.nomeExibicao}</h4>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.turmaNome}</span>
                  </div>
                </div>
                <Button 
                  variant={isCalled ? "destructive" : "default"} 
                  className={cn("h-10 w-[90px] sm:w-[120px] rounded-xl font-black text-[11px] uppercase tracking-[0.15em] shadow-sm transition-all active:scale-95", !isCalled ? "gradient-primary text-white" : "bg-red-500 text-white")} 
                  disabled={isProcessing} 
                  onClick={() => handleToggleCall(s)}
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : isCalled ? "Cancelar" : "Chamar"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
