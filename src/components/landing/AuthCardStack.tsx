import { Stethoscope, Send } from "lucide-react";

// Effet de profondeur construit avec de simples transformations CSS
// (rotation + décalage + ombre), pas une librairie d'animation — pour
// rester fiable sans jamais pouvoir vérifier le rendu visuellement
// avant livraison. Pas de suivi de la souris (ajoute de la
// complexité JS pour un gain incertain sans itération visuelle réelle).
export function AuthCardStack({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative" style={{ perspective: "1200px" }}>
      {/* Carte arrière — visite médicale, nettement décalée et réduite */}
      <div
        className="absolute w-40 rounded-xl border border-surface-border bg-white px-3.5 py-3 auth-float-slow"
        style={{
          top: "-56px",
          left: "-72px",
          transform: "scale(0.8) rotate(-9deg)",
          transformOrigin: "bottom right",
          boxShadow: "0 24px 48px -16px rgba(15, 27, 61, 0.35)",
          zIndex: 1,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
            <Stethoscope size={13} />
          </span>
          <div>
            <p className="text-xs font-semibold text-ink">Visite médicale</p>
            <p className="text-[11px] text-ink-faint">Dans 3 jours</p>
          </div>
        </div>
      </div>

      {/* Carte intermédiaire — notification, décalée à droite */}
      <div
        className="absolute w-36 rounded-xl border border-surface-border bg-white px-3 py-2.5 auth-float-slower"
        style={{
          top: "-30px",
          right: "-56px",
          transform: "scale(0.75) rotate(8deg)",
          transformOrigin: "bottom left",
          boxShadow: "0 20px 40px -14px rgba(15, 27, 61, 0.3)",
          zIndex: 2,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-amber/10 text-accent-amber">
            <Send size={11} />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-ink">Rappel envoyé</p>
            <p className="text-[10px] text-ink-faint">Il y a 2 min</p>
          </div>
        </div>
      </div>

      {/* Carte principale — légèrement réduite pour laisser respirer les deux autres */}
      <div
        className="relative"
        style={{ zIndex: 3, transform: "scale(0.88)", transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}
