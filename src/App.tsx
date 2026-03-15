// ✅ src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHashRouter, RouterProvider } from "react-router-dom";
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
import GalleryPage from "./pages/GalleryPage";
import NotFound from "./pages/NotFound";
import AdminLoginPage from "./pages/AdminLoginPage";
import QuoteActionPage from "./pages/QuoteActionPage";

// Admin Pages
import AdminLayout from "./pages/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import QuotesPage from "./pages/admin/QuotesPage";
import CreateQuotePage from "./pages/admin/CreateQuotePage";
import QuoteDetailPage from "./pages/admin/QuoteDetailPage";
import ContactsPage from "./pages/admin/ContactsPage";
import AdminModelsPage from "./pages/admin/ModelsPage";
import EmailSettingsPage from "./pages/admin/EmailSettingsPage";
import RequireAdmin from "./components/RequireAdmin";
import SiteSettingsPage from "./pages/admin/SiteSettingsPage";
import PaymentsPage from "./pages/admin/PaymentsPage";
import MediaPage from "./pages/admin/MediaPage";
import SuppliersPage from "./pages/admin/SuppliersPage";
import BOQPage from "./pages/admin/BOQPage";
import PoolBOQVariablesPage from "./pages/admin/PoolBOQVariablesPage";
import PoolBOQPriceListPage from "./pages/admin/PoolBOQPriceListPage";
import PoolBOQTemplatePage from "./pages/admin/PoolBOQTemplatePage";
import ModularBOQVariablesPage from "./pages/admin/ModularBOQVariablesPage";
import ModularBOQTemplatePage from "./pages/admin/ModularBOQTemplatePage";
import ModelTypesPage from "./pages/admin/ModelTypesPage";
import DevIdeasPage from "./pages/admin/DevIdeasPage";
import DiscountsPage from "./pages/admin/DiscountsPage";
import UsersPage from "./pages/admin/UsersPage";
import ThemesPage from "./pages/admin/ThemesPage";
import DeployUpdatePage from "./pages/admin/DeployUpdatePage";
import DebugPage from "./pages/admin/DebugPage";
import AdminModelRequestsPage from "./pages/admin/AdminModelRequestsPage";

// Pro Pages
import ProLoginPage from "./pages/pro/ProLoginPage";
import ProLayout from "./pages/pro/ProLayout";
import ProDashboardPage from "./pages/pro/ProDashboardPage";
import ProQuotesPage from "./pages/pro/ProQuotesPage";
import ProSettingsPage from "./pages/pro/ProSettingsPage";
import ProModelRequestPage from "./pages/pro/ProModelRequestPage";
import ProModelsOverridePage from "./pages/pro/ProModelsOverridePage";
import RequirePro from "./components/RequirePro";
import ProDebugPage from "./pages/pro/ProDebugPage";
import PurchaseReportsPage from "./pages/admin/PurchaseReportsPage";
import PurchaseReportDetailPage from "./pages/admin/PurchaseReportDetailPage";
import ProAdminContactsPage from "./pages/admin/ContactsPage";
import ProAdminDiscountsPage from "./pages/admin/DiscountsPage";
import ProAdminEmailPage from "./pages/admin/EmailSettingsPage";
import ProAdminPaymentsPage from "./pages/admin/PaymentsPage";
import ProAdminSitePage from "./pages/admin/SiteSettingsPage";

const queryClient = new QueryClient();

const router = createHashRouter([
  /* Public */
  { path: "/",                         element: <HomePage /> },
  { path: "/about",                    element: <AboutPage /> },
  { path: "/contact",                  element: <ContactPage /> },
  { path: "/legal",                    element: <LegalPage /> },
  { path: "/models",                   element: <ModelsPage /> },
  { path: "/gallery",                  element: <GalleryPage /> },
  { path: "/configure",                element: <ConfigurePage /> },
  { path: "/details",                  element: <DetailsPage /> },
  { path: "/quote",                    element: <QuotePage /> },
  { path: "/quote-action/:quoteId",    element: <QuoteActionPage /> },
  { path: "/admin-login",              element: <AdminLoginPage /> },

  /* Admin */
  {
    element: <RequireAdmin />,
    children: [{
      path: "/admin",
      element: <AdminLayout />,
      children: [
        { index: true,                          element: <DashboardPage /> },
        { path: "quotes",                       element: <QuotesPage /> },
        { path: "quotes/new",                   element: <CreateQuotePage /> },
        { path: "quotes/:id",                   element: <QuoteDetailPage /> },
        { path: "reports",                      element: <PurchaseReportsPage /> },
        { path: "reports/:id",                  element: <PurchaseReportDetailPage /> },
        { path: "contacts",                     element: <ContactsPage /> },
        { path: "models",                       element: <AdminModelsPage /> },
        { path: "media",                        element: <MediaPage /> },
        { path: "boq",                          element: <BOQPage /> },
        { path: "pool-variables",               element: <PoolBOQVariablesPage /> },
        { path: "pricelist",                    element: <PoolBOQPriceListPage /> },
        { path: "pool-template",                element: <PoolBOQTemplatePage /> },
        { path: "modular-variables",            element: <ModularBOQVariablesPage /> },
        { path: "modular-template",             element: <ModularBOQTemplatePage /> },
        { path: "model-types",                  element: <ModelTypesPage /> },
        { path: "suppliers",                    element: <SuppliersPage /> },
        { path: "email",                        element: <EmailSettingsPage /> },
        { path: "payments",                     element: <PaymentsPage /> },
        { path: "site",                         element: <SiteSettingsPage /> },
        { path: "dev-ideas",                    element: <DevIdeasPage /> },
        { path: "discounts",                    element: <DiscountsPage /> },
        { path: "users",                        element: <UsersPage /> },
        { path: "themes",                       element: <ThemesPage /> },
        { path: "deploy",                       element: <DeployUpdatePage /> },
        { path: "debug",                        element: <DebugPage /> },
        { path: "model-requests",               element: <AdminModelRequestsPage /> },
      ],
    }],
  },

  /* Professional Portal */
  { path: "/pro-login", element: <ProLoginPage /> },
  {
    element: <RequirePro />,
    children: [{
      path: "/pro",
      element: <ProLayout />,
      children: [
        { index: true,              element: <ProDashboardPage /> },
        { path: "quotes",           element: <ProQuotesPage /> },
        { path: "reports",          element: <PurchaseReportsPage /> },
        { path: "reports/:id",      element: <PurchaseReportDetailPage /> },
        { path: "model-request",    element: <ProModelRequestPage /> },
        { path: "models",           element: <ProModelsOverridePage /> },
        { path: "settings",         element: <ProSettingsPage /> },
        { path: "contacts",         element: <ProAdminContactsPage /> },
        { path: "discounts",        element: <ProAdminDiscountsPage /> },
        { path: "email",            element: <ProAdminEmailPage /> },
        { path: "payments",         element: <ProAdminPaymentsPage /> },
        { path: "site",             element: <ProAdminSitePage /> },
        { path: "debug",            element: <ProDebugPage /> },
      ],
    }],
  },

  /* Fallback */
  { path: "*", element: <NotFound /> },
]);

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <QuoteProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <RouterProvider router={router} />
        </TooltipProvider>
      </QuoteProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
