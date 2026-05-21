import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  MoreHorizontal,
  MapPin,
  Loader2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  User as UserIcon,
  Truck,
  Wand2,
  Route as RouteIcon,
  Map as MapIconUI,
  FileDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import debounce from 'lodash/debounce'
import { Skeleton } from '@/components/ui/skeleton'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { UserOptions } from 'jspdf-autotable'

// Add type for jsPDF with autotable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useProfile } from '@/hooks/use-profile'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import MapView from '@/components/MapView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const routeSchema = z.object({
  vehicle_id: z.string().min(1, 'Selecione um veículo'),
  driver_id: z.string().min(1, 'Selecione um motorista'),
  delivery_date: z.string().min(1, 'Selecione a data'),
  status: z.enum(['pendente', 'em_rota', 'finalizada']),
  customer_ids: z.array(z.string()).min(1, 'Selecione pelo menos um cliente'),
})

type RouteFormValues = z.infer<typeof routeSchema>

export const Route = createFileRoute('/routes')({
  component: RoutesPage,
})

function RoutesPage() {
  const { data: currentProfile, isLoading: profileLoading } = useProfile()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const handleSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearch(value)
      setPage(1)
    }, 500),
    []
  )

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    handleSearch(value)
  }
  const [optimizedData, setOptimizedData] = useState<any>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [currentTab, setCurrentTab] = useState('config')

  const canManage = currentProfile?.role === 'admin' || currentProfile?.role === 'lancador'

  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      vehicle_id: '',
      driver_id: '',
      delivery_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pendente',
      customer_ids: [],
    },
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['routes', debouncedSearch, page],
    queryFn: async () => {
      let query = supabase
        .from('routes')
        .select(`
          *,
          vehicle:vehicles(name, plate),
          driver:profiles!routes_driver_id_fkey(full_name),
          stops:route_stops(
            id,
            customer:customers(id, name, address, latitude, longitude)
          )
        `, { count: 'exact' })
      
      if (debouncedSearch) {
        // Simple filter on the main table fields
        query = query.or(`status.ilike.%${debouncedSearch}%`)
      }
      
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await query
        .order('delivery_date', { ascending: false })
        .range(from, to)
      
      if (error) {
        toast.error('Erro ao carregar rotas: ' + error.message)
        throw error
      }
      return { routes: data, count: count || 0 }
    }
  })

  const routes = data?.routes
  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  // Fetch vehicles for selection
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, name, plate, status')
        .order('name')
      
      if (error) throw error
      return data
    }
  })

  // Fetch drivers for selection
  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'motorista')
      
      if (error) throw error
      return data
    }
  })

  // Fetch customers for selection
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, address, latitude, longitude')
        .order('name')
      
      if (error) throw error
      return data
    }
  })

  const createMutation = useMutation({
    mutationFn: async (values: RouteFormValues) => {
      const { customer_ids, ...routeData } = values
      
      const payload = {
        ...routeData,
        distance: optimizedData?.routes[0]?.distance || 0,
        duration: optimizedData?.routes[0]?.duration || 0,
        route_geometry: optimizedData?.routes[0]?.geometry || null,
      }

      // 1. Create route
      const { data: route, error: routeError } = await supabase
        .from('routes')
        .insert([payload])
        .select()
        .single()
      
      if (routeError) throw routeError

      // 2. Create stops using optimized order if available
      const orderedCustomerIds = optimizedData 
        ? optimizedData.routes[0].steps
            .filter((s: any) => s.type === 'job')
            .map((s: any) => customer_ids[s.id])
        : customer_ids

      const stops = orderedCustomerIds.map((customerId: string, index: number) => ({
        route_id: route.id,
        customer_id: customerId,
        order_index: index,
        status: 'pendente'
      }))

      const { error: stopsError } = await supabase
        .from('route_stops')
        .insert(stops)
      
      if (stopsError) throw stopsError

      return route
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      setIsModalOpen(false)
      setOptimizedData(null)
      setCurrentTab('config')
      form.reset()
      toast.success('Rota criada com sucesso')
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar rota: ${error.message}`)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string, values: RouteFormValues }) => {
      const { customer_ids, ...routeData } = values
      
      const payload: any = {
        ...routeData,
      }

      if (optimizedData) {
        payload.distance = optimizedData.routes[0].distance
        payload.duration = optimizedData.routes[0].duration
        payload.route_geometry = optimizedData.routes[0].geometry
      }

      // 1. Update route
      const { error: routeError } = await supabase
        .from('routes')
        .update(payload)
        .eq('id', id)
      
      if (routeError) throw routeError

      // 2. Refresh stops if customer list changed
      // Note: In a real app, we'd compare old and new stops. Here we simplify by replacing.
      const { error: deleteError } = await supabase
        .from('route_stops')
        .delete()
        .eq('route_id', id)
      
      if (deleteError) throw deleteError

      const orderedCustomerIds = optimizedData 
        ? optimizedData.routes[0].steps
            .filter((s: any) => s.type === 'job')
            .map((s: any) => customer_ids[s.id])
        : customer_ids

      const stops = orderedCustomerIds.map((customerId: string, index: number) => ({
        route_id: id,
        customer_id: customerId,
        order_index: index,
        status: 'pendente'
      }))

      const { error: stopsError } = await supabase
        .from('route_stops')
        .insert(stops)
      
      if (stopsError) throw stopsError

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      setIsModalOpen(false)
      setOptimizedData(null)
      setCurrentTab('config')
      toast.success('Rota atualizada com sucesso')
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar rota: ${error.message}`)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('routes')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] })
      setIsDeleteDialogOpen(false)
      toast.success('Rota excluída com sucesso')
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`)
    }
  })

  const onSubmit = (values: RouteFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: selectedRoute.id, values })
    } else {
      createMutation.mutate(values)
    }
  }

  const handleEditClick = (route: any) => {
    setSelectedRoute(route)
    setIsEditing(true)
    setOptimizedData(null)
    setCurrentTab('config')
    
    form.reset({
      vehicle_id: route.vehicle_id,
      driver_id: route.driver_id,
      delivery_date: route.delivery_date,
      status: route.status,
      customer_ids: route.stops?.map((s: any) => s.customer?.id).filter(Boolean) || [],
    })
    
    setIsModalOpen(true)
  }

  const handleDeleteClick = (route: any) => {

  const handleOptimize = async () => {
    const values = form.getValues()
    if (values.customer_ids.length < 2) {
      toast.error('Selecione pelo menos 2 clientes (o primeiro será considerado o Ponto de Partida)')
      return
    }

    setIsOptimizing(true)
    try {
      const selectedCustomers = values.customer_ids.map(id => 
        customers?.find(c => c.id === id)
      ).filter(Boolean)

      if (selectedCustomers.some(c => !c?.latitude || !c?.longitude)) {
        toast.error('Alguns clientes selecionados não possuem coordenadas geográficas configuradas.')
        return
      }

      const { data, error } = await supabase.functions.invoke('optimize-route', {
        body: { locations: selectedCustomers }
      })

      if (error) throw error
      
      setOptimizedData(data)
      setCurrentTab('optimization')
      toast.success('Rota otimizada com sucesso!')
    } catch (error: any) {
      console.error(error)
      toast.error(`Erro na otimização: ${error.message}`)
    } finally {
      setIsOptimizing(false)
    }
  }

  const exportToPDF = (route: any) => {
    const doc = new jsPDF() as jsPDFWithAutoTable
    const dateStr = route.delivery_date ? format(new Date(route.delivery_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'

    // Header
    doc.setFontSize(20)
    doc.setTextColor(37, 99, 235) // Blue-600
    doc.text('Relatório de Rota de Entrega', 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30)

    // Route info box
    doc.setFillColor(248, 250, 252) // Slate-50
    doc.roundedRect(14, 35, 182, 45, 2, 2, 'F')
    
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59) // Slate-800
    doc.setFont('helvetica', 'bold')
    doc.text('Informações da Rota', 20, 42)
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Data: ${dateStr}`, 20, 50)
    doc.text(`Veículo: ${route.vehicle?.name || '-'} (${route.vehicle?.plate || '-'})`, 20, 57)
    doc.text(`Motorista: ${route.driver?.full_name || '-'}`, 20, 64)
    doc.text(`Distância Total: ${route.distance ? (route.distance / 1000).toFixed(1) + ' km' : '-'}`, 120, 50)
    doc.text(`Duração Estimada: ${route.duration ? Math.round(route.duration / 60) + ' min' : '-'}`, 120, 57)
    doc.text(`Status: ${route.status}`, 120, 64)

    // Stops table
    const tableData = route.stops?.map((stop: any, index: number) => [
      index + 1,
      stop.customer?.name || '-',
      stop.customer?.address || '-',
      'Pendente'
    ]) || []

    doc.autoTable({
      startY: 85,
      head: [['#', 'Cliente', 'Endereço', 'Status']],
      body: tableData,
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { top: 85 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 45 },
        2: { cellWidth: 90 },
        3: { cellWidth: 25 }
      }
    })

    doc.save(`rota-${dateStr.replace(/\//g, '-')}-${route.id.substring(0, 8)}.pdf`)
    toast.success('PDF gerado com sucesso')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pendente</Badge>
      case 'em_rota':
        return <Badge className="bg-blue-600">Em Rota</Badge>
      case 'finalizada':
        return <Badge className="bg-emerald-600">Finalizada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredRoutes = routes?.filter(r => 
    r.vehicle?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.driver?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (profileLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rotas</h1>
          <p className="text-slate-500 text-sm">Gerencie e acompanhe as rotas de entrega</p>
        </div>
        {canManage && (
          <Button 
            onClick={() => {
              setIsEditing(false)
              setOptimizedData(null)
              setCurrentTab('config')
              form.reset({
                vehicle_id: '',
                driver_id: '',
                delivery_date: format(new Date(), 'yyyy-MM-dd'),
                status: 'pendente',
                customer_ids: [],
              })
              setIsModalOpen(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <Plus size={18} className="mr-2" />
            Nova Rota
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Filtrar rotas recentes..." 
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={onSearchChange}
            />
          </div>
        </div>

        {/* Tabela de Rotas */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Distância</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Paradas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mapa</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-red-500">
                    Erro ao carregar rotas. Tente novamente.
                  </TableCell>
                </TableRow>
              ) : routes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                    Nenhuma rota encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                routes?.map((route) => (
                  <TableRow key={route.id} className="group">
                    <TableCell className="font-medium text-slate-900">
                      {route.delivery_date ? format(new Date(route.delivery_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck size={14} className="text-slate-400" />
                        <div>
                          <div className="font-medium">{route.vehicle?.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{route.vehicle?.plate}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {route.distance ? `${(route.distance / 1000).toFixed(1)} km` : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {route.duration ? `${Math.round(route.duration / 60)} min` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {route.stops?.length || 0} paradas
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(route.status)}</TableCell>
                    <TableCell>
                      {route.route_geometry && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                              <MapIconUI size={14} className="mr-1" /> Ver
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl h-[600px] p-0 overflow-hidden">
                            <MapView 
                              stops={[
                                {
                                  id: 'depot',
                                  latitude: route.stops?.[0]?.customer?.latitude || 0,
                                  longitude: route.stops?.[0]?.customer?.longitude || 0,
                                  name: 'Ponto de Partida',
                                  type: 'vehicle' as const,
                                  driverName: route.driver?.full_name || undefined
                                },
                                ...(route.stops?.map((s: any) => ({
                                  id: s.id,
                                  latitude: s.customer?.latitude,
                                  longitude: s.customer?.longitude,
                                  name: s.customer?.name,
                                  order_index: s.order_index,
                                  type: 'customer' as const
                                })) || [])
                              ]} 
                              routeGeometry={route.route_geometry}
                            />
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditClick(route)}>
                              <Pencil size={14} className="mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToPDF(route)}>
                              <FileDown size={14} className="mr-2" /> Exportar PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => handleDeleteClick(route)}
                            >
                              <Trash2 size={14} className="mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t bg-slate-50/50 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Mostrando <span className="font-medium">{routes?.length || 0}</span> de <span className="font-medium">{totalCount}</span> rotas
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-medium px-2">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Nova Rota */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Nova Rota de Entrega</DialogTitle>
            <DialogDescription>
              Configure o veículo, motorista e clientes para esta rota.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 border-b bg-slate-50/50">
                  <TabsList className="grid w-full grid-cols-2 mt-2">
                    <TabsTrigger value="config" className="flex items-center gap-2">
                      <Pencil size={14} /> Configuração
                    </TabsTrigger>
                    <TabsTrigger value="optimization" disabled={!optimizedData} className="flex items-center gap-2">
                      <Wand2 size={14} /> Otimização
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="config" className="h-full m-0">
                    <ScrollArea className="h-full p-6">
                      <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="delivery_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Entrega</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status Inicial</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="em_rota">Em Rota</SelectItem>
                              <SelectItem value="finalizada">Finalizada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehicle_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Veículo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um veículo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vehicles?.map(v => (
                                <SelectItem key={v.id} value={v.id} disabled={v.status === 'manutencao'}>
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <span>{v.name} ({v.plate})</span>
                                    {v.status && v.status !== 'disponivel' && (
                                      <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize">
                                        {v.status.replace('_', ' ')}
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="driver_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motorista</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um motorista" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {drivers?.map(d => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="customer_ids"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Selecionar Clientes</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Selecione os clientes que farão parte desta rota.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 border rounded-md p-4 max-h-[200px] overflow-y-auto bg-slate-50">
                          {customers?.map((customer) => (
                            <FormField
                              key={customer.id}
                              control={form.control}
                              name="customer_ids"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={customer.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(customer.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, customer.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== customer.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      <span className="font-semibold">{customer.name}</span>
                                      <span className="block text-xs text-slate-500 truncate max-w-[400px]">
                                        {customer.address}
                                      </span>
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Resumo da Rota */}
                  <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-800">
                        <Clock size={16} />
                        Resumo da Rota
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-sm text-blue-700 space-y-1">
                        <p><strong>Total de Paradas:</strong> {form.watch('customer_ids')?.length || 0}</p>
                        {form.watch('customer_ids')?.length > 0 && (
                          <div className="mt-2 text-xs">
                            <p className="font-semibold mb-1">Clientes selecionados:</p>
                            <div className="flex flex-wrap gap-1">
                              {form.watch('customer_ids').map(id => {
                                const customer = customers?.find(c => c.id === id)
                                return (
                                  <Badge key={id} variant="secondary" className="bg-white border-blue-200">
                                    {customer?.name}
                                  </Badge>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                    </div>
                    </ScrollArea>
                  </TabsContent>

                <TabsContent value="optimization" className="h-full m-0">
                  <ScrollArea className="h-full p-6">
                    {optimizedData && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <Card className="bg-slate-50 border-slate-200">
                            <CardContent className="p-4 flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <RouteIcon size={20} />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold">Distância Total</p>
                                <p className="text-lg font-bold">{(optimizedData.routes[0].distance / 1000).toFixed(1)} km</p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card className="bg-slate-50 border-slate-200">
                            <CardContent className="p-4 flex items-center gap-3">
                              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <Clock size={20} />
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase font-semibold">Tempo Estimado</p>
                                <p className="text-lg font-bold">{Math.round(optimizedData.routes[0].duration / 60)} min</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <MapView 
                          stops={[
                            // Add vehicle/driver as first point if possible
                            ...(form.watch('vehicle_id') ? [{
                              id: 'vehicle-start',
                              latitude: Number(customers?.[0]?.latitude || 0), 
                              longitude: Number(customers?.[0]?.longitude || 0),
                              name: 'Ponto de Partida',
                              type: 'vehicle' as const,
                              driverName: drivers?.find(d => d.id === form.watch('driver_id'))?.full_name
                            }] : []),
                            ...form.watch('customer_ids').map(id => {
                              const c = customers?.find(cust => cust.id === id);
                              if (!c) return null;
                              return {
                                id: c.id,
                                latitude: Number(c.latitude),
                                longitude: Number(c.longitude),
                                name: c.name,
                                type: 'customer' as const,
                                order_index: optimizedData?.routes[0]?.steps
                                  ?.filter((s: any) => s.type === 'job')
                                  ?.findIndex((s: any) => form.getValues('customer_ids')[s.id] === id)
                              };
                            }).filter(Boolean) as any
                          ]} 
                          routeGeometry={optimizedData.routes[0].geometry}
                        />

                        <div className="space-y-3">
                          <h3 className="font-semibold text-sm flex items-center gap-2">
                            <MapIconUI size={16} /> Sequência de Entregas
                          </h3>
                          <div className="space-y-2">
                            {optimizedData.routes[0].steps
                              .filter((step: any) => step.type === 'job')
                              .map((step: any, index: number) => {
                                const customer = customers?.find(c => c.id === form.getValues('customer_ids')[step.id]);
                                return (
                                  <div key={index} className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm">
                                    <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold truncate">{customer?.name}</p>
                                      <p className="text-xs text-slate-500 truncate">{customer?.address}</p>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>



              <DialogFooter className="p-6 border-t bg-slate-50 flex flex-row items-center justify-between">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={handleOptimize}
                    disabled={isOptimizing || form.watch('customer_ids').length < 1}
                  >
                    {isOptimizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 size={14} className="mr-2" />}
                    Otimizar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending || (currentTab === 'config' && !optimizedData)}
                  >
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {optimizedData ? 'Confirmar e Criar' : 'Criar Rota'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Rota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as paradas vinculadas a esta rota também serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedRoute && deleteMutation.mutate(selectedRoute.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
}


