import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { 
  LayoutDashboard, 
  Users, 
  Truck, 
  MapPin, 
  Package, 
  LogOut, 
  Menu,
  X,
  Package2
} from "lucide-react";
import { Button } from "@/components/ui/button";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ open, setOpen }: { open: boolean, setOpen: (v: boolean) => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Usuários', icon: Users, to: '/users' },
    { label: 'Veículos', icon: Truck, to: '/vehicles' },
    { label: 'Clientes', icon: Package, to: '/customers' },
    { label: 'Rotas', icon: MapPin, to: '/routes' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: '/login' });
  };

  return (
    <>
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Package2 size={24} />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Roteirização</span>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.to 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-slate-600 hover:text-red-600 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut size={20} />
              Sair do Sistema
            </Button>
          </div>
        </div>
      </div>
      {open && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" 
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Delivery Routing SaaS" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session && location.pathname !== '/login') {
        navigate({ to: '/login' });
      } else if (session && (location.pathname === '/login' || location.pathname === '/')) {
        navigate({ to: '/dashboard' });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && location.pathname !== '/login') {
        navigate({ to: '/login' });
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  const isLoginPage = location.pathname === '/login';

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-50">
        {!isLoginPage && session && (
          <>
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
            <div className="lg:pl-64 flex flex-col min-h-screen">
              <header className="h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-30 lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <Package2 size={20} />
                  </div>
                  <span className="font-bold text-slate-900">Roteirização</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                  <Menu size={24} />
                </Button>
              </header>
              <main className="flex-1 p-4 lg:p-8">
                <Outlet />
              </main>
            </div>
          </>
        )}
        {isLoginPage && <Outlet />}
        {!session && !isLoginPage && null}
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

