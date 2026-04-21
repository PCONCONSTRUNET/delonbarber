import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA manifest and title setup is now handled via inline script in index.html 
// to ensure it runs before the browser captures the "Add to Home Screen" event.


createRoot(document.getElementById("root")!).render(<App />);
