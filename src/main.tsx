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

// ─── HACK: Forçar Zoom Matemático no iOS PWA ────────────────────────────────
// Como o WKWebView do iOS PWA às vezes trava em 980px (modo desktop) e se recusa
// a ler a tag viewport, calculamos a proporção exata para dar o zoom perfeito.
try {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      ('standalone' in navigator && (navigator as any).standalone === true);
                      
  if (isIOS && isStandalone) {
    // Se a largura da tela lida pelo iOS for bizarramente grande (> 500px) num celular
    if (window.innerWidth > 500 && window.screen.width < 500) {
      const zoomFactor = window.innerWidth / window.screen.width;
      document.documentElement.style.setProperty('zoom', zoomFactor.toString(), 'important');
    } else {
      // Se estiver normal, só garante um pequeno aumento extra
      document.documentElement.style.setProperty('zoom', '1.05', 'important');
    }
  }
} catch (e) {
  console.error("Erro ao aplicar zoom no iOS PWA", e);
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
