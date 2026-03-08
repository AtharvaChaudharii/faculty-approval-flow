import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import UploadDocument from "./pages/UploadDocument";
import DocumentReview from "./pages/DocumentReview";
import Archive from "./pages/Archive";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import { useCurrentUser } from "./lib/auth-store";

const queryClient = new QueryClient();

function ProtectedUpload() {
  const user = useCurrentUser();
  if (user.role === 'director') return <Navigate to="/" replace />;
  return <AppLayout><UploadDocument /></AppLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/upload" element={<ProtectedUpload />} />
          <Route path="/document/:id" element={<AppLayout><DocumentReview /></AppLayout>} />
          <Route path="/archive" element={<AppLayout><Archive /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
