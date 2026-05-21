import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vehicles')({
  component: () => <div className="p-4"><h1>Veículos</h1><p className="text-slate-500">Gestão de veículos em breve...</p></div>,
})
