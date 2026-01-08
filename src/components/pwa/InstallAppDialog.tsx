import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, Share, Plus, MoreVertical, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallAppDialog({ open, onOpenChange }: InstallAppDialogProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
    
    // Check if already installed
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        onOpenChange(false);
      }
    }
  };

  if (isStandalone) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              App Já Instalado!
            </DialogTitle>
            <DialogDescription>
              Você já está usando o aplicativo instalado. Aproveite a experiência completa!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="text-6xl">✅</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Instalar Aplicativo
          </DialogTitle>
          <DialogDescription>
            Instale nosso app para uma experiência mais rápida e acesso offline!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Direct Install Button (Android/Desktop with Chrome) */}
          {deferredPrompt && (
            <div className="space-y-3">
              <Button onClick={handleInstall} className="w-full gap-2" size="lg">
                <Download className="h-5 w-5" />
                Instalar Agora
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Clique para adicionar à sua tela inicial
              </p>
            </div>
          )}

          {/* iOS Instructions */}
          {isIOS && !deferredPrompt && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <span className="text-lg">🍎</span> 
                Instruções para iPhone/iPad
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Toque no botão Compartilhar</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Share className="h-5 w-5" />
                      <span>Na barra inferior do Safari</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Role e selecione</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Plus className="h-5 w-5 border rounded" />
                      <span>"Adicionar à Tela de Início"</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Confirme tocando em "Adicionar"</p>
                    <p className="text-muted-foreground">O app aparecerá na sua tela inicial</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android Instructions (fallback if prompt not available) */}
          {isAndroid && !deferredPrompt && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <span className="text-lg">🤖</span>
                Instruções para Android
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Toque no menu do navegador</p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MoreVertical className="h-5 w-5" />
                      <span>3 pontinhos no canto superior</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Selecione "Instalar aplicativo"</p>
                    <p className="text-muted-foreground">Ou "Adicionar à tela inicial"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Confirme a instalação</p>
                    <p className="text-muted-foreground">O app aparecerá na sua tela inicial</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Desktop Instructions */}
          {!isIOS && !isAndroid && !deferredPrompt && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <span className="text-lg">💻</span>
                Instruções para Desktop
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Procure o ícone de instalação</p>
                    <p className="text-muted-foreground">Na barra de endereços do navegador</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Clique em "Instalar"</p>
                    <p className="text-muted-foreground">O app será adicionado ao seu sistema</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Benefícios do App:
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                ⚡ Mais rápido
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                📱 Tela cheia
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                🔔 Notificações
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                📶 Funciona offline
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
