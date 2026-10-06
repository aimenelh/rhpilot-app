// Toutes les pages « Gestion de la paie » : la paie est en accès anticipé, jamais
// présentée comme disponible pour tous (pratique commerciale trompeuse sinon).
export default function GestionPaieLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-ink px-4 py-2.5 text-center text-sm text-white">
        La paie de RH Pilot est en <strong className="font-semibold">accès anticipé</strong>, ouverte sur invitation. Les
        calculs de ces pages sont des démonstrations du moteur.{" "}
        <a href="mailto:contact@rhpilot.fr?subject=Acc%C3%A8s%20anticip%C3%A9%20%C3%A0%20la%20paie" className="font-semibold underline underline-offset-2">
          Demander un accès
        </a>
      </div>
      {children}
    </>
  );
}
