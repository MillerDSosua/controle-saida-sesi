
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, History as HistoryIcon, User, Bus } from "lucide-react";
import { cn } from "@/lib/utils";

export function HistoryManagement() {
  const [history, setHistory] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [diaRef] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const qH = query(
      collection(db, "calls"), 
      where("diaRef", "==", diaRef), 
      orderBy("dataHoraChamado", "desc")
    );
    
    const unsubH = onSnapshot(qH, (s) => {
      setHistory(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qC = query(collection(db, "classes"), orderBy("nome", "asc"));
    const unsubC = onSnapshot(qC, (s) => {
      setClasses(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubH(); unsubC(); };
  }, [diaRef]);

  const filteredHistory = history.filter(h => {
    const nameMatch = (h.nomeExibicao || h.escolarNome || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    let classMatch = selectedClass === "all";
    if (!classMatch) {
      if (h.tipo === 'escolar') {
        classMatch = h.turmasRelacionadas?.includes(selectedClass);
      } else {
        classMatch = h.turmaId === selectedClass;
      }
    }

    return nameMatch && classMatch;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Filtrar histórico por nome ou transporte..."
            className="pl-10 h-12 rounded-xl bg-white border-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="h-12 rounded-xl bg-white border-2">
            <SelectValue placeholder="Filtrar por turma envolvida" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="premium-card">
        <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4 bg-slate-50">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
            <HistoryIcon size={18} /> Histórico de Hoje ({format(new Date(), "dd 'de' MMMM", { locale: ptBR })})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Chamada</TableHead>
                <TableHead className="font-bold">Turma(s)</TableHead>
                <TableHead className="font-bold">Horário</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="hidden lg:table-cell font-bold">Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((h) => (
                  <TableRow key={h.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          h.tipo === 'escolar' ? "bg-orange-100 text-orange-600" : "bg-primary/5 text-primary"
                        )}>
                          {h.tipo === 'escolar' ? <Bus size={16} /> : <User size={16} />}
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold">{h.nomeExibicao || h.escolarNome}</span>
                           <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                              {h.tipo === 'escolar' ? "Escolar" : "Aluno Individual"}
                           </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-primary/70">
                        {h.tipo === 'escolar' ? "Multi-turmas" : h.turmaNome}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm font-bold">
                      {h.dataHoraChamado ? format(h.dataHoraChamado.toDate(), "HH:mm") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={cn(
                          "font-black uppercase text-[9px] tracking-widest px-2.5 py-1",
                          h.status === "Chamado" ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
                        )}
                      >
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {h.chamadoPorEmail}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24 text-muted-foreground opacity-50">
                    Nenhuma atividade registrada hoje.
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
