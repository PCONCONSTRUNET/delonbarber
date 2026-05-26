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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // dados considerados frescos por 30s -> evita refetch ao trocar de aba
      gcTime: 5 * 60_000, // mantém cache por 5min mesmo sem consumidores
      refetchOnWindowFocus: true, // atualiza ao voltar pra aba
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

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
              <Route path="/login" element={<Login />} />
              <Route path="/servicos" element={<Suspense fallback={<RouteFallback />}><Servicos /></Suspense>} />
              <Route path="/agendar" element={<Suspense fallback={<RouteFallback />}><Agendar /></Suspense>} />
              <Route path="/perfil" element={<Suspense fallback={<RouteFallback />}><Perfil /></Suspense>} />
              <Route path="/cliente" element={<Suspense fallback={<RouteFallback />}><Cliente /></Suspense>} />
              <Route path="/pacotes" element={<Suspense fallback={<RouteFallback />}><Pacotes /></Suspense>} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/agenda" element={<AdminAgenda />} />
              <Route path="/admin/clientes" element={<AdminClientes />} />
              <Route path="/admin/servicos" element={<AdminServicos />} />
              <Route path="/admin/financeiro" element={<AdminFinanceiro />} />
              <Route path="/admin/ia" element={<AdminIA />} />
              <Route path="/admin/pacotes" element={<AdminPacotes />} />
              <Route path="/admin/avaliacoes" element={<AdminAvaliacoes />} />
              <Route path="/admin/fidelidade" element={<AdminFidelidade />} />
              <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFound /></Suspense>} />
            </Routes>
          </BrowserRouter>
        </AdminNotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
