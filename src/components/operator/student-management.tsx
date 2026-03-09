"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, writeBatch } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  User, 
  Bus, 
  FileUp, 
  FileDown, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Info,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function StudentManagement() {
  const db = useFirestore();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [escolares, setEscolares] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [formData, setFormData] = useState({ nomeExibicao: "", turmaId: "", escolarId: "" });
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<"intro" | "preview" | "success">("intro");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);
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
      setFormData({ nomeExibicao: "", turmaId: "", escolarId: "" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!db || isDeletingId) return;
    if (!confirm(`Tem certeza que deseja excluir o aluno "${name}"?`)) return;

    setIsDeletingId(id);
    try {
      await deleteDoc(doc(db, "students", id));
      toast({ title: "Sucesso", description: "Aluno removido com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleExport = () => {
    if (students.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Não há alunos para exportar." });
      return;
    }
    const headers = ["nomeExibicao", "turma", "escolar"];
    const rows = students.map(s => [s.nomeExibicao, s.turmaNome, s.escolarNome || ""]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `alunos_sesi_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleDownloadModel = () => {
    const headers = ["nomeExibicao", "turma", "escolar"];
    const examples = [["Miller Daniel", "7A", ""], ["Maria Souza", "6B", "Escolar Cássio"]];
    const csvContent = [headers.join(","), ...examples.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_importacao_alunos.csv";
    link.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImportFile(file);
  };

  const validateImport = async () => {
    if (!importFile || !db) return;
    setIsValidating(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim() !== "");
      const headers = lines[0].split(",").map(h => h.trim());
      const rows = lines.slice(1).map((line, index) => {
        const values = line.split(",").map(v => v.trim());
        const rowData: any = {};
        headers.forEach((h, i) => rowData[h] = values[i]);
        const targetClass = classes.find(c => c.nome.toLowerCase() === rowData.turma?.toLowerCase());
        const targetEscolar = rowData.escolar ? escolares.find(e => e.nome.toLowerCase() === rowData.escolar?.toLowerCase()) : null;
        return {
          id: index,
          nomeExibicao: rowData.nomeExibicao,
          turmaNome: rowData.turma,
          escolarNome: rowData.escolar,
          turmaId: targetClass?.id || null,
          escolarId: targetEscolar?.id || null,
          isValid: !!(rowData.nomeExibicao && targetClass),
          error: !rowData.nomeExibicao ? "Nome ausente" : !targetClass ? "Turma não encontrada" : null
        };
      });
      setParsedRows(rows);
      setImportStep("preview");
      setIsValidating(false);
    };
    reader.readAsText(importFile);
  };

  const executeImport = async () => {
    if (!db) return;
    setIsSubmitting(true);
    const validRows = parsedRows.filter(r => r.isValid);
    try {
      const batch = writeBatch(db);
      validRows.forEach(row => {
        const newDocRef = doc(collection(db, "students"));
        batch.set(newDocRef, {
          nomeExibicao: row.nomeExibicao,
          turmaId: row.turmaId,
          turmaNome: row.turmaNome,
          escolarId: row.escolarId || null,
          escolarNome: row.escolarNome || null,
          ativo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setImportStep("success");
      toast({ title: "Importação Concluída", description: `${validRows.length} alunos foram cadastrados.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro na Importação", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.nomeExibicao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.turmaNome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Toolbar Normalizada */}
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="relative w-full xl:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Buscar alunos..."
            className="pl-12 h-14 rounded-2xl bg-slate-50 border-none text-base focus-visible:ring-2 focus-visible:ring-primary/10 transition-all placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Ações de Importação/Exportação */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 h-14 bg-slate-100/30 px-2 rounded-2xl border border-slate-100/50">
            <Button 
              variant="ghost" 
              className="flex-1 sm:flex-none h-10 rounded-xl px-4 font-bold hover:bg-white hover:shadow-sm text-slate-600 gap-2 transition-all active:scale-95"
              onClick={handleDownloadModel}
            >
              <Download size={16} />
              <span className="text-[10px] uppercase tracking-wider">Modelo</span>
            </Button>
            
            <Button 
              variant="ghost" 
              className="flex-1 sm:flex-none h-10 rounded-xl px-4 font-bold hover:bg-white hover:shadow-sm text-slate-600 gap-2 transition-all active:scale-95"
              onClick={handleExport}
            >
              <FileDown size={16} />
              <span className="text-[10px] uppercase tracking-wider">Exportar</span>
            </Button>

            <Button 
              variant="ghost" 
              className="flex-1 sm:flex-none h-10 rounded-xl bg-white shadow-sm px-4 font-bold text-primary gap-2 transition-all active:scale-95"
              onClick={() => {
                setImportStep("intro");
                setImportFile(null);
                setParsedRows([]);
                setIsImportModalOpen(true);
              }}
            >
              <FileUp size={16} />
              <span className="text-[10px] uppercase tracking-wider">Importar</span>
            </Button>
          </div>

          {/* Botão Novo Aluno */}
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setEditingStudent(null); setFormData({ nomeExibicao: "", turmaId: "", escolarId: "" }); }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-14 rounded-2xl gradient-primary shadow-lg shadow-primary/20 px-8 font-black gap-2 transition-transform active:scale-95">
                <Plus size={20} /> Novo Aluno
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[32px] p-0 overflow-hidden border-none shadow-2xl max-w-[480px]">
              <div className="bg-primary px-8 py-10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">{editingStudent ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
                  <DialogDescription className="text-primary-foreground/70 font-medium">Dados do aluno para o sistema de chamada.</DialogDescription>
                </DialogHeader>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-6 bg-white">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome de Exibição</Label>
                    <Input
                      value={formData.nomeExibicao}
                      onChange={(e) => setFormData({ ...formData, nomeExibicao: e.target.value })}
                      placeholder="Ex: Miller Daniel"
                      required
                      className="h-12 rounded-xl bg-slate-50 border-none text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Turma</Label>
                    <Select value={formData.turmaId} onValueChange={(val) => setFormData({ ...formData, turmaId: val })}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none text-base">
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        {classes.map(c => <SelectItem key={c.id} value={c.id} className="h-11 rounded-lg">{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escolar (Opcional)</Label>
                    <Select value={formData.escolarId || "none"} onValueChange={(val) => setFormData({ ...formData, escolarId: val === "none" ? "" : val})}>
                      <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none text-base">
                        <SelectValue placeholder="Sem escolar" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        <SelectItem value="none" className="h-11 rounded-lg">Uso individual</SelectItem>
                        {escolares.map(e => <SelectItem key={e.id} value={e.id} className="h-11 rounded-lg">{e.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl gradient-primary text-base font-black">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Salvar Aluno"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="rounded-[40px] p-0 overflow-hidden border-none shadow-2xl max-w-[800px] w-[95vw] h-[80vh] flex flex-col">
          <div className="bg-slate-900 px-8 py-10 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-black tracking-tight">Importar Alunos</DialogTitle>
                <DialogDescription className="text-slate-400 text-base">Cadastre múltiplos alunos via CSV.</DialogDescription>
              </div>
              <FileUp size={32} className="opacity-20" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
            {importStep === "intro" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Info size={16} className="text-primary" /> Instruções
                    </h4>
                    <ul className="space-y-3 text-sm text-slate-600">
                      <li className="flex gap-2"><CheckCircle2 size={14} className="text-green-500 shrink-0" /> Use arquivo CSV.</li>
                      <li className="flex gap-2"><CheckCircle2 size={14} className="text-green-500 shrink-0" /> Turmas devem existir.</li>
                      <li className="flex gap-2"><CheckCircle2 size={14} className="text-green-500 shrink-0" /> Siga o modelo padrão.</li>
                    </ul>
                  </div>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-white group hover:border-primary/30 transition-all relative">
                    <FileUp size={32} className="text-slate-300 group-hover:scale-110 transition-transform mb-4" />
                    <p className="text-sm font-bold text-slate-500">Selecione o arquivo CSV</p>
                    <Input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {importFile && <Badge className="mt-4 bg-primary/10 text-primary border-none">{importFile.name}</Badge>}
                  </div>
                </div>
              </div>
            )}
            {importStep === "preview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
                    <p className="text-2xl font-black">{parsedRows.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-green-100 text-center">
                    <p className="text-[10px] font-black uppercase text-green-500">Válidos</p>
                    <p className="text-2xl font-black text-green-600">{parsedRows.filter(r => r.isValid).length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-red-100 text-center">
                    <p className="text-[10px] font-black uppercase text-red-500">Erros</p>
                    <p className="text-2xl font-black text-red-600">{parsedRows.filter(r => !r.isValid).length}</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase">Aluno</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Turma</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-bold">{row.nomeExibicao}</TableCell>
                          <TableCell className="text-sm font-medium">{row.turmaNome}</TableCell>
                          <TableCell>
                            {row.isValid ? <Badge className="bg-green-500 text-[8px] font-black">OK</Badge> : <Badge variant="destructive" className="text-[8px] font-black">{row.error}</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            {importStep === "success" && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="h-20 w-20 bg-green-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-green-200">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-black tracking-tight">Importação Finalizada</h3>
                <Button onClick={() => setIsImportModalOpen(false)} className="rounded-xl h-12 px-8 gradient-primary">Fechar</Button>
              </div>
            )}
          </div>
          <div className="bg-white border-t p-6 flex justify-between items-center shrink-0">
            <Button variant="ghost" className="font-bold" onClick={() => setIsImportModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <div className="flex gap-3">
              {importStep === "intro" && <Button disabled={!importFile || isValidating} onClick={validateImport} className="h-12 rounded-xl gradient-primary px-8 font-black">{isValidating ? <Loader2 className="animate-spin" /> : "Validar"}</Button>}
              {importStep === "preview" && <Button disabled={isSubmitting || !parsedRows.some(r => r.isValid)} onClick={executeImport} className="h-12 rounded-xl gradient-primary px-8 font-black">{isSubmitting ? <Loader2 className="animate-spin" /> : "Confirmar Importação"}</Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="premium-card overflow-hidden border-none shadow-sm bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="py-5 pl-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Aluno</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Turma</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transporte</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/30 group">
                    <TableCell className="py-4 pl-8">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shrink-0">
                          <User size={18} />
                        </div>
                        <span className="font-bold text-base tracking-tight text-slate-900 truncate max-w-[150px] sm:max-w-none">{s.nomeExibicao}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none px-2.5 py-0.5 font-black text-[9px] uppercase tracking-wider">
                        {s.turmaNome}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.escolarNome ? (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Bus size={14} className="text-slate-300" />
                          <span className="text-sm font-medium">{s.escolarNome}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-bold uppercase">Individual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white hover:shadow-sm" onClick={() => {
                          setEditingStudent(s);
                          setFormData({ nomeExibicao: s.nomeExibicao, turmaId: s.turmaId, escolarId: s.escolarId || "" });
                          setIsDialogOpen(true);
                        }}>
                          <Edit2 size={16} className="text-slate-400 hover:text-primary transition-colors" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-red-50" disabled={isDeletingId === s.id} onClick={() => handleDelete(s.id, s.nomeExibicao)}>
                          {isDeletingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} className="text-slate-300 hover:text-red-500 transition-colors" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 text-slate-400 font-medium italic">
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
