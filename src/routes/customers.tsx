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
  User,
  Loader2,
  MapPin,
  Phone,
  MessageSquare,
  ExternalLink,
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
import { Badge } from '@/components/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { useProfile } from '@/hooks/use-profile'

const customerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  address: z.string().min(5, 'Endereço é obrigatório'),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  phone: z.string().min(8, 'Telefone inválido').optional().or(z.literal('')),
})

type CustomerFormValues = z.infer<typeof customerSchema>

export const Route = createFileRoute('/customers')({
  component: CustomersPage,
})

function CustomersPage() {
  const { data: currentProfile, isLoading: profileLoading } = useProfile()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
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

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      address: '',
      latitude: null,
      longitude: null,
      phone: '',
    },
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', debouncedSearch, page],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
      
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,address.ilike.%${debouncedSearch}%`)
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await query
        .order('name')
        .range(from, to)
      
      if (error) {
        toast.error('Erro ao carregar clientes: ' + error.message)
        throw error
      }
      return { customers: data, count: count || 0 }
    }
  })

  const customers = data?.customers
  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize)

  const createMutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const { data, error } = await supabase
        .from('customers')
        .insert([values])
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsModalOpen(false)
      form.reset()
      toast.success('Cliente cadastrado com sucesso')
    },
    onError: (error: any) => {
      toast.error(`Erro ao cadastrar: ${error.message}`)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string, values: CustomerFormValues }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(values)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsModalOpen(false)
      toast.success('Cliente atualizado com sucesso')
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsDeleteDialogOpen(false)
      toast.success('Cliente excluído com sucesso')
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`)
    }
  })

  const onSubmit = (values: CustomerFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: selectedCustomer.id, values })
    } else {
      createMutation.mutate(values)
    }
  }

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer)
    setIsEditing(true)
    form.reset({
      name: customer.name,
      address: customer.address,
      latitude: customer.latitude,
      longitude: customer.longitude,
      phone: customer.phone || '',
    })
    setIsModalOpen(true)
  }

  const handleDeleteClick = (customer: any) => {
    setSelectedCustomer(customer)
    setIsDeleteDialogOpen(true)
  }

  const filteredCustomers = customers?.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  )

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    window.open(`https://wa.me/${cleaned}`, '_blank')
  }

  const openMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank')
  }

  if (profileLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-blue-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-slate-500 text-sm">Gerencie sua base de clientes e endereços de entrega</p>
        </div>
        {canManage && (
          <Button 
            onClick={() => {
              setIsEditing(false)
              form.reset({
                name: '',
                address: '',
                latitude: null,
                longitude: null,
                phone: '',
              })
              setIsModalOpen(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            <Plus size={18} className="mr-2" />
            Novo Cliente
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Buscar por nome ou endereço..." 
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
                <TableHead>Endereço</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-red-500">
                    Falha ao carregar dados. Tente atualizar a página.
                  </TableCell>
                </TableRow>
              ) : customers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                customers?.map((customer) => (
                  <TableRow key={customer.id} className="group">
                    <TableCell className="font-medium text-slate-900">{customer.name}</TableCell>
                    <TableCell className="text-slate-600 max-w-[300px] truncate">{customer.address}</TableCell>
                    <TableCell>
                      {customer.phone ? (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">{customer.phone}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => openWhatsApp(customer.phone || '')}
                          >
                            <MessageSquare size={14} />
                          </Button>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {customer.latitude && customer.longitude ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => openMaps(customer.latitude || 0, customer.longitude || 0)}
                        >
                          <MapPin size={14} className="mr-1" /> Maps
                        </Button>
                      ) : <span className="text-slate-400 text-xs italic">Não mapeado</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          {canManage && (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                <Pencil size={14} className="mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                onClick={() => handleDeleteClick(customer)}
                              >
                                <Trash2 size={14} className="mr-2" /> Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                          {!canManage && <DropdownMenuItem disabled>Visualização apenas</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              </div>
            ))
          ) : customers?.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum cliente encontrado.</div>
          ) : (
            customers?.map((customer) => (
              <div key={customer.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-900">{customer.name}</h3>
                  <div className="flex gap-1">
                    {customer.phone && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-emerald-600 border-emerald-100"
                        onClick={() => openWhatsApp(customer.phone || '')}
                      >
                        <MessageSquare size={14} />
                      </Button>
                    )}
                    {customer.latitude && customer.longitude && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 text-blue-600 border-blue-100"
                        onClick={() => openMaps(customer.latitude || 0, customer.longitude || 0)}
                      >
                        <MapPin size={14} />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-600 flex items-start gap-1">
                  <MapPin size={14} className="mt-0.5 text-slate-400 shrink-0" />
                  <span>{customer.address}</span>
                </div>
                {canManage && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(customer)}>
                      <Pencil size={14} className="mr-2" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700 border-red-100" onClick={() => handleDeleteClick(customer)}>
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
              Mostrando <span className="font-medium">{customers?.length || 0}</span> de <span className="font-medium">{totalCount}</span> clientes
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            <DialogDescription>
              Insira os dados de contato e endereço para entregas.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo / Razão Social</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Mercado Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, Número, Bairro, Cidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone / WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="5511999999999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="-23.5505" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="-46.6333" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
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
            <AlertDialogTitle>Excluir Cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente 
              <span className="font-semibold text-slate-900 mx-1">{selectedCustomer?.name}</span>
              será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedCustomer && deleteMutation.mutate(selectedCustomer.id)}
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

