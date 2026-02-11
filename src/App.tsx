import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AdminAuth from "./pages/AdminAuth";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import AddStock from "./pages/AddStock";
import POS from "./pages/POS";
import Customers from "./pages/Customers";
import Loans from "./pages/Loans";
import DailyReports from "./pages/DailyReports";
import StaffManagement from "./pages/StaffManagement";
import ShopSettings from "./pages/ShopSettings";
import NotFound from "./pages/NotFound";
import AdminCMS from "./pages/AdminCMS";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminAuth />} />
            <Route path="/admin-cms" element={<AdminCMS />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/add-stock" element={<AddStock />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/reports" element={<DailyReports />} />
            <Route path="/staff" element={<StaffManagement />} />
            <Route path="/settings" element={<ShopSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
