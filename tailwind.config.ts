import type { Config } from "tailwindcss";

// Palette dérivée du logo RH Pilot : marine (structure/texte), dégradé
// bleu→violet (action principale, repris du "P" du logo), sarcelle
// (accent secondaire/succès, repris de l'éclat du logo). Utilisée avec
// parcimonie — pas de couleur vive sur autre chose que les actions
// principales, pour garder un ton professionnel adapté à un outil RH.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F1B3D",
          soft: "#3D4A6B",
          faint: "#8A93AB",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F7F8FA",
          border: "#E4E7EE",
        },
        brand: {
          blue: "#2F6FED",
          violet: "#7C5CFC",
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
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #2F6FED 0%, #7C5CFC 100%)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 27, 61, 0.06), 0 1px 1px rgba(15, 27, 61, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
