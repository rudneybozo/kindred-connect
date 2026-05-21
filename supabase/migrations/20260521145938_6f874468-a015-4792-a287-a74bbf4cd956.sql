-- Add status column to vehicles table
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_rota', 'manutencao'));

-- Add column for vehicle name (nickname/label) if model is not enough
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS name TEXT;

-- Update RLS policies for vehicles to ensure lancadores can manage them too
DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Anyone can view vehicles" ON public.vehicles;

CREATE POLICY "Admins and dispatchers can manage vehicles" 
ON public.vehicles 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'lancador')
  )
);

CREATE POLICY "Drivers can view vehicles" 
ON public.vehicles 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'motorista'
  )
);
