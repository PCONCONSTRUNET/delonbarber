import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RatingStars } from '@/components/ratings/RatingStars';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, Eye, EyeOff, Search, Star, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminRating {
  id: string;
  appointment_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_public: boolean;
  created_at: string;
  profile: {
    name: string | null;
    phone: string | null;
  } | null;
}

export function RatingsManager() {
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  async function fetchAllRatings() {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('ratings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ratings:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar as avaliações.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Fetch profiles for each rating
    const ratingsWithProfiles: AdminRating[] = [];
    
    for (const rating of data || []) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('user_id', rating.user_id)
        .maybeSingle();

      ratingsWithProfiles.push({
        ...rating,
        profile: profileData || { name: null, phone: null }
      });
    }

    setRatings(ratingsWithProfiles);
    setLoading(false);
  }

  async function toggleVisibility(id: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('ratings')
      .update({ is_public: !currentStatus })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível alterar visibilidade.', variant: 'destructive' });
      return;
    }

    setRatings(ratings.map(r => 
      r.id === id ? { ...r, is_public: !currentStatus } : r
    ));

    toast({ 
      title: !currentStatus ? 'Avaliação pública' : 'Avaliação oculta',
      description: !currentStatus ? 'A avaliação agora aparece na página inicial.' : 'A avaliação foi removida da página inicial.'
    });
  }

  async function deleteRating(id: string) {
    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir avaliação.', variant: 'destructive' });
      return;
    }

    setRatings(ratings.filter(r => r.id !== id));
    setDeleteId(null);
    toast({ title: 'Excluído', description: 'Avaliação removida com sucesso.' });
  }

  useEffect(() => {
    fetchAllRatings();
  }, []);

  const filteredRatings = ratings.filter(r => {
    const search = searchTerm.toLowerCase();
    return (
      r.profile?.name?.toLowerCase().includes(search) ||
      r.comment?.toLowerCase().includes(search) ||
      r.rating.toString().includes(search)
    );
  });

  const stats = {
    total: ratings.length,
    public: ratings.filter(r => r.is_public).length,
    average: ratings.length > 0 
      ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1) 
      : '0',
    fiveStars: ratings.filter(r => r.rating === 5).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-4 border border-border"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs">Total</span>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-4 border border-border"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Eye className="h-4 w-4" />
            <span className="text-xs">Públicas</span>
          </div>
          <p className="text-2xl font-bold text-green-500">{stats.public}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl p-4 border border-border"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Star className="h-4 w-4" />
            <span className="text-xs">Média</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">{stats.average}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl p-4 border border-border"
        >
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-xs">5 Estrelas</span>
          </div>
          <p className="text-2xl font-bold">{stats.fiveStars}</p>
        </motion.div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou comentário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Ratings List - Mobile cards + Desktop table */}
      {filteredRatings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>{searchTerm ? 'Nenhuma avaliação encontrada' : 'Nenhuma avaliação ainda'}</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards View */}
          <div className="space-y-3 md:hidden">
            <AnimatePresence>
              {filteredRatings.map((rating) => (
                <motion.div
                  key={rating.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-xl border border-border bg-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                        {rating.profile?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{rating.profile?.name || 'Cliente'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(rating.created_at), "dd/MM/yy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <RatingStars rating={rating.rating} size="sm" />
                  </div>
                  
                  {rating.comment && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      "{rating.comment}"
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rating.is_public}
                        onCheckedChange={() => toggleVisibility(rating.id, rating.is_public)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {rating.is_public ? 'Pública' : 'Oculta'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-8 px-2"
                      onClick={() => setDeleteId(rating.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Visível</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredRatings.map((rating) => (
                    <motion.tr
                      key={rating.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b last:border-0"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {rating.profile?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{rating.profile?.name || 'Cliente'}</p>
                            <p className="text-xs text-muted-foreground">{rating.profile?.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RatingStars rating={rating.rating} size="sm" />
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {rating.comment || '-'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(rating.created_at), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rating.is_public}
                            onCheckedChange={() => toggleVisibility(rating.id, rating.is_public)}
                          />
                          {rating.is_public ? (
                            <Eye className="h-4 w-4 text-green-500" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(rating.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A avaliação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteRating(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
