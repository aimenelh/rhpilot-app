import type { Config } from "tailwindcss";

// Identité "Encre et corail" : un noir encre profond et un corail
// affirmé (brand.primary), avec une variante plus sombre pour les
// accents secondaires (brand.primary-dark). accent.teal/amber/rose ont
// un sens précis (succès/avertissement/critique) dans toute l'app.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#14151A",
          soft: "#4A4A4D",
          faint: "#8C8C90",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F7F8FA",
          border: "#E4E7EE",
        },
        brand: {
          primary: "#E8432E",
          "primary-dark": "#B8321F",
        },
        accent: {
          teal: "#14B8A6",
          amber: "#D97706",
          rose: "#E11D48",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl: "0.875rem",
      },
      boxShadow: {
        // Repos : cartes, toasts, dialogues — quasi imperceptible,
        // jamais l'ombre lourde et générique qu'on voit sur beaucoup
        // de SaaS. Ne jamais remplacer par shadow-lg/xl/2xl de
        // Tailwind pour ce rôle.
        card: "0 1px 2px rgba(20, 21, 26, 0.06), 0 1px 1px rgba(20, 21, 26, 0.04)",
        // Élevé : tout ce qui flotte au-dessus du contenu — panneaux
        // (Copilote, Assistant, visite guidée, invite d'installation),
        // menus déroulants, modales. Un seul palier pour les deux
        // rôles (comme le reste du design system, "modale" et
        // "dropdown" ne sont pas visuellement distingués chez nous).
        // Reste dans le même esprit sobre que card, juste plus
        // marqué pour signaler la superposition.
        elevated: "0 8px 24px -4px rgba(20, 21, 26, 0.12), 0 4px 8px -4px rgba(20, 21, 26, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
