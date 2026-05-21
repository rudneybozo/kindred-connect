-- Remover políticas problemáticas
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Criar política usando auth.uid() diretamente para o próprio perfil
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Criar política para admins usando um check que não cause recursão
-- Uma forma é usar uma função SECURITY DEFINER ou apenas verificar o auth.uid() contra uma lista de IDs admin (mas isso é estático)
-- Melhor: Usar a política de ADMINS que já existia se ela estava correta, mas ela também usava subquery.

-- Vamos usar a política simplificada que permite SELECT se o usuário for o dono OU se o role for admin no JWT (se tivermos sincronizado)
-- Como não temos no JWT por padrão, vamos usar a abordagem de subquery mas com cuidado ou uma função.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin());
