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
  const { user, roles, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("calls");

  useEffect(() => {
    if (!loading && !roles.includes("operator")) {
      router.push("/login");
    }
  }, [loading, roles, router]);

  if (loading) {
    return null;
  }

  if (!user || !roles.includes("operator")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardHeader />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        <Tabs
          defaultValue="calls"
          className="space-y-6 sm:space-y-8"
          onValueChange={setActiveTab}
        >
          <div className="flex items-center justify-center overflow-x-auto pb-1 scrollbar-hide">
            <TabsList className="flex w-[92%] sm:w-auto apple-blur p-1 h-14 rounded-2xl border border-slate-200 shadow-sm bg-white/50 backdrop-blur-md">
              <TabsTrigger
                value="calls"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-0 sm:px-6 rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                title="Chamadas"
              >
                <PhoneOutgoing size={22} className="shrink-0" />
                <span className="hidden sm:inline ml-1">Chamadas</span>
              </TabsTrigger>

              <TabsTrigger
                value="escolares"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-0 sm:px-6 rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                title="Escolares"
              >
                <Bus size={22} className="shrink-0" />
                <span className="hidden sm:inline ml-1">Escolares</span>
              </TabsTrigger>

              <TabsTrigger
                value="students"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-0 sm:px-6 rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                title="Alunos"
              >
                <GraduationCap size={22} className="shrink-0" />
                <span className="hidden sm:inline ml-1">Alunos</span>
              </TabsTrigger>

              <TabsTrigger
                value="classes"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-0 sm:px-6 rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                title="Turmas"
              >
                <Users size={22} className="shrink-0" />
                <span className="hidden sm:inline ml-1">Turmas</span>
              </TabsTrigger>

              <TabsTrigger
                value="history"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-0 sm:px-6 rounded-xl font-bold transition-all data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md"
                title="Histórico"
              >
                <History size={22} className="shrink-0" />
                <span className="hidden sm:inline ml-1">Histórico</span>
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