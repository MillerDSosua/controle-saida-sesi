"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, where, getDocs, limit } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash, Search, Bus, Loader2, Users, LayoutGrid, List } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function EscolarManagement() {
  const { user } = useAuth();
  const db = useFirestore();
  const [escolares, setEscolares] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [calls, setCalls] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEscolar, setEditingEscolar] = useState<any>(null);
  const [name, setName] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
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
    if (!user || !db) return;

    const unsubE = onSnapshot(
      query(collection(db, "escolares"), orderBy("nome", "asc")), 
      (s) => {
        setEscolares(s.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubS = onSnapshot(collection(db, "students"), (s) => {
      setStudents(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qCalls = query(collection(db, "calls"), where("diaRef", "==", diaRef), where("tipo", "==", "escolar"));
    const unsubCalls = onSnapshot(qCalls, (s) => {
      const callsMap: Record<string, any> = {};
      s.docs.forEach(d => {
        const data = d.data();
        if (!callsMap[data.escolarId] || data.updatedAt?.toMillis() > (callsMap[data.escolarId].updatedAt?.toMillis() || 0)) {
          callsMap[data.escolarId] = { id: d.id, ...data };
        }
      });
      setCalls(callsMap);
    });

    return () => { unsubE(); unsubS(); unsubCalls(); };
  }, [db, diaRef, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    try {
      if (editingEscolar) {
        await updateDoc(doc(db, "escolares", editingEscolar.id), {
          nome: name,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Sucesso", description: "Escolar atualizado." });
      } else {
        await addDoc(collection(db, "escolares"), {
          nome: name,
          ativo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Sucesso", description: "Escolar cadastrado." });
      }
      setIsDialogOpen(false);
      setEditingEscolar(null);
      setName("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar." });
    }
  };

  const handleDelete = async (id: string, escolarName: string) => {
    if (!db || isDeletingId) return;
    if (!confirm(`Tem certeza que deseja excluir o transporte "${escolarName}"?\nEsta ação não poderá ser desfeita.`)) return;

    setIsDeletingId(id);
    try {
      const studentsQuery = query(collection(db, "students"), where("escolarId", "==", id), limit(1));
      const studentsSnapshot = await getDocs(studentsQuery);
      if (!studentsSnapshot.empty) {
        toast({ variant: "destructive", title: "Não é possível excluir", description: "Existem alunos vinculados." });
        setIsDeletingId(null);
        return;
      }
      await deleteDoc(doc(db, "escolares", id));
      toast({ title: "Sucesso", description: "Transporte removido." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleToggleCall = async (escolar: any) => {
    if (!db || processingIds.has(escolar.id)) return;
    setProcessingIds(prev => new Set(prev).add(escolar.id));

    const existingCall = calls[escolar.id];
    const relatedStudents = students.filter(s => s.escolarId === escolar.id);
    const relatedClasses = Array.from(new Set(relatedStudents.map(s => s.turmaId)));

    try {
      if (existingCall && existingCall.status === "Chamado") {
        await updateDoc(doc(db, "calls", existingCall.id), { status: "Cancelado", updatedAt: serverTimestamp() });
        toast({ title: "Cancelado", description: `Escolar ${escolar.nome} removido.` });
      } else {
        const payload = {
          tipo: "escolar",
          escolarId: escolar.id,
          escolarNome: escolar.nome,
          status: "Chamado",
          dataHoraChamado: serverTimestamp(),
          diaRef,
          chamadoPorUid: user?.uid,
          chamadoPorEmail: user?.email,
          turmasRelacionadas: relatedClasses,
          alunosRelacionados: relatedStudents.map(s => s.nomeExibicao),
          updatedAt: serverTimestamp(),
        };
        if (existingCall) await updateDoc(doc(db, "calls", existingCall.id), payload);
        else await addDoc(collection(db, "calls"), { ...payload, createdAt: serverTimestamp() });
        toast({ title: "Chamado", description: `Escolar ${escolar.nome} enviado ao quadro.` });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(escolar.id);
        return next;
      });
    }
  };

  const filteredEscolares = escolares.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-5 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Buscar escolares..."
                className="h-11 bg-slate-50 border-none rounded-xl pl-10 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) { setEditingEscolar(null); setName(""); }
            }}>
              <DialogTrigger asChild>
                <Button className="h-10 rounded-xl gradient-primary shadow-lg shadow-primary/20 px-6 font-black gap-2 active:scale-95 transition-all text-[11px] uppercase tracking-wider">
                  <Plus size={16} /> Novo Escolar
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl max-w-[480px]">
                <div className="bg-primary px-8 py-10 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight">
                      {editingEscolar ? "Editar Escolar" : "Novo Escolar"}
                    </DialogTitle>
                  </DialogHeader>
                </div>
                <form onSubmit={handleSave} className="p-8 space-y-6 bg-white">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nome do Escolar / Motorista</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Escolar do Cássio" required className="h-12 rounded-xl bg-slate-50 border-none text-base" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-12 rounded-xl gradient-primary text-base font-black active:scale-95 transition-transform">Salvar Cadastro</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEscolares.map((e) => {
            const currentCall = calls[e.id];
            const isCalled = currentCall && currentCall.status === "Chamado";
            const isProcessing = processingIds.has(e.id);
            const studentCount = students.filter(s => s.escolarId === e.id).length;

            return (
              <Card key={e.id} className={cn("rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all duration-300 h-[320px] flex flex-col justify-between overflow-hidden relative", isCalled ? "border-green-500/30 bg-green-50/10" : "hover:bg-slate-50/10")}>
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 bg-white shadow-sm text-slate-400 hover:text-primary rounded-xl active:scale-90 transition-all" 
                    onClick={() => { setEditingEscolar(e); setName(e.nome); setIsDialogOpen(true); }}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 bg-white shadow-sm text-slate-300 hover:text-red-500 rounded-xl active:scale-90 transition-all" 
                    disabled={isDeletingId === e.id} 
                    onClick={() => handleDelete(e.id, e.nome)}
                  >
                    {isDeletingId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash size={14} />}
                  </Button>
                </div>
                <CardContent className="p-8 flex flex-col h-full justify-between items-center text-center">
                  <div className="space-y-4 w-full">
                    <div className={cn("h-20 w-20 rounded-[2rem] mx-auto flex items-center justify-center transition-all duration-300", isCalled ? "bg-green-100 text-green-600" : "bg-slate-50 text-slate-300")}>
                      {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <Bus size={40} />}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight line-clamp-2 min-h-[3rem]">{e.nome}</h3>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Badge variant="secondary" className="bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-[0.1em] py-0.5 px-2.5 rounded-md border-none">ESCOLAR</Badge>
                        <Badge variant="outline" className="text-slate-400 text-[10px] font-black uppercase tracking-[0.1em] py-0.5 px-2.5 rounded-md border-slate-100 bg-white shadow-xs">
                          <Users size={10} className="mr-1.5" /> {studentCount}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant={isCalled ? "destructive" : "default"} 
                    className={cn("w-full h-11 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95", !isCalled ? "gradient-primary" : "bg-red-500")} 
                    disabled={isProcessing} 
                    onClick={() => handleToggleCall(e)}
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
          {filteredEscolares.map((e) => {
            const currentCall = calls[e.id];
            const isCalled = currentCall && currentCall.status === "Chamado";
            const isProcessing = processingIds.has(e.id);
            const studentCount = students.filter(s => s.escolarId === e.id).length;

            return (
              <div key={e.id} className={cn("flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all h-24 sm:h-28 hover:bg-slate-50/30", isCalled && "border-l-4 border-l-green-500 bg-green-50/10")}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={cn("h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300", isCalled ? "bg-green-100 text-green-600 border-green-200" : "bg-slate-50 text-slate-300 border-slate-100")}>
                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Bus size={28} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate pr-4">{e.nome}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-orange-600/70 uppercase tracking-[0.2em]">Escolar</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">| {studentCount} Alunos</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 sm:gap-2 mr-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl bg-slate-50 text-slate-400 hover:text-primary active:scale-90 transition-all" 
                      onClick={() => { setEditingEscolar(e); setName(e.nome); setIsDialogOpen(true); }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl bg-slate-50 text-slate-300 hover:text-red-500 active:scale-90 transition-all" 
                      disabled={isDeletingId === e.id} 
                      onClick={() => handleDelete(e.id, e.nome)}
                    >
                      {isDeletingId === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash size={14} />}
                    </Button>
                  </div>
                  <Button 
                    variant={isCalled ? "destructive" : "default"} 
                    className={cn("h-10 w-[90px] sm:w-[120px] rounded-xl font-black text-[11px] uppercase tracking-[0.15em] shadow-sm transition-all active:scale-95", !isCalled ? "gradient-primary text-white" : "bg-red-500 text-white")} 
                    disabled={isProcessing} 
                    onClick={() => handleToggleCall(e)}
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : isCalled ? "Cancelar" : "Chamar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}