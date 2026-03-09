"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, History as HistoryIcon, User, Bus, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function HistoryManagement() {
  const db = useFirestore();
  const [history, setHistory] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [diaRef] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (!db) return;
    const qH = query(collection(db, "calls"), where("diaRef", "==", diaRef), orderBy("dataHoraChamado", "desc"));
    const unsubH = onSnapshot(qH, (s) => setHistory(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qC = query(collection(db, "classes"), orderBy("nome", "asc"));
    const unsubC = onSnapshot(qC, (s) => setClasses(s.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubH(); unsubC(); };
  }, [db, diaRef]);

  const filteredHistory = history.filter(h => {
    const nameMatch = (h.nomeExibicao || h.escolarNome || "").toLowerCase().includes(searchTerm.toLowerCase());
    let classMatch = selectedClass === "all";
    if (!classMatch) {
      if (h.tipo === 'escolar') classMatch = h.turmasRelacionadas?.includes(selectedClass);
      else classMatch = h.turmaId === selectedClass;
    }
    return nameMatch && classMatch;
  });

  return (
    <div className="space-y-8">
      {/* Toolbar Normalizada */}
      <div className="flex flex-col sm:flex-row gap-5 items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full sm:max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Filtrar histórico..." 
            className="pl-12 h-14 bg-slate-50 border-none rounded-2xl text-base focus-visible:ring-2 focus-visible:ring-primary/10 transition-all" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl text-base font-semibold focus:ring-2 focus:ring-primary/10 transition-all">
              <SelectValue placeholder="Todas as turmas" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl shadow-xl border-slate-100">
              <SelectItem value="all" className="font-medium">Todas as turmas</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id} className="font-medium">{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="premium-card overflow-hidden border-none shadow-sm bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b px-8 py-5 bg-slate-50/50">
          <CardTitle className="text-base font-black flex items-center gap-2 text-primary uppercase tracking-wider">
            <HistoryIcon size={18} /> Atividade de Hoje
          </CardTitle>
          <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-widest px-3 py-1">
            {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </Badge>
        </CardHeader>
        
        {/* VIEW DESKTOP: TABELA */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-widest py-5 pl-8 text-slate-400">Chamada</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Envolvidos</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Horário</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-right pr-8 text-slate-400">Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((h) => (
                  <TableRow key={h.id} className="hover:bg-slate-50/30 transition-colors">
                    <TableCell className="py-4 pl-8">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center border", h.tipo === 'escolar' ? "bg-orange-50 text-orange-500 border-orange-100" : "bg-primary/5 text-primary border-primary/10")}>
                          {h.tipo === 'escolar' ? <Bus size={18} /> : <User size={18} />}
                        </div>
                        <span className="font-bold text-slate-900 tracking-tight">{h.nomeExibicao || h.escolarNome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {h.tipo === 'escolar' ? "Escolar" : h.turmaNome}
                    </TableCell>
                    <TableCell className="font-bold text-slate-600">
                      {h.dataHoraChamado ? format(h.dataHoraChamado.toDate(), "HH:mm") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-black uppercase text-[8px] tracking-widest px-2.5 py-0.5 border-none", h.status === "Chamado" ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500")}>
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8 text-[9px] font-bold text-slate-300 uppercase tracking-wider">
                      {h.chamadoPorEmail?.split('@')[0]}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium italic">Nenhuma atividade registrada.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* VIEW MOBILE: CARDS */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((h) => (
              <div key={h.id} className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-12 w-12 rounded-full flex items-center justify-center border transition-colors", h.tipo === 'escolar' ? "bg-orange-50 text-orange-500 border-orange-100" : "bg-primary/5 text-primary border-primary/10")}>
                      {h.tipo === 'escolar' ? <Bus size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 tracking-tight text-base">{h.nomeExibicao || h.escolarNome}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {h.tipo === 'escolar' ? "Transporte" : `Turma ${h.turmaNome}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className={cn("font-black uppercase text-[8px] tracking-widest px-2.5 py-0.5 border-none", h.status === "Chamado" ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500")}>
                    {h.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-[10px] font-black tabular-nums">{h.dataHoraChamado ? format(h.dataHoraChamado.toDate(), "HH:mm") : "-"}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                    Por: {h.chamadoPorEmail?.split('@')[0]}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-slate-300 font-medium italic">Nenhuma atividade.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
