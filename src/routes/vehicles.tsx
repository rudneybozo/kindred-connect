import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  MoreHorizontal,
  Truck,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import debounce from 'lodash/debounce'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useProfile } from '@/hooks/use-profile'

const vehicleSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  plate: z.string().min(7, 'Placa inválida').max(8),
  model: z.string().min(2, 'Modelo é obrigatório'),
  capacity: z.coerce.number().min(0.1, 'Capacidade deve ser maior que zero'),
  status: z.enum(['disponivel', 'em_rota', 'manutencao']),
})

type VehicleFormValues = z.infer<typeof vehicleSchema>

export const Route = createFileRoute('/vehicles')({
  component: VehiclesPage,
})

function VehiclesPage() {
  const { data: currentProfile, isLoading: profileLoading } = useProfile()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)
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

  const canManage = currentProfile?.role === 'admin' || currentProfile?.role === 'lancador'

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      name: '',
      plate: '',
      model: '',
      capacity: 0,
      status: 'disponivel',
    },
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicles', debouncedSearch, page],
    queryFn: async () => {
      let query = supabase
        .from('vehicles')
        .select('*', { count: 'exact' })
      
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,plate.ilike.%${debouncedSearch}%,model.ilike.%${debouncedSearch}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await query
        .order('name')
        .range(from, to)
      
      if (error) {
        toast.error('Erro ao carregar veículos: ' + error.message)
        throw error
      }
      return { vehicles: data, count: count || 0 }
    }
  })

  const vehicles = data?.vehicles
  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  const createMutation = useMutation({
    mutationFn: async (values: VehicleFormValues) => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([values])
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsModalOpen(false)
      form.reset()
      toast.success('Veículo cadastrado com sucesso')
    },
    onError: (error: any) => {
      toast.error(`Erro ao cadastrar: ${error.message}`)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string, values: VehicleFormValues }) => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(values)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsModalOpen(false)
      toast.success('Veículo atualizado com sucesso')
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setIsDeleteDialogOpen(false)
      toast.success('Veículo excluído com sucesso')
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`)
    }
  })

  const onSubmit = (values: VehicleFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: selectedVehicle.id, values })
    } else {
      createMutation.mutate(values)
    }
  }

  const handleEdit = (vehicle: any) => {
    setSelectedVehicle(vehicle)
    setIsEditing(true)
    form.reset({
      name: vehicle.name || '',
      plate: vehicle.plate,
      model: vehicle.model,
      capacity: vehicle.capacity,
      status: vehicle.status as any,
    })
    setIsModalOpen(true)
  }

  const handleDeleteClick = (vehicle: any) => {
    setSelectedVehicle(vehicle)
    setIsDeleteDialogOpen(true)
  }

  const filteredVehicles = vehicles?.filter(v => 
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'disponivel':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Disponível</Badge>
      case 'em_rota':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Em Rota</Badge>
      case 'manutencao':
        return <Badge className="bg-amber-500 hover:bg-amber-600">Manutenção</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (profileLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Veículos</h1>
          <p className="text-slate-500 text-sm">Gerencie a frota de veículos para entregas</p>
        </div>
        {canManage && (
          <Button 
            onClick={() => {
              setIsEditing(false)
              form.reset({
                name: '',
                plate: '',
                model: '',
                capacity: 0,
                status: 'disponivel',
              })
              setIsModalOpen(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <Plus size={18} className="mr-2" />
            Novo Veículo
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Buscar por nome, placa ou modelo..." 
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={onSearchChange}
            />
          </div>
        </div>

        {/* Tabela para Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Capacidade (kg)</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-red-500">
                    Falha ao carregar veículos.
                  </TableCell>
                </TableRow>
              ) : vehicles?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="h-24 text-center text-slate-500">
                    Nenhum veículo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                vehicles?.map((vehicle) => (
                  <TableRow key={vehicle.id} className="group">
                    <TableCell className="font-medium text-slate-900">{vehicle.name || vehicle.model}</TableCell>
                    <TableCell className="text-slate-600">{vehicle.plate}</TableCell>
                    <TableCell className="text-slate-600">{vehicle.model}</TableCell>
                    <TableCell className="text-slate-600 font-mono">{vehicle.capacity}</TableCell>
                    <TableCell>{getStatusBadge(vehicle.status || 'disponivel')}</TableCell>
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
                            <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
                              <Pencil size={14} className="mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => handleDeleteClick(vehicle)}
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

        {/* Cards para Mobile */}
        <div className="md:hidden divide-y">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </div>
            ))
          ) : vehicles?.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum veículo encontrado.</div>
          ) : (
            vehicles?.map((vehicle) => (
              <div key={vehicle.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{vehicle.name || vehicle.model}</h3>
                    <p className="text-xs text-slate-500 uppercase font-mono">{vehicle.plate}</p>
                  </div>
                  {getStatusBadge(vehicle.status || 'disponivel')}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Modelo</span>
                    {vehicle.model}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Capacidade</span>
                    {vehicle.capacity} kg
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(vehicle)}>
                      <Pencil size={14} className="mr-2" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700 border-red-100" onClick={() => handleDeleteClick(vehicle)}>
                      <Trash2 size={14} className="mr-2" /> Excluir
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t bg-slate-50/50 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Mostrando <span className="font-medium">{vehicles?.length || 0}</span> de <span className="font-medium">{totalCount}</span> veículos
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

      {/* Modal de Cadastro/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do veículo para a frota.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome/Identificação</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Caminhão 01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placa</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC1D23" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: VW Delivery" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="1500" {...field} />
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="disponivel">Disponível</SelectItem>
                        <SelectItem value="em_rota">Em Rota</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Salvar Alterações' : 'Cadastrar Veículo'}
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
            <AlertDialogTitle>Excluir Veículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O veículo 
              <span className="font-semibold text-slate-900 mx-1">{selectedVehicle?.name || selectedVehicle?.plate}</span>
              será removido permanentemente da frota.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedVehicle && deleteMutation.mutate(selectedVehicle.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

