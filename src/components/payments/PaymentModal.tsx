import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PaymentMethodSelector, PaymentMethod } from './PaymentMethodSelector';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  amount: number;
  clientName?: string;
  onConfirmPayment: (method: PaymentMethod) => Promise<void>;
}

export function PaymentModal({
  open,
  onOpenChange,
  appointmentId,
  amount,
  clientName,
  onConfirmPayment,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    if (!selectedMethod) return;
    
    setIsProcessing(true);
    try {
      await onConfirmPayment(selectedMethod);
      onOpenChange(false);
      setSelectedMethod(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false);
      setSelectedMethod(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Registrar Pagamento</span>
            <span className="text-2xl font-bold text-primary">
              R$ {amount.toFixed(0)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {clientName && (
            <p className="text-sm text-muted-foreground">
              Cliente: <span className="text-foreground font-medium">{clientName}</span>
            </p>
          )}

          <PaymentMethodSelector
            selected={selectedMethod}
            onSelect={setSelectedMethod}
            disabled={isProcessing}
          />

          <Button
            onClick={handleConfirm}
            disabled={!selectedMethod || isProcessing}
            className="w-full h-12"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
