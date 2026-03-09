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
        await updateDoc(doc(db, "classes", editingClass.id), payload);
        toast({ title: "Sucesso", description: "Turma atualizada com sucesso." });
      } else {
        const newPayload = {
          ...payload,
          ativa: true,
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, "classes"), newPayload);
        toast({ title: "Sucesso", description: "Turma criada com sucesso." });
      }
      setIsDialogOpen(false);
      setEditingClass(null);
      setName("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, className: string) => {
    if (!db || isDeletingId) return;
    if (!confirm(`Tem certeza que deseja excluir a turma "${className}"?`)) return;

    setIsDeletingId(id);
    try {
      const studentsQuery = query(collection(db, "students"), where("turmaId", "==", id), limit(1));
      const studentsSnapshot = await getDocs(studentsQuery);

      if (!studentsSnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Não é possível excluir",
          description: "Existem alunos matriculados nesta turma.",
        });
        setIsDeletingId(null);
        return;
      }

      await deleteDoc(doc(db, "classes", id));
      toast({ title: "Sucesso", description: "Turma excluída com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredClasses = classes.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      {/* Toolbar Normalizada */}
      <div className="flex flex-col sm:flex-row gap-5 items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Buscar turmas..."
            className="pl-12 h-14 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/10 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingClass(null); setName(""); }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto h-14 rounded-2xl gradient-primary shadow-lg shadow-primary/20 px-8 font-black gap-2 transition-transform active:scale-95">
              <Plus size={18} /> Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[32px] p-0 overflow-hidden border-none shadow-2xl max-w-[480px]">
            <div className="bg-primary px-8 py-10 text-white">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">{editingClass ? "Editar Turma" : "Nova Turma"}</DialogTitle>
              </DialogHeader>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-6 bg-white">
              <div className="space-y-2">
                <Label htmlFor="className" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Turma</Label>
                <Input
                  id="className"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: 1º Ano A"
                  required
                  disabled={isSubmitting}
                  className="h-12 rounded-xl bg-slate-50 border-none text-base"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl gradient-primary text-base font-black">
                  {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Salvar Turma"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="premium-card overflow-hidden border-none shadow-sm bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="py-5 pl-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Nome</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/30">
                    <TableCell className="py-4 pl-8 font-bold text-slate-900">{c.nome}</TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => {
                          setEditingClass(c);
                          setName(c.nome);
                          setIsDialogOpen(true);
                        }}>
                          <Edit2 size={16} className="text-slate-400 hover:text-primary" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-lg hover:bg-red-50" 
                          disabled={isDeletingId === c.id}
                          onClick={() => handleDelete(c.id, c.nome)}
                        >
                          {isDeletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} className="text-slate-300 hover:text-red-500" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-20 text-slate-400 font-medium italic">
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
