
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"
import { verifyPaystackWebhook } from "./verifyWebhook.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Use the secret key from environment variables
  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_TEST_SECRET_KEY')
  if (!PAYSTACK_SECRET_KEY) {
    console.error("Missing PAYSTACK_TEST_SECRET_KEY environment variable")
    return new Response(JSON.stringify({ 
      status: false, 
      message: "Paystack API key not configured" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }

  try {
    const url = new URL(req.url);
    console.log("Processing request for path:", url.pathname, "method:", req.method);
    console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    // Handle webhook events from Paystack
    if (url.pathname.endsWith('/webhook') && req.method === 'POST') {
      // Verify webhook signature
      const hash = req.headers.get('x-paystack-signature');
      const body = await req.text();
      
      console.log("Received webhook from Paystack. Signature:", hash ? "Present" : "Missing");
      console.log("Webhook body:", body);
      
      // Verify the webhook signature if hash is present
      if (hash) {
        const isValid = await verifyPaystackWebhook(body, hash, PAYSTACK_SECRET_KEY);
        console.log("Webhook signature verification:", isValid ? "Valid" : "Invalid");
        
        if (!isValid) {
          console.error("Invalid webhook signature");
          return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          });
        }
      } else {
        console.warn("No webhook signature provided, skipping verification");
      }
      
      try {
        const event = JSON.parse(body);
        const { event: eventType, data } = event;
        
        console.log("Processing event type:", eventType);
        console.log("Event data:", JSON.stringify(data, null, 2));
        
        // Handle successful charge events
        if (eventType === 'charge.success') {
          const { reference, amount, customer, status } = data;
          
          console.log(`Processing successful charge: ref=${reference}, status=${status}, amount=${amount/100} NGN`);
          
          if (status === 'success') {
            // Create a client with the service role key to bypass RLS
            const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
            const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
            
            console.log("Creating Supabase client with URL:", supabaseUrl);
            console.log("Service role key present:", !!supabaseServiceRoleKey);
            
            if (!supabaseUrl || !supabaseServiceRoleKey) {
              console.error("Missing Supabase configuration");
              throw new Error("Server configuration error");
            }
            
            const supabaseAdminClient = createClient(
              supabaseUrl,
              supabaseServiceRoleKey,
              { auth: { persistSession: false } }
            );
            
            console.log("Looking for transaction with reference:", reference);
            
            // Find the transaction using the reference
            const { data: transactionData, error: transactionError } = await supabaseAdminClient
              .from('transactions')
              .select('*')
              .eq('reference', reference)
              .single();
              
            if (transactionError) {
              console.error("Error finding transaction:", transactionError);
              throw transactionError;
            }
            
            if (!transactionData) {
              console.error("Transaction not found for reference:", reference);
              throw new Error("Transaction not found");
            }
            
            console.log("Found transaction in database:", JSON.stringify(transactionData, null, 2));
            const walletId = transactionData.wallet_id;
            
            // Update the wallet balance
            const { data: walletData, error: walletError } = await supabaseAdminClient
              .from('wallets')
              .select('balance')
              .eq('id', walletId)
              .single();
              
            if (walletError) {
              console.error("Error finding wallet:", walletError);
              throw walletError;
            }
            
            console.log("Current wallet balance:", walletData.balance);
            
            // Convert values explicitly to numbers to prevent type issues
            const currentBalance = parseFloat(walletData.balance || '0');
            const depositAmount = parseFloat(transactionData.amount || '0');
            
            const newBalance = currentBalance + depositAmount;
            console.log("New wallet balance will be:", newBalance);
            
            // Begin transaction to ensure atomicity
            // First update the transaction status to processing to prevent duplicate processing
            console.log("Updating transaction status to processing for ID:", transactionData.id);
            const { data: processingTx, error: processingError } = await supabaseAdminClient
              .from('transactions')
              .update({ 
                status: 'processing',
                updated_at: new Date().toISOString()
              })
              .eq('id', transactionData.id)
              .eq('status', 'pending')  // Only update if still pending
              .select('*')
              .single();
              
            if (processingError) {
              console.error("Error updating transaction to processing status:", processingError);
              // This might mean the transaction was already processed
              console.log("Checking current transaction status...");
              
              const { data: currentTx } = await supabaseAdminClient
                .from('transactions')
                .select('status')
                .eq('id', transactionData.id)
                .single();
                
              if (currentTx && currentTx.status !== 'pending') {
                console.log("Transaction already processed with status:", currentTx.status);
                return new Response(JSON.stringify({ 
                  status: "success",
                  message: "Transaction already processed"
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  status: 200,
                });
              }
              
              throw processingError;
            }
            
            // Then update the wallet
            console.log("Updating wallet balance for ID:", walletId);
            const { data: updatedWallet, error: updateError } = await supabaseAdminClient
              .from('wallets')
              .update({ 
                balance: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', walletId)
              .select('*')
              .single();
              
            if (updateError) {
              console.error("Error updating wallet balance:", updateError);
              
              // Revert transaction status on failure
              await supabaseAdminClient
                .from('transactions')
                .update({ 
                  status: 'pending',
                  updated_at: new Date().toISOString()
                })
                .eq('id', transactionData.id);
                
              throw updateError;
            }
            
            console.log("Updated wallet balance successfully:", JSON.stringify(updatedWallet, null, 2));
            
            // Then update transaction status to completed
            console.log("Updating transaction status to completed for ID:", transactionData.id);
            const { data: updatedTx, error: txUpdateError } = await supabaseAdminClient
              .from('transactions')
              .update({ 
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', transactionData.id)
              .select('*')
              .single();
              
            if (txUpdateError) {
              console.error("Error updating transaction status to completed:", txUpdateError);
              throw txUpdateError;
            }
            
            console.log("Successfully updated transaction status to completed:", JSON.stringify(updatedTx, null, 2));
            
            return new Response(JSON.stringify({ 
              status: "success",
              message: "Payment processed successfully",
              data: {
                transaction: updatedTx,
                wallet: updatedWallet
              }
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          } else {
            console.log("Transaction status is not success:", status);
          }
        } else {
          console.log("Event type is not charge.success:", eventType);
        }
        
        // Return 200 to acknowledge receipt
        return new Response(JSON.stringify({ 
          status: "success",
          message: "Webhook processed successfully"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (webhookError) {
        console.error("Error processing webhook:", webhookError);
        return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    } 
    // Handle regular API calls
    else {
      let body;
      try {
        body = await req.json();
        console.log("Received API request with body:", JSON.stringify(body, null, 2));
      } catch (err) {
        console.error("Error parsing request body:", err);
        body = {
          amount: 0,
          email: '',
          type: 'deposit'
        };
      }
      
      const { amount, email, type, accountNumber, bankCode } = body;
      
      if (!amount || !email) {
        return new Response(JSON.stringify({ 
          status: false,
          message: "Missing required fields: amount and email are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
      
      if (type === 'withdrawal') {
        // First create a transfer recipient
        const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: "nuban",
            name: email,
            account_number: accountNumber,
            bank_code: bankCode,
            currency: "NGN"
          })
        })

        const recipientData = await recipientResponse.json()
        
        if (!recipientData.status) {
          throw new Error(recipientData.message || 'Failed to create transfer recipient')
        }
        
        // Now initiate the transfer
        const transferResponse = await fetch('https://api.paystack.co/transfer', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            source: 'balance',
            amount: amount * 100, // Convert to kobo
            recipient: recipientData.data.recipient_code,
            reason: 'Withdrawal from ChessStake'
          })
        })

        const transferData = await transferResponse.json()
        return new Response(JSON.stringify(transferData), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        // Generate a unique reference
        const reference = body.reference || `chess_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
        
        console.log(`Initializing payment for email: ${email}, amount: ${amount}, reference: ${reference}`);
        
        // Handle deposits by initializing a payment
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            amount: amount * 100, // Convert to kobo
            callback_url: `${req.headers.get('origin')}/wallet`,
            reference
          })
        })

        const data = await response.json()
        console.log("Paystack initialization response:", JSON.stringify(data, null, 2));
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }
  } catch (error) {
    console.error("Error in Paystack function:", error);
    return new Response(JSON.stringify({ 
      status: false, 
      error: error.message || "An unexpected error occurred" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
