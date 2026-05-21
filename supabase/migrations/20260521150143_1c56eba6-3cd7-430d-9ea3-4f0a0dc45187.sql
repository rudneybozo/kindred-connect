-- Add new columns to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone TEXT;

-- Standardize access policies for customers
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;

CREATE POLICY "Admins and dispatchers can manage customers" 
ON public.customers 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'lancador')
  )
);

CREATE POLICY "Drivers can view customers" 
ON public.customers 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'motorista'
  )
);
