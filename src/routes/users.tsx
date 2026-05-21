import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/users')({
  component: () => <div className="p-4"><h1>Usuários</h1><p className="text-slate-500">Gestão de usuários em breve...</p></div>,
})
