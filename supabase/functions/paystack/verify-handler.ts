
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"
import { verifyPaystackTransaction, processVerifiedTransaction } from "./verify.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let body;
    try {
      body = await req.json();
      console.log("Received verify request with body:", JSON.stringify(body, null, 2));
    } catch (err) {
      console.error("Error parsing request body:", err);
      return new Response(JSON.stringify({ 
        status: false, 
        message: "Invalid request body" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    const { reference } = body;
    
    if (!reference) {
      return new Response(JSON.stringify({ 
        status: false, 
        message: "Reference is required" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    // Use the secret key from environment variables
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_TEST_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      console.error("Missing PAYSTACK_TEST_SECRET_KEY environment variable");
      return new Response(JSON.stringify({ 
        status: false, 
        message: "Paystack API key not configured" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // Verify the transaction with Paystack
    const verification = await verifyPaystackTransaction(reference, PAYSTACK_SECRET_KEY);
    
    if (!verification.status) {
      return new Response(JSON.stringify({ 
        status: false, 
        message: verification.message || "Verification failed" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    // If verification is successful, process the transaction
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ 
        status: false, 
        message: "Server configuration error" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    // Create admin client for database operations
    const supabaseAdminClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      { auth: { persistSession: false } }
    );
    
    // Process the verified transaction
    const result = await processVerifiedTransaction(verification, supabaseAdminClient);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error("Error in verification handler:", error);
    return new Response(JSON.stringify({ 
      status: false, 
      error: error.message || "An unexpected error occurred" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
