-- Function to get the current user's role without recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Update is_admin to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT get_my_role() = 'admin'::user_role;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Drop recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policies
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins have full access on profiles"
ON public.profiles FOR ALL
TO authenticated
USING (is_admin());

-- Also fix vehicles policies just in case
DROP POLICY IF EXISTS "Admins and Lancadores can manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Admins and dispatchers can manage vehicles" ON public.vehicles;

CREATE POLICY "Admins and Lancadores can manage vehicles"
ON public.vehicles FOR ALL
TO authenticated
USING (get_my_role() IN ('admin'::user_role, 'lancador'::user_role));
