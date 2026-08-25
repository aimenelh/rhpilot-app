import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { EnteringAnimation } from "./EnteringAnimation";

// Étape transitoire entre la connexion et le dashboard, uniquement
// pour afficher l'animation "Allez... démarre !" le temps que la
// session s'installe. Protégée comme n'importe quelle page du
// dashboard : quelqu'un qui arriverait ici sans être connecté (lien
// mis en favori, etc.) est renvoyé vers la connexion plutôt que de
// rester face à une animation qui ne mènera jamais nulle part.
export default function EnteringPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  return <EnteringAnimation />;
}
