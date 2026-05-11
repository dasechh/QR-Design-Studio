import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Editor from "@/pages/Editor";

const queryClient = new QueryClient();

type AppView = { type: "home" } | { type: "editor"; design?: any };

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [view, setView] = useState<AppView>({ type: "home" });

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="animate-spin h-7 w-7 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;

  if (view.type === "editor") {
    return (
      <Editor
        initialDesign={view.design ?? null}
        onBack={() => setView({ type: "home" })}
      />
    );
  }

  return (
    <Home
      onNewDesign={() => setView({ type: "editor", design: null })}
      onOpenDesign={(design) => setView({ type: "editor", design })}
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
