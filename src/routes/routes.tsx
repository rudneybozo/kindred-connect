import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/routes')({
  component: () => <div className="p-4"><h1>Rotas</h1><p className="text-slate-500">Gestão de rotas em breve...</p></div>,
})
