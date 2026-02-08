// ✅ src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { QuoteProvider } from "@/contexts/QuoteContext";

// Public Pages
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import ModelsPage from "./pages/ModelsPage";
import ConfigurePage from "./pages/ConfigurePage";
import DetailsPage from "./pages/DetailsPage";
import QuotePage from "./pages/QuotePage";
import LegalPage from "./pages/LegalPage";
import NotFound from "./pages/NotFound";
import AdminLoginPage from "./pages/AdminLoginPage";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import QuotesPage from "./pages/admin/QuotesPage";
import ContactsPage from "./pages/admin/ContactsPage";
import AdminModelsPage from "./pages/admin/ModelsPage";
import EmailSettingsPage from "./pages/admin/EmailSettingsPage";
import RequireAdmin from "./components/RequireAdmin";
import SiteSettingsPage from "./pages/admin/SiteSettingsPage";
import MediaPage from "./pages/admin/MediaPage";
import SuppliersPage from "./pages/admin/SuppliersPage";
import BOQPage from "./pages/admin/BOQPage";
import DevIdeasPage from "./pages/admin/DevIdeasPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <QuoteProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/configure" element={<ConfigurePage />} />
              <Route path="/details" element={<DetailsPage />} />
              <Route path="/quote" element={<QuotePage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />

              {/* Admin */}
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="quotes" element={<QuotesPage />} />
                  <Route path="contacts" element={<ContactsPage />} />
                  <Route path="models" element={<AdminModelsPage />} />
                  <Route path="media" element={<MediaPage />} />
                  <Route path="boq" element={<BOQPage />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route path="email" element={<EmailSettingsPage />} />
                  <Route path="site" element={<SiteSettingsPage />} />
                  <Route path="dev-ideas" element={<DevIdeasPage />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </QuoteProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
