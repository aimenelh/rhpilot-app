"use client";

import { useEffect } from "react";

// Dernier recours, si la mise en page racine elle-même échoue : aucun composant ni style
// de l'application ne peut être supposé chargé, d'où les styles en ligne.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "-apple-system, Segoe UI, Roboto, Arial, sans-serif", background: "#F7F8FA", color: "#14151A" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>RH Pilot est momentanément indisponible</h1>
          <p style={{ maxWidth: 420, color: "#4A4A4D", lineHeight: 1.6 }}>
            Une erreur est survenue. Réessayez dans un instant ; si le problème revient, écrivez à contact@rhpilot.fr
            {error.digest ? ` en indiquant le code ${error.digest}` : ""}.
          </p>
          <button type="button" onClick={reset} style={{ marginTop: 12, border: 0, borderRadius: 8, background: "#E8432E", color: "#fff", padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
