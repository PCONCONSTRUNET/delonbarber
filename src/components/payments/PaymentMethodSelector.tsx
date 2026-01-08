import { motion } from 'framer-motion';
import { QrCode, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof QrCode; description: string }[] = [
  { id: 'pix', label: 'PIX', icon: QrCode, description: 'Pagamento instantâneo' },
  { id: 'credit', label: 'Crédito', icon: CreditCard, description: 'Cartão de crédito' },
  { id: 'debit', label: 'Débito', icon: Smartphone, description: 'Cartão de débito' },
  { id: 'cash', label: 'Dinheiro', icon: Banknote, description: 'Pagamento em espécie' },
];

export function PaymentMethodSelector({ selected, onSelect, disabled }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">
        Forma de pagamento
      </label>
      <div className="grid grid-cols-2 gap-3">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selected === method.id;

          return (
            <motion.button
              key={method.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => !disabled && onSelect(method.id)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                "hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              )}
            >
              <Icon className={cn(
                "h-6 w-6",
                isSelected ? "text-primary" : "text-muted-foreground"
              )} />
              <div className="text-center">
                <p className={cn(
                  "font-medium text-sm",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {method.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {method.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
