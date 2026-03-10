
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Toolbar Normalizada Premium */}
      <div className="flex flex-col lg:flex-row gap-5 items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:max-w-3xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              placeholder="Buscar no histórico de hoje..." 
              className="pl-12 h-14 bg-slate-50 border-none rounded-2xl text-base font-medium focus-visible:ring-2 focus-visible:ring-primary/10 transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl text-base font-bold focus:ring-2 focus:ring-primary/10 transition-all">
                <SelectValue placeholder="Todas as Turmas" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-xl border-slate-100 p-1">
                <SelectItem value="all" className="font-bold rounded-xl h-11">Todas as turmas</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id} className="font-semibold rounded-xl h-11">{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100">
          <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] px-3 py-1 rounded-md shadow-xs">
            {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
          </Badge>
        </div>
      </div>

      <Card className="overflow-hidden border border-slate-100 shadow-sm bg-white rounded-[2rem] animate-in fade-in duration-700">
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] py-6 pl-8 text-slate-400">Chamada</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Envolvimento</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Horário</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-right pr-8 text-slate-400">Operador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((h) => (
                  <TableRow key={h.id} className="hover:bg-slate-50/50 transition-all duration-300 hover:-translate-y-0.5 group">
                    <TableCell className="py-5 pl-8">
                      <div className="flex items-center gap-4">
                        <div className={cn("h-12 w-12 rounded-full flex items-center justify-center border transition-all duration-300", h.tipo === 'escolar' ? "bg-orange-50 text-orange-500 border-orange-100" : "bg-primary/5 text-primary border-primary/10 group-hover:bg-primary group-hover:text-white")}>
                          {h.tipo === 'escolar' ? <Bus size={20} /> : <User size={20} />}
                        </div>
                        <span className="font-black text-lg text-slate-900 tracking-tight">{h.nomeExibicao || h.escolarNome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      {h.tipo === 'escolar' ? "Escolar" : h.turmaNome}
                    </TableCell>
                    <TableCell className="font-black text-slate-900 tabular-nums">
                      {h.dataHoraChamado ? format(h.dataHoraChamado.toDate(), "HH:mm") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-black uppercase text-[9px] tracking-[0.15em] px-3 py-1 border-none shadow-sm rounded-md", h.status === "Chamado" ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400")}>
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.15em]">
                      {h.chamadoPorEmail?.split('@')[0]}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24 text-slate-300 font-bold italic tracking-tight">Nenhuma atividade registrada no período.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((h) => (
              <div key={h.id} className="p-6 space-y-5 hover:bg-slate-50/50 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn("h-14 w-14 rounded-full flex items-center justify-center border transition-all shadow-sm", h.tipo === 'escolar' ? "bg-orange-50 text-orange-500 border-orange-100" : "bg-primary/5 text-primary border-primary/10")}>
                      {h.tipo === 'escolar' ? <Bus size={24} /> : <User size={24} />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 tracking-tight text-xl">{h.nomeExibicao || h.escolarNome}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          {h.tipo === 'escolar' ? "Transporte" : `Turma ${h.turmaNome}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className={cn("font-black uppercase text-[9px] tracking-[0.15em] px-3 py-1 border-none shadow-sm rounded-md", h.status === "Chamado" ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400")}>
                    {h.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-primary bg-primary/5 px-3 py-1.5 rounded-xl">
                    <Clock size={14} className="text-primary/60" />
                    <span className="text-[11px] font-black tabular-nums tracking-tight">{h.dataHoraChamado ? format(h.dataHoraChamado.toDate(), "HH:mm") : "-"}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                    OP: {h.chamadoPorEmail?.split('@')[0]}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-24 text-center text-slate-300 font-bold italic tracking-tight">Vazio.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
