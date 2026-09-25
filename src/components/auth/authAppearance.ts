// Habillage du formulaire Clerk sur les pages d'accès (inscription, connexion).
//
// Clerk additionne les classes de l'apparence globale (src/app/layout.tsx) et
// celles-ci : une propriété présente des deux côtés (fond du bouton, taille du
// texte, couleur des liens, bordure de la carte) est tranchée par l'ordre du CSS
// de Tailwind, pas par l'ordre d'écriture. Le « ! » force donc ces valeurs-là,
// et passe aussi devant les styles internes de Clerk (hauteur maximale des
// champs, reflet dégradé du bouton, bordure dessinée en ombre).
export const authFormAppearance = {
  elements: {
    rootBox: "!w-full",
    cardBox: "!w-full !max-w-none !shadow-none !border-0 !rounded-none !bg-transparent",
    card: "!w-full !shadow-none !border-0 !rounded-none !bg-transparent !p-0 !gap-5",
    // Titre et sous-titre de Clerk masqués (la page affiche les siens), mais
    // l'en-tête reste visible quand il porte l'adresse et son bouton « modifier ».
    header: "hidden has-[.cl-identityPreview]:!flex",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    logoBox: "hidden",
    main: "!gap-5",
    socialButtonsBlockButton: "!h-12 !rounded-xl !border !border-[#e3ddd3] !bg-white !shadow-none hover:!bg-[#fbf8f3]",
    socialButtonsBlockButtonText: "!text-[15px] !font-semibold !text-[#20211f]",
    dividerLine: "!bg-[#eee8df]",
    dividerText: "!text-[13px] !text-[#8a8178]",
    formFieldLabel: "!text-[13px] !font-semibold !text-[#615e58]",
    formFieldAction: "!text-[13px] !font-semibold !text-[#b73927] hover:!text-[#8f2c1e]",
    formFieldInput:
      "!h-12 !max-h-none !rounded-xl !border !border-[#d9d0c5] !bg-white !px-4 !text-[15px] !shadow-none placeholder:!text-[#b5aca1] focus:!border-[#e8432e] focus:!ring-4 focus:!ring-[rgba(232,67,46,0.12)] focus-visible:!outline-none",
    formFieldInputShowPasswordButton: "!text-[#8a8178] hover:!text-[#20211f]",
    formButtonPrimary:
      "!h-12 !rounded-xl !bg-[#20211f] !bg-none !text-[15px] !font-semibold !normal-case !shadow-none after:!bg-none hover:!bg-black",
    identityPreview: "!w-full !justify-between !rounded-xl !border !border-[#e3ddd3] !bg-[#fbfaf7] !px-4 !py-2.5",
    identityPreviewText: "!text-[14px] !text-[#20211f]",
    identityPreviewEditButton: "!text-[#b73927]",
    // Les cases du code sont des blocs (pas des champs) : l'état actif passe par data-focus-within.
    otpCodeFieldInput:
      "!h-14 !max-h-none !w-12 !rounded-xl !border !border-[#d9d0c5] !bg-white !text-xl !font-semibold !shadow-none data-[focus-within=true]:!border-[#e8432e] data-[focus-within=true]:!ring-4 data-[focus-within=true]:!ring-[rgba(232,67,46,0.12)]",
    formResendCodeLink: "!text-[#b73927]",
    alternativeMethodsBlockButton: "!h-12 !rounded-xl !border !border-[#e3ddd3] !shadow-none",
    backLink: "!text-[#615e58]",
    footer: "!bg-transparent !bg-none !p-0 !pt-2",
    footerAction: "!flex-wrap !justify-center !px-0 !py-3",
    footerActionText: "!text-[13.5px] !text-[#615e58]",
    footerActionLink: "!text-[13.5px] !font-semibold !text-[#b73927] hover:!text-[#8f2c1e]",
  },
};
