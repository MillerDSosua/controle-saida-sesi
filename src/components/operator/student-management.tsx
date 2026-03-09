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
  
  // Estados para Importação
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

  const handleDelete = async (id: string) => {
    if (!db) return;
    if (confirm("Deseja excluir este aluno?")) {
      try {
        await deleteDoc(doc(db, "students", id));
        toast({ title: "Sucesso", description: "Aluno removido." });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
      }
    }
  };

  // Lógica de Exportação
  const handleExport = () => {
    if (students.length === 0) {
      toast({ variant: "destructive", title: "Erro", description: "Não há alunos para exportar." });
      return;
    }

    const headers = ["nomeExibicao", "turma", "escolar"];
    const rows = students.map(s => [
      s.nomeExibicao,
      s.turmaNome,
      s.escolarNome || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `alunos_sesi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Exportação Concluída", description: "A lista de alunos foi baixada com sucesso." });
  };

  // Lógica de Baixar Modelo
  const handleDownloadModel = () => {
    const headers = ["nomeExibicao", "turma", "escolar"];
    const examples = [
      ["Miller Daniel", "7A", ""],
      ["Maria Souza", "6B", "Escolar Cássio"],
      ["João Pedro", "7B", "Trans Neneco"]
    ];

    const csvContent = [
      headers.join(","),
      ...examples.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_alunos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Lógica de Processamento de Arquivo
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
        
        // Validação
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
      // Usar lote para performance (limite 500 por lote do Firestore)
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
    <div className="space-y-6">
      {/* Barra de Ferramentas Premium */}
      <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="relative w-full xl:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <Input
            placeholder="Buscar alunos por nome ou turma..."
            className="pl-12 h-14 rounded-2xl bg-slate-50 border-none text-lg focus-visible:ring-2 focus-visible:ring-primary/10 transition-all placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <Button 
            variant="outline" 
            className="h-14 rounded-2xl border-slate-200 px-6 font-bold hover:bg-slate-50 gap-2 transition-all active:scale-95"
            onClick={handleDownloadModel}
          >
            <Download size={18} className="text-slate-500" />
            <span className="hidden sm:inline">Modelo</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-14 rounded-2xl border-slate-200 px-6 font-bold hover:bg-slate-50 gap-2 transition-all active:scale-95"
            onClick={handleExport}
          >
            <FileDown size={18} className="text-slate-500" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>

          <Button 
            variant="secondary" 
            className="h-14 rounded-2xl bg-primary/5 text-primary border-none hover:bg-primary/10 px-6 font-bold gap-2 transition-all active:scale-95"
            onClick={() => {
              setImportStep("intro");
              setImportFile(null);
              setParsedRows([]);
              setIsImportModalOpen(true);
            }}
          >
            <FileUp size={18} />
            <span className="hidden sm:inline">Importar</span>
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setEditingStudent(null); setFormData({ nomeExibicao: "", turmaId: "", escolarId: "" }); }
          }}>
            <DialogTrigger asChild>
              <Button className="h-14 rounded-2xl gradient-primary shadow-xl shadow-primary/20 px-8 font-black gap-2 transition-all active:scale-95 ml-auto sm:ml-0">
                <Plus size={20} /> Novo Aluno
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[32px] p-0 overflow-hidden border-none shadow-2xl max-w-[480px]">
              <div className="bg-primary px-8 py-10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-black tracking-tight">{editingStudent ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
                  <DialogDescription className="text-primary-foreground/70 font-medium">Preencha os dados do aluno para o sistema de chamada.</DialogDescription>
                </DialogHeader>
              </div>
              <form onSubmit={handleSave} className="p-8 space-y-8 bg-white">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nome de Exibição</Label>
                    <Input
                      value={formData.nomeExibicao}
                      onChange={(e) => setFormData({ ...formData, nomeExibicao: e.target.value })}
                      placeholder="Ex: Miller Daniel"
                      required
                      className="h-14 rounded-2xl bg-slate-50 border-none text-lg"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Turma Vinculada</Label>
                    <Select
                      value={formData.turmaId}
                      onValueChange={(val) => setFormData({ ...formData, turmaId: val })}
                    >
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none text-lg">
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-xl">
                        {classes.map(c => <SelectItem key={c.id} value={c.id} className="h-12 rounded-xl">{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Transporte Escolar (Opcional)</Label>
                    <Select
                      value={formData.escolarId || "none"}
                      onValueChange={(val) => setFormData({ ...formData, escolarId: val === "none" ? "" : val})}
                    >
                      <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none text-lg">
                        <SelectValue placeholder="Nenhum escolar" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-xl">
                        <SelectItem value="none" className="h-12 rounded-xl">Sem escolar</SelectItem>
                        {escolares.map(e => <SelectItem key={e.id} value={e.id} className="h-12 rounded-xl">{e.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isSubmitting} className="w-full h-16 rounded-2xl gradient-primary text-lg font-black shadow-xl shadow-primary/20">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : editingStudent ? "Salvar Alterações" : "Cadastrar Aluno"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Modal de Importação Premium */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="rounded-[40px] p-0 overflow-hidden border-none shadow-[0_32px_120px_-15px_rgba(0,0,0,0.3)] max-w-[900px] w-[95vw] h-[85vh] flex flex-col">
          <div className="bg-slate-900 px-10 py-12 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-4xl font-black tracking-tighter">Importar Alunos</DialogTitle>
                <DialogDescription className="text-slate-400 text-lg font-medium">Cadastre múltiplos alunos de forma segura via planilha CSV.</DialogDescription>
              </div>
              <div className="h-16 w-16 bg-white/10 rounded-[24px] flex items-center justify-center text-white/50">
                <FileUp size={32} />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 p-10">
            {importStep === "intro" && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Info size={20} className="text-primary" /> Como preparar seu arquivo
                      </h4>
                      <ul className="space-y-4">
                        {[
                          "Use o formato CSV (separado por vírgulas).",
                          "As turmas e escolares citados devem já estar cadastrados.",
                          "O cabeçalho deve ser exatamente como o modelo.",
                          "Evite caracteres especiais complexos nos nomes."
                        ].map((item, i) => (
                          <li key={i} className="flex gap-3 text-slate-600 font-medium">
                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-black">{i+1}</div>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Exemplo da Planilha</h4>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase">nomeExibicao</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">turma</TableHead>
                            <TableHead className="text-[10px] font-black uppercase">escolar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="border-none hover:bg-transparent">
                            <TableCell className="text-xs font-bold py-2">Daniel Silva</TableCell>
                            <TableCell className="text-xs font-bold py-2">7A</TableCell>
                            <TableCell className="text-xs font-bold py-2">-</TableCell>
                          </TableRow>
                          <TableRow className="border-none hover:bg-transparent">
                            <TableCell className="text-xs font-bold py-2">Maria Souza</TableCell>
                            <TableCell className="text-xs font-bold py-2">6B</TableCell>
                            <TableCell className="text-xs font-bold py-2">Escolar Cássio</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center space-y-8 bg-white rounded-[32px] border-2 border-dashed border-slate-200 p-10 hover:border-primary/30 transition-all group relative">
                    <div className="h-24 w-24 bg-primary/5 rounded-[28px] flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                      <FileUp size={40} />
                    </div>
                    <div className="text-center space-y-2">
                      <h4 className="text-xl font-black text-slate-800">Selecione o arquivo CSV</h4>
                      <p className="text-slate-500 text-sm font-medium">Clique para buscar ou arraste o arquivo aqui</p>
                    </div>
                    <Input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleFileChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {importFile && (
                      <div className="bg-primary/5 border border-primary/10 px-6 py-3 rounded-2xl flex items-center gap-3 animate-in zoom-in duration-300">
                        <CheckCircle2 size={18} className="text-primary" />
                        <span className="text-sm font-bold text-primary">{importFile.name}</span>
                        <X 
                          size={14} 
                          className="text-primary/50 cursor-pointer hover:text-primary transition-colors" 
                          onClick={(e) => { e.stopPropagation(); setImportFile(null); }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {importStep === "preview" && (
              <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                    <div className="bg-slate-900 p-6 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Linhas</span>
                      <span className="text-3xl font-black text-white">{parsedRows.length}</span>
                    </div>
                  </Card>
                  <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                    <div className="bg-green-500 p-6 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-green-100 uppercase tracking-widest">Linhas Válidas</span>
                      <span className="text-3xl font-black text-white">{parsedRows.filter(r => r.isValid).length}</span>
                    </div>
                  </Card>
                  <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                    <div className="bg-red-500 p-6 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-red-100 uppercase tracking-widest">Com Erro</span>
                      <span className="text-3xl font-black text-white">{parsedRows.filter(r => !r.isValid).length}</span>
                    </div>
                  </Card>
                </div>

                <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-8 py-6 bg-slate-50 border-b border-slate-100">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Revisão dos Dados</h4>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="font-black text-[10px] uppercase">Aluno</TableHead>
                          <TableHead className="font-black text-[10px] uppercase">Turma</TableHead>
                          <TableHead className="font-black text-[10px] uppercase">Escolar</TableHead>
                          <TableHead className="font-black text-[10px] uppercase">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedRows.map((row) => (
                          <TableRow key={row.id} className="hover:bg-slate-50/50">
                            <TableCell className="font-bold py-4">{row.nomeExibicao || "-"}</TableCell>
                            <TableCell className="font-bold text-slate-500">{row.turmaNome}</TableCell>
                            <TableCell className="font-bold text-slate-400">{row.escolarNome || "-"}</TableCell>
                            <TableCell>
                              {row.isValid ? (
                                <Badge className="bg-green-500 text-white border-none uppercase text-[8px] font-black tracking-widest">Válido</Badge>
                              ) : (
                                <Badge variant="destructive" className="uppercase text-[8px] font-black tracking-widest">{row.error}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {importStep === "success" && (
              <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in zoom-in duration-700">
                <div className="h-32 w-32 bg-green-500 rounded-[40px] flex items-center justify-center text-white shadow-2xl shadow-green-200">
                  <CheckCircle2 size={64} />
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Sucesso Absoluto!</h3>
                  <p className="text-slate-500 text-lg font-medium max-w-sm mx-auto">
                    Os alunos válidos foram importados e já estão disponíveis no sistema para chamadas.
                  </p>
                </div>
                <div className="w-full h-px bg-slate-200"></div>
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="h-14 rounded-2xl border-slate-200 px-8 font-bold"
                    onClick={() => setIsImportModalOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button 
                    className="h-14 rounded-2xl gradient-primary px-8 font-black shadow-xl shadow-primary/20"
                    onClick={() => setImportStep("intro")}
                  >
                    Importar Outro
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border-t border-slate-100 p-8 shrink-0">
            <div className="flex justify-between items-center max-w-6xl mx-auto">
              <div className="hidden sm:block">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                  Sistema SESI Inteligente<br />
                  Tecnologia de Gestão de Dados
                </p>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <Button 
                  variant="ghost" 
                  className="flex-1 sm:flex-none h-14 rounded-2xl px-8 font-bold text-slate-500"
                  onClick={() => {
                    if (importStep === "preview") setImportStep("intro");
                    else setIsImportModalOpen(false);
                  }}
                  disabled={isSubmitting}
                >
                  {importStep === "success" ? "Fechar" : "Cancelar"}
                </Button>
                
                {importStep === "intro" && (
                  <Button 
                    className="flex-1 sm:flex-none h-14 rounded-2xl gradient-primary px-10 font-black shadow-xl shadow-primary/20 transition-all active:scale-95"
                    disabled={!importFile || isValidating}
                    onClick={validateImport}
                  >
                    {isValidating ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 size={18} className="mr-2" />}
                    Validar Arquivo
                  </Button>
                )}

                {importStep === "preview" && (
                  <Button 
                    className="flex-1 sm:flex-none h-14 rounded-2xl gradient-primary px-10 font-black shadow-xl shadow-primary/20 transition-all active:scale-95"
                    disabled={isSubmitting || parsedRows.filter(r => r.isValid).length === 0}
                    onClick={executeImport}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Plus size={18} className="mr-2" />}
                    Confirmar Importação ({parsedRows.filter(r => r.isValid).length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lista de Alunos (Tabela Original Refinada) */}
      <Card className="premium-card overflow-hidden border-none shadow-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-100">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 pl-8">Identificação do Aluno</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Turma</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Transporte</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-400 pr-10">Gerenciar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="py-5 pl-8">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-[18px] bg-primary/5 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
                          <User size={22} />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-slate-900">{s.nomeExibicao}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest">
                        {s.turmaNome}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.escolarNome ? (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Bus size={16} className="text-slate-300" />
                          <span className="text-sm font-bold">{s.escolarNome}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium">Uso individual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all" onClick={() => {
                          setEditingStudent(s);
                          setFormData({ 
                            nomeExibicao: s.nomeExibicao, 
                            turmaId: s.turmaId,
                            escolarId: s.escolarId || ""
                          });
                          setIsDialogOpen(true);
                        }}>
                          <Edit2 size={18} className="text-slate-400 hover:text-primary transition-colors" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-red-50 hover:shadow-md transition-all group/del" onClick={() => handleDelete(s.id)}>
                          <Trash2 size={18} className="text-slate-300 group-hover/del:text-red-500 transition-colors" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-32 text-slate-400 font-medium italic">
                    Nenhum aluno cadastrado. Use o botão "Novo Aluno" ou "Importar" acima.
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
