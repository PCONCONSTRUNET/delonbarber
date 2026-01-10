import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLoyalty, useLoyaltyAdmin, LoyaltyProgram } from '@/hooks/useLoyalty';
import { Gift, Plus, Trash2, Users, Trophy, Star, Check, Edit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function LoyaltyManager() {
  const { programs, loadingPrograms, createProgram, updateProgram, deleteProgram } = useLoyalty();
  const { allProgress, loadingProgress, allRewards, addVisit, grantReward, useReward } = useLoyaltyAdmin();
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<LoyaltyProgram | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [visitsRequired, setVisitsRequired] = useState(10);
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardType, setRewardType] = useState<'discount' | 'free_service' | 'custom'>('custom');
  const [rewardValue, setRewardValue] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);

  // Buscar clientes para aplicar fidelidade
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-loyalty'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, phone')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setName('');
    setVisitsRequired(10);
    setRewardDescription('');
    setRewardType('custom');
    setRewardValue(null);
    setIsActive(true);
    setEditingProgram(null);
  };

  const handleSubmit = () => {
    if (!name || !rewardDescription) return;

    if (editingProgram) {
      updateProgram.mutate({
        id: editingProgram.id,
        name,
        visits_required: visitsRequired,
        reward_description: rewardDescription,
        reward_type: rewardType,
        reward_value: rewardValue,
        is_active: isActive,
      });
    } else {
      createProgram.mutate({
        name,
        visits_required: visitsRequired,
        reward_description: rewardDescription,
        reward_type: rewardType,
        reward_value: rewardValue,
        is_active: isActive,
      });
    }
    setShowForm(false);
    resetForm();
  };

  const handleEdit = (program: LoyaltyProgram) => {
    setEditingProgram(program);
    setName(program.name);
    setVisitsRequired(program.visits_required);
    setRewardDescription(program.reward_description);
    setRewardType(program.reward_type);
    setRewardValue(program.reward_value);
    setIsActive(program.is_active);
    setShowForm(true);
  };

  // Progresso com dados do cliente
  const progressWithClients = allProgress.map(p => {
    const client = clients.find(c => c.user_id === p.user_id);
    const program = programs.find(prog => prog.id === p.program_id);
    return {
      ...p,
      clientName: client?.name || 'Desconhecido',
      clientPhone: client?.phone || '',
      programName: program?.name || 'Programa',
      visitsRequired: program?.visits_required || 10,
    };
  });

  // Recompensas com dados
  const rewardsWithData = allRewards.map(r => {
    const client = clients.find(c => c.user_id === r.user_id);
    const program = programs.find(prog => prog.id === r.program_id);
    return {
      ...r,
      clientName: client?.name || 'Desconhecido',
      programName: program?.name || 'Programa',
      rewardDescription: program?.reward_description || '',
    };
  });

  const availableRewards = rewardsWithData.filter(r => r.status === 'available');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="programs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="programs" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Programas
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="rewards" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Recompensas
          </TabsTrigger>
        </TabsList>

        {/* Programas */}
        <TabsContent value="programs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Programas de Fidelidade</h3>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Programa
            </Button>
          </div>

          {loadingPrograms ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : programs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum programa criado ainda.</p>
                <p className="text-sm">Crie um programa para começar a fidelizar seus clientes!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {programs.map(program => (
                <Card key={program.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{program.name}</h4>
                          <Badge variant={program.is_active ? 'default' : 'secondary'}>
                            {program.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <Star className="h-3 w-3 inline mr-1" />
                          {program.visits_required} visitas = {program.reward_description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(program)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteProgram.mutate(program.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Dialog para criar/editar programa */}
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {editingProgram ? 'Editar Programa' : 'Novo Programa de Fidelidade'}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-2">
                <div className="space-y-2">
                  <Label>Nome do Programa</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Fidelidade Premium"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Visitas Necessárias</Label>
                  <Input
                    type="number"
                    value={visitsRequired}
                    onChange={e => setVisitsRequired(Number(e.target.value))}
                    min={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Recompensa</Label>
                  <Select value={rewardType} onValueChange={(v: 'discount' | 'free_service' | 'custom') => setRewardType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Desconto em R$</SelectItem>
                      <SelectItem value="free_service">Serviço Grátis</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {rewardType === 'discount' && (
                  <div className="space-y-2">
                    <Label>Valor do Desconto (R$)</Label>
                    <Input
                      type="number"
                      value={rewardValue || ''}
                      onChange={e => setRewardValue(Number(e.target.value))}
                      placeholder="Ex: 50"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Descrição da Recompensa</Label>
                  <Textarea
                    value={rewardDescription}
                    onChange={e => setRewardDescription(e.target.value)}
                    placeholder="Ex: 1 Corte Grátis"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>Programa Ativo</Label>
                </div>
              </div>

              <div className="flex-shrink-0 pt-4 border-t">
                <Button onClick={handleSubmit} className="w-full h-11">
                  {editingProgram ? 'Salvar Alterações' : 'Criar Programa'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Clientes */}
        <TabsContent value="clients" className="space-y-4">
          <h3 className="text-lg font-semibold">Progresso dos Clientes</h3>

          {programs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Crie um programa de fidelidade primeiro.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Adicionar visita a um cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Adicionar Visita</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddVisitForm
                    clients={clients}
                    programs={programs}
                    onAddVisit={(userId, programId) => addVisit.mutate({ userId, programId })}
                  />
                </CardContent>
              </Card>

              {/* Lista de progresso */}
              {loadingProgress ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : progressWithClients.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum cliente no programa ainda.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {progressWithClients.map(progress => {
                    const canClaim = progress.visits_count >= progress.visitsRequired;
                    return (
                      <Card key={progress.id}>
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{progress.clientName}</p>
                              <p className="text-sm text-muted-foreground">{progress.programName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">
                                  {progress.visits_count}/{progress.visitsRequired} visitas
                                </Badge>
                                {progress.rewards_claimed > 0 && (
                                  <Badge variant="secondary">
                                    {progress.rewards_claimed} recompensa(s) resgatada(s)
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addVisit.mutate({
                                  userId: progress.user_id,
                                  programId: progress.program_id,
                                })}
                              >
                                +1 Visita
                              </Button>
                              {canClaim && (
                                <Button
                                  size="sm"
                                  onClick={() => grantReward.mutate({
                                    userId: progress.user_id,
                                    programId: progress.program_id,
                                  })}
                                >
                                  <Trophy className="h-4 w-4 mr-1" />
                                  Conceder
                                </Button>
                              )}
                            </div>
                          </div>
                          {/* Barra de progresso visual */}
                          <div className="mt-3">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{
                                  width: `${Math.min((progress.visits_count / progress.visitsRequired) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Recompensas */}
        <TabsContent value="rewards" className="space-y-4">
          <h3 className="text-lg font-semibold">Recompensas Disponíveis</h3>

          {availableRewards.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma recompensa disponível.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {availableRewards.map(reward => (
                <Card key={reward.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{reward.clientName}</p>
                        <p className="text-sm text-muted-foreground">{reward.programName}</p>
                        <Badge variant="default" className="mt-1">
                          {reward.rewardDescription}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => useReward.mutate(reward.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Marcar como Usado
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente para adicionar visita
function AddVisitForm({
  clients,
  programs,
  onAddVisit,
}: {
  clients: { user_id: string; name: string | null; phone: string | null }[];
  programs: LoyaltyProgram[];
  onAddVisit: (userId: string, programId: string) => void;
}) {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');

  const handleAdd = () => {
    if (selectedClient && selectedProgram) {
      onAddVisit(selectedClient, selectedProgram);
      setSelectedClient('');
    }
  };

  return (
    <div className="flex gap-3 items-end">
      <div className="flex-1 space-y-2">
        <Label>Cliente</Label>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.user_id} value={client.user_id}>
                {client.name || client.phone || 'Sem nome'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-2">
        <Label>Programa</Label>
        <Select value={selectedProgram} onValueChange={setSelectedProgram}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o programa" />
          </SelectTrigger>
          <SelectContent>
            {programs.filter(p => p.is_active).map(program => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={handleAdd} disabled={!selectedClient || !selectedProgram}>
        <Plus className="h-4 w-4 mr-1" />
        Adicionar
      </Button>
    </div>
  );
}
