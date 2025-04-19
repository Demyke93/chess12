
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

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
          
          // Check each pending transaction with Paystack
          for (const tx of pendingTransactions) {
            if (!tx.reference) continue;
            
            try {
              console.log('Manually verifying transaction reference:', tx.reference);
              const verifyResponse = await supabase.functions.invoke('paystack/verify', {
                body: { reference: tx.reference }
              });
              
              console.log('Verification response:', verifyResponse);
              
              // The edge function will handle updating the transaction and wallet if successful
            } catch (verifyError) {
              console.error('Error verifying transaction:', verifyError);
            }
          }
          
          // Refetch transactions in case any were updated
          const { data: updatedData, error: refetchError } = await supabase
            .from('transactions')
            .select('*')
            .eq('wallet_id', walletIdToUse)
            .order('created_at', { ascending: false });
            
          if (!refetchError && updatedData) {
            console.log('Re-fetched transactions after verification:', updatedData);
            return updatedData as Transaction[];
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

  const refreshTransactions = () => {
    console.log('Manually refreshing transactions');
    return queryClient.invalidateQueries({ queryKey: ['transactions', walletId, user?.id] });
  };

  return {
    ...query,
    refreshTransactions
  };
};
