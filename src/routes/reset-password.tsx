import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Package2 } from 'lucide-react'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordComponent,
})

function ResetPasswordComponent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase processa o token automaticamente via hash da URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    // Caso já esteja em sessão de recovery
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Senha atualizada com sucesso!')
      navigate({ to: '/dashboard' })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-xl text-white">
              <Package2 size={32} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
          <CardDescription>
            {ready ? 'Digite sua nova senha abaixo' : 'Validando link de recuperação...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!ready}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={!ready}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || !ready}
            >
              {loading ? 'Atualizando...' : 'Atualizar Senha'}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate({ to: '/login' })}
                className="text-sm text-blue-600 hover:underline"
              >
                Voltar ao login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
