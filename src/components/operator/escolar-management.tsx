"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash,
  Search,
  Bus,
  Loader2,
  Users,
  LayoutGrid,
  List,
  X,
  UserPlus,
  GraduationCap,
} from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

export function EscolarManagement() {
  const { user } = useAuth();
  const [escolares, setEscolares] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [calls, setCalls] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEscolar, setEditingEscolar] = useState<any>(null);
  const [name, setName] = useState("");
  const [studentToAddId, setStudentToAddId] = useState<string>("");
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isUpdatingVincule, setIsUpdatingVincule] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  const { toast } = useToast();
  const [diaRef] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const nowIso = () => new Date().toISOString();

  const generateId = () => {
    if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }

    return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  };

  const mapSupabaseRow = (row: any) => ({
    id: row.id,
    ...(row.data || {}),
  });

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

  const loadEscolares = async () => {
    const { data, error } = await supabase
      .from("escolares")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Erro ao buscar escolares:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os escolares.",
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

    setEscolares(mapped);
  };

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Erro ao buscar students:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os alunos.",
      });
      return;
    }

    const mapped = (data || [])
      .map(mapSupabaseRow)
      .sort((a, b) =>
        (a.nomeExibicao || "").localeCompare(b.nomeExibicao || "", "pt-BR", {
          sensitivity: "base",
        })
      );

    setStudents(mapped);
  };

  const loadCalls = async () => {
    const { data, error } = await supabase
      .from("calls")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Erro ao buscar calls:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as chamadas.",
      });
      return;
    }

    const mapped = (data || []).map(mapSupabaseRow);

    const filtered = mapped.filter(
      (call) => call.diaRef === diaRef && call.tipo === "escolar"
    );

    const callsMap: Record<string, any> = {};

    filtered.forEach((call) => {
      const current = callsMap[call.escolarId];

      const currentUpdated = current?.updatedAt
        ? new Date(current.updatedAt).getTime()
        : 0;

      const newUpdated = call.updatedAt
        ? new Date(call.updatedAt).getTime()
        : 0;

      if (!current || newUpdated > currentUpdated) {
        callsMap[call.escolarId] = call;
      }
    });

    setCalls(callsMap);
  };

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      await Promise.all([loadEscolares(), loadStudents(), loadCalls()]);
    };

    init();
  }, [user, diaRef]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingEscolar) {
        const { error } = await supabase
          .from("escolares")
          .update({
            data: {
              ...editingEscolar,
              nome: name,
              updatedAt: nowIso(),
            },
          })
          .eq("id", editingEscolar.id);

        if (error) throw error;

        toast({ title: "Sucesso", description: "Escolar atualizado." });
      } else {
        const newId = generateId();

        const { error } = await supabase.from("escolares").insert([
          {
            id: newId,
            data: {
              id: newId,
              nome: name,
              ativo: true,
              createdAt: nowIso(),
              updatedAt: nowIso(),
            },
          },
        ]);

        if (error) throw error;

        toast({ title: "Sucesso", description: "Escolar cadastrado." });
      }

      setIsDialogOpen(false);
      setEditingEscolar(null);
      setName("");
      setStudentToAddId("");

      await Promise.all([loadEscolares(), loadStudents(), loadCalls()]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao salvar.",
      });
    }
  };

  const handleAddStudentToEscolar = async () => {
    if (!editingEscolar || !studentToAddId) return;

    setIsUpdatingVincule(true);

    try {
      const student = students.find((s) => s.id === studentToAddId);
      if (!student) return;

      const { error } = await supabase
        .from("students")
        .update({
          data: {
            ...student,
            escolarId: editingEscolar.id,
            escolarNome: editingEscolar.nome,
            updatedAt: nowIso(),
          },
        })
        .eq("id", student.id);

      if (error) throw error;

      setStudentToAddId("");

      toast({
        title: "Vínculo Criado",
        description: `${student.nomeExibicao} agora faz parte deste escolar.`,
      });

      await loadStudents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao vincular aluno.",
      });
    } finally {
      setIsUpdatingVincule(false);
    }
  };

  const handleRemoveStudentFromEscolar = async (studentId: string, studentName: string) => {
    try {
      const student = students.find((s) => s.id === studentId);
      if (!student) return;

      const { error } = await supabase
        .from("students")
        .update({
          data: {
            ...student,
            escolarId: null,
            escolarNome: null,
            updatedAt: nowIso(),
          },
        })
        .eq("id", studentId);

      if (error) throw error;

      toast({
        title: "Vínculo Removido",
        description: `O aluno ${studentName} foi removido deste transporte.`,
      });

      await loadStudents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao remover vínculo.",
      });
    }
  };

  const handleDeleteClick = (id: string, escolarName: string) => {
    setItemToDelete({ id, name: escolarName });
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!itemToDelete || isDeletingId) return;

    const { id } = itemToDelete;
    setIsDeletingId(id);
    setDeleteConfirmOpen(false);

    try {
      const linkedStudent = students.find((s) => s.escolarId === id);

      if (linkedStudent) {
        toast({
          variant: "destructive",
          title: "Não é possível excluir",
          description:
            "Não é possível excluir este escolar enquanto houver alunos vinculados. Remova ou transfira os alunos antes de excluir.",
        });
        return;
      }

      const { error } = await supabase.from("escolares").delete().eq("id", id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Transporte removido." });

      await Promise.all([loadEscolares(), loadStudents(), loadCalls()]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message || "Falha ao excluir.",
      });
    } finally {
      setIsDeletingId(null);
      setItemToDelete(null);
    }
  };

  const handleToggleCall = async (escolar: any) => {
    if (processingIds.has(escolar.id)) return;

    setProcessingIds((prev) => new Set(prev).add(escolar.id));

    const existingCall = calls[escolar.id];
    const relatedStudents = students.filter((s) => s.escolarId === escolar.id);
    const relatedClasses = Array.from(new Set(relatedStudents.map((s) => s.turmaId)));

    try {
      if (existingCall && existingCall.status === "Chamado") {
        const { error } = await supabase
          .from("calls")
          .update({
            data: {
              ...existingCall,
              status: "Cancelado",
              updatedAt: nowIso(),
            },
          })
          .eq("id", existingCall.id);

        if (error) throw error;

        toast({ title: "Cancelado", description: `Escolar ${escolar.nome} removido.` });
      } else {
        const payload = {
          tipo: "escolar",
          escolarId: escolar.id,
          escolarNome: escolar.nome,
          status: "Chamado",
          dataHoraChamado: nowIso(),
          diaRef,
          chamadoPorUid: user?.id || null,
          chamadoPorEmail: user?.email || null,
          turmasRelacionadas: relatedClasses,
          alunosRelacionados: relatedStudents.map((s) => s.nomeExibicao),
          updatedAt: nowIso(),
        };

        if (existingCall) {
          const { error } = await supabase
            .from("calls")
            .update({
              data: {
                ...existingCall,
                ...payload,
              },
            })
            .eq("id", existingCall.id);

          if (error) throw error;
        } else {
          const newId = generateId();

          const { error } = await supabase.from("calls").insert([
            {
              id: newId,
              data: {
                id: newId,
                ...payload,
                createdAt: nowIso(),
              },
            },
          ]);

          if (error) throw error;
        }

        toast({ title: "Chamado", description: `Escolar ${escolar.nome} enviado ao quadro.` });
      }

      await loadCalls();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Falha ao processar chamada.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(escolar.id);
        return next;
      });
    }
  };

  const filteredEscolares = escolares.filter((e) =>
    (e.nome || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const linkedStudents = editingEscolar
    ? students.filter((s) => s.escolarId === editingEscolar.id)
    : [];

  const unlinkedStudents = students.filter((s) => !s.escolarId);

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

            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setEditingEscolar(null);
                  setName("");
                  setStudentToAddId("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="h-10 rounded-xl gradient-primary shadow-lg shadow-primary/20 px-6 font-black gap-2 active:scale-95 transition-all text-[11px] uppercase tracking-wider">
                  <Plus size={16} /> Novo Escolar
                </Button>
              </DialogTrigger>

              <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl max-w-[550px] flex flex-col max-h-[90vh]">
                <div className="bg-primary px-8 py-8 text-white shrink-0">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight">
                      {editingEscolar ? "Editar Escolar" : "Novo Escolar"}
                    </DialogTitle>
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">
                      Configurações de Transporte
                    </p>
                  </DialogHeader>
                </div>

                <div className="p-8 space-y-8 bg-white overflow-y-auto flex-1 scrollbar-hide">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Nome do Escolar / Motorista
                    </Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Escolar do Cássio"
                      required
                      className="h-12 rounded-xl bg-slate-50 border-none text-base font-bold text-slate-900"
                    />
                  </div>

                  {editingEscolar && (
                    <>
                      <Separator className="bg-slate-50" />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Alunos Vinculados ({linkedStudents.length})
                          </Label>
                        </div>

                        <div className="space-y-2">
                          {linkedStudents.length > 0 ? (
                            linkedStudents.map((student) => (
                              <div
                                key={student.id}
                                className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100">
                                    <GraduationCap size={16} />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900 leading-none">
                                      {student.nomeExibicao}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                      {student.turmaNome}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                  onClick={() =>
                                    handleRemoveStudentFromEscolar(student.id, student.nomeExibicao)
                                  }
                                >
                                  <X size={14} />
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 font-medium italic text-center py-4">
                              Nenhum aluno vinculado a este transporte.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 pt-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Vincular Novo Aluno
                        </Label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Select value={studentToAddId} onValueChange={setStudentToAddId}>
                              <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl text-sm font-bold">
                                <SelectValue placeholder="Selecione um aluno..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-none shadow-xl">
                                {unlinkedStudents.length > 0 ? (
                                  unlinkedStudents.map((student) => (
                                    <SelectItem
                                      key={student.id}
                                      value={student.id}
                                      className="h-10 font-bold"
                                    >
                                      {student.nomeExibicao} ({student.turmaNome})
                                    </SelectItem>
                                  ))
                                ) : (
                                  <p className="p-3 text-xs text-center text-slate-400">
                                    Todos os alunos já possuem transporte.
                                  </p>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            disabled={!studentToAddId || isUpdatingVincule}
                            onClick={handleAddStudentToEscolar}
                            className="h-12 w-12 gradient-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg active:scale-95 transition-all"
                          >
                            {isUpdatingVincule ? (
                              <Loader2 className="animate-spin" size={18} />
                            ) : (
                              <UserPlus size={18} />
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <DialogFooter className="p-8 bg-slate-50/50 shrink-0">
                  <Button
                    type="submit"
                    onClick={handleSave}
                    className="w-full h-12 rounded-xl gradient-primary text-sm font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-primary/20"
                  >
                    Salvar Alterações
                  </Button>
                </DialogFooter>
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
            const studentCount = students.filter((s) => s.escolarId === e.id).length;

            return (
              <Card
                key={e.id}
                className={cn(
                  "rounded-[2rem] border border-slate-100 bg-white shadow-sm transition-all duration-300 h-[340px] sm:h-[320px] flex flex-col justify-between overflow-hidden relative",
                  isCalled ? "border-green-500/30 bg-green-50/10" : "hover:bg-slate-50/5"
                )}
              >
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 active:scale-90 transition-all rounded-xl"
                    onClick={() => {
                      setEditingEscolar(e);
                      setName(e.nome);
                      setIsDialogOpen(true);
                    }}
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all rounded-xl"
                    disabled={isDeletingId === e.id}
                    onClick={() => handleDeleteClick(e.id, e.nome)}
                    title="Excluir"
                  >
                    {isDeletingId === e.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash size={16} />
                    )}
                  </Button>
                </div>
                <CardContent className="p-6 sm:p-8 flex flex-col h-full justify-between items-center text-center">
                  <div className="space-y-4 sm:space-y-6 w-full mt-2 sm:mt-0">
                    <div
                      className={cn(
                        "h-12 w-12 sm:h-20 sm:w-20 rounded-[1.25rem] sm:rounded-[2rem] mx-auto flex items-center justify-center transition-all duration-300",
                        isCalled ? "bg-green-100 text-green-600" : "bg-slate-50 text-slate-300"
                      )}
                    >
                      {isProcessing ? (
                        <Loader2 className="animate-spin" size={24} />
                      ) : (
                        <Bus size={24} className="sm:w-10 sm:h-10 opacity-70 sm:opacity-100" />
                      )}
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] px-2">
                        {e.nome}
                      </h3>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-orange-50 text-orange-600 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] py-0.5 px-2 rounded-md border-none"
                        >
                          ESCOLAR
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] py-0.5 px-2 rounded-md border-slate-100 bg-white shadow-xs"
                        >
                          <Users size={10} className="mr-1.5" /> {studentCount}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={isCalled ? "destructive" : "default"}
                    className={cn(
                      "w-full h-12 sm:h-11 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 mt-4",
                      !isCalled ? "gradient-primary" : "bg-red-500"
                    )}
                    disabled={isProcessing}
                    onClick={() => handleToggleCall(e)}
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" />
                    ) : isCalled ? (
                      "Cancelar"
                    ) : (
                      "Chamar Saída"
                    )}
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
            const studentCount = students.filter((s) => s.escolarId === e.id).length;

            return (
              <div
                key={e.id}
                className={cn(
                  "flex items-center justify-between p-3 sm:p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all h-24 sm:h-28 hover:bg-slate-50/10",
                  isCalled && "border-l-4 border-l-green-500 bg-green-50/10"
                )}
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div
                    className={cn(
                      "h-10 w-10 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300",
                      isCalled
                        ? "bg-green-100 text-green-600 border-green-200"
                        : "bg-slate-50 text-slate-300 border-slate-100"
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Bus size={24} className="sm:size-28 opacity-60 sm:opacity-100" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate pr-2 sm:pr-4">
                      {e.nome}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-orange-600/70 uppercase tracking-[0.2em]">
                        Escolar
                      </span>
                      <span className="hidden sm:inline text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                        | {studentCount} Alunos
                      </span>
                      <span className="sm:hidden text-[10px] font-bold text-slate-400">
                        {studentCount} Alunos
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <div className="flex items-center gap-1 sm:gap-2 mr-1 sm:mr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 active:scale-90 transition-all rounded-xl"
                      onClick={() => {
                        setEditingEscolar(e);
                        setName(e.nome);
                        setIsDialogOpen(true);
                      }}
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all rounded-xl"
                      disabled={isDeletingId === e.id}
                      onClick={() => handleDeleteClick(e.id, e.nome)}
                      title="Excluir"
                    >
                      {isDeletingId === e.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash size={16} />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant={isCalled ? "destructive" : "default"}
                    className={cn(
                      "h-10 w-[80px] sm:w-[120px] rounded-xl font-black text-[11px] uppercase tracking-[0.15em] shadow-sm transition-all active:scale-95",
                      !isCalled ? "gradient-primary text-white" : "bg-red-500 text-white"
                    )}
                    disabled={isProcessing}
                    onClick={() => handleToggleCall(e)}
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" />
                    ) : isCalled ? (
                      "Cancelar"
                    ) : (
                      "Chamar"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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