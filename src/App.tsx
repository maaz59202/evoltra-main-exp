import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import Docs from "./pages/Docs";
import Projects from "./pages/Projects";
import Kanban from "./pages/Kanban";
import Team from "./pages/Team";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";

// Funnel Builder Pages
import Funnels from "./pages/Funnels";
import FunnelBuilder from "./pages/FunnelBuilder";
import PublicFunnel from "./pages/PublicFunnel";
import Leads from "./pages/Leads";
import Billing from "./pages/Billing";
import InvoiceDetails from "./pages/InvoiceDetails";
import ProjectDetails from "./pages/ProjectDetails";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";

// Client Portal Pages
import ClientLogin from "./pages/client/ClientLogin";
import ClientForgotPassword from "./pages/client/ClientForgotPassword";
import ClientAcceptInvite from "./pages/client/ClientAcceptInvite";
import ClientResetPassword from "./pages/client/ClientResetPassword";
import ClientPortal from "./pages/client/ClientPortal";
import ClientProjectView from "./pages/client/ClientProjectView";
import ClientInvoiceView from "./pages/client/ClientInvoiceView";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: false,
    },
  },
});

// Wrapper component for dashboard pages
const WithDashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <DashboardLayout>{children}</DashboardLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ClientAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Protected Routes with Dashboard Layout */}
              <Route 
                path="/onboarding" 
                element={
                  <ProtectedRoute requireOnboarding={false}>
                    <Onboarding />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <WithDashboardLayout>
                      <Dashboard />
                    </WithDashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/projects" 
                element={
                  <ProtectedRoute>
                    <WithDashboardLayout>
                      <Projects />
                    </WithDashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/kanban" 
                element={
                  <ProtectedRoute>
                    <WithDashboardLayout>
                      <Kanban />
                    </WithDashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/project/:projectId" 
                element={
                  <ProtectedRoute>
                    <WithDashboardLayout>
                      <ProjectDetails />
                    </WithDashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/team" 
                element={
                  <ProtectedRoute>
                    <WithDashboardLayout>
                      <Team />
                    </WithDashboardLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Funnel Builder Routes */}
              <Route 
                path="/funnels" 
                element={
                  <ProtectedRoute>
                    <WithDashboardLayout>
                      <Funnels />
                    </WithDashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/funnel/:funnelId" 
                element={
                  <ProtectedRoute>
                    <FunnelBuilder />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/leads" 
                element={
                  <ProtectedRoute>
                    <WithDashboardLayout>
                      <Leads />
                    </WithDashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/billing" 
                element={
                  <ProtectedRoute>
                    <WithDashboardLayout>
                      <Billing />
                    </WithDashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/billing/invoices/:invoiceId" 
                element={
                  <ProtectedRoute>
                    <WithDashboardLayout>
                      <InvoiceDetails />
                    </WithDashboardLayout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <WithDashboardLayout>
                      <Settings />
                    </WithDashboardLayout>
                  </ProtectedRoute>
                } 
              />
              {/* Public Funnel Viewer */}
              <Route path="/f/:funnelId" element={<PublicFunnel />} />
              
              {/* Public routes */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              
              {/* Client Portal Routes */}
              <Route path="/client/login" element={<ClientLogin />} />
              <Route path="/client/forgot-password" element={<ClientForgotPassword />} />
              <Route path="/client/accept/:token" element={<ClientAcceptInvite />} />
              <Route path="/client/reset-password/:token" element={<ClientResetPassword />} />
              <Route path="/client/portal" element={<ClientPortal />} />
              <Route path="/client/project/:projectId" element={<ClientProjectView />} />
              <Route path="/client/invoice/:invoiceId" element={<ClientInvoiceView />} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ClientAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
