import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registra o service worker (necessário no Android/Chrome pra oferecer "Instalar app").
// No iOS/Safari isso não habilita instalação (a Apple usa as meta tags do index.html pra isso),
// mas não atrapalha e ainda garante cache básico do app shell.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}
