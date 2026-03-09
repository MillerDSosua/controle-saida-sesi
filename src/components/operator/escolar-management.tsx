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
import { Plus, Edit2, Trash2, Search, Bus, PhoneOutgoing, XCircle, CheckCircle2, Loader2, Users, AlertCircle } from "lucide-react";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEscolar, setEditingEscolar] = useState<any>(null);
  const [name, setName] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [diaRef] = useState(() => format(new Date(), "yyyy-MM-dd"));

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
        console.log("[EscolarManagement] Atualizando escolar:", editingEscolar.id);
        await updateDoc(doc(db, "escolares", editingEscolar.id), {
          nome: name,
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Sucesso", description: "Escolar atualizado com sucesso." });
      } else {
        console.log("[EscolarManagement] Criando novo escolar:", name);
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
      console.error("[EscolarManagement] Erro ao salvar:", error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar escolar." });
    }
  };

  const handleDelete = async (id: string, escolarName: string) => {
    if (!db || isDeletingId) return;

    console.log(`[EscolarManagement] Tentando excluir escolar: ${escolarName} (${id})`);

    if (!confirm(`Tem certeza que deseja excluir o transporte "${escolarName}"?`)) {
      return;
    }

    setIsDeletingId(id);

    try {
      // Validação: Verificar se existem alunos vinculados a este escolar
      console.log("[EscolarManagement] Verificando dependências de alunos...");
      const studentsQuery = query(
        collection(db, "students"), 
        where("escolarId", "==", id),
        limit(1)
      );
      const studentsSnapshot = await getDocs(studentsQuery);

      if (!studentsSnapshot.empty) {
        console.warn("[EscolarManagement] Exclusão abortada: Existem alunos vinculados.");
        toast({
          variant: "destructive",
          title: "Não é possível excluir",
          description: "Existem alunos vinculados a este transporte. Altere o transporte dos alunos antes de excluir o cadastro.",
        });
        setIsDeletingId(null);
        return;
      }

      console.log("[EscolarManagement] Nenhuma dependência encontrada. Excluindo documento...");
      await deleteDoc(doc(db, "escolares", id));
      
      console.log("[EscolarManagement] Exclusão realizada com sucesso.");
      toast({ title: "Sucesso", description: "Transporte escolar removido com sucesso." });
    } catch (error: any) {
      console.error("[EscolarManagement] Erro crítico na exclusão:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao excluir", 
        description: error.message || "Ocorreu uma falha no servidor ao tentar excluir o transporte." 
      });
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

    console.log("[EscolarManagement] Iniciando toggle de chamada para escolar:", escolar.nome);
    const existingCall = calls[escolar.id];
    const relatedStudents = students.filter(s => s.escolarId === escolar.id);
    const relatedClasses = Array.from(new Set(relatedStudents.map(s => s.turmaId)));

    try {
      if (existingCall && existingCall.status === "Chamado") {
        console.log("[EscolarManagement] Cancelando chamada de escolar:", existingCall.id);
        const callRef = doc(db, "calls", existingCall.id);
        
        await updateDoc(callRef, {
          status: "Cancelado",
          updatedAt: serverTimestamp(),
        });
        console.log("[EscolarManagement] Chamada cancelada com sucesso.");
        
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

        if (existingCall) {
          console.log("[EscolarManagement] Reativando chamada de escolar existente:", existingCall.id);
          await updateDoc(doc(db, "calls", existingCall.id), payload);
        } else {
          console.log("[EscolarManagement] Criando nova chamada de escolar");
          await addDoc(collection(db, "calls"), {
            ...payload,
            createdAt: serverTimestamp(),
          });
        }
        console.log("[EscolarManagement] Chamada realizada com sucesso.");
        
        toast({ title: "Escolar Chamado", description: `Transporte ${escolar.nome} enviado ao quadro.` });
      }
    } catch (error: any) {
      console.error("[EscolarManagement] Erro ao processar chamada:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: error.message || "Falha ao processar chamada do escolar." 
      });
    } finally {
      toggleProcessing(escolar.id, false);
    }
  };

  const filteredEscolares = escolares.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Buscar escolares..."
            className="pl-12 h-12 bg-secondary/30 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingEscolar(null); setName(""); }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto gap-2 h-12 rounded-xl gradient-primary shadow-lg shadow-primary/20">
              <Plus size={18} /> Novo Escolar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingEscolar ? "Editar Escolar" : "Novo Escolar"}</DialogTitle>
                <DialogDescription>Cadastre o nome do transporte escolar ou motorista.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome do Escolar / Motorista</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Escolar do Cássio"
                    required
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full h-12 rounded-xl gradient-primary font-bold">Salvar Cadastro</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredEscolares.length > 0 ? (
          filteredEscolares.map((e) => {
            const currentCall = calls[e.id];
            const isCalled = currentCall && currentCall.status === "Chamado";
            const isProcessing = processingIds.has(e.id);
            const studentCount = students.filter(s => s.escolarId === e.id).length;

            return (
              <Card key={e.id} className={cn(
                "premium-card group overflow-hidden border-2 transition-all duration-300 flex flex-col h-[320px] relative",
                isCalled ? "border-green-500/30 bg-green-50/10" : "border-transparent"
              )}>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white/80 backdrop-blur shadow-sm hover:bg-white" onClick={(evt) => {
                    evt.stopPropagation();
                    setEditingEscolar(e);
                    setName(e.nome);
                    setIsDialogOpen(true);
                  }}>
                    <Edit2 size={14} className="text-primary" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg bg-white/80 backdrop-blur shadow-sm hover:bg-red-50" 
                    disabled={isDeletingId === e.id}
                    onClick={(evt) => {
                      evt.stopPropagation();
                      handleDelete(e.id, e.nome);
                    }}
                  >
                    {isDeletingId === e.id ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <Trash2 size={14} className="text-destructive" />}
                  </Button>
                </div>

                <CardContent className="p-6 flex flex-col h-full space-y-4">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className={cn(
                      "h-20 w-20 rounded-full flex items-center justify-center shadow-inner transition-all duration-500",
                      isCalled ? "bg-green-100 text-green-600 scale-105" : "bg-slate-100 text-slate-400"
                    )}>
                      {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <Bus size={40} />}
                    </div>
                    
                    <div className="space-y-1 w-full px-2">
                      <h3 className="text-lg font-bold text-primary leading-tight line-clamp-2 min-h-[3rem] flex items-center justify-center">
                        {e.nome}
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 mt-auto">
                    <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-100 text-[10px] font-black uppercase tracking-wider px-2.5 py-1">
                      ESCOLAR
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground border-slate-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-1">
                      <Users size={10} className="mr-1" /> {studentCount} ALUNOS
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
                      onClick={() => handleToggleCall(e)}
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
              <h3 className="text-2xl font-bold">Nenhum escolar encontrado</h3>
              <p className="max-w-xs mx-auto">Tente ajustar sua busca ou cadastre novos escolares no sistema.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}