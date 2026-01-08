import { useState } from 'react';
import { User, Phone, Calendar, DollarSign, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { Client, useClientNotes } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientListProps {
  clients: Client[];
}

export function ClientList({ clients }: ClientListProps) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newNote, setNewNote] = useState('');
  const { notes, addNote, loading: notesLoading } = useClientNotes(selectedClient?.user_id || null);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addNote(newNote);
    setNewNote('');
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
            className="p-4 rounded-2xl glass-effect"
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
                onClick={() => setSelectedClient(client)}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Notes Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notas - {selectedClient?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicionar nota..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <Button onClick={handleAddNote} disabled={notesLoading}>
                Adicionar
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma nota ainda
                </p>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="p-3 rounded-lg bg-muted">
                    <p className="text-sm">{note.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
