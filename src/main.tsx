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
// Como o WKWebView às vezes trava em 980px (modo desktop) e ignora a tag viewport,
// nós forçamos o #root a ter a largura da tela do celular e usamos transform: scale
// para anular o "shrink" do iOS. Isso deixa tudo gigante e alinhado perfeitamente!
try {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      ('standalone' in navigator && (navigator as any).standalone === true);
                      
  if (isIOS && isStandalone) {
    if (window.innerWidth > 500 && window.screen.width < 500) {
      const scaleFactor = window.innerWidth / window.screen.width;
      
      // Quando a página carregar, aplicamos o hack no root
      const applyHack = () => {
        const root = document.getElementById('root');
        if (root) {
          root.style.width = window.screen.width + 'px';
          root.style.height = window.screen.height + 'px';
          root.style.transformOrigin = 'top left';
          root.style.transform = `scale(${scaleFactor})`;
          root.style.overflow = 'hidden';
          root.style.position = 'absolute';
          root.style.top = '0';
          root.style.left = '0';
          document.body.style.overflow = 'hidden';
          document.body.style.width = window.innerWidth + 'px';
          document.body.style.height = window.innerHeight + 'px';
        }
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
