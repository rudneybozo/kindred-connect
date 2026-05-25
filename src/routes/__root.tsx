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
  Package2,
  Search as SearchIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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

function Sidebar({ open, setOpen, role }: { open: boolean, setOpen: (v: boolean) => void, role?: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', roles: ['admin', 'lancador', 'motorista'] },
    { label: 'Usuários', icon: Users, to: '/users', roles: ['admin'] },
    { label: 'Veículos', icon: Truck, to: '/vehicles', roles: ['admin', 'lancador'] },
    { label: 'Clientes', icon: Package, to: '/customers', roles: ['admin', 'lancador'] },
    { label: 'Rotas', icon: MapPin, to: '/routes', roles: ['admin', 'lancador', 'motorista'] },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: '/login' });
  };

  const filteredMenuItems = menuItems.filter(item => 
    !role || item.roles.includes(role)
  );

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
            {filteredMenuItems.map((item) => (
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
      { property: "og:title", content: "Delivery Routing SaaS" },
      { name: "twitter:title", content: "Delivery Routing SaaS" },
      { name: "description", content: "Lovable Generated Project" },
      { property: "og:description", content: "Lovable Generated Project" },
      { name: "twitter:description", content: "Lovable Generated Project" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7f2db075-49fa-43b1-8964-19a74746a039/id-preview-ef69d5d0--9995bded-7893-4b1b-85ff-56e34ce85095.lovable.app-1779386055983.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/7f2db075-49fa-43b1-8964-19a74746a039/id-preview-ef69d5d0--9995bded-7893-4b1b-85ff-56e34ce85095.lovable.app-1779386055983.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
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
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
      }

      setLoading(false);
      
      if (!session && location.pathname !== '/login' && location.pathname !== '/reset-password') {
        navigate({ to: '/login' });
      } else if (session && (location.pathname === '/login' || location.pathname === '/')) {
        navigate({ to: '/dashboard' });
      }
    };

    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData);
      } else {
        setProfile(null);
        if (location.pathname !== '/login') {
          navigate({ to: '/login' });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen font-medium text-slate-600">Carregando sistema...</div>;
  }

  const isLoginPage = location.pathname === '/login';

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-50">
        {!isLoginPage && session && (
          <>
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} role={profile?.role} />
            <div className="lg:pl-64 flex flex-col min-h-screen">
              <header className="h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-30">
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="p-2 bg-blue-600 rounded-lg text-white">
                    <Package2 size={20} />
                  </div>
                  <span className="font-bold text-slate-900">Roteirização</span>
                </div>
                
                {/* Global Search Button */}
                <div className="hidden lg:flex items-center flex-1 max-w-md ml-4">
                  <Button
                    variant="outline"
                    className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 bg-slate-50/50 border-slate-200"
                    onClick={() => setCommandOpen(true)}
                  >
                    <SearchIcon className="mr-2 h-4 w-4" />
                    <span>Busca global...</span>
                    <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </Button>
                </div>

                <div className="lg:hidden">
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                    <Menu size={24} />
                  </Button>
                </div>
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
        
        {/* Global Search Command */}
        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput placeholder="Digite para buscar páginas..." />
          <CommandList>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            <CommandGroup heading="Navegação">
              <CommandItem onSelect={() => { navigate({ to: '/dashboard' }); setCommandOpen(false); }}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </CommandItem>
              {profile?.role === 'admin' && (
                <CommandItem onSelect={() => { navigate({ to: '/users' }); setCommandOpen(false); }}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>Usuários</span>
                </CommandItem>
              )}
              {(profile?.role === 'admin' || profile?.role === 'lancador') && (
                <>
                  <CommandItem onSelect={() => { navigate({ to: '/vehicles' }); setCommandOpen(false); }}>
                    <Truck className="mr-2 h-4 w-4" />
                    <span>Veículos</span>
                  </CommandItem>
                  <CommandItem onSelect={() => { navigate({ to: '/customers' }); setCommandOpen(false); }}>
                    <Package className="mr-2 h-4 w-4" />
                    <span>Clientes</span>
                  </CommandItem>
                </>
              )}
              <CommandItem onSelect={() => { navigate({ to: '/routes' }); setCommandOpen(false); }}>
                <MapPin className="mr-2 h-4 w-4" />
                <span>Rotas</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </QueryClientProvider>
  );
}


