import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/customers')({
  component: () => <div className="p-4"><h1>Clientes</h1><p className="text-slate-500">Gestão de clientes em breve...</p></div>,
})
