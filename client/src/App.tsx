import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Scan from "./pages/Scan";
import Admin from "./pages/Admin";
import PrintQR from "./pages/PrintQR";
import OwnerDashboard from "./pages/OwnerDashboard";
import OperatorDashboard from "./pages/OperatorDashboard";
import OwnerLotQR from "./pages/OwnerLotQR";
import OwnerPage from "./pages/OwnerPage";
import OwnerByIdPage from "./pages/OwnerByIdPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={OwnerDashboard} />
      <Route path="/scan" component={Scan} />
      <Route path="/scan/:lotId/:spaceNumber" component={Scan} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/print-qr" component={PrintQR} />
      <Route path="/owner/id/:openId" component={OwnerByIdPage} />
      <Route path="/owner/:customUrl" component={OwnerPage} />
      <Route path="/owner" component={OwnerDashboard} />
      <Route path="/owner/lot/:lotId/qr" component={OwnerLotQR} />
      <Route path="/operator" component={OperatorDashboard} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
