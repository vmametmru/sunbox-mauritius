import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { QuoteProvider } from "@/contexts/QuoteContext";
import ModelsPage from "./pages/ModelsPage";
import ConfigurePage from "./pages/ConfigurePage";
import DetailsPage from "./pages/DetailsPage";
import QuotePage from "./pages/QuotePage";
import NotFound from "./pages/NotFound";
import SiteSettingsPage from "./pages/admin/SiteSettingsPage";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import QuotesPage from "./pages/admin/QuotesPage";
import AdminModelsPage from "./pages/admin/ModelsPage";
import OptionsPage from "./pages/admin/OptionsPage";
import EmailSettingsPage from "./pages/admin/EmailSettingsPage";
import RequireAdmin from "./components/RequireAdmin";
import AdminLoginPage from "./pages/AdminLoginPage";
import MediaPage from "./pages/admin/MediaPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <QuoteProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
  {/* Public Routes */}
  <Route path="/" element={<HomePage />} />
  <Route path="/models" element={<ModelsPage />} />
  <Route path="/configure" element={<ConfigurePage />} />
  <Route path="/details" element={<DetailsPage />} />
  <Route path="/quote" element={<QuotePage />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="/contact" element={<ContactPage />} />
  <Route path="/legal" element={<LegalPage />} />
  <Route path="/admin-login" element={<AdminLoginPage />} />

  {/* Admin Routes */}
  <Route element={<RequireAdmin />}>
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="quotes" element={<QuotesPage />} />
      <Route path="models" element={<AdminModelsPage />} />
      <Route path="media" element={<MediaPage />} />
      <Route path="options" element={<OptionsPage />} />
      <Route path="email" element={<EmailSettingsPage />} />
      <Route path="site" element={<SiteSettingsPage />} />
    </Route>
  </Route>

  <Route path="*" element={<NotFound />} />
</Routes>
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QuoteProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
