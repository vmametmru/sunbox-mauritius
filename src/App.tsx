import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { QuoteProvider } from "@/contexts/QuoteContext";

// Public pages
import HomePage from "@/pages/HomePage";
import ModelsPage from "@/pages/ModelsPage";
import ConfigurePage from "@/pages/ConfigurePage";
import DetailsPage from "@/pages/DetailsPage";
import QuotePage from "@/pages/QuotePage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import LegalPage from "@/pages/LegalPage";
import NotFound from "@/pages/NotFound";

// Admin pages
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import DashboardPage from "@/pages/admin/DashboardPage";
import QuotesPage from "@/pages/admin/QuotesPage";
import AdminModelsPage from "@/pages/admin/ModelsPage";
import MediaPage from "@/pages/admin/MediaPage";
import OptionsPage from "@/pages/admin/OptionsPage";
import EmailSettingsPage from "@/pages/admin/EmailSettingsPage";
import SiteSettingsPage from "@/pages/admin/SiteSettingsPage";
import RequireAdmin from "@/components/RequireAdmin";

const queryClient = new QueryClient();

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <QuoteProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <BrowserRouter>
              <Routes>

                {/* ================= PUBLIC ROUTES ================= */}
                <Route path="/" element={<HomePage />} />
                <Route path="/models" element={<ModelsPage />} />
                <Route path="/configure" element={<ConfigurePage />} />
                <Route path="/details" element={<DetailsPage />} />
                <Route path="/quote" element={<QuotePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/legal" element={<LegalPage />} />
                <Route path="/admin-login" element={<AdminLoginPage />} />

                {/* ================= ADMIN ROUTES ================= */}
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

                {/* ================= 404 ================= */}
                <Route path="*" element={<NotFound />} />

              </Routes>
            </BrowserRouter>

          </TooltipProvider>
        </QuoteProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
