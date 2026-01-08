import { useState } from 'react';
import { MessageSquare, Sparkles, Loader2, Calendar, Clock, Scissors, Check, Phone, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ParsedAppointment {
  client_name?: string;
  client_phone?: string;
  date?: string;
  time?: string;
  services?: string[];
  notes?: string;
}

export function WhatsAppAI() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [parsed, setParsed] = useState<ParsedAppointment | null>(null);

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
      toast.success("Mensagem interpretada!");
    } catch (error) {
      console.error('Error parsing message:', error);
      toast.error("Não foi possível interpretar a mensagem.");
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async () => {
    if (!parsed) return;

    setCreating(true);

    try {
      // Parse the date from DD/MM/YYYY format
      let appointmentDate: string | null = null;
      if (parsed.date) {
        const dateParts = parsed.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateParts) {
          appointmentDate = `${dateParts[3]}-${dateParts[2]}-${dateParts[1]}`;
        } else {
          // Try other formats or use as-is if it's already in ISO format
          const dateMatch = parsed.date.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            appointmentDate = parsed.date;
          }
        }
      }

      // Parse time to HH:MM format
      let appointmentTime = parsed.time || '10:00';
      if (appointmentTime && !appointmentTime.includes(':')) {
        appointmentTime = `${appointmentTime}:00`;
      }

      if (!appointmentDate) {
        toast.error("Data inválida. Por favor, verifique o formato.");
        setCreating(false);
        return;
      }

      // Get admin's user id (the one creating the appointment)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado para criar agendamentos.");
        setCreating(false);
        return;
      }

      // Find services by name
      const serviceNames = parsed.services || [];
      let totalPrice = 0;
      let totalDuration = 0;
      const matchedServices: { id: string; price: number; duration: number }[] = [];

      if (serviceNames.length > 0) {
        const { data: servicesData } = await supabase
          .from('services')
          .select('id, name, price, duration_minutes')
          .eq('is_active', true);

        if (servicesData) {
          for (const serviceName of serviceNames) {
            const found = servicesData.find(s => 
              s.name.toLowerCase().includes(serviceName.toLowerCase()) ||
              serviceName.toLowerCase().includes(s.name.toLowerCase())
            );
            if (found) {
              matchedServices.push({
                id: found.id,
                price: Number(found.price),
                duration: found.duration_minutes
              });
              totalPrice += Number(found.price);
              totalDuration += found.duration_minutes;
            }
          }
        }
      }

      // Create the appointment with guest client data
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id, // Admin creates the appointment
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          notes: parsed.notes || null,
          total_price: totalPrice,
          total_duration: totalDuration,
          status: 'pending',
          payment_status: 'pending',
          // Guest client fields - stores exact data from WhatsApp
          guest_name: parsed.client_name || null,
          guest_phone: parsed.client_phone?.replace(/\D/g, '') || null
        })
        .select()
        .single();

      if (aptError) {
        console.error('Error creating appointment:', aptError);
        throw aptError;
      }

      // Add services to appointment
      if (matchedServices.length > 0 && appointment) {
        const appointmentServices = matchedServices.map(service => ({
          appointment_id: appointment.id,
          service_id: service.id,
          price_at_booking: service.price
        }));

        await supabase
          .from('appointment_services')
          .insert(appointmentServices);
      }

      toast.success(`Agendamento criado para ${parsed.client_name || 'Cliente'}!`);
      clearResult();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error("Erro ao criar agendamento. Verifique os dados.");
    } finally {
      setCreating(false);
    }
  };

  const clearResult = () => {
    setParsed(null);
    setMessage('');
  };

  const canCreate = parsed && parsed.date && parsed.time;

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

Exemplo:
João Pereira
48998601201
corte tradicional + barba
dia 12/02 as 12:00"
          rows={6}
          className="mb-4 font-mono text-sm"
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
                <User className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium text-primary">{parsed.client_name}</span>
              </div>
            )}

            {parsed.client_phone && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Phone className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Telefone:</span>
                <span className="font-medium text-green-500">{parsed.client_phone}</span>
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

          {!canCreate && (
            <p className="text-amber-500 text-sm mt-4">
              ⚠️ Data e horário são obrigatórios para criar o agendamento.
            </p>
          )}

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={clearResult} className="flex-1">
              Limpar
            </Button>
            <Button 
              className="flex-1" 
              onClick={createAppointment}
              disabled={!canCreate || creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Criar Agendamento
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <div className="rounded-2xl glass-effect p-6">
        <h4 className="font-medium mb-2">💡 Como usar:</h4>
        <ol className="text-sm text-muted-foreground space-y-2">
          <li>1. Copie a mensagem do cliente no WhatsApp</li>
          <li>2. Cole no campo acima</li>
          <li>3. Clique em "Interpretar com IA"</li>
          <li>4. Revise os dados extraídos</li>
          <li>5. Clique em "Criar Agendamento"</li>
        </ol>
        <p className="text-xs text-muted-foreground mt-3 p-2 rounded bg-muted">
          ℹ️ O agendamento será criado com os dados do cliente exatamente como foram enviados no WhatsApp.
        </p>
      </div>
    </div>
  );
}
