import { useState } from 'react';
import { MessageSquare, Sparkles, Loader2, Calendar, Clock, Scissors } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ParsedAppointment {
  client_name?: string;
  date?: string;
  time?: string;
  services?: string[];
  notes?: string;
}

export function WhatsAppAI() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedAppointment | null>(null);
  const { toast } = useToast();

  const parseMessage = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    setParsed(null);

    try {
      const { data, error } = await supabase.functions.invoke('parse-whatsapp', {
        body: { message }
      });

      if (error) throw error;

      setParsed(data);
      toast({ title: "Mensagem interpretada!" });
    } catch (error) {
      console.error('Error parsing message:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível interpretar a mensagem.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setParsed(null);
    setMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Input area */}
      <div className="rounded-2xl glass-effect p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Interpretar Mensagem do WhatsApp</h3>
        </div>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Cole aqui a mensagem do cliente do WhatsApp...

Exemplo: 'Oi, quero agendar um corte degradê pra sexta às 14h. Meu nome é João.'"
          rows={5}
          className="mb-4"
        />

        <Button 
          onClick={parseMessage} 
          disabled={loading || !message.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Interpretando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Interpretar com IA
            </>
          )}
        </Button>
      </div>

      {/* Result */}
      {parsed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl glass-effect p-6"
        >
          <h3 className="font-semibold mb-4 text-green-500">✓ Dados Extraídos</h3>

          <div className="space-y-3">
            {parsed.client_name && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{parsed.client_name}</span>
              </div>
            )}

            {parsed.date && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">{parsed.date}</span>
              </div>
            )}

            {parsed.time && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Horário:</span>
                <span className="font-medium">{parsed.time}</span>
              </div>
            )}

            {parsed.services && parsed.services.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <Scissors className="h-4 w-4 text-primary mt-0.5" />
                <span className="text-muted-foreground">Serviços:</span>
                <span className="font-medium">{parsed.services.join(', ')}</span>
              </div>
            )}

            {parsed.notes && (
              <div className="p-3 rounded-lg bg-muted">
                <span className="text-muted-foreground">Observações:</span>
                <p className="font-medium mt-1">{parsed.notes}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={clearResult} className="flex-1">
              Limpar
            </Button>
            <Button className="flex-1">
              Criar Agendamento
            </Button>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <div className="rounded-2xl glass-effect p-6">
        <h4 className="font-medium mb-2">Como usar:</h4>
        <ol className="text-sm text-muted-foreground space-y-2">
          <li>1. Copie a mensagem do cliente no WhatsApp</li>
          <li>2. Cole no campo acima</li>
          <li>3. Clique em "Interpretar com IA"</li>
          <li>4. Revise os dados extraídos</li>
          <li>5. Crie o agendamento manualmente</li>
        </ol>
      </div>
    </div>
  );
}
