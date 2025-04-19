
import { Card, CardContent } from "@/components/ui/card";

export const DemoAccountWarning = () => {
  return (
    <Card className="border-yellow-600/50 bg-yellow-900/20">
      <CardContent className="p-6">
        <h3 className="text-yellow-500 font-semibold text-lg mb-2">Demo Account</h3>
        <p className="text-yellow-400/80">
          This is a demo account. While you can practice with demo coins, they cannot be used in real matches. 
          To play real matches, please create a regular account.
        </p>
      </CardContent>
    </Card>
  );
};
