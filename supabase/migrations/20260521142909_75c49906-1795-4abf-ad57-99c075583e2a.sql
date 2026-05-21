-- Função para criar perfil automaticamente e atribuir papel de admin ao email específico
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    CASE 
      WHEN NEW.email = 'rudneybozo@gmail.com' THEN 'admin'::user_role 
      ELSE 'motorista'::user_role 
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para automatizar a criação do perfil após o cadastro no Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Caso o usuário já tenha se cadastrado, tentamos atualizar o papel dele via um update que varre o auth.users (se acessível)
DO $$
DECLARE
  target_id UUID;
BEGIN
  -- Tenta buscar o ID no auth.users (disponível em migrações)
  SELECT id INTO target_id FROM auth.users WHERE email = 'rudneybozo@gmail.com';
  
  IF target_id IS NOT NULL THEN
    -- Garante que o perfil existe e é admin
    INSERT INTO public.profiles (id, role) 
    VALUES (target_id, 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
  END IF;
END $$;
