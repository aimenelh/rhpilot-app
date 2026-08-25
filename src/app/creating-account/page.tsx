import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CreatingAccountAnimation } from "./CreatingAccountAnimation";

// Étape transitoire entre l'inscription et le dashboard, uniquement
// pour afficher la petite histoire du document qui s'échappe le temps
// que le compte soit prêt. Protégée comme /entering : quelqu'un qui
// arriverait ici sans être connecté est renvoyé vers l'inscription.
export default function CreatingAccountPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-up");
  return <CreatingAccountAnimation />;
}
