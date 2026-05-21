-- Create route_stops table
CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'entregue', 'falha')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

-- Create policies for route_stops
CREATE POLICY "Admins can do everything on route_stops"
ON public.route_stops FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Dispatchers can do everything on route_stops"
ON public.route_stops FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'lancador'
  )
);

CREATE POLICY "Drivers can view and update their own route stops"
ON public.route_stops FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.routes
    WHERE routes.id = route_stops.route_id AND routes.driver_id = auth.uid()
  )
);

-- Ensure routes table has appropriate policies (if not already there)
-- Admin/Lancador can manage routes, Drivers can only see theirs.
DROP POLICY IF EXISTS "Admins can manage routes" ON public.routes;
CREATE POLICY "Admins can manage routes"
ON public.routes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Dispatchers can manage routes" ON public.routes;
CREATE POLICY "Dispatchers can manage routes"
ON public.routes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'lancador'
  )
);

DROP POLICY IF EXISTS "Drivers can view their routes" ON public.routes;
CREATE POLICY "Drivers can view their routes"
ON public.routes FOR SELECT
TO authenticated
USING (driver_id = auth.uid());
