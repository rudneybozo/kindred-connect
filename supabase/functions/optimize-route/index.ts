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
      throw new Error('ORS_API_KEY not configured')
    }

    console.log(`Optimizing route for ${locations.length} locations`)

    // OpenRouteService Optimization API (Vroom)
    // https://openrouteservice.org/dev/#/api-docs/optimization/post
    
    // Convert locations to ORS jobs
    const jobs = locations.map((loc: any, index: number) => ({
      id: index,
      service: 300, // 5 min service time
      location: [loc.longitude, loc.latitude],
      skills: [1],
    }))

    // Define a vehicle (starting from the first location)
    const vehicles = [{
      id: 1,
      profile: profile,
      start: [locations[0].longitude, locations[0].latitude],
      end: [locations[0].longitude, locations[0].latitude],
      capacity: [100],
      skills: [1],
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
          g: true // return geometry
        }
      }),
    })

    const data = await response.json()

    if (data.error) {
      console.error('ORS Error:', data.error)
      throw new Error(data.error.message || 'Error from ORS API')
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
