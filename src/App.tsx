import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AdminNotificationProvider } from "@/contexts/AdminNotificationContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import { PushPromptModal } from "@/components/push/PushPromptModal";
import { DynamicManifest } from "@/components/pwa/DynamicManifest";

// Code-splitting: client routes loaded on demand
const Servicos = lazy(() => import("./pages/Servicos"));
const Agendar = lazy(() => import("./pages/Agendar"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Cliente = lazy(() => import("./pages/Cliente"));
const Pacotes = lazy(() => import("./pages/Pacotes"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin remains eagerly loaded (unchanged behavior)
import { AdminDashboard, AdminAgenda, AdminClientes, AdminServicos, AdminFinanceiro, AdminIA, AdminPacotes, AdminAvaliacoes, AdminFidelidade } from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => {

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminNotificationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DynamicManifest />
            <PushPromptModal excludePaths={["/admin", "/login", "/perfil"]} />
            <Routes>
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/" element={<Index />} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="/agendar" element={<Agendar />} />
              <Route path="/login" element={<Login />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/cliente" element={<Cliente />} />
              <Route path="/pacotes" element={<Pacotes />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/agenda" element={<AdminAgenda />} />
              <Route path="/admin/clientes" element={<AdminClientes />} />
              <Route path="/admin/servicos" element={<AdminServicos />} />
              <Route path="/admin/financeiro" element={<AdminFinanceiro />} />
              <Route path="/admin/ia" element={<AdminIA />} />
              <Route path="/admin/pacotes" element={<AdminPacotes />} />
              <Route path="/admin/avaliacoes" element={<AdminAvaliacoes />} />
              <Route path="/admin/fidelidade" element={<AdminFidelidade />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AdminNotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
