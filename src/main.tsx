import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

// PWA manifest and title setup is now handled via inline script in index.html 
// to ensure it runs before the browser captures the "Add to Home Screen" event.

// ─── Atualização automática segura do PWA ───────────────────────────────────
// Quando um novo Service Worker toma o controle (após deploy),
// o app detecta via controllerchange e faz um reload seguro.
// Isso garante que todos os usuários recebam a versão nova automaticamente,
// sem precisar desinstalar ou limpar cache manualmente.
// Funciona em iOS PWA (WKWebView) sem causar tela preta.
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    setTimeout(() => window.location.reload(), 300);
  });
}

// ─── HACK: Forçar Layout Mobile no iOS PWA ────────────────────────────────────
// Resolve o bug dos 980px do iOS usando 'zoom' (que preserva o scroll original),
// e corrige o tamanho de telas de 100vh para não empurrar o conteúdo pra baixo.
try {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      ('standalone' in navigator && (navigator as any).standalone === true);
                      
  if (isIOS && isStandalone) {
    if (window.innerWidth > 500 && window.screen.width < 500) {
      const zoomFactor = window.innerWidth / window.screen.width;
      
      const applyHack = () => {
        // 1. Aplica o zoom nativo no HTML (Isso aumenta tudo, e preserva o Scroll vertical!)
        document.documentElement.style.setProperty('zoom', zoomFactor.toString(), 'important');
        
        // 2. O zoom quebra a altura das telas de login (100dvh). 
        // Para corrigir, a altura CSS precisa ser a altura física dividida pelo zoom.
        const correctedHeight = window.screen.height / zoomFactor;
        
        const style = document.createElement('style');
        style.innerHTML = `
          .min-h-\\[100dvh\\], .min-h-screen, .min-h-\\[100vh\\] {
            min-height: ${correctedHeight}px !important;
          }
          .h-screen, .h-\\[100dvh\\] {
            height: ${correctedHeight}px !important;
          }
        `;
        document.head.appendChild(style);
      };
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyHack);
      } else {
        applyHack();
      }
    }
  }
} catch (e) {
  console.error("Erro ao aplicar layout fix no iOS PWA", e);
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
