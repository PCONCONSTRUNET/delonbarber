import { motion } from 'framer-motion';
import { CreditCard, Banknote, Smartphone } from 'lucide-react';
import { PixIcon } from '@/components/icons/PixIcon';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

interface PaymentMethodConfig {
  id: PaymentMethod;
  label: string;
  description: string;
  iconColor: string;
  isPix?: boolean;
}

const paymentMethods: PaymentMethodConfig[] = [
  { id: 'pix', label: 'PIX', description: 'Pagamento instantâneo', iconColor: '', isPix: true },
  { id: 'credit', label: 'Crédito', description: 'Cartão de crédito', iconColor: 'text-blue-500' },
  { id: 'debit', label: 'Débito', description: 'Cartão de débito', iconColor: 'text-purple-500' },
  { id: 'cash', label: 'Dinheiro', description: 'Pagamento em espécie', iconColor: 'text-green-500' },
];

const getIcon = (method: PaymentMethodConfig, isSelected: boolean) => {
  if (method.isPix) {
    return <PixIcon size={28} />;
  }

  const iconClass = cn("h-7 w-7", method.iconColor);
  
  switch (method.id) {
    case 'credit':
      return <CreditCard className={iconClass} />;
    case 'debit':
      return <Smartphone className={iconClass} />;
    case 'cash':
      return <Banknote className={iconClass} />;
    default:
      return null;
  }
};

export function PaymentMethodSelector({ selected, onSelect, disabled }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">
        Forma de pagamento
      </label>
      <div className="grid grid-cols-2 gap-3">
        {paymentMethods.map((method) => {
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
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-border bg-card"
              )}
            >
              {getIcon(method, isSelected)}
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
