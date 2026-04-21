import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Dynamically swaps the PWA manifest and iOS Apple Web App meta tags
 * based on whether the user is inside the admin area or the client area.
 * This way, "Add to Home Screen" creates a separate icon for /admin
 * (opens at /admin/login) versus the client app (opens at /).
 */
export function DynamicManifest() {
  const location = useLocation();

  useEffect(() => {
    const isAdmin = location.pathname.startsWith("/admin");

    const manifestHref = isAdmin ? "/manifest-admin.json" : "/manifest.json";
    const appTitle = isAdmin ? "Delon Admin" : "Delon Barber";

    // Manifest link
    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      document.head.appendChild(manifestLink);
    }
    if (manifestLink.getAttribute("href") !== manifestHref) {
      manifestLink.setAttribute("href", manifestHref);
    }

    // iOS uses this meta to label the home-screen icon
    let appleTitle = document.querySelector<HTMLMetaElement>(
      'meta[name="apple-mobile-web-app-title"]'
    );
    if (!appleTitle) {
      appleTitle = document.createElement("meta");
      appleTitle.name = "apple-mobile-web-app-title";
      document.head.appendChild(appleTitle);
    }
    if (appleTitle.getAttribute("content") !== appTitle) {
      appleTitle.setAttribute("content", appTitle);
    }

    // Document title (helps Android too)
    if (isAdmin && !document.title.includes("Admin")) {
      document.title = "Delon Admin";
    }
  }, [location.pathname]);

  return null;
}
