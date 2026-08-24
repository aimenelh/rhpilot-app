import Image from "next/image";

export type MascotPose =
  | "dashboard"
  | "urgent"
  | "deadline"
  | "calm"
  | "medical"
  | "hire"
  | "newhireHandshake"
  | "missingDocument"
  | "completedJourney"
  | "search"
  | "createJourney"
  | "reminder"
  | "copilot";

// Chaque pose correspond à un fichier dans public/illustrations/mascot/.
// "deadline" (elle regarde sa montre) n'a pas encore d'export — dépose
// deadline.png au même endroit et décommente la ligne pour l'activer,
// aucune autre modification de code nécessaire.
const AVAILABLE_POSES: Partial<Record<MascotPose, string>> = {
  dashboard: "/illustrations/mascot/dashboard.png",
  urgent: "/illustrations/mascot/urgent.png",
  // deadline: "/illustrations/mascot/deadline.png",
  calm: "/illustrations/mascot/calm.png",
  medical: "/illustrations/mascot/medical.png",
  hire: "/illustrations/mascot/hire.png",
  newhireHandshake: "/illustrations/mascot/newhire-handshake.png",
  missingDocument: "/illustrations/mascot/missing-document.png",
  completedJourney: "/illustrations/mascot/completed-journey.png",
  search: "/illustrations/mascot/search.png",
  createJourney: "/illustrations/mascot/create-journey.png",
  reminder: "/illustrations/mascot/reminder.png",
  copilot: "/illustrations/mascot/copilot.png",
};

// Permet d'éviter d'afficher deux fois la même image (retombée sur
// "dashboard") quand une pose distincte n'a pas encore son asset.
export function isPoseAvailable(pose: MascotPose): boolean {
  return pose in AVAILABLE_POSES;
}

export function Mascot({
  pose,
  className,
}: {
  pose: MascotPose;
  className?: string;
}) {
  // Tant qu'une pose n'a pas son asset, on retombe sur "dashboard"
  // plutôt que d'afficher une image cassée.
  const src = AVAILABLE_POSES[pose] ?? AVAILABLE_POSES.dashboard;
  if (!src) return null;

  return (
    <Image
      src={src}
      alt=""
      width={370}
      height={167}
      className={className}
      priority
    />
  );
}
