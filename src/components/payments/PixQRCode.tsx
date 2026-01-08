import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, QrCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generatePixPayload, generatePixQRCodeUrl } from '@/lib/pix';
import { toast } from 'sonner';

interface PixQRCodeProps {
  amount: number;
  transactionId: string;
  clientName?: string;
  compact?: boolean;
}

// Configure your PIX details here
const PIX_CONFIG = {
  pixKey: '11999999999', // Replace with actual PIX key
  merchantName: 'BARBEARIA ALAN DELON',
  merchantCity: 'SAO PAULO',
};

export function PixQRCode({ amount, transactionId, clientName, compact = false }: PixQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const pixPayload = generatePixPayload({
    ...PIX_CONFIG,
    amount,
    transactionId: transactionId.replace(/-/g, '').slice(0, 25),
    description: clientName?.slice(0, 20),
  });

  const qrCodeUrl = generatePixQRCodeUrl(pixPayload);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <QrCode className="h-8 w-8 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">PIX</p>
          <p className="text-xs text-muted-foreground truncate">
            R$ {amount.toFixed(2)}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="flex-shrink-0"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card rounded-2xl p-6 text-center space-y-4"
    >
      <div className="flex items-center justify-center gap-2 text-primary">
        <QrCode className="h-5 w-5" />
        <h3 className="font-semibold">Pagamento via PIX</h3>
      </div>

      <div className="relative inline-block">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-xl">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <img
          src={qrCodeUrl}
          alt="QR Code PIX"
          className="w-48 h-48 mx-auto rounded-xl bg-white p-2"
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      <div className="space-y-2">
        <p className="text-2xl font-bold text-primary">
          R$ {amount.toFixed(2)}
        </p>
        <p className="text-sm text-muted-foreground">
          Escaneie o QR Code ou copie o código
        </p>
      </div>

      <Button
        onClick={handleCopy}
        variant="outline"
        className="w-full"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Código copiado!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copiar código PIX
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        O pagamento será confirmado automaticamente
      </p>
    </motion.div>
  );
}
