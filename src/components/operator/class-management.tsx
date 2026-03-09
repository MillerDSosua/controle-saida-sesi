"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, getDocs, where, limit } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ClassManagement() {
  const db = useFirestore();
  const [classes, setClasses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "classes"), orderBy("nome", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("[ClassManagement] Erro no listener:", error));
    return () => unsubscribe();
  }, [db]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        nome: name,
        updatedAt: serverTimestamp(),
      };

      if (editingClass) {
        console.log("[ClassManagement] Atualizando classe...", editingClass.id, payload);
        await updateDoc(doc(db, "classes", editingClass.id), payload);
        toast({ title: "Sucesso", description: "Turma atualizada com sucesso." });
      } else {
        const newPayload = {
          ...payload,
          ativa: true,
          createdAt: serverTimestamp(),
        };
        console.log("[ClassManagement] Criando nova classe...", newPayload);
        await addDoc(collection(db, "classes"), newPayload);
        toast({ title: "Sucesso", description: "Turma criada com sucesso." });
      }
      setIsDialogOpen(false);
      setEditingClass(null);
      setName("");
    } catch (error: any) {
      console.error("[ClassManagement] Erro ao salvar:", error);
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message || "Não foi possível persistir os dados." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, className: string) => {
    if (!db || isDeletingId) return;
    
    console.log(`[ClassManagement] Tentando excluir turma: ${className} (${id})`);

    if (!confirm(`Tem certeza que deseja excluir a turma "${className}"?`)) {
      return;
    }

    setIsDeletingId(id);

    try {
      // Validação: Verificar se existem alunos vinculados a esta turma
      console.log("[ClassManagement] Verificando dependências de alunos...");
      const studentsQuery = query(
        collection(db, "students"), 
        where("turmaId", "==", id),
        limit(1)
      );
      const studentsSnapshot = await getDocs(studentsQuery);

      if (!studentsSnapshot.empty) {
        console.warn("[ClassManagement] Exclusão abortada: Existem alunos vinculados.");
        toast({
          variant: "destructive",
          title: "Não é possível excluir",
          description: "Existem alunos matriculados nesta turma. Remova ou transfira os alunos antes de excluir a turma.",
        });
        setIsDeletingId(null);
        return;
      }

      console.log("[ClassManagement] Nenhuma dependência encontrada. Excluindo documento...");
      await deleteDoc(doc(db, "classes", id));
      
      console.log("[ClassManagement] Exclusão realizada com sucesso.");
      toast({ title: "Sucesso", description: "Turma excluída com sucesso." });
    } catch (error: any) {
      console.error("[ClassManagement] Erro crítico na exclusão:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao excluir", 
        description: error.message || "Ocorreu uma falha no servidor ao tentar excluir." 
      });
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredClasses = classes.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar turmas..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingClass(null); setName(""); }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2">
              <Plus size={18} /> Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingClass ? "Editar Turma" : "Nova Turma"}</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="className">Nome da Turma</Label>
                  <Input
                    id="className"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: 1º Ano A"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="premium-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingClass(c);
                          setName(c.nome);
                          setIsDialogOpen(true);
                        }}>
                          <Edit2 size={16} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive" 
                          disabled={isDeletingId === c.id}
                          onClick={() => handleDelete(c.id, c.nome)}
                        >
                          {isDeletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-10 text-muted-foreground">
                    Nenhuma turma encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}