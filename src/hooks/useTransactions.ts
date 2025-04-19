
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
