"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentManagement } from "@/components/operator/student-management";
import { ClassManagement } from "@/components/operator/class-management";
import { CallManagement } from "@/components/operator/call-management";
import { HistoryManagement } from "@/components/operator/history-management";
import { EscolarManagement } from "@/components/operator/escolar-management";
import { Users, GraduationCap, PhoneOutgoing, History, Bus } from "lucide-react";

export default function OperatorPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("calls");

  useEffect(() => {
    if (!loading && (!user || role !== "operator")) {
      router.push("/");
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "operator") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader title="Controle de Saída SESI" />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Tabs defaultValue="calls" className="space-y-8" onValueChange={setActiveTab}>
          <div className="flex items-center justify-center sm:justify-start overflow-x-auto pb-1 scrollbar-hide">
            <TabsList className="flex w-full sm:w-auto apple-blur p-1.5 h-14 rounded-2xl border border-slate-200 shadow-sm bg-white/50">
              <TabsTrigger value="calls" className="flex-1 sm:flex-none items-center gap-2 px-6 rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                <PhoneOutgoing size={18} />
                <span className="text-sm">Chamadas</span>
              </TabsTrigger>
              <TabsTrigger value="escolares" className="flex-1 sm:flex-none items-center gap-2 px-6 rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                <Bus size={18} />
                <span className="text-sm">Escolares</span>
              </TabsTrigger>
              <TabsTrigger value="students" className="flex-1 sm:flex-none items-center gap-2 px-6 rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                <GraduationCap size={18} />
                <span className="text-sm">Alunos</span>
              </TabsTrigger>
              <TabsTrigger value="classes" className="flex-1 sm:flex-none items-center gap-2 px-6 rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                <Users size={18} />
                <span className="text-sm">Turmas</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 sm:flex-none items-center gap-2 px-6 rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md">
                <History size={18} />
                <span className="text-sm">Histórico</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TabsContent value="calls" className="mt-0 outline-none">
              <CallManagement />
            </TabsContent>
            <TabsContent value="escolares" className="mt-0 outline-none">
              <EscolarManagement />
            </TabsContent>
            <TabsContent value="students" className="mt-0 outline-none">
              <StudentManagement />
            </TabsContent>
            <TabsContent value="classes" className="mt-0 outline-none">
              <ClassManagement />
            </TabsContent>
            <TabsContent value="history" className="mt-0 outline-none">
              <HistoryManagement />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
