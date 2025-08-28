import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import OrderForm from "@/pages/order-form";
import { Dashboard } from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import { InstallAppButton } from "@/components/install-app-button";
import { IOSQuickAccess } from "@/components/ios-quick-access";

function Router() {
  return (
    <Switch>
      <Route path="/" component={OrderForm} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
