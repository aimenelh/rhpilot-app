import { authFormAppearance } from "@/components/auth/authAppearance";

// Même habillage que l'accès RH, mais les titres de Clerk restent visibles :
// sur l'espace salarié, pas d'écran d'accompagnement pour les remplacer à
// chaque étape (code reçu par e-mail, mot de passe oublié…).
export const espaceAuthAppearance = {
  ...authFormAppearance,
  elements: {
    ...authFormAppearance.elements,
    header: "!flex !items-start !text-left",
    headerTitle: "!block !text-[20px] !font-semibold !text-[#20211f]",
    headerSubtitle: "!block !text-[14px] !text-[#615e58]",
  },
};
