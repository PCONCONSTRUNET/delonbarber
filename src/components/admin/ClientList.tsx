import { useState } from 'react';
import { User, Phone, Calendar, DollarSign, Eye, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Client } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { ClientDetailsModal } from './ClientDetailsModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientListProps {
  clients: Client[];
  onDeleteClient?: (userId: string) => Promise<boolean>;
}

export function ClientList({ clients, onDeleteClient }: ClientListProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (client: Client) => {
    if (!onDeleteClient) return;
    setDeletingId(client.user_id);
    await onDeleteClient(client.user_id);
    setDeletingId(null);
  };

  return (
    <>
      <div className="space-y-3">
        {clients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-2xl glass-effect hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => setSelectedClient(client)}
              >
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

              <div className="flex gap-2">
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

                {onDeleteClient && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={deletingId === client.user_id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir permanentemente o cliente{' '}
                          <span className="font-semibold text-foreground">{client.name || 'Sem nome'}</span>?
                          <br /><br />
                          <span className="text-destructive font-medium">
                            Esta ação não pode ser desfeita. Todos os dados serão removidos:
                          </span>
                          <ul className="list-disc list-inside mt-2 text-sm">
                            <li>Histórico de agendamentos</li>
                            <li>Pacotes e benefícios</li>
                            <li>Notas do cliente</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(client)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir Permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
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
