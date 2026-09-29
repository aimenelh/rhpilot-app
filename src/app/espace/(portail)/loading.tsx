// Chargement de l'espace salarié : squelette léger plutôt qu'un écran figé.
export default function EspaceLoading() {
  return (
    <div className="space-y-3 px-5 py-6" aria-busy="true" aria-label="Chargement">
      <div className="skeleton-block h-7 w-40 rounded-lg" />
      <div className="skeleton-block h-20 rounded-2xl" />
      <div className="skeleton-block h-20 rounded-2xl" />
      <div className="skeleton-block h-20 rounded-2xl" />
    </div>
  );
}
