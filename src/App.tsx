import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminNotificationProvider } from "@/contexts/AdminNotificationContext";
import Index from "./pages/Index";
import Servicos from "./pages/Servicos";
import Agendar from "./pages/Agendar";
import Login from "./pages/Login";
import Perfil from "./pages/Perfil";
import Cliente from "./pages/Cliente";
import Pacotes from "./pages/Pacotes";
import NotFound from "./pages/NotFound";
import { AdminDashboard, AdminAgenda, AdminClientes, AdminServicos, AdminFinanceiro, AdminIA, AdminPacotes, AdminAvaliacoes, AdminFidelidade } from "./pages/Admin";

const queryClient = new QueryClient();

const App = () => {

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AdminNotificationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
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
