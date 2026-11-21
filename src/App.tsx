import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { MotionGlobalConfig } from "framer-motion";
import { lazy, Suspense } from "react";
import { AdminNotificationProvider } from "@/contexts/AdminNotificationContext";
import { ClientNotificationProvider } from "@/contexts/ClientNotificationContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import { DynamicManifest } from "@/components/pwa/DynamicManifest";

// Code-splitting: client routes loaded on demand
const Servicos = lazy(() => import("./pages/Servicos"));
const Agendar = lazy(() => import("./pages/Agendar"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Cliente = lazy(() => import("./pages/Cliente"));
const Pacotes = lazy(() => import("./pages/Pacotes"));
const Historico = lazy(() => import("./pages/Historico"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin and Barber Panel remain eagerly loaded (unchanged behavior)
import { AdminDashboard, AdminAgenda, AdminClientes, AdminBarbeiros, AdminServicos, AdminFinanceiro, AdminManualBooking, AdminPacotes, AdminAvaliacoes, AdminFidelidade } from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import { BarberDashboard, BarberAgenda, BarberClientes, BarberFinanceiro, BarberManualBooking } from "./pages/BarberPanel";
import BarberLogin from "./pages/BarberLogin";

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
  <div className="min-h-screen min-h-dvh flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

// Nos painéis Admin e Barbeiro as páginas abrem direto, sem animações de entrada (fade/piscada).
// Executado durante o render (antes das rotas) para valer já na primeira pintura.
const AdminMotionSwitch = () => {
  const { pathname } = useLocation();
  MotionGlobalConfig.skipAnimations =
    pathname.startsWith('/admin') || pathname.startsWith('/barbeiro');
  return null;
};

const App = () => {

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminNotificationProvider>
          <ClientNotificationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <DynamicManifest />
              <AdminMotionSwitch />
              <Routes>
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/servicos" element={<Suspense fallback={<RouteFallback />}><Servicos /></Suspense>} />
                <Route path="/agendar" element={<Suspense fallback={<RouteFallback />}><Agendar /></Suspense>} />
                <Route path="/perfil" element={<Suspense fallback={<RouteFallback />}><Perfil /></Suspense>} />
                <Route path="/cliente" element={<Suspense fallback={<RouteFallback />}><Cliente /></Suspense>} />
                <Route path="/historico" element={<Suspense fallback={<RouteFallback />}><Historico /></Suspense>} />
                <Route path="/pacotes" element={<Suspense fallback={<RouteFallback />}><Pacotes /></Suspense>} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/agenda" element={<AdminAgenda />} />
                <Route path="/admin/clientes" element={<AdminClientes />} />
                <Route path="/admin/barbeiros" element={<AdminBarbeiros />} />
                <Route path="/admin/servicos" element={<AdminServicos />} />
                <Route path="/admin/financeiro" element={<AdminFinanceiro />} />
                <Route path="/admin/agendamento-manual" element={<AdminManualBooking />} />
                <Route path="/admin/pacotes" element={<AdminPacotes />} />
                <Route path="/admin/avaliacoes" element={<AdminAvaliacoes />} />
                <Route path="/admin/fidelidade" element={<AdminFidelidade />} />
                <Route path="/barbeiro/login" element={<BarberLogin />} />
                <Route path="/barbeiro" element={<BarberDashboard />} />
                <Route path="/barbeiro/agenda" element={<BarberAgenda />} />
                <Route path="/barbeiro/clientes" element={<BarberClientes />} />
                <Route path="/barbeiro/financeiro" element={<BarberFinanceiro />} />
                <Route path="/barbeiro/agendamento-manual" element={<BarberManualBooking />} />
                <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFound /></Suspense>} />
              </Routes>
            </BrowserRouter>
          </ClientNotificationProvider>
        </AdminNotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
