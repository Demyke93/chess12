
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CoinConversionInfo = () => {
  const { data: conversionRate, isLoading } = useQuery({
    queryKey: ["conversionRate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'currency_conversion')
        .single();
      
      if (error) {
        console.error("Error fetching conversion rate:", error);
        return { value: { naira_to_coin: 1000, min_deposit: 1000, min_withdrawal: 1000 } };
      }
      
      return data || { value: { naira_to_coin: 1000, min_deposit: 1000, min_withdrawal: 1000 } };
    }
  });

  // Safely extract conversion rates
  const nairaRate = typeof conversionRate?.value === 'object' 
    ? (conversionRate.value as any).naira_to_coin || 1000 
    : 1000;
  const minDeposit = typeof conversionRate?.value === 'object' 
    ? (conversionRate.value as any).min_deposit || 1000 
    : 1000;
  const minWithdrawal = typeof conversionRate?.value === 'object' 
    ? (conversionRate.value as any).min_withdrawal || 1000 
    : 1000;

  return (
    <Card className="bg-chess-dark/90 border-chess-brown/50">
      <CardContent className="pt-6 space-y-2">
        <h3 className="font-semibold text-lg">Currency Conversion</h3>
        
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-400">
            <div className="bg-chess-brown/20 p-3 rounded-md border border-chess-brown/30">
              <p className="text-white font-medium text-lg mb-1">₦{nairaRate.toLocaleString()} = 1 coin</p>
              <p className="text-sm opacity-80">This is the standard conversion rate for all transactions</p>
            </div>
            
            <div className="space-y-1.5">
              <p className="font-medium text-gray-300">Deposit Information:</p>
              <p>• Minimum deposit: ₦{minDeposit.toLocaleString()}</p>
              <p>• Deposit via Paystack (cards, bank transfers, USSD)</p>
              <p>• Instant crediting to your account</p>
            </div>
            
            <div className="space-y-1.5">
              <p className="font-medium text-gray-300">Withdrawal Information:</p>
              <p>• Minimum withdrawal: ₦{minWithdrawal.toLocaleString()}</p>
              <p>• Withdrawal to Nigerian bank accounts</p>
              <p>• Processing time: 1-3 business days</p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-700">
              <p className="text-sm font-medium text-gray-300 mb-2">Example Conversions:</p>
              <div className="bg-chess-dark p-3 rounded-md border border-chess-brown/20 space-y-2">
                <div className="flex justify-between">
                  <span>₦{nairaRate.toLocaleString()}</span>
                  <span>→</span>
                  <span className="font-medium text-white">1 coin</span>
                </div>
                <div className="flex justify-between">
                  <span>₦{(nairaRate * 5).toLocaleString()}</span>
                  <span>→</span>
                  <span className="font-medium text-white">5 coins</span>
                </div>
                <div className="flex justify-between">
                  <span>10 coins</span>
                  <span>→</span>
                  <span className="font-medium text-white">₦{(nairaRate * 10).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
