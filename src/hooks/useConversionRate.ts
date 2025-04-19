
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type ConversionRateValue = {
  naira_to_coin: number;
  min_deposit: number;
  min_withdrawal: number;
};

export const useConversionRate = () => {
  return useQuery({
    queryKey: ["conversionRate"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'currency_conversion')
          .maybeSingle();
        
        if (error) {
          console.error("Error fetching conversion rate:", error);
          // Return default values instead of throwing
          return { 
            value: { 
              naira_to_coin: 1000, 
              min_deposit: 1000, 
              min_withdrawal: 1000 
            } as ConversionRateValue 
          };
        }
        
        return data || { 
          value: { 
            naira_to_coin: 1000, 
            min_deposit: 1000, 
            min_withdrawal: 1000 
          } as ConversionRateValue 
        };
      } catch (error) {
        console.error("Error in conversion rate fetch:", error);
        // Return default values instead of throwing
        return { 
          value: { 
            naira_to_coin: 1000, 
            min_deposit: 1000, 
            min_withdrawal: 1000 
          } as ConversionRateValue 
        };
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
};
