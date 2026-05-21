-- Adicionar coluna email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Atualizar trigger para incluir email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    CASE 
      WHEN NEW.email = 'rudneybozo@gmail.com' THEN 'admin'::user_role 
      ELSE (NEW.raw_user_meta_data->>'role')::user_role
    END,
    NEW.email
  );
  RETURN NEW;
END;
$function$;

-- Sincronizar emails existentes
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;
