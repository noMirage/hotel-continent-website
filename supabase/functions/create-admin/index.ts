import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const email = 'admin@luxestay.com'
    const password = 'admin123'

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
      console.log('User already exists:', userId)
    } else {
      // Create the admin user
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (createError) {
        throw createError
      }

      userId = userData.user.id
      console.log('Created user:', userId)
    }

    // Check if admin role already exists
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!existingRole) {
      // Add super_admin role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'super_admin' })

      if (roleError) {
        throw roleError
      }
      console.log('Added super_admin role')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        credentials: { email, password }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error:', errorMessage)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
