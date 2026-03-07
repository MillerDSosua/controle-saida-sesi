"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Search, User, Bus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function StudentManagement() {
  const db = useFirestore();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [escolares, setEscolares] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [formData, setFormData] = useState({ nomeExibicao: "", turmaId: "", escolarId: "" });
  const { toast } = useToast();

  useEffect(() => {
    if (!db) return;
    const unsubS = onSnapshot(query(collection(db, "students"), orderBy("nomeExibicao", "asc")), (s) => {
      setStudents(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubC = onSnapshot(query(collection(db, "classes"), orderBy("nome", "asc")), (s) => {
      setClasses(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubE = onSnapshot(query(collection(db, "escolares"), orderBy("nome", "asc")), (s) => {
      setEscolares(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubS(); unsubC(); unsubE(); };
  }, [db]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || isSubmitting) return;

    const selectedClass = classes.find(c => c.id === formData.turmaId);
    if (!selectedClass) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione uma turma válida." });
      return;
    }

    setIsSubmitting(true);
    const selectedEscolar = escolares.find(e => e.id === formData.escolarId);

    try {
      const data = {
        nomeExibicao: formData.nomeExibicao,
        turmaId: formData.turmaId,
        turmaNome: selectedClass.nome,
        escolarId: formData.escolarId || null,
        escolarNome: selectedEscolar ? selectedEscolar.nome : null,
        updatedAt: serverTimestamp(),
      };

      if (editingStudent) {
        console.log("[StudentManagement] Atualizando aluno...", editingStudent.id, data);
        await updateDoc(doc(db, "students", editingStudent.id), data);
        console.log("[StudentManagement] Sucesso updateDoc.");
        toast({ title: "Sucesso", description: "Aluno atualizado." });
      } else {
        const newPayload = {
          ...data,
          ativo: true,
          createdAt: serverTimestamp(),
        };
        console.log("[StudentManagement] Criando novo aluno...", newPayload);
        const docRef = await addDoc(collection(db, "students"), newPayload);
        console.log("[StudentManagement] Sucesso addDoc. ID:", docRef.id);
        toast({ title: "Sucesso", description: "Aluno cadastrado." });
      }
      setIsDialogOpen(false);
      setEditingStudent(null);
      setFormData({ nomeExibicao: "", turmaId: "", escolarId: "" });
    } catch (error: any) {
      console.error("[StudentManagement] Erro ao salvar:", error);
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message || "Falha na comunicação com o banco de dados." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    if (confirm("Deseja excluir este aluno?")) {
      try {
        console.log("[StudentManagement] Excluindo aluno...", id);
        await deleteDoc(doc(db, "students", id));
        console.log("[StudentManagement] Sucesso deleteDoc.");
        toast({ title: "Sucesso", description: "Aluno removido." });
      } catch (error: any) {
        console.error("[StudentManagement] Erro ao excluir:", error);
        toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.nomeExibicao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.turmaNome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar alunos por nome ou turma..."
            className="pl-10 h-12 rounded-xl bg-white border-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingStudent(null); setFormData({ nomeExibicao: "", turmaId: "", escolarId: "" }); }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2 h-12 rounded-xl gradient-primary shadow-lg">
              <Plus size={18} /> Novo Aluno
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingStudent ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
              </DialogHeader>
              <div className="py-6 space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome Completo</Label>
                  <Input
                    value={formData.nomeExibicao}
                    onChange={(e) => setFormData({ ...formData, nomeExibicao: e.target.value })}
                    placeholder="Ex: Miller Daniel"
                    required
                    disabled={isSubmitting}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Turma Atual</Label>
                  <Select
                    disabled={isSubmitting}
                    value={formData.turmaId}
                    onValueChange={(val) => setFormData({ ...formData, turmaId: val })}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Escolar (Opcional)</Label>
                  <Select
                    disabled={isSubmitting}
                    value={formData.escolarId || "none"}
                    onValueChange={(val) => setFormData({ ...formData, escolarId: val === "none" ? "" : val})}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder="Nenhum escolar vinculado" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none">Nenhum escolar</SelectItem>
                      {escolares
                      .filter(e => e.id && e.nome) 
                      .map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl gradient-primary font-bold">
                  {isSubmitting ? "Gravando..." : "Salvar Cadastro"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="premium-card overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold py-5">Aluno</TableHead>
                <TableHead className="font-bold">Turma</TableHead>
                <TableHead className="font-bold">Escolar</TableHead>
                <TableHead className="text-right font-bold pr-8">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                          <User size={16} />
                        </div>
                        {s.nomeExibicao}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-primary/70">{s.turmaNome}</span>
                    </TableCell>
                    <TableCell>
                      {s.escolarNome ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Bus size={14} className="text-primary/40" />
                          <span className="text-xs font-semibold">{s.escolarNome}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => {
                          setEditingStudent(s);
                          setFormData({ 
                            nomeExibicao: s.nomeExibicao, 
                            turmaId: s.turmaId,
                            escolarId: s.escolarId || ""
                          });
                          setIsDialogOpen(true);
                        }}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 rounded-xl" onClick={() => handleDelete(s.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 text-muted-foreground">
                    Nenhum aluno cadastrado.
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
