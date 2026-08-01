import { Stethoscope, Send } from "lucide-react";

// Effet de profondeur construit avec de simples transformations CSS
// (rotation + décalage + ombre), pas une librairie d'animation — pour
// rester fiable sans jamais pouvoir vérifier le rendu visuellement
// avant livraison. Pas de suivi de la souris (ajoute de la
// complexité JS pour un gain incertain sans itération visuelle réelle).
export function AuthCardStack({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative"
      style={{ perspective: "1200px" }}
      aria-hidden={false}
    >
      {/* Carte arrière — visite médicale */}
      <div
        className="absolute w-48 rounded-xl border border-surface-border bg-white px-3.5 py-3 shadow-lg auth-float-slow"
        style={{
          top: "-28px",
          left: "-24px",
          transform: "rotate(-8deg)",
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

      {/* Carte intermédiaire — notification */}
      <div
        className="absolute w-44 rounded-xl border border-surface-border bg-white px-3.5 py-3 shadow-lg auth-float-slower"
        style={{
          top: "-14px",
          right: "-20px",
          transform: "rotate(6deg)",
          zIndex: 2,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-amber/10 text-accent-amber">
            <Send size={12} />
          </span>
          <div>
            <p className="text-xs font-semibold text-ink">Rappel envoyé</p>
            <p className="text-[11px] text-ink-faint">Il y a 2 min</p>
          </div>
        </div>
      </div>

      {/* Carte principale — au premier plan, sans rotation */}
      <div className="relative" style={{ zIndex: 3 }}>
        {children}
      </div>
    </div>
  );
}
