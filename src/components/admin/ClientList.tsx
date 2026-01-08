import { useState } from 'react';
import { User, Phone, Calendar, DollarSign, Eye, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Client } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDetailsModal } from './ClientDetailsModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientListProps {
  clients: Client[];
}

export function ClientList({ clients }: ClientListProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  return (
    <>
      <div className="space-y-3">
        {clients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-2xl glass-effect hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => setSelectedClient(client)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-semibold">{client.name || 'Sem nome'}</span>
                </div>
                
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Phone className="h-3 w-3" />
                    <span>{client.phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {client.total_appointments} agendamentos
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    R$ {client.total_spent.toFixed(0)}
                  </span>
                </div>

                {client.last_appointment && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Última visita: {format(new Date(client.last_appointment), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedClient(client);
                }}
              >
                <Eye className="h-4 w-4" />
                Detalhes
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Client Details Modal */}
      <ClientDetailsModal
        client={selectedClient}
        open={!!selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </>
  );
}
