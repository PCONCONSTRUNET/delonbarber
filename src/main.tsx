import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Inject the correct manifest BEFORE React mounts so iOS Safari sees the
// right one when the user taps "Add to Home Screen".
(function injectManifest() {
  const isAdmin = window.location.pathname.startsWith("/admin");
  const manifestHref = isAdmin ? "/manifest-admin.json" : "/manifest.json";
  const appTitle = isAdmin ? "Delon Admin" : "Delon Barber";

  let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifestLink) {
    manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    document.head.appendChild(manifestLink);
  }
  manifestLink.setAttribute("href", manifestHref);

  let appleTitle = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-title"]'
  );
  if (!appleTitle) {
    appleTitle = document.createElement("meta");
    appleTitle.name = "apple-mobile-web-app-title";
    document.head.appendChild(appleTitle);
  }
  appleTitle.setAttribute("content", appTitle);

  if (isAdmin) document.title = "Delon Admin";
})();

createRoot(document.getElementById("root")!).render(<App />);
