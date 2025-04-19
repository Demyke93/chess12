
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  reference?: string;
  payout_details?: any;
}

export const useTransactions = (walletId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['transactions', walletId, user?.id],
    queryFn: async () => {
      try {
        // If walletId is null (temporary wallet), return empty array
        if (walletId === null) {
          console.log('No wallet ID yet, returning empty transactions array');
          return [];
        }
        
        let walletIdToUse = walletId;
        
        if (!walletIdToUse && user?.id) {
          // If no wallet ID is provided, fetch the user's wallet first
          console.log('Fetching wallet ID for transactions', user.id);
          const { data: walletData, error: walletError } = await supabase
            .from('wallets')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (walletError) {
            console.error('Error fetching wallet:', walletError);
            return []; // Return empty array on error
          }
          
          // If wallet exists, use its ID
          if (walletData) {
            walletIdToUse = walletData.id;
            console.log('Found wallet ID for transactions:', walletIdToUse);
          } else {
            // If there's no wallet, we won't try to fetch transactions
            console.log('No wallet found for transactions');
            return [];
          }
        }
        
        if (!walletIdToUse) {
          console.log('No wallet ID available for transactions');
          return []; // Return empty array if no wallet ID
        }
        
        console.log('Fetching transactions for wallet ID:', walletIdToUse);
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('wallet_id', walletIdToUse)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching transactions:', error);
          return []; // Return empty array on error
        }
        
        console.log('Fetched transactions:', data);
        
        // Check if there are any pending transactions that need to be verified
        const pendingTransactions = data?.filter(tx => tx.status === 'pending' && tx.type === 'deposit' && tx.reference);
        
        if (pendingTransactions && pendingTransactions.length > 0) {
          console.log('Found pending transactions to verify:', pendingTransactions.length);
          
          let successfullyProcessed = false;
          
          // Check each pending transaction with Paystack
          for (const tx of pendingTransactions) {
            if (!tx.reference) continue;
            
            try {
              console.log('Manually verifying transaction reference:', tx.reference);
              
              // Try the dedicated verify endpoint first
              try {
                console.log('Using verify-handler endpoint for reference:', tx.reference);
                const verifyResponse = await supabase.functions.invoke('paystack/verify-handler', {
                  body: { reference: tx.reference }
                });
                
                console.log('verify-handler response:', verifyResponse);
                
                if (verifyResponse.data && verifyResponse.data.success) {
                  console.log('Transaction verified successfully:', tx.reference);
                  successfullyProcessed = true;
                  
                  toast({
                    title: 'Payment Processed',
                    description: 'Your deposit has been successfully processed.',
                  });
                }
              } catch (verifyHandlerError) {
                console.error('Error using verify-handler:', verifyHandlerError);
                
                // Fallback to the regular verify endpoint
                try {
                  console.log('Falling back to verify endpoint for reference:', tx.reference);
                  const fallbackResponse = await supabase.functions.invoke('paystack/verify', {
                    body: { reference: tx.reference }
                  });
                  
                  console.log('Fallback verification response:', fallbackResponse);
                  
                  if (fallbackResponse.data && fallbackResponse.data.success) {
                    successfullyProcessed = true;
                  }
                } catch (fallbackError) {
                  console.error('Error using fallback verification:', fallbackError);
                }
              }
            } catch (verifyError) {
              console.error('Error verifying transaction:', verifyError);
            }
          }
          
          // If any transaction was processed, refetch the transactions and wallet
          if (successfullyProcessed) {
            console.log('Some transactions were processed, refetching data...');
            
            // Refetch transactions
            const { data: updatedData, error: refetchError } = await supabase
              .from('transactions')
              .select('*')
              .eq('wallet_id', walletIdToUse)
              .order('created_at', { ascending: false });
              
            if (!refetchError && updatedData) {
              console.log('Re-fetched transactions after verification:', updatedData);
              
              // Also invalidate the wallet query to update the balance
              queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
              
              return updatedData as Transaction[];
            }
          }
        }
        
        return data as Transaction[];
      } catch (error) {
        console.error('Error in transaction fetch:', error);
        return []; // Return empty array on error
      }
    },
    enabled: !!user?.id,
    staleTime: 10000, // 10 seconds
    refetchInterval: 15000, // Automatically refetch every 15 seconds
    refetchOnWindowFocus: true,
    retry: 3,
  });

  const refreshTransactions = async () => {
    console.log('Manually refreshing transactions');
    // First invalidate the transactions query
    await queryClient.invalidateQueries({ queryKey: ['transactions', walletId, user?.id] });
    
    // Then also invalidate the wallet query to update the balance
    await queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
    
    return query.refetch();
  };

  return {
    ...query,
    refreshTransactions
  };
};
