
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0"

/**
 * Function to verify a Paystack transaction by reference
 * @param reference Paystack transaction reference
 * @param secretKey Paystack secret key
 */
export const verifyPaystackTransaction = async (reference: string, secretKey: string) => {
  try {
    console.log(`Verifying Paystack transaction with reference: ${reference}`);
    
    const url = `https://api.paystack.co/transaction/verify/${reference}`;
    
    console.log(`Making request to Paystack API: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Paystack API responded with status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Paystack API responded with status ${response.status}: ${errorText}`);
      return { status: false, message: `API error: ${response.status}` };
    }
    
    const data = await response.json();
    console.log(`Verification response for ${reference}:`, JSON.stringify(data, null, 2));
    
    // Log additional details about transaction status
    if (data.data) {
      console.log(`Transaction ${reference} status: ${data.data.status}`);
      console.log(`Transaction ${reference} amount: ${data.data.amount} (in kobo)`);
      console.log(`Transaction ${reference} gateway response: ${data.data.gateway_response}`);
    }
    
    return data;
  } catch (error) {
    console.error(`Error verifying transaction ${reference}:`, error);
    throw error;
  }
};

/**
 * Function to update wallet and transaction status based on verification result
 */
export const processVerifiedTransaction = async (
  verificationData: any, 
  supabaseAdminClient: any
) => {
  try {
    const { reference, status, amount } = verificationData?.data || {};
    
    if (!reference) {
      console.error("Missing reference in verification data");
      return { success: false, error: "Invalid verification data" };
    }
    
    console.log(`Processing verified transaction: ${reference} with status: ${status}`);
    
    // Find the transaction using the reference
    console.log(`Looking up transaction with reference: ${reference}`);
    const { data: transactionData, error: transactionError } = await supabaseAdminClient
      .from('transactions')
      .select('*')
      .eq('reference', reference)
      .single();
      
    if (transactionError) {
      console.error("Error finding transaction:", transactionError);
      
      // Let's check all transactions to see if there's a reference issue
      const { data: allTransactions } = await supabaseAdminClient
        .from('transactions')
        .select('id, reference, status')
        .order('created_at', { ascending: false })
        .limit(10);
        
      console.log("Recent transactions:", JSON.stringify(allTransactions, null, 2));
      
      return { success: false, error: transactionError };
    }
    
    if (!transactionData) {
      console.error("Transaction not found for reference:", reference);
      
      // Let's check if there are any pending transactions
      const { data: pendingTransactions } = await supabaseAdminClient
        .from('transactions')
        .select('id, reference, status')
        .eq('status', 'pending')
        .limit(20);
        
      console.log("Pending transactions:", JSON.stringify(pendingTransactions, null, 2));
      
      return { success: false, error: "Transaction not found" };
    }
    
    console.log("Found transaction:", JSON.stringify(transactionData, null, 2));
    
    // If transaction is already completed or failed, skip processing
    if (transactionData.status === 'completed') {
      console.log(`Transaction ${reference} already processed with status: completed`);
      return { 
        success: true, 
        message: "Transaction already processed",
        transaction: transactionData
      };
    }
    
    if (transactionData.status === 'failed') {
      console.log(`Transaction ${reference} already processed with status: failed`);
      return { 
        success: true, 
        message: "Transaction already processed (failed)",
        transaction: transactionData
      };
    }
    
    // Check if payment was successful
    if (status !== 'success') {
      console.log(`Transaction ${reference} verification returned non-success status: ${status}`);
      
      // Update transaction to failed
      const { data: failedTx, error: failedError } = await supabaseAdminClient
        .from('transactions')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionData.id)
        .select('*')
        .single();
        
      if (failedError) {
        console.error("Error updating transaction to failed:", failedError);
      }
      
      return { 
        success: false, 
        error: `Payment verification failed with status: ${status}`,
        transaction: failedTx
      };
    }
    
    // Get the wallet ID from transaction
    const walletId = transactionData.wallet_id;
    console.log("Processing payment for wallet ID:", walletId);
    
    // Update the wallet balance
    console.log(`Looking up wallet with ID: ${walletId}`);
    const { data: walletData, error: walletError } = await supabaseAdminClient
      .from('wallets')
      .select('balance, user_id')
      .eq('id', walletId)
      .single();
      
    if (walletError) {
      console.error("Error finding wallet:", walletError);
      
      // Check if the wallet exists
      const { count, error: countError } = await supabaseAdminClient
        .from('wallets')
        .select('id', { count: 'exact', head: true })
        .eq('id', walletId);
        
      if (countError) {
        console.error("Error checking wallet existence:", countError);
      } else {
        console.log(`Wallet ${walletId} exists: ${count > 0}`);
      }
      
      return { success: false, error: walletError };
    }
    
    console.log("Current wallet balance:", walletData.balance);
    console.log("Wallet belongs to user:", walletData.user_id);
    
    // Convert values explicitly to numbers to prevent type issues
    const currentBalance = parseFloat(walletData.balance || '0');
    const depositAmount = parseFloat(transactionData.amount || '0');
    
    const newBalance = currentBalance + depositAmount;
    console.log("New wallet balance will be:", newBalance);
    
    // Check for potential data type issues
    console.log("Balance data types - current:", typeof currentBalance, 
                "deposit:", typeof depositAmount, 
                "new:", typeof newBalance);
    console.log("Values - current:", currentBalance, 
                "deposit:", depositAmount, 
                "new:", newBalance);
    
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
      
      // Check if the transaction was already processed
      const { data: currentTx } = await supabaseAdminClient
        .from('transactions')
        .select('status')
        .eq('id', transactionData.id)
        .single();
        
      if (currentTx && currentTx.status !== 'pending') {
        console.log("Transaction already processed with status:", currentTx.status);
        return { 
          success: true,
          message: "Transaction already processed",
          transaction: currentTx
        };
      }
      
      return { success: false, error: processingError };
    }
    
    // Then update the wallet
    console.log("Updating wallet balance for ID:", walletId);
    console.log("UPDATE SQL equivalent: UPDATE wallets SET balance = ", newBalance, " WHERE id = ", walletId);
    
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
      console.log("Update error details:", JSON.stringify(updateError, null, 2));
      
      // Revert transaction status on failure
      await supabaseAdminClient
        .from('transactions')
        .update({ 
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionData.id);
        
      return { success: false, error: updateError };
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
      return { success: false, error: txUpdateError };
    }
    
    console.log("Successfully updated transaction status to completed:", JSON.stringify(updatedTx, null, 2));
    
    return { 
      success: true,
      message: "Payment processed successfully",
      data: {
        transaction: updatedTx,
        wallet: updatedWallet
      }
    };
  } catch (error) {
    console.error("Error processing verification:", error);
    return { success: false, error: error.message || "Error processing verification" };
  }
};
