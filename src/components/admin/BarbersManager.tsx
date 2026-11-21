import { useState } from 'react';
import {
  UserPlus,
  Pencil,
  Percent,
  KeyRound,
  Copy,
  Check,
  Camera,
  Loader2,
  ShieldCheck,
  UserCheck,
  Unlink,
  Phone,
  Scissors,
  Crown,
  Bell,
} from 'lucide-react';
import { Barber, CreateBarberInput, useAdminBarbers } from '@/hooks/useBarbers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export function BarbersManager() {
  const {
    barbers,
    loading,
    uploadBarberAvatar,
    createBarber,
    updateBarber,
    assignBarberAccount,
    unlinkBarberAccount,
  } = useAdminBarbers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copiedLogin, setCopiedLogin] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('50');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [accessMode, setAccessMode] = useState<'none' | 'create' | 'link'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Quick commission edit modal/dialog or access dialog
  const [accessDialogBarber, setAccessDialogBarber] = useState<Barber | null>(null);
  const [accessEmail, setAccessEmail] = useState('');
  const [accessPassword, setAccessPassword] = useState('');
  const [accessTab, setAccessTab] = useState<'create' | 'link'>('create');
  const [savingAccess, setSavingAccess] = useState(false);

  const barberLoginUrl = `${window.location.origin}/barber/login`;

  const copyBarberLoginLink = async () => {
    try {
      await navigator.clipboard.writeText(barberLoginUrl);
      setCopiedLogin(true);
      toast.success('Link do Painel do Barbeiro copiado!');
      setTimeout(() => setCopiedLogin(false), 2000);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const openNewDialog = () => {
    setEditingBarber(null);
    setName('');
    setPhone('');
    setBio('Barbeiro Profissional');
    setCommissionPercent('50');
    setAvatarUrl(null);
    setIsActive(true);
    setNotifyPush(true);
    setAccessMode('create');
    setEmail('');
    setPassword('');
    setDialogOpen(true);
  };

  const openEditDialog = (barber: Barber) => {
    setEditingBarber(barber);
    setName(barber.name);
    setPhone(barber.phone || '');
    setBio(barber.bio || '');
    setCommissionPercent(String(barber.commission_percent ?? 50));
    setAvatarUrl(barber.avatar_url);
    setIsActive(barber.is_active);
    setNotifyPush(barber.notify_push ?? true);
    setAccessMode('none');
    setEmail(barber.email || '');
    setPassword('');
    setDialogOpen(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const url = await uploadBarberAvatar(file);
    if (url) setAvatarUrl(url);
    setUploadingAvatar(false);
  };

  const handleSaveBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Digite o nome do barbeiro');
      return;
    }

    const parsedComm = Number(commissionPercent);
    if (isNaN(parsedComm) || parsedComm < 0 || parsedComm > 100) {
      toast.error('Porcentagem de comissão deve ser entre 0 e 100%');
      return;
    }

    if (!editingBarber && accessMode === 'create') {
      if (!email.trim()) {
        toast.error('Informe o e-mail de acesso do barbeiro');
        return;
      }
      if (password.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        return;
      }
    }

    if (!editingBarber && accessMode === 'link' && !email.trim()) {
      toast.error('Informe o e-mail da conta cadastrada');
      return;
    }

    setSaving(true);
    if (editingBarber) {
      const ok = await updateBarber(editingBarber.id, {
        name: name.trim(),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        commission_percent: parsedComm,
        avatar_url: avatarUrl,
        is_active: isActive,
        notify_push: notifyPush,
      });
      if (ok) setDialogOpen(false);
    } else {
      const input: CreateBarberInput = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        commission_percent: parsedComm,
        avatar_url: avatarUrl,
        is_active: isActive,
        notify_push: notifyPush,
        is_owner: false,
        accessMode,
        email: email.trim() || undefined,
        password: password || undefined,
      };
      const created = await createBarber(input);
      if (created) setDialogOpen(false);
    }
    setSaving(false);
  };

  const openAccessDialog = (barber: Barber) => {
    setAccessDialogBarber(barber);
    setAccessEmail(barber.email || '');
    setAccessPassword('');
    setAccessTab('create');
  };

  const handleAssignAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessDialogBarber) return;
    if (!accessEmail.trim()) {
      toast.error('Informe o e-mail');
      return;
    }
    if (accessTab === 'create' && accessPassword.length < 6) {
      toast.error('Senha precisa ter pelo menos 6 caracteres');
      return;
    }

    setSavingAccess(true);
    const ok = await assignBarberAccount(
      accessDialogBarber.id,
      accessEmail,
      accessTab === 'create' ? accessPassword : undefined
    );
    if (ok) {
      toast.success('Acesso ao Painel do Barbeiro configurado!');
      setAccessDialogBarber(null);
    }
    setSavingAccess(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Info & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl glass-effect border border-primary/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" />
            <p className="font-semibold text-sm">Acesso exclusivo dos barbeiros</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Cada barbeiro cadastrado entra por{' '}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">/barber</code> (ou{' '}
            <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">/barber/login</code>) com sua própria agenda, sem acessar o Admin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyBarberLoginLink} className="gap-1.5">
            {copiedLogin ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            Copiar link de login
          </Button>
          <Button size="sm" onClick={openNewDialog} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Cadastrar Barbeiro
          </Button>
        </div>
      </div>

      {/* Barbers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {barbers.map((barber) => (
          <div
            key={barber.id}
            className={`p-4 rounded-2xl glass-effect border transition-all space-y-4 ${
              !barber.is_active ? 'opacity-60 border-border/50' : 'border-border'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-14 w-14 border-2 border-primary/40 shrink-0">
                  <AvatarImage src={barber.avatar_url || undefined} alt={barber.name} className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {barber.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base truncate">{barber.name}</h3>
                    {barber.is_owner ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-2 py-0">
                        <Crown className="h-2.5 w-2.5 mr-1" />
                        Dono
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-2 py-0">
                        Comissionado
                      </Badge>
                    )}
                    {!barber.is_active && (
                      <Badge variant="destructive" className="text-[10px] px-2 py-0">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {barber.bio || 'Barbeiro'}
                  </p>
                  {barber.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      {barber.phone}
                    </p>
                  )}
                </div>
              </div>

              {!barber.is_owner && (
                <Switch
                  checked={barber.is_active}
                  onCheckedChange={(checked) => updateBarber(barber.id, { is_active: checked })}
                  title={barber.is_active ? 'Desativar barbeiro' : 'Ativar barbeiro'}
                />
              )}
            </div>

            {/* Commission & Access Info */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
              <div className="p-2.5 rounded-xl bg-muted/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3 w-3 text-primary" />
                  Comissão
                </p>
                <p className="font-bold text-base text-foreground mt-0.5">
                  {barber.is_owner ? '100% (Dono)' : `${barber.commission_percent}%`}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-muted/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <KeyRound className="h-3 w-3 text-primary" />
                  Login do Painel
                </p>
                {barber.user_id ? (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <p className="text-xs font-medium text-green-500 flex items-center gap-1 truncate" title={barber.email || ''}>
                        <UserCheck className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{barber.email || 'Conta vinculada'}</span>
                      </p>
                      {!barber.is_owner && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${
                            barber.notify_push !== false
                              ? 'border-primary/40 text-primary'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          <Bell className="h-2.5 w-2.5 mr-0.5" />
                          {barber.notify_push !== false ? 'Push ativo' : 'Push off'}
                        </Badge>
                      )}
                    </div>
                ) : (
                  <p className="text-xs text-amber-500 mt-1">Sem login vinculado</p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditDialog(barber)}
                className="flex-1 gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar / Comissão
              </Button>

              {!barber.is_owner && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAccessDialog(barber)}
                    className="flex-1 gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {barber.user_id ? 'Alterar Acesso' : 'Configurar Acesso'}
                  </Button>
                  {barber.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => unlinkBarberAccount(barber.id)}
                      title="Desvincular conta de login"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Criar / Editar Barbeiro */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editingBarber ? `Editar ${editingBarber.name}` : 'Cadastrar Novo Barbeiro'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveBarber} className="space-y-4 overflow-y-auto flex-1 pr-1">
            {/* Avatar upload */}
            <div className="flex justify-center pt-1">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-primary/50">
                  <AvatarImage src={avatarUrl || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
                    {name ? name.slice(0, 2).toUpperCase() : <Scissors className="h-7 w-7" />}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/80 transition-colors">
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-primary-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barber-name">Nome *</Label>
              <Input
                id="barber-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Silva"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="barber-phone">Telefone / WhatsApp</Label>
                <Input
                  id="barber-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(48) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barber-commission">Comissão (%)</Label>
                <div className="relative">
                  <Input
                    id="barber-commission"
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    disabled={editingBarber?.is_owner}
                    className="pr-8"
                  />
                  <Percent className="h-3.5 w-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barber-bio">Especialidade / Cargo</Label>
              <Input
                id="barber-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ex: Especialista em Degradê e Barba"
              />
            </div>

            {!editingBarber?.is_owner && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="space-y-0.5">
                  <Label htmlFor="barber-notify-push" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                    <Bell className="h-3.5 w-3.5 text-primary" />
                    Notificação Push de novos agendamentos
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Envia push para este barbeiro sempre que um cliente agendar com ele.
                  </p>
                </div>
                <Switch
                  id="barber-notify-push"
                  checked={notifyPush}
                  onCheckedChange={setNotifyPush}
                />
              </div>
            )}

            {!editingBarber && (
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Acesso ao Painel Exclusivo do Barbeiro
                </Label>
                <Tabs
                  value={accessMode}
                  onValueChange={(v) => setAccessMode(v as 'none' | 'create' | 'link')}
                >
                  <TabsList className="grid w-full grid-cols-3 h-8">
                    <TabsTrigger value="create" className="text-xs">Criar Login</TabsTrigger>
                    <TabsTrigger value="link" className="text-xs">Vincular</TabsTrigger>
                    <TabsTrigger value="none" className="text-xs">Depois</TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="space-y-3 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">E-mail de acesso *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="barbeiro@delonbarber.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Senha (mín. 6 caracteres) *</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Cria o usuário automaticamente sem sair da sua conta de admin.
                    </p>
                  </TabsContent>

                  <TabsContent value="link" className="space-y-2 pt-2">
                    <Label className="text-xs">E-mail da conta já cadastrada *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@cadastrado.com"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Se o barbeiro já criou uma conta no app, informe o e-mail dele aqui.
                    </p>
                  </TabsContent>

                  <TabsContent value="none" className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      Você poderá configurar o login dele depois a qualquer momento.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving || uploadingAvatar}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingBarber ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Configurar / Alterar Acesso do Barbeiro */}
      <Dialog
        open={!!accessDialogBarber}
        onOpenChange={(open) => !open && setAccessDialogBarber(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Acesso de {accessDialogBarber?.name}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssignAccess} className="space-y-4">
            <Tabs value={accessTab} onValueChange={(v) => setAccessTab(v as 'create' | 'link')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Criar novo acesso</TabsTrigger>
                <TabsTrigger value="link">Vincular existente</TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label>E-mail do barbeiro</Label>
                  <Input
                    type="email"
                    value={accessEmail}
                    onChange={(e) => setAccessEmail(e.target.value)}
                    placeholder="joao@delonbarber.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha inicial</Label>
                  <Input
                    type="password"
                    value={accessPassword}
                    onChange={(e) => setAccessPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required={accessTab === 'create'}
                  />
                </div>
              </TabsContent>

              <TabsContent value="link" className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label>E-mail cadastrado no app</Label>
                  <Input
                    type="email"
                    value={accessEmail}
                    onChange={(e) => setAccessEmail(e.target.value)}
                    placeholder="email@cadastrado.com"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O acesso deste usuário será liberado em <code>/barber</code> sem conceder acesso de Admin.
                </p>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAccessDialogBarber(null)}
                className="flex-1"
                disabled={savingAccess}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={savingAccess}>
                {savingAccess ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Acesso'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
