import type { Config } from "tailwindcss";

// Identité "Encre et corail" — abandon volontaire du dégradé
// bleu→violet (devenu le signe distinctif des sites générés par IA et
// des templates SaaS génériques) au profit d'un noir encre profond et
// d'un unique corail affirmé. Les noms de tokens (brand.blue,
// brand.violet, brand-gradient) sont conservés tels quels pour ne pas
// casser les centaines d'usages existants dans le code — seules leurs
// valeurs changent. accent.teal/amber/rose restent intouchés : ils ont
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
          blue: "#E8432E",
          violet: "#B8321F",
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
        // Plus un vrai dégradé bicolore — un aplat, pour que chaque
        // usage existant de bg-brand-gradient rende plat désormais,
        // sans avoir à retoucher les fichiers qui l'utilisent.
        "brand-gradient": "linear-gradient(135deg, #E8432E 0%, #E8432E 100%)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 21, 26, 0.06), 0 1px 1px rgba(20, 21, 26, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
