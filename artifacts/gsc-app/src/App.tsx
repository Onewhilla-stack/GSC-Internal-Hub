import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { DateRangeProvider } from "@/lib/date-range";
import { Layout } from "@/components/layout";
import { Spinner } from "@/components/ui/spinner";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Jobs from "@/pages/jobs";
import Expenses from "@/pages/expenses";
import Clients from "@/pages/clients";
import ClientProfile from "@/pages/client-profile";
import Receipts from "@/pages/receipts";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import ActivityLog from "@/pages/activity-log";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center"><Spinner className="w-8 h-8" /></div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function DirectorRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, isDirector } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center"><Spinner className="w-8 h-8" /></div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (!isDirector) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/jobs" component={() => <ProtectedRoute component={Jobs} />} />
      <Route path="/expenses" component={() => <DirectorRoute component={Expenses} />} />
      <Route path="/clients" component={() => <ProtectedRoute component={Clients} />} />
      <Route path="/clients/:id" component={() => <ProtectedRoute component={ClientProfile} />} />
      <Route path="/receipts" component={() => <ProtectedRoute component={Receipts} />} />
      <Route path="/analytics" component={() => <DirectorRoute component={Analytics} />} />
      <Route path="/activity-log" component={() => <DirectorRoute component={ActivityLog} />} />
      <Route path="/settings" component={() => <DirectorRoute component={Settings} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DateRangeProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </DateRangeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
