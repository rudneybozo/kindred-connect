import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Users, Truck, MapPin } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardComponent,
})

function DashboardComponent() {
  const stats = [
    { title: 'Total Rotas', value: '24', icon: MapPin, color: 'text-blue-600' },
    { title: 'Motoristas', value: '8', icon: Truck, color: 'text-green-600' },
    { title: 'Clientes', value: '156', icon: Users, color: 'text-purple-600' },
    { title: 'Entregas Hoje', value: '42', icon: Package, color: 'text-orange-600' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-slate-500">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Rotas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-500 text-sm">Lista de rotas aparecerá aqui...</div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Status da Frota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-500 text-sm">Status dos veículos aparecerá aqui...</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
