import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Copy, Check, ExternalLink, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const CALENDAR_FEED_TOKEN = 'delon-barber-calendar-2024';

export function CalendarSubscription() {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Build the calendar feed URL
  const feedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed?token=${CALENDAR_FEED_TOKEN}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const handleOpenInCalendar = () => {
    // webcal:// protocol opens the calendar app directly
    const webcalUrl = feedUrl.replace('https://', 'webcal://');
    window.open(webcalUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Sincronizar</span> iPhone
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Sincronizar com iPhone
          </DialogTitle>
          <DialogDescription>
            Adicione sua agenda ao calendário do iPhone para atualização automática
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Instructions */}
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
              <p className="text-muted-foreground">
                Abra <strong className="text-foreground">Ajustes</strong> no iPhone
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
              <p className="text-muted-foreground">
                Vá em <strong className="text-foreground">Calendário → Contas → Adicionar Conta</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
              <p className="text-muted-foreground">
                Selecione <strong className="text-foreground">Outro → Adicionar Assinatura de Calendário</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
              <p className="text-muted-foreground">
                Cole o link abaixo e confirme
              </p>
            </div>
          </div>

          {/* Feed URL */}
          <div className="bg-muted/50 rounded-xl p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Link da agenda:</p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-background rounded-lg p-2 overflow-x-auto whitespace-nowrap">
                {feedUrl.slice(0, 50)}...
              </code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopy}
                className="flex-shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Quick action button */}
          <Button 
            onClick={handleOpenInCalendar}
            className="w-full gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir no Calendário
          </Button>

          {/* Info */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
            <RefreshCw className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              O calendário do iPhone atualiza automaticamente a cada 15 minutos com os novos agendamentos.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
