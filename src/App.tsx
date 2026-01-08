import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Servicos from "./pages/Servicos";
import Agendar from "./pages/Agendar";
import Login from "./pages/Login";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import { AdminDashboard, AdminAgenda, AdminClientes, AdminServicos, AdminFinanceiro, AdminIA } from "./pages/Admin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/login" element={<Login />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/agenda" element={<AdminAgenda />} />
          <Route path="/admin/clientes" element={<AdminClientes />} />
          <Route path="/admin/servicos" element={<AdminServicos />} />
          <Route path="/admin/financeiro" element={<AdminFinanceiro />} />
          <Route path="/admin/ia" element={<AdminIA />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
