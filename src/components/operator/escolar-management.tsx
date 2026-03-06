
"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Search, Bus, PhoneOutgoing, XCircle, CheckCircle2, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function EscolarManagement() {
  const { user } = useAuth();
  const [escolares, setEscolares] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [calls, setCalls] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEscolar, setEditingEscolar] = useState<any>(null);
  const [name, setName] = useState("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [diaRef] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const unsubE = onSnapshot(query(collection(db, "escolares"), orderBy("nome", "asc")), (s) => {
      setEscolares(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubS = onSnapshot(collection(db, "students"), (s) => {
      setStudents(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qCalls = query(collection(db, "calls"), where("diaRef", "==", diaRef), where("tipo", "==", "escolar"));
    const unsubCalls = onSnapshot(qCalls, (s) => {
      const callsMap: Record<string, any> = {};
      s.docs.forEach(d => {
        const data = d.data();
        callsMap[data.escolarId] = { id: d.id, ...data };
      });
      setCalls(callsMap);
    });

    return () => { unsubE(); unsubS(); unsubCalls(); };
  }, [diaRef]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar escolar." });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja excluir este escolar?")) {
      await deleteDoc(doc(db, "escolares", id));
      toast({ title: "Sucesso", description: "Escolar removido." });
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
    if (processingIds.has(escolar.id)) return;
    toggleProcessing(escolar.id, true);

    try {
      const existingCall = calls[escolar.id];
      const relatedStudents = students.filter(s => s.escolarId === escolar.id);
      const relatedClasses = Array.from(new Set(relatedStudents.map(s => s.turmaId)));

      if (existingCall && existingCall.status === "Chamado") {
        await updateDoc(doc(db, "calls", existingCall.id), {
          status: "Cancelado",
          updatedAt: serverTimestamp(),
        });
        toast({ title: "Chamada Cancelada", description: `Escolar ${escolar.nome} removido do quadro.` });
      } else {
        if (existingCall) {
          await updateDoc(doc(db, "calls", existingCall.id), {
            status: "Chamado",
            dataHoraChamado: serverTimestamp(),
            updatedAt: serverTimestamp(),
            chamadoPorUid: user?.uid,
            chamadoPorEmail: user?.email,
            turmasRelacionadas: relatedClasses,
            alunosRelacionados: relatedStudents.map(s => s.nomeExibicao),
          });
        } else {
          await addDoc(collection(db, "calls"), {
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
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        toast({ title: "Escolar Chamado", description: `Transporte ${escolar.nome} enviado ao quadro.` });
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar chamada de escolar." });
    } finally {
      toggleProcessing(escolar.id, false);
    }
  };

  const filteredEscolares = escolares.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-2xl shadow-sm border">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar escolares..."
            className="pl-10 h-12 rounded-xl bg-secondary/30 border-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingEscolar(null); setName(""); }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2 h-12 rounded-xl gradient-primary">
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
                  <Label>Nome do Escolar / Motorista</Label>
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
                <Button type="submit" className="h-12 rounded-xl gradient-primary">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEscolares.map((e) => {
          const isCalled = calls[e.id]?.status === "Chamado";
          const isProcessing = processingIds.has(e.id);
          const studentCount = students.filter(s => s.escolarId === e.id).length;

          return (
            <Card key={e.id} className={cn(
              "premium-card border-2 transition-all duration-300",
              isCalled ? "border-green-500/30 bg-green-50/10" : "border-transparent"
            )}>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner",
                    isCalled ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {isProcessing ? <Loader2 className="animate-spin" /> : <Bus size={28} />}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => {
                      setEditingEscolar(e);
                      setName(e.nome);
                      setIsDialogOpen(true);
                    }}>
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-destructive" onClick={() => handleDelete(e.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-primary truncate">{e.nome}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">{studentCount} Alunos Vinculados</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCalled ? (
                    <Badge className="bg-green-500 text-white border-transparent text-[10px] font-black uppercase tracking-wider px-3 py-1 animate-pulse">
                      <CheckCircle2 size={10} className="mr-1" /> Chamado Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px] font-black uppercase tracking-wider px-3 py-1">
                      Em Espera
                    </Badge>
                  )}
                </div>

                <Button
                  variant={isCalled ? "destructive" : "default"}
                  className={cn(
                    "w-full h-14 rounded-xl font-bold gap-2 text-sm shadow-lg",
                    !isCalled && "gradient-primary shadow-primary/20",
                    isCalled && "bg-red-500 hover:bg-red-600"
                  )}
                  disabled={isProcessing}
                  onClick={() => handleToggleCall(e)}
                >
                  {isCalled ? (
                    <><XCircle size={18} /> Cancelar Chamada</>
                  ) : (
                    <><PhoneOutgoing size={18} /> Chamar Escolar</>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {filteredEscolares.length === 0 && (
          <div className="col-span-full py-24 text-center opacity-40">
            <Bus size={48} className="mx-auto mb-4" />
            <h3 className="text-xl font-bold">Nenhum escolar cadastrado</h3>
          </div>
        )}
      </div>
    </div>
  );
}
