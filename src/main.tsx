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

// ─── HACK: Forçar Viewport Correto no iOS PWA ────────────────────────────────
// Como o WKWebView do iOS PWA às vezes trava em 980px (modo desktop) e se recusa
// a ler a tag viewport corretamente, nós reescrevemos a tag explicitamente
// com a largura real da tela, o que resolve o bug de zoom sem quebrar o alinhamento.
try {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      ('standalone' in navigator && (navigator as any).standalone === true);
                      
  if (isIOS && isStandalone) {
    // Se a largura da tela lida pelo iOS for bizarramente grande (> 500px) num celular
    if (window.innerWidth > 500 && window.screen.width < 500) {
      // Remover qualquer zoom anterior caso exista
      document.documentElement.style.removeProperty('zoom');
      
      // Forçar o viewport para a largura exata da tela (ex: width=390) em vez de device-width
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        document.head.appendChild(viewportMeta);
      }
      viewportMeta.setAttribute('content', `width=${window.screen.width}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`);
    }
  }
} catch (e) {
  console.error("Erro ao aplicar viewport fix no iOS PWA", e);
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
