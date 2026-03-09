
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, where, getDocs, limit } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Search, Bus, PhoneOutgoing, XCircle, Loader2, Users, AlertCircle, LayoutGrid, List } from "lucide-react";
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
    if (!user || !db) return;

    console.log("[EscolarManagement] Iniciando listeners para o dia:", diaRef);

    const unsubE = onSnapshot(
      query(collection(db, "escolares"), orderBy("nome", "asc")), 
      (s) => {
        setEscolares(s.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => console.error("[EscolarManagement] Erro no listener de escolares:", error)
    );

    const unsubS = onSnapshot(
      collection(db, "students"), 
      (s) => {
        setStudents(s.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => console.error("[EscolarManagement] Erro no listener de alunos:", error)
    );

    const qCalls = query(
      collection(db, "calls"), 
      where("diaRef", "==", diaRef), 
      where("tipo", "==", "escolar")
    );
    
    const unsubCalls = onSnapshot(
      qCalls, 
      (s) => {
        const callsMap: Record<string, any> = {};
        s.docs.forEach(d => {
          const data = d.data();
          if (!callsMap[data.escolarId] || data.updatedAt?.toMillis() > (callsMap[data.escolarId].updatedAt?.toMillis() || 0)) {
            callsMap[data.escolarId] = { id: d.id, ...data };
          }
        });
        setCalls(callsMap);
      },
      (error) => console.error("[EscolarManagement] Erro no listener de chamadas:", error)
    );

    return () => { unsubE(); unsubS(); unsubCalls(); };
  }, [db, diaRef, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    try {
      if (editingEscolar) {
        console.log("[EscolarManagement] Atualizando escolar:", editingEscolar.id, { nome: name });
        await updateDoc(doc(db, "escolares", editingEscolar.id), {
          nome: name,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Sucesso", description: "Escolar atualizado com sucesso." });
      } else {
        console.log("[EscolarManagement] Criando novo escolar:", { nome: name });
        await addDoc(collection(db, "escolares"), {
          nome: name,
          ativo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Sucesso", description: "Escolar cadastrado com sucesso." });
      }
      setIsDialogOpen(false);
      setEditingEscolar(null);
      setName("");
    } catch (error: any) {
      console.error("[EscolarManagement] Erro ao salvar escolar:", error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar escolar." });
    }
  };

  const handleDelete = async (id: string, escolarName: string) => {
    if (!db || isDeletingId) return;
    if (!confirm(`Tem certeza que deseja excluir o transporte "${escolarName}"?`)) return;

    setIsDeletingId(id);
    console.log(`[EscolarManagement] Tentando excluir escolar: ${escolarName} (${id})`);
    
    try {
      const studentsQuery = query(collection(db, "students"), where("escolarId", "==", id), limit(1));
      const studentsSnapshot = await getDocs(studentsQuery);
      if (!studentsSnapshot.empty) {
        console.warn("[EscolarManagement] Bloqueado: Existem alunos vinculados.");
        toast({ variant: "destructive", title: "Não é possível excluir", description: "Existem alunos vinculados a este transporte. Desvincule-os antes de excluir." });
        setIsDeletingId(null);
        return;
      }
      await deleteDoc(doc(db, "escolares", id));
      console.log("[EscolarManagement] Escolar excluído com sucesso.");
      toast({ title: "Sucesso", description: "Transporte escolar removido com sucesso." });
    } catch (error: any) {
      console.error("[EscolarManagement] Erro ao excluir escolar:", error);
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    } finally {
      setIsDeletingId(null);
    }
  };

  const toggleProcessing = (id: string, isProcessing: boolean) => {
    setProcessingIds(prev => {
      const next = new Set(prev);
      if (isProcessing) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleCall = async (escolar: any) => {
    if (!db || processingIds.has(escolar.id)) return;
    toggleProcessing(escolar.id, true);

    const existingCall = calls[escolar.id];
    const relatedStudents = students.filter(s => s.escolarId === escolar.id);
    const relatedClasses = Array.from(new Set(relatedStudents.map(s => s.turmaId)));

    try {
      if (existingCall && existingCall.status === "Chamado") {
        console.log("[EscolarManagement] Cancelando chamada de escolar:", existingCall.id);
        await updateDoc(doc(db, "calls", existingCall.id), {
          status: "Cancelado",
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Chamada Cancelada", description: `Escolar ${escolar.nome} removido do quadro.` });
      } else {
        const payload = {
          tipo: "escolar",
          escolarId: escolar.id,
          escolarNome: escolar.nome,
          status: "Chamado",
          dataHoraChamado: serverTimestamp(),
          diaRef: diaRef,
          chamadoPorUid: user?.uid,
          chamadoPorEmail: user?.email,
          turmasRelacionadas: relatedClasses,
          alunosRelacionados: relatedStudents.map(s => s.nomeExibicao),
          updatedAt: serverTimestamp(),
        };

        console.log("[EscolarManagement] Criando/Atualizando chamada de escolar:", escolar.nome, payload);

        if (existingCall) {
          await updateDoc(doc(db, "calls", existingCall.id), payload);
        } else {
          await addDoc(collection(db, "calls"), { ...payload, createdAt: serverTimestamp() });
        }
        toast({ title: "Escolar Chamado", description: `Transporte ${escolar.nome} enviado ao quadro.` });
      }
    } catch (error: any) {
      console.error("[EscolarManagement] Erro crítico na ação de chamada de escolar:", error);
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      toggleProcessing(escolar.id, false);
    }
  };

  const filteredEscolares = escolares.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 py-4">
      {/* Toolbar Premium Reorganizada */}
      <div className="flex flex-col lg:flex-row gap-5 items-center justify-between bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:max-w-3xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Buscar escolares..."
              className="pl-12 h-14 bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-primary/10 rounded-2xl text-base transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setEditingEscolar(null); setName(""); }
          }}>
            <DialogTrigger asChild>
              <Button className="h-14 rounded-2xl gradient-primary shadow-xl shadow-primary/20 px-8 font-black gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest">
                <Plus size={18} /> Novo Escolar
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[32px] p-0 overflow-hidden border-none shadow-2xl max-w-[480px]">
              <div className="bg-primary px-8 py-10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black tracking-tight">{editingEscolar ? "Editar Escolar" : "Novo Escolar"}</DialogTitle>
                  <DialogDescription className="text-primary-foreground/70 font-medium">Cadastre o nome do transporte escolar ou motorista.</DialogDescription>
                </DialogHeader>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-8 bg-white">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nome do Escolar / Motorista</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Escolar do Cássio"
                      required
                      className="h-14 rounded-2xl bg-slate-50 border-none text-lg"
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-16 rounded-2xl gradient-primary text-lg font-black shadow-xl shadow-primary/20">
                    Salvar Cadastro
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
          {filteredEscolares.length > 0 ? (
            filteredEscolares.map((e) => {
              const currentCall = calls[e.id];
              const isCalled = currentCall && currentCall.status === "Chamado";
              const isProcessing = processingIds.has(e.id);
              const studentCount = students.filter(s => s.escolarId === e.id).length;

              return (
                <Card key={e.id} className={cn(
                  "premium-card group overflow-hidden border-2 transition-all duration-300 flex flex-col h-[320px] justify-between relative",
                  isCalled ? "border-green-500/30 bg-green-50/10" : "border-transparent"
                )}>
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/90 backdrop-blur shadow-sm hover:bg-white" onClick={(evt) => {
                      evt.stopPropagation();
                      setEditingEscolar(e);
                      setName(e.nome);
                      setIsDialogOpen(true);
                    }}>
                      <Edit2 size={16} className="text-primary" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl bg-white/90 backdrop-blur shadow-sm hover:bg-red-50" 
                      disabled={isDeletingId === e.id}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        handleDelete(e.id, e.nome);
                      }}
                    >
                      {isDeletingId === e.id ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <Trash2 size={16} className="text-destructive" />}
                    </Button>
                  </div>

                  <CardContent className="p-8 flex flex-col h-full justify-between">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={cn(
                        "h-20 w-20 rounded-[28px] flex items-center justify-center shadow-inner transition-all duration-500",
                        isCalled ? "bg-green-100 text-green-600 scale-105" : "bg-slate-50 text-slate-300"
                      )}>
                        {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <Bus size={40} />}
                      </div>
                      
                      <div className="space-y-2 w-full">
                        <h3 className="text-xl font-black text-slate-900 leading-tight line-clamp-2 min-h-[3rem] flex items-center justify-center tracking-tight">
                          {e.nome}
                        </h3>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-none text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                            ESCOLAR
                          </Badge>
                          <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                            <Users size={10} className="mr-1" /> {studentCount}
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
                        onClick={() => handleToggleCall(e)}
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
            <EmptyEscolarState />
          )}
        </div>
      ) : (
        <div className="space-y-3 max-w-5xl mx-auto">
          {filteredEscolares.length > 0 ? (
            filteredEscolares.map((e) => {
              const currentCall = calls[e.id];
              const isCalled = currentCall && currentCall.status === "Chamado";
              const isProcessing = processingIds.has(e.id);
              const studentCount = students.filter(s => s.escolarId === e.id).length;

              return (
                <div 
                  key={e.id}
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
                      {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Bus size={28} />}
                    </div>
                    <div className="min-w-0 flex-1 pr-2 sm:pr-4">
                      <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                        {e.nome}
                      </h4>
                      <div className="flex items-center gap-1 sm:gap-2 mt-1">
                        <span className="text-[10px] font-black text-orange-600/70 uppercase tracking-widest shrink-0">Escolar</span>
                        <div className="h-1 w-1 rounded-full bg-slate-200 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{studentCount} Alunos</span>
                        {isCalled && <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-1 sm:mr-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl" onClick={() => {
                        setEditingEscolar(e);
                        setName(e.nome);
                        setIsDialogOpen(true);
                      }}>
                        <Edit2 size={16} className="text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl" onClick={() => handleDelete(e.id, e.nome)}>
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>

                    <Button
                      variant={isCalled ? "destructive" : "default"}
                      className={cn(
                        "h-12 w-[90px] sm:w-[140px] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm",
                        !isCalled && "gradient-primary text-white",
                        isCalled && "bg-red-500 hover:bg-red-600 text-white"
                      )}
                      disabled={isProcessing}
                      onClick={() => handleToggleCall(e)}
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={16} /> : isCalled ? "Cancelar" : "Chamar"}
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyEscolarState />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyEscolarState() {
  return (
    <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
      <div className="h-24 w-24 rounded-[32px] bg-slate-100 flex items-center justify-center">
        <AlertCircle size={48} className="text-slate-300" />
      </div>
      <div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Nenhum escolar encontrado</h3>
        <p className="max-w-xs mx-auto text-slate-500 font-medium">Cadastre novos escolares para gerenciar as saídas coletivas.</p>
      </div>
    </div>
  );
}
