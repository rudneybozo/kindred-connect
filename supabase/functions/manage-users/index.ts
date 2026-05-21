import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the session of the user calling the function
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Only admins can manage users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { action, userData } = await req.json()

    if (action === 'create') {
      const { email, password, full_name, role } = userData
      
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        user_metadata: { full_name },
        email_confirm: true
      })

      if (createError) throw createError

      // Update role in profiles
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ role, full_name })
        .eq('id', newUser.user.id)

      if (profileError) throw profileError

      return new Response(JSON.stringify({ data: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (action === 'update') {
      const { id, email, password, full_name, role } = userData
      
      const updateData: any = {
        email,
        user_metadata: { full_name }
      }
      if (password) updateData.password = password

      const { data: updatedUser, error: updateError } = await supabaseClient.auth.admin.updateUserById(
        id,
        updateData
      )

      if (updateError) throw updateError

      // Update role in profiles
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ role, full_name })
        .eq('id', id)

      if (profileError) throw profileError

      return new Response(JSON.stringify({ data: updatedUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (action === 'delete') {
      const { id } = userData
      const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(id)

      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
