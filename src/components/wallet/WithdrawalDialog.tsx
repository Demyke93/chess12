
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormEvent } from 'react';

interface WithdrawalDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  bankCode: string;
  setBankCode: (value: string) => void;
  accountNumber: string;
  setAccountNumber: (value: string) => void;
  accountName: string;
  isVerifying: boolean;
  verifyAccount: () => void;
  handleWithdrawal: (e: FormEvent) => void;
  banks: any[];
}

export const WithdrawalDialog = ({
  isOpen,
  onOpenChange,
  amount,
  bankCode,
  setBankCode,
  accountNumber,
  setAccountNumber,
  accountName,
  isVerifying,
  verifyAccount,
  handleWithdrawal,
  banks,
}: WithdrawalDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-chess-dark border-chess-brown text-white">
        <DialogHeader>
          <DialogTitle>Withdrawal</DialogTitle>
          <DialogDescription>
            Enter your bank account details to withdraw ₦{Number(amount).toLocaleString() || '0'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleWithdrawal} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Bank</label>
            <Select value={bankCode} onValueChange={setBankCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bank" />
              </SelectTrigger>
              <SelectContent>
                {banks?.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Account Number</label>
            <Input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter 10-digit account number"
              maxLength={10}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={verifyAccount}
              disabled={isVerifying || !bankCode || !accountNumber}
            >
              {isVerifying ? 'Verifying...' : 'Verify Account'}
            </Button>
            
            {accountName && (
              <div className="text-green-400 text-sm font-medium">
                {accountName}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!accountName || !bankCode || !accountNumber}
            >
              Withdraw
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
