import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMyLoyalty } from '@/hooks/useLoyalty';
import { Gift, Star, Trophy } from 'lucide-react';

export function MyLoyaltyProgress() {
  const { myProgress, loadingProgress, myRewards, loadingRewards } = useMyLoyalty();

  if (loadingProgress || loadingRewards) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  if (myProgress.length === 0 && myRewards.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Você ainda não está em nenhum programa de fidelidade.</p>
          <p className="text-sm">Continue visitando para acumular benefícios!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recompensas disponíveis */}
      {myRewards.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Trophy className="h-5 w-5" />
              Recompensas Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myRewards.map(reward => (
              <div key={reward.id} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div>
                  <p className="font-medium">{reward.program?.name}</p>
                  <Badge variant="default">{reward.program?.reward_description}</Badge>
                </div>
                <Gift className="h-6 w-6 text-primary" />
              </div>
            ))}
            <p className="text-sm text-muted-foreground text-center">
              Apresente na próxima visita para usar sua recompensa!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Progresso nos programas */}
      {myProgress.map(progress => {
        const percentage = Math.min(
          (progress.visits_count / (progress.program?.visits_required || 10)) * 100,
          100
        );
        const visitsRemaining = Math.max(
          (progress.program?.visits_required || 10) - progress.visits_count,
          0
        );

        return (
          <Card key={progress.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-5 w-5 text-amber-500" />
                {progress.program?.name || 'Programa Fidelidade'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Info do programa */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recompensa:</span>
                  <span className="font-medium">{progress.program?.reward_description}</span>
                </div>

                {/* Contagem de visitas */}
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">
                    {progress.visits_count}/{progress.program?.visits_required || 10}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {visitsRemaining > 0
                      ? `Faltam ${visitsRemaining} visita(s)`
                      : 'Recompensa disponível!'}
                  </span>
                </div>

                {/* Barra de progresso */}
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Histórico de recompensas */}
                {progress.rewards_claimed > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="h-4 w-4" />
                    {progress.rewards_claimed} recompensa(s) já resgatada(s)
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
