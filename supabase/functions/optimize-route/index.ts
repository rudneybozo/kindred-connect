import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { locations, profile = 'driving-car' } = await req.json()
    const apiKey = Deno.env.get('ORS_API_KEY')

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração pendente: ORS_API_KEY não encontrada no Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!locations || locations.length < 1) {
      throw new Error('Nenhuma localização fornecida para otimização.')
    }

    console.log(`Optimizing route for ${locations.length} locations`)

    // Convert locations to ORS jobs
    // Note: locations[0] is assumed to be the start/end point (depot)
    const jobs = locations.slice(1).map((loc: any, index: number) => ({
      id: index + 1,
      service: 300, 
      location: [Number(loc.longitude), Number(loc.latitude)],
    }))

    const vehicles = [{
      id: 1,
      profile: profile,
      start: [Number(locations[0].longitude), Number(locations[0].latitude)],
      end: [Number(locations[0].longitude), Number(locations[0].latitude)],
      capacity: [100],
    }]

    const response = await fetch('https://api.openrouteservice.org/optimization', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobs,
        vehicles,
        options: {
          g: true 
        }
      }),
    })

    const data = await response.json()

    if (data.error || (data.code !== undefined && data.code !== 0)) {
      console.error('ORS Error:', data)
      throw new Error(data.message || 'Erro na API de Otimização. Verifique as coordenadas.')
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error in optimize-route:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
