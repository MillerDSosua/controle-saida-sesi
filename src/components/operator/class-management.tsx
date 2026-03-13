"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash, Search, Loader2 } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";

export function ClassManagement() {
  const [classes, setClasses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const { toast } = useToast();

  const nowIso = () => new Date().toISOString();

  const mapSupabaseRow = (row: any) => ({
    id: row.id,
    ...(row.data || {}),
  });

  const generateId = () => {
    if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
  
    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  };

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Erro ao buscar classes:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as turmas.",
      });
      return;
    }

    const mapped = (data || [])
      .map(mapSupabaseRow)
      .sort((a, b) =>
        (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
          sensitivity: "base",
        })
      );

    setClasses(mapped);
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const payload = {
        nome: name,
        updatedAt: nowIso(),
      };

      if (editingClass) {
        const { error } = await supabase
          .from("classes")
          .update({
            data: {
              ...editingClass,
              ...payload,
            },
          })
          .eq("id", editingClass.id);

        if (error) throw error;

        toast({ title: "Sucesso", description: "Turma atualizada com sucesso." });
      } else {
        const newId = generateId();

        const { error } = await supabase.from("classes").insert([
          {
            id: newId,
            data: {
              id: newId,
              ...payload,
              ativa: true,
              createdAt: nowIso(),
            },
          },
        ]);

        if (error) throw error;

        toast({ title: "Sucesso", description: "Turma criada com sucesso." });
      }

      setIsDialogOpen(false);
      setEditingClass(null);
      setName("");
      await loadClasses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Falha ao salvar turma.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string, className: string) => {
    setItemToDelete({ id, name: className });
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete || isDeletingId) return;

    const { id } = itemToDelete;
    setIsDeletingId(id);
    setDeleteConfirmOpen(false);

    try {
      const { data: studentRows, error: studentsError } = await supabase
        .from("students")
        .select("id,data")
        .eq("data->>turmaId", id)
        .limit(1);

      if (studentsError) throw studentsError;

      if (studentRows && studentRows.length > 0) {
        toast({
          variant: "destructive",
          title: "Não é possível excluir",
          description: "Existem alunos matriculados nesta turma.",
        });
        return;
      }

      const { error } = await supabase.from("classes").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Turma excluída com sucesso." });
      await loadClasses();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message || "Falha ao excluir turma.",
      });
    } finally {
      setIsDeletingId(null);
      setItemToDelete(null);
    }
  };

  const filteredClasses = classes.filter((c) =>
    (c.nome || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              placeholder="Buscar turmas..."
              className="h-11 bg-slate-50 border-none rounded-xl pl-10 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingClass(null);
                setName("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="h-10 rounded-xl gradient-primary shadow-lg shadow-primary/20 px-6 font-black uppercase tracking-wider text-[11px] gap-2 active:scale-95 transition-all">
                <Plus size={16} /> Nova Turma
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl max-w-[480px]">
              <div className="bg-primary px-8 py-10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">
                    {editingClass ? "Editar Turma" : "Nova Turma"}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6 bg-white">
                <div className="space-y-2">
                  <Label
                    htmlFor="className"
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400"
                  >
                    Nome da Turma
                  </Label>
                  <Input
                    id="className"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: 1º Ano A"
                    required
                    disabled={isSubmitting}
                    className="h-12 rounded-xl bg-slate-50 border-none text-base font-bold"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl gradient-primary text-[11px] uppercase tracking-[0.2em] font-black active:scale-95 transition-all"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Salvar Registro"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden border border-slate-100 shadow-sm bg-white rounded-3xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="py-6 pl-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Nome da Turma
                </TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.length > 0 ? (
                filteredClasses.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/30 transition-all duration-200">
                    <TableCell className="py-4 pl-8 font-black text-lg text-slate-900 tracking-tight">
                      {c.nome}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 active:scale-90 transition-all"
                          onClick={() => {
                            setEditingClass(c);
                            setName(c.nome);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Pencil size={16} />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all"
                          disabled={isDeletingId === c.id}
                          onClick={() => handleDeleteClick(c.id, c.nome)}
                        >
                          {isDeletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash size={16} />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-20 text-slate-300 font-bold italic tracking-tight">
                    Nenhuma turma cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium">
              Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}