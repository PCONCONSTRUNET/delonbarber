import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

// PWA manifest and title setup is handled via inline script in index.html
// to ensure it runs before the browser captures the "Add to Home Screen" event.

// iOS layout fix (zoom hack) is also handled in index.html as a static inline
// script — this avoids any race condition between DOM manipulation and React's
// reconciler (which was the root cause of the "insertBefore" crash on iOS).

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

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
