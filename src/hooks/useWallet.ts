
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Wallet } from '@/types';
import { useToast } from '@/hooks/use-toast';

// Function to create wallet via Edge Function
export const createWalletViaAPI = async (userId: string, username?: string) => {
  try {
    console.log('Creating wallet via Edge Function for user:', userId, 'username:', username);
    
    // First check if the function is accessible
    try {
      const payload = { user_id: userId, username };
      console.log('Sending payload to create-wallet function:', payload);
      
      const { data, error } = await supabase.functions.invoke('create-wallet', { 
        body: payload
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to invoke create-wallet function: ${error.message}`);
      }
      
      console.log('Response from Edge function:', data);
      
      if (!data?.status) {
        console.error('Edge function returned error status:', data);
        
        // Add more detailed error information
        let errorMsg = data?.message || 'Edge function failed to create wallet';
        
        // Include RLS policy information if available
        if (data?.error?.hint) {
          errorMsg += ` - ${data.error.hint}`;
        }
        
        // Include details about the error
        if (data?.error?.details) {
          console.error('Error details:', data.error.details);
        }
        
        throw new Error(errorMsg);
      }
      
      console.log('Wallet created successfully via Edge Function:', data);
      return data.data;
    } catch (edgeFunctionError) {
      console.error('Edge function access error:', edgeFunctionError);
      
      // Fall back to direct database operation if the edge function fails
      console.log('Attempting direct database insert as fallback...');
      
      // First check if wallet already exists to avoid duplicates
      const { data: existingWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (existingWallet) {
        console.log('Wallet already exists, returning existing wallet');
        return existingWallet;
      }
      
      // Try direct insert (will work if RLS policies allow)
      const { data: newWallet, error: insertError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          balance: 0
        })
        .select('*')
        .single();
        
      if (insertError) {
        console.error('Direct insert fallback failed:', insertError);
        throw new Error(`Could not create wallet: ${insertError.message}. Please ensure the Edge Function is deployed or check database permissions.`);
      }
      
      return newWallet;
    }
  } catch (err) {
    console.error('Error creating wallet via API:', err);
    throw err;
  }
};

// Added function to manually fetch wallet data
export const fetchWalletData = async (userId: string) => {
  if (!userId) {
    console.log('No user ID provided to fetchWalletData');
    return null;
  }

  try {
    console.log('Manually fetching wallet data for user:', userId);
    
    // First check if wallet already exists
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (walletError) {
      console.error('Error fetching wallet data:', walletError);
      return null;
    }

    if (!walletData) {
      console.log('No wallet found for user:', userId);
      return {
        id: null,
        user_id: userId,
        balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Wallet;
    }

    let isDemo = false;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_demo')
        .eq('id', userId)
        .maybeSingle();
      
      isDemo = profileData?.is_demo || false;
    } catch (err) {
      console.error('Error fetching profile data:', err);
    }

    console.log('Fetched wallet data:', { ...walletData, is_demo: isDemo });
    return { ...walletData, is_demo: isDemo } as Wallet;
  } catch (error) {
    console.error('Error in manual wallet fetch:', error);
    return null;
  }
};

export const useWallet = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create wallet mutation
  const createWalletMutation = useMutation({
    mutationFn: ({ userId, username }: { userId: string; username?: string }) => 
      createWalletViaAPI(userId, username),
    onSuccess: (data) => {
      console.log('Wallet creation succeeded:', data);
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      toast({
        title: 'Wallet Created',
        description: 'Your wallet has been created successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Wallet creation mutation error:', error);
      
      // More descriptive error message
      let errorMessage = error.message;
      if (errorMessage.includes('Failed to send a request to the Edge Function')) {
        errorMessage = 'The wallet creation service is currently unavailable. Please try again later or contact support if the issue persists.';
      }
      
      toast({
        title: 'Wallet Creation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  });

  // Added mutation for forcefully refreshing wallet data
  const refreshWalletMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      return fetchWalletData(user.id);
    },
    onSuccess: (data) => {
      if (data) {
        console.log('Forcing wallet data refresh with:', data);
        queryClient.setQueryData(['wallet', user?.id], data);
        toast({
          title: 'Wallet Refreshed',
          description: 'Your wallet balance has been updated',
        });
      }
    },
    onError: (error) => {
      console.error('Error refreshing wallet data:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Could not refresh wallet data. Please try again.',
        variant: 'destructive',
      });
    }
  });

  return {
    wallet: useQuery({
      queryKey: ['wallet', user?.id],
      queryFn: async () => {
        if (!user?.id) {
          console.log('No user ID, returning null wallet');
          return null;
        }

        try {
          // First check if wallet already exists
          const { data: walletData, error: walletError } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (walletError) {
            console.error('Error fetching wallet data:', walletError);
            return null;
          }

          // If wallet doesn't exist for this user, we'll use the functions API 
          // which can bypass RLS to create a wallet
          if (!walletData) {
            console.log('No wallet found, will need to create one via the API');
            
            // Return a temporary object that we'll use until we can create a proper wallet
            // We won't set an ID to avoid SQL errors with invalid UUIDs
            return {
              id: null,
              user_id: user.id,
              balance: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Wallet;
          }

          let isDemo = false;
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('is_demo')
              .eq('id', user.id)
              .maybeSingle();
            
            isDemo = profileData?.is_demo || false;
            console.log('User is demo account:', isDemo);
          } catch (err) {
            console.error('Error fetching profile data:', err);
            // Continue even if profile data couldn't be fetched
          }

          console.log('Returning wallet data with balance:', walletData.balance);
          return { ...walletData, is_demo: isDemo } as Wallet;
        } catch (error) {
          console.error('Error in wallet fetch:', error);
          // Return a basic wallet object instead of null
          return {
            id: null,
            user_id: user.id,
            balance: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Wallet;
        }
      },
      enabled: !!user?.id,
      staleTime: 5000, // Reduced to 5 seconds to update more frequently
      refetchInterval: 15000, // Reduced to 15 seconds for more frequent updates
      refetchOnWindowFocus: true,
      retry: 3,
    }),
    createWallet: createWalletMutation,
    forceRefresh: refreshWalletMutation.mutate,
    isRefreshing: refreshWalletMutation.isPending
  };
};
