import { useState } from 'react';
import { Sparkles, Loader2, Calendar, Clock, Scissors, Check, Phone, User, Send, Wand2, Copy, RefreshCw, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
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
          const dateMatch = parsed.date.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (dateMatch) {
            appointmentDate = parsed.date;
          }
        }
      }

      let appointmentTime = parsed.time || '10:00';
      if (appointmentTime && !appointmentTime.includes(':')) {
        appointmentTime = `${appointmentTime}:00`;
      }

      if (!appointmentDate) {
        toast.error("Data inválida. Por favor, verifique o formato.");
        setCreating(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado para criar agendamentos.");
        setCreating(false);
        return;
      }

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
          const matchedIds = new Set<string>();
          
          for (const serviceName of serviceNames) {
            const normalizedSearch = serviceName.toLowerCase().trim();
            
            let found = servicesData.find(s => 
              s.name.toLowerCase().trim() === normalizedSearch
            );
            
            if (!found) {
              found = servicesData.find(s => {
                const normalizedName = s.name.toLowerCase().trim();
                return normalizedName.includes(normalizedSearch) ||
                       normalizedSearch.includes(normalizedName);
              });
            }
            
            if (!found) {
              const searchWords = normalizedSearch.split(/\s+/);
              found = servicesData.find(s => {
                const nameWords = s.name.toLowerCase().split(/\s+/);
                return searchWords.some(word => 
                  nameWords.some(nWord => nWord.includes(word) || word.includes(nWord))
                );
              });
            }
            
            if (found && !matchedIds.has(found.id)) {
              matchedIds.add(found.id);
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

      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .insert({
          user_id: user.id,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          notes: parsed.notes || null,
          total_price: totalPrice,
          total_duration: totalDuration,
          status: 'pending',
          payment_status: 'pending',
          guest_name: parsed.client_name || null,
          guest_phone: parsed.client_phone?.replace(/\D/g, '') || null
        })
        .select()
        .single();

      if (aptError) {
        console.error('Error creating appointment:', aptError);
        throw aptError;
      }

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

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMessage(text);
      toast.success("Mensagem colada!");
    } catch {
      toast.error("Não foi possível acessar a área de transferência");
    }
  };

  const canCreate = parsed && parsed.date && parsed.time;

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/20 via-green-600/10 to-emerald-500/20 border border-green-500/30 p-5"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
        
        <div className="relative flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white/10 border border-green-500/30">
            <WhatsAppIcon size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Assistente WhatsApp</h2>
            <p className="text-sm text-muted-foreground">
              Cole a mensagem do cliente e deixe a IA extrair os dados
            </p>
          </div>
          <div className="ml-auto">
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
              <Sparkles className="h-3 w-3 mr-1" />
              IA
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Chat-like Interface */}
      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
        {/* Input Area - Chat Style */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1 space-y-3">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cole a mensagem do WhatsApp aqui...

Ex: João Silva - 48999001234
Quero corte + barba
Sábado dia 18 às 10h"
                rows={4}
                className="resize-none border-0 bg-background/80 focus-visible:ring-green-500/50 rounded-xl text-sm"
              />
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={pasteFromClipboard}
                  className="text-xs gap-1.5 rounded-lg"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Colar
                </Button>
                
                <div className="flex-1" />
                
                <Button 
                  onClick={parseMessage} 
                  disabled={loading || !message.trim()}
                  size="sm"
                  className="gap-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Analisando...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Interpretar</span>
                      <Send className="h-4 w-4 sm:hidden" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b border-border"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="bg-muted/50 rounded-2xl rounded-tl-sm p-4 inline-block">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-muted-foreground">Interpretando mensagem...</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Parsed Result - Chat Response Style */}
        <AnimatePresence>
          {parsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-3">
                  {/* Success Header */}
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                      <Check className="h-3 w-3 mr-1" />
                      Dados extraídos
                    </Badge>
                  </div>

                  {/* Extracted Data Cards */}
                  <div className="grid gap-2">
                    {parsed.client_name && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Cliente</p>
                          <p className="font-medium text-sm">{parsed.client_name}</p>
                        </div>
                      </motion.div>
                    )}

                    {parsed.client_phone && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                      >
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <Phone className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">WhatsApp</p>
                          <p className="font-medium text-sm text-green-600">{parsed.client_phone}</p>
                        </div>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {parsed.date && (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                        >
                          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-orange-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Data</p>
                            <p className="font-medium text-sm">{parsed.date}</p>
                          </div>
                        </motion.div>
                      )}

                      {parsed.time && (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-purple-500" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Horário</p>
                            <p className="font-medium text-sm">{parsed.time}</p>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {parsed.services && parsed.services.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-3 rounded-xl bg-muted/50 border border-border"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Scissors className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-xs text-muted-foreground">Serviços</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 ml-10">
                          {parsed.services.map((service, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {parsed.notes && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30"
                      >
                        <p className="text-xs text-yellow-600 font-medium mb-1">📝 Observações</p>
                        <p className="text-sm">{parsed.notes}</p>
                      </motion.div>
                    )}
                  </div>

                  {/* Warning if missing required fields */}
                  {!canCreate && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
                    >
                      <p className="text-sm text-amber-600">
                        ⚠️ Data e horário são obrigatórios para criar o agendamento.
                      </p>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-2 pt-2"
                  >
                    <Button 
                      variant="outline" 
                      onClick={clearResult} 
                      size="sm"
                      className="gap-2 rounded-lg"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Nova mensagem
                    </Button>
                    <Button 
                      onClick={createAppointment}
                      disabled={!canCreate || creating}
                      size="sm"
                      className="flex-1 gap-2 rounded-lg bg-primary hover:bg-primary/90"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Criar Agendamento
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State / Instructions */}
        {!parsed && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Wand2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="font-medium text-foreground mb-2">Como funciona?</h4>
            <div className="text-sm text-muted-foreground space-y-1 max-w-xs mx-auto">
              <p>1️⃣ Copie a mensagem do cliente no WhatsApp</p>
              <p>2️⃣ Cole no campo acima e clique em Interpretar</p>
              <p>3️⃣ Revise os dados e crie o agendamento</p>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-green-600 max-w-xs mx-auto">
              💡 A IA extrai automaticamente nome, telefone, data, horário e serviços!
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
