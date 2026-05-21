import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
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
  Map as MapIconUI
} from 'lucide-react'
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
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

  // Fetch routes with details
  const { data: routes, isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select(`
          *,
          vehicle:vehicles(name, plate),
          driver:profiles!routes_driver_id_fkey(full_name),
          stops:route_stops(
            id,
            customer:customers(name, address)
          )
        `)
        .order('delivery_date', { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  // Fetch vehicles for selection
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, name, plate')
        .eq('status', 'disponivel')
      
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
      // Logic for editing would be similar but needs to handle stop updates
      toast.info('Edição será implementada em breve. Por favor, exclua e crie uma nova.')
    } else {
      createMutation.mutate(values)
    }
  }

  const handleDeleteClick = (route: any) => {
    setSelectedRoute(route)
    setIsDeleteDialogOpen(true)
  }

  const handleOptimize = async () => {
    const values = form.getValues()
    if (!values.customer_ids.length) {
      toast.error('Selecione pelo menos um cliente')
      return
    }

    setIsOptimizing(true)
    try {
      const selectedCustomers = values.customer_ids.map(id => 
        customers?.find(c => c.id === id)
      ).filter(Boolean)

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
              placeholder="Buscar por veículo ou motorista..." 
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                <TableHead>Paradas</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="animate-spin inline-block mr-2" /> Carregando rotas...
                  </TableCell>
                </TableRow>
              ) : filteredRoutes?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                    Nenhuma rota encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoutes?.map((route) => (
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserIcon size={14} className="text-slate-400" />
                        <span>{route.driver?.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {route.stops?.length || 0} paradas
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(route.status)}</TableCell>
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
              <ScrollArea className="flex-1 p-6">
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
                                <SelectItem key={v.id} value={v.id}>
                                  {v.name} ({v.plate})
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

              <DialogFooter className="p-6 border-t bg-slate-50">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Rota
                </Button>
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
