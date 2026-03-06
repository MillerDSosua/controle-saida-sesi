
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

      <main className="flex-1 container mx-auto px-4 py-6 sm:px-6">
        <Tabs defaultValue="calls" className="space-y-6" onValueChange={setActiveTab}>
          <div className="flex items-center justify-center sm:justify-start overflow-x-auto pb-2">
            <TabsList className="flex w-full sm:w-auto apple-blur p-1 h-12">
              <TabsTrigger value="calls" className="flex items-center gap-2 px-4 sm:px-6">
                <PhoneOutgoing size={16} />
                <span className="hidden sm:inline">Chamadas</span>
              </TabsTrigger>
              <TabsTrigger value="escolares" className="flex items-center gap-2 px-4 sm:px-6">
                <Bus size={16} />
                <span className="hidden sm:inline">Escolares</span>
              </TabsTrigger>
              <TabsTrigger value="students" className="flex items-center gap-2 px-4 sm:px-6">
                <GraduationCap size={16} />
                <span className="hidden sm:inline">Alunos</span>
              </TabsTrigger>
              <TabsTrigger value="classes" className="flex items-center gap-2 px-4 sm:px-6">
                <Users size={16} />
                <span className="hidden sm:inline">Turmas</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 px-4 sm:px-6">
                <History size={16} />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <TabsContent value="calls">
              <CallManagement />
            </TabsContent>
            <TabsContent value="escolares">
              <EscolarManagement />
            </TabsContent>
            <TabsContent value="students">
              <StudentManagement />
            </TabsContent>
            <TabsContent value="classes">
              <ClassManagement />
            </TabsContent>
            <TabsContent value="history">
              <HistoryManagement />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
