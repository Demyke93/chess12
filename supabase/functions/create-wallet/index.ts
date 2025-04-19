
// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Try to import from multiple CDNs for better reliability
let createClient;
try {
  const supabaseJs = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.21.0/+esm");
  createClient = supabaseJs.createClient;
} catch (e) {
  console.error("Primary CDN failed, trying fallback:", e);
  const supabaseJs = await import("https://esm.sh/@supabase/supabase-js@2.21.0");
  createClient = supabaseJs.createClient;
}

// Define a more specific payload type
interface WalletCreationPayload {
  user_id: string;
  username?: string;
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("create-wallet function called");
    console.log("Request headers:", Object.fromEntries(req.headers));
    
    // Parse the request payload
    const requestBody = await req.text();
    console.log("Request body:", requestBody);
    
    let payload;
    try {
      payload = JSON.parse(requestBody);
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
      return new Response(
        JSON.stringify({ 
          status: false, 
          message: 'Invalid JSON payload',
          error: parseError.message 
        }), 
        { headers: corsHeaders, status: 400 }
      );
    }
    
    const { user_id, username = 'User' } = payload as WalletCreationPayload;
    console.log("Parsed payload:", { user_id, username });

    // Validate user_id
    if (!user_id) {
      console.error("Missing user_id in request");
      return new Response(
        JSON.stringify({ 
          status: false, 
          message: 'Missing user_id' 
        }), 
        { headers: corsHeaders, status: 400 }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ 
          status: false, 
          message: 'Server configuration error - missing Supabase credentials' 
        }), 
        { headers: corsHeaders, status: 500 }
      );
    }

    console.log("Creating Supabase admin client");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // First check if the profile exists, if not create it
    console.log("Checking if profile exists for user:", user_id);
    const { data: profileData, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .maybeSingle();

    if (profileCheckError) {
      console.error("Profile check error:", profileCheckError);
      return new Response(
        JSON.stringify({ 
          status: false, 
          message: 'Error checking user profile', 
          error: profileCheckError 
        }), 
        { headers: corsHeaders, status: 500 }
      );
    }

    // If profile doesn't exist, create it first
    if (!profileData) {
      console.log(`Profile not found for user ${user_id}, creating it first`);
      const { error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user_id,
          username: username,
          avatar_url: '♟',
          is_demo: false,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (createProfileError) {
        console.error("Profile creation error:", createProfileError);
        return new Response(
          JSON.stringify({ 
            status: false, 
            message: 'Failed to create user profile', 
            error: createProfileError 
          }), 
          { headers: corsHeaders, status: 500 }
        );
      }
      
      console.log(`Successfully created profile for user ${user_id}`);
    }

    // Check for existing wallet
    console.log("Checking for existing wallet for user:", user_id);
    const { data: existingWallet, error: checkError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (checkError) {
      console.error("Wallet check error:", checkError);
      return new Response(
        JSON.stringify({ 
          status: false, 
          message: 'Error checking for existing wallet', 
          error: checkError 
        }), 
        { headers: corsHeaders, status: 500 }
      );
    }

    // If wallet exists, return it
    if (existingWallet) {
      console.log("Wallet already exists for user:", user_id);
      return new Response(
        JSON.stringify({ 
          status: true, 
          message: 'Wallet already exists', 
          data: existingWallet 
        }), 
        { headers: corsHeaders }
      );
    }

    // Create new wallet
    console.log("Creating new wallet for user:", user_id);
    const { data: newWallet, error: createError } = await supabaseAdmin
      .from('wallets')
      .insert({
        user_id: user_id,
        balance: 0
      })
      .select('*')
      .single();

    if (createError) {
      console.error("Wallet creation error:", createError);
      return new Response(
        JSON.stringify({ 
          status: false, 
          message: 'Failed to create wallet', 
          error: createError 
        }), 
        { headers: corsHeaders, status: 500 }
      );
    }

    console.log("Wallet created successfully for user:", user_id);
    // Return successful response
    return new Response(
      JSON.stringify({ 
        status: true, 
        message: 'Wallet created successfully', 
        data: newWallet 
      }), 
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        status: false, 
        message: 'Unexpected server error', 
        error: error.message 
      }), 
      { headers: corsHeaders, status: 500 }
    );
  }
});
