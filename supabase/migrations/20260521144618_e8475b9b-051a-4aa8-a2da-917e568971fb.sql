-- Remover política antiga
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Nova política: Apenas admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Nova política: Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
