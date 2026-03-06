
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
import { Search, History as HistoryIcon } from "lucide-react";

export function HistoryManagement() {
  const [history, setHistory] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [diaRef, setDiaRef] = useState<string>("");

  useEffect(() => {
    setDiaRef(format(new Date(), "yyyy-MM-dd"));
  }, []);

  useEffect(() => {
    if (!diaRef) return;

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
    const matchSearch = h.nomeExibicao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = selectedClass === "all" || h.turmaId === selectedClass;
    return matchSearch && matchClass;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Filtrar histórico por nome..."
            className="pl-10 h-12 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="h-12 rounded-xl">
            <SelectValue placeholder="Filtrar por turma" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="premium-card">
        <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <HistoryIcon size={18} /> Histórico de Hoje ({diaRef ? format(new Date(), "dd 'de' MMMM", { locale: ptBR }) : "..."})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Aluno</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.nomeExibicao}</TableCell>
                    <TableCell>{h.turmaNome}</TableCell>
                    <TableCell>
                      {h.dataHoraChamado ? format(h.dataHoraChamado.toDate(), "HH:mm") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={h.status === "Chamado" ? "default" : "destructive"} className="font-bold">
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {h.chamadoPorEmail}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
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
