
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
    console.log("Verify handler received request", req.method);
    console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
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
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_TEST_SECRET_KEY') || Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      console.error("Missing Paystack secret key environment variable");
      console.log("Available environment variables:", Object.keys(Deno.env.toObject()));
      return new Response(JSON.stringify({ 
        status: false, 
        message: "Paystack API key not configured" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    console.log(`Verifying transaction with reference: ${reference}`);
    
    // Verify the transaction with Paystack
    const verification = await verifyPaystackTransaction(reference, PAYSTACK_SECRET_KEY);
    
    if (!verification.status) {
      console.error(`Verification failed for reference: ${reference}`, verification);
      return new Response(JSON.stringify({ 
        status: false, 
        message: verification.message || "Verification failed" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    console.log(`Verification successful for reference: ${reference}`);
    console.log(`Verification data:`, JSON.stringify(verification.data, null, 2));
    
    // If verification is successful, process the transaction
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase configuration");
      console.log("Available environment variables:", Object.keys(Deno.env.toObject()));
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
    console.log("Transaction processing result:", JSON.stringify(result, null, 2));
    
    return new Response(JSON.stringify({
      ...result,
      status: result.success,
      verification_status: verification.status
    }), {
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
