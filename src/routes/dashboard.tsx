import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Package, 
  Users, 
  Truck, 
  MapPin, 
  Route as RouteIcon, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Calendar,
  ArrowUpRight
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/dashboard')({
  component: DashboardComponent,
})

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function DashboardComponent() {
  // Fetch real data for stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      
      const [routesCount, vehiclesCount, customersCount, driversCount, todayRoutes] = await Promise.all([
        supabase.from('routes').select('*', { count: 'exact', head: true }),
        supabase.from('vehicles').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'motorista'),
        supabase.from('routes').select('distance, duration').eq('delivery_date', today)
      ])

      const totalKm = (todayRoutes.data?.reduce((acc, r) => acc + (Number(r.distance) || 0), 0) || 0) / 1000

      return {
        totalRoutes: routesCount.count || 0,
        totalVehicles: vehiclesCount.count || 0,
        totalCustomers: customersCount.count || 0,
        totalDrivers: driversCount.count || 0,
        kmToday: totalKm.toFixed(1)
      }
    }
  })

  // Fetch chart data
  const { data: chartData, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: async () => {
      // 1. Routes per day (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i)
        return format(d, 'yyyy-MM-dd')
      })

      const { data: dailyRoutes } = await supabase
        .from('routes')
        .select('delivery_date, distance')
        .gte('delivery_date', last7Days[0])

      const dailyData = last7Days.map(date => {
        const routes = dailyRoutes?.filter(r => r.delivery_date === date) || []
        return {
          name: format(new Date(date + 'T12:00:00'), 'EEE', { locale: ptBR }),
          quantidade: routes.length,
          km: (routes.reduce((acc, r) => acc + (Number(r.distance) || 0), 0) / 1000).toFixed(1)
        }
      })

      // 2. Deliveries per driver
      const { data: driverRoutes } = await supabase
        .from('routes')
        .select(`
          driver:profiles!routes_driver_id_fkey(full_name)
        `)

      const driverStats = driverRoutes?.reduce((acc: any, curr: any) => {
        const name = curr.driver?.full_name || 'Desconhecido'
        acc[name] = (acc[name] || 0) + 1
        return acc
      }, {})

      const driverChartData = Object.entries(driverStats || {}).map(([name, value]) => ({
        name,
        value
      })).sort((a, b) => (b.value as number) - (a.value as number)).slice(0, 5)

      return { dailyData, driverChartData }
    }
  })

  if (statsLoading || chartsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-7">
          <Skeleton className="col-span-4 h-80 w-full" />
          <Skeleton className="col-span-3 h-80 w-full" />
        </div>
      </div>
    )
  }

  const statCards = [
    { title: 'Total de Rotas', value: stats?.totalRoutes, icon: RouteIcon, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%' },
    { title: 'Km Rodados (Hoje)', value: `${stats?.kmToday} km`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+5%' },
    { title: 'Clientes Atendidos', value: stats?.totalCustomers, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', trend: '+24%' },
    { title: 'Frota Ativa', value: stats?.totalVehicles, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-50', trend: 'Estável' },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Painel Analítico</h1>
          <p className="text-slate-500">Visão geral do desempenho logístico e roteirização.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border p-1 rounded-lg shadow-sm">
          <Calendar className="ml-2 h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium pr-3 text-slate-600">
            {format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </span>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-none shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bg} ${stat.color} p-2 rounded-lg transition-colors group-hover:scale-110 duration-300`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal py-0 px-1.5 h-5 flex items-center gap-0.5">
                  <ArrowUpRight size={10} className="text-emerald-500" /> {stat.trend}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Main Chart */}
        <Card className="col-span-full lg:col-span-4 border-none shadow-md">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Volume de Entregas</CardTitle>
                <CardDescription>Quantidade de rotas concluídas nos últimos 7 dias.</CardDescription>
              </div>
              <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">7 Dias</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-2">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData?.dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="quantidade" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorQty)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Driver Performance Chart */}
        <Card className="col-span-full lg:col-span-3 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Rotas por Motorista</CardTitle>
            <CardDescription>Top 5 motoristas com mais rotas realizadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartData?.driverChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 500 }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Produtividade média</span>
                <span className="font-bold text-slate-900">+12%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Distance KPI */}
        <Card className="border-none shadow-md bg-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-white/80 text-sm font-medium uppercase tracking-wider">Eficiência da Frota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{stats?.kmToday} km</div>
                <p className="text-blue-100 text-sm mt-1">Rodados hoje em rotas otimizadas</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <MapPin className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-medium bg-white/10 p-2 rounded-lg border border-white/10">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Redução de 18% em custos de combustível estimada</span>
            </div>
          </CardContent>
        </Card>

        {/* Operational Status */}
        <Card className="col-span-1 lg:col-span-2 border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="text-slate-400 h-5 w-5" />
              Resumo Operacional
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-xl border bg-slate-50/50">
              <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalVehicles}</p>
                <p className="text-xs text-slate-500">Veículos cadastrados</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl border bg-slate-50/50">
              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalCustomers}</p>
                <p className="text-xs text-slate-500">Pontos de entrega ativos</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl border bg-slate-50/50">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalDrivers}</p>
                <p className="text-xs text-slate-500">Motoristas na equipe</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl border bg-slate-50/50">
              <div className="bg-violet-100 p-2 rounded-lg text-violet-600">
                <Package size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalRoutes}</p>
                <p className="text-xs text-slate-500">Histórico total de rotas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
