import { useState } from 'react';
import { User, Phone, Calendar, DollarSign, Eye, Trash2, Link, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Client } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClientDetailsModal } from './ClientDetailsModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExclusiveClients } from '@/hooks/useExclusiveClients';
import { cn } from '@/lib/utils';

interface ClientListProps {
  clients: Client[];
  onDeleteClient?: (userId: string, isGuest: boolean) => Promise<boolean>;
}

export function ClientList({ clients, onDeleteClient }: ClientListProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { exclusiveIds, toggleExclusive } = useExclusiveClients();

  const handleDelete = async (client: Client) => {
    if (!onDeleteClient) return;
    setDeletingId(client.user_id);
    await onDeleteClient(client.user_id, client.is_guest);
    setDeletingId(null);
  };

  return (
    <>
      <div className="space-y-2 md:space-y-3">
        {clients.map((client, index) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-3 md:p-4 rounded-2xl glass-effect hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setSelectedClient(client)}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-sm md:text-base truncate">{client.name || 'Sem nome'}</span>
                  {!client.is_guest && exclusiveIds.includes(client.user_id) && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                      <Star className="h-2.5 w-2.5 mr-0.5 fill-yellow-500" />
                      Exclusivo
                    </Badge>
                  )}
                  {client.is_guest && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-500 border-blue-500/30">
                      <Link className="h-2.5 w-2.5 mr-0.5" />
                      Formulário
                    </Badge>
                  )}
                </div>
                
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mb-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span className="truncate">{client.phone}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-[10px] md:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {client.total_appointments} agend.
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    R$ {client.total_spent.toFixed(0)}
                  </span>
                </div>

                {client.last_appointment && (
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1 hidden sm:block">
                    Última: {format(new Date(client.last_appointment), "dd/MM/yy", { locale: ptBR })}
                  </p>
                )}
              </div>

              <div className="flex gap-1 md:gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 md:px-3 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClient(client);
                  }}
                >
                  <Eye className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Ver</span>
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
