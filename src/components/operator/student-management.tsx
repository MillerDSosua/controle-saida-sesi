"use client";

import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, writeBatch } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Pencil, 
  Trash, 
  Search, 
  User, 
  FileUp, 
  FileDown, 
  Download, 
  CheckCircle2, 
  Loader2,
  Info,
  Bus
} from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';

export function StudentManagement() {
  const db = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);
  
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

  const handleDeleteClick = (id: string, name: string) => {
    setItemToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!db || !itemToDelete || isDeletingId) return;
    const { id } = itemToDelete;
    setIsDeletingId(id);
    setDeleteConfirmOpen(false);
    
    try {
      await deleteDoc(doc(db, "students", id));
      toast({ title: "Sucesso", description: "Aluno removido com sucesso." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    } finally {
      setIsDeletingId(null);
      setItemToDelete(null);
    }
  };

  const handleExport = () => {
    if (students.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Não há alunos para exportar." });
      return;
    }

    const data = students.map(s => ({
      nomeExibicao: s.nomeExibicao,
      turma: s.turmaNome,
      escolar: s.escolarNome || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");
    XLSX.writeFile(workbook, `alunos_sesi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadModel = () => {
    const data = [
      { nomeExibicao: "Miller Daniel", turma: "7A", escolar: "" },
      { nomeExibicao: "Maria Souza", turma: "6B", escolar: "Escolar Cássio" }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo");
    XLSX.writeFile(workbook, "modelo_importacao_alunos.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportStep("intro");
      setIsImportModalOpen(true);
      // Reset input to allow selecting same file again
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      setImportFile(file);
      setImportStep("intro");
      setIsImportModalOpen(true);
    }
  };

  const validateImport = async () => {
    if (!importFile || !db) return;
    setIsValidating(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const rows = json.map((rowData: any, index) => {
          const nome = rowData.nomeExibicao || rowData["nomeExibicao"] || "";
          const turma = rowData.turma || rowData["turma"] || "";
          const escolar = rowData.escolar || rowData["escolar"] || "";

          const targetClass = classes.find(c => 
            c.nome.toLowerCase().trim() === turma.toString().toLowerCase().trim()
          );
          
          const targetEscolar = escolar 
            ? escolares.find(e => e.nome.toLowerCase().trim() === escolar.toString().toLowerCase().trim()) 
            : null;

          return {
            id: index,
            nomeExibicao: nome,
            turmaNome: turma,
            escolarNome: escolar,
            turmaId: targetClass?.id || null,
            escolarId: targetEscolar?.id || null,
            isValid: !!(nome && targetClass),
            error: !nome ? "Nome ausente" : !targetClass ? "Turma não encontrada" : null
          };
        });

        setParsedRows(rows);
        setImportStep("preview");
      } catch (err: any) {
        toast({ 
          variant: "destructive", 
          title: "Erro na leitura", 
          description: "Não foi possível processar o arquivo. Verifique o formato." 
        });
      } finally {
        setIsValidating(false);
      }
    };
    reader.readAsArrayBuffer(importFile);
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex flex-col xl:flex-row gap-5 items-center justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              placeholder="Buscar alunos..."
              className="h-11 bg-slate-50 border-none rounded-xl pl-10 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Button 
                variant="ghost" 
                className="h-10 rounded-xl px-4 font-bold bg-slate-50 hover:bg-slate-100 text-slate-500 gap-2 active:scale-95 text-[10px] uppercase tracking-wider shrink-0"
                onClick={handleDownloadModel}
              >
                <Download size={14} /> Modelo
              </Button>
              
              <Button 
                variant="ghost" 
                className="h-10 rounded-xl px-4 font-bold bg-slate-50 hover:bg-slate-100 text-slate-500 gap-2 active:scale-95 text-[10px] uppercase tracking-wider shrink-0"
                onClick={handleExport}
              >
                <FileDown size={14} /> Exportar
              </Button>

              <Button 
                variant="ghost" 
                className="h-10 rounded-xl px-4 font-bold bg-slate-50 hover:bg-slate-100 text-primary gap-2 active:scale-95 text-[10px] uppercase tracking-wider shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp size={14} /> Importar
              </Button>

              {/* Hidden file input for toolbar button */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileChange} 
              />
            </div>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) { setEditingStudent(null); setFormData({ nomeExibicao: "", turmaId: "", escolarId: "" }); }
            }}>
              <DialogTrigger asChild>
                <Button className="h-10 w-full sm:w-auto rounded-xl gradient-primary shadow-lg shadow-primary/20 px-6 font-black gap-2 active:scale-95 text-[11px] uppercase tracking-wider">
                  <Plus size={18} /> Novo Aluno
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl max-w-[480px]">
                <div className="bg-primary px-8 py-10 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tight">{editingStudent ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
                  </DialogHeader>
                </div>
                <form onSubmit={handleSave} className="p-8 space-y-6 bg-white">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nome de Exibição</Label>
                      <Input
                        value={formData.nomeExibicao}
                        onChange={(e) => setFormData({ ...formData, nomeExibicao: e.target.value })}
                        placeholder="Ex: Miller Daniel"
                        required
                        className="h-12 rounded-xl bg-slate-50 border-none text-base font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Turma</Label>
                      <Select value={formData.turmaId} onValueChange={(val) => setFormData({ ...formData, turmaId: val })}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none text-base font-bold">
                          <SelectValue placeholder="Selecione a turma" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl p-1">
                          {classes.map(c => <SelectItem key={c.id} value={c.id} className="h-11 rounded-lg font-semibold">{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Escolar (Opcional)</Label>
                      <Select value={formData.escolarId || "none"} onValueChange={(val) => setFormData({ ...formData, escolarId: val === "none" ? "" : val})}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none text-base font-bold">
                          <SelectValue placeholder="Sem escolar" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-xl p-1">
                          <SelectItem value="none" className="h-11 rounded-lg font-semibold">Uso individual</SelectItem>
                          {escolares.map(e => <SelectItem key={e.id} value={e.id} className="h-11 rounded-lg font-semibold">{e.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl gradient-primary text-base font-black active:scale-95 transition-transform">
                      {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Salvar Cadastro"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="rounded-[3rem] p-0 overflow-hidden border-none shadow-2xl max-w-[800px] w-[95vw] h-[80vh] flex flex-col">
          <div className="bg-slate-900 px-8 py-10 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-black tracking-tight">Importar Alunos</DialogTitle>
                <DialogDescription className="text-slate-400 text-base font-medium">Cadastre múltiplos registros via planilha Excel ou CSV.</DialogDescription>
              </div>
              <FileUp size={32} className="opacity-20" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
            {importStep === "intro" && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                      <Info size={16} className="text-primary" /> Instruções de Uso
                    </h4>
                    <ul className="space-y-3 text-sm text-slate-500 font-medium">
                      <li className="flex gap-2.5"><CheckCircle2 size={16} className="text-green-500 shrink-0" /> Utilize arquivos no formato .xlsx, .xls ou .csv.</li>
                      <li className="flex gap-2.5"><CheckCircle2 size={16} className="text-green-500 shrink-0" /> As turmas informadas devem existir no sistema.</li>
                      <li className="flex gap-2.5"><CheckCircle2 size={16} className="text-green-500 shrink-0" /> Mantenha os cabeçalhos do modelo padrão.</li>
                    </ul>
                  </div>
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] p-8 bg-white group hover:border-primary/30 hover:bg-primary/[0.02] transition-all relative"
                  >
                    <FileUp size={32} className="text-slate-300 transition-transform mb-4" />
                    <p className="text-sm font-black text-slate-500 tracking-tight">Arraste ou selecione o arquivo</p>
                    {/* Input to handle clicks and manual file picking */}
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={handleFileChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                    {importFile && <Badge className="mt-4 bg-primary text-white border-none px-3 py-1 font-bold">{importFile.name}</Badge>}
                  </div>
                </div>
              </div>
            )}
            {importStep === "preview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total</p>
                    <p className="text-2xl font-black">{parsedRows.length}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-green-100 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Válidos</p>
                    <p className="text-2xl font-black text-green-600">{parsedRows.filter(r => r.isValid).length}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-red-100 text-center shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Erros</p>
                    <p className="text-2xl font-black text-red-600">{parsedRows.filter(r => !r.isValid).length}</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Aluno</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Turma</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row, i) => (
                        <TableRow key={i} className="hover:bg-slate-50/30">
                          <TableCell className="text-sm font-black text-slate-900 tracking-tight">{row.nomeExibicao}</TableCell>
                          <TableCell className="text-sm font-bold text-slate-500">{row.turmaNome}</TableCell>
                          <TableCell>
                            {row.isValid ? (
                              <Badge className="bg-green-500 text-white text-[8px] font-black tracking-widest border-none">VÁLIDO</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[8px] font-black tracking-widest border-none">{row.error?.toUpperCase()}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            {importStep === "success" && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-5">
                <div className="h-24 w-24 bg-green-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-green-200 animate-in zoom-in duration-500">
                  <CheckCircle2 size={48} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-3xl font-black tracking-tight text-slate-900">Sucesso Absoluto</h3>
                  <p className="text-slate-500 font-medium">Os registros foram processados e salvos.</p>
                </div>
                <Button onClick={() => setIsImportModalOpen(false)} className="rounded-xl h-14 px-10 gradient-primary font-black uppercase tracking-widest active:scale-95 transition-all">Concluir</Button>
              </div>
            )}
          </div>
          <div className="bg-white border-t p-6 flex justify-between items-center shrink-0">
            <Button variant="ghost" className="font-black text-[11px] uppercase tracking-widest text-slate-400 hover:text-slate-900" onClick={() => setIsImportModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <div className="flex gap-3">
              {importStep === "intro" && <Button disabled={!importFile || isValidating} onClick={validateImport} className="h-12 rounded-xl gradient-primary px-8 font-black uppercase tracking-widest active:scale-95 transition-all">{isValidating ? <Loader2 className="animate-spin" /> : "Validar Arquivo"}</Button>}
              {importStep === "preview" && <Button disabled={isSubmitting || !parsedRows.some(r => r.isValid)} onClick={executeImport} className="h-12 rounded-xl gradient-primary px-8 font-black uppercase tracking-widest active:scale-95 transition-all">{isSubmitting ? <Loader2 className="animate-spin" /> : "Confirmar e Importar"}</Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="py-6 pl-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Aluno</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Turma</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Transporte</TableHead>
              <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50/30 transition-all duration-200">
                  <TableCell className="py-4 pl-8">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shrink-0">
                        <User size={18} />
                      </div>
                      <span className="font-black text-base tracking-tight text-slate-900 truncate max-w-[150px] sm:max-w-none">{s.nomeExibicao}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest rounded-md">
                      {s.turmaNome}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {s.escolarNome ? (
                      <div className="flex items-center gap-2.5 text-slate-600 font-bold text-sm">
                        <Bus size={14} className="text-orange-500/60" />
                        <span>{s.escolarNome}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Individual</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 active:scale-90 transition-all" 
                        onClick={() => {
                          setEditingStudent(s);
                          setFormData({ nomeExibicao: s.nomeExibicao, turmaId: s.turmaId, escolarId: s.escolarId || "" });
                          setIsDialogOpen(true);
                        }}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 rounded-xl bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all" 
                        disabled={isDeletingId === s.id}
                        onClick={() => handleDeleteClick(s.id, s.nomeExibicao)}
                      >
                        {isDeletingId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash size={16} />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20 text-slate-300 font-bold italic tracking-tight">
                  Nenhum registro de aluno localizado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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
