"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Search, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function StudentManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [formData, setFormData] = useState({ nomeExibicao: "", turmaId: "" });
  const { toast } = useToast();

  useEffect(() => {
    const qS = query(collection(db, "students"), orderBy("nomeExibicao", "asc"));
    const unsubS = onSnapshot(qS, (s) => setStudents(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qC = query(collection(db, "classes"), orderBy("nome", "asc"));
    const unsubC = onSnapshot(qC, (s) => setClasses(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubS(); unsubC(); };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClass = classes.find(c => c.id === formData.turmaId);
    if (!selectedClass) return;

    try {
      const data = {
        ...formData,
        turmaNome: selectedClass.nome,
        updatedAt: serverTimestamp(),
      };

      if (editingStudent) {
        await updateDoc(doc(db, "students", editingStudent.id), data);
        toast({ title: "Sucesso", description: "Aluno atualizado." });
      } else {
        await addDoc(collection(db, "students"), {
          ...data,
          ativo: true,
          createdAt: serverTimestamp(),
        });
        toast({ title: "Sucesso", description: "Aluno cadastrado." });
      }
      setIsDialogOpen(false);
      setEditingStudent(null);
      setFormData({ nomeExibicao: "", turmaId: "" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao salvar." });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja excluir este aluno?")) {
      await deleteDoc(doc(db, "students", id));
      toast({ title: "Sucesso", description: "Aluno removido." });
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
            placeholder="Buscar alunos..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingStudent(null); setFormData({ nomeExibicao: "", turmaId: "" }); }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto gap-2">
              <Plus size={18} /> Novo Aluno
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingStudent ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={formData.nomeExibicao}
                    onChange={(e) => setFormData({ ...formData, nomeExibicao: e.target.value })}
                    placeholder="Nome do aluno"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select
                    value={formData.turmaId}
                    onValueChange={(val) => setFormData({ ...formData, turmaId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Salvar</Button>
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
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-primary">
                          <User size={14} />
                        </div>
                        {s.nomeExibicao}
                      </div>
                    </TableCell>
                    <TableCell>{s.turmaNome}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingStudent(s);
                          setFormData({ nomeExibicao: s.nomeExibicao, turmaId: s.turmaId });
                          setIsDialogOpen(true);
                        }}>
                          <Edit2 size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(s.id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                    Nenhum aluno encontrado.
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