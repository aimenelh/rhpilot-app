import type { FC } from "react";
import { S1Opening } from "./scenes/S1Opening";
import { S2Knot } from "./scenes/S2Knot";
import { S3Hiring } from "./scenes/S3Hiring";
import { S4Reminders } from "./scenes/S4Reminders";
import { S5Copilot } from "./scenes/S5Copilot";
import { S6Payroll } from "./scenes/S6Payroll";
import { S7Employee } from "./scenes/S7Employee";
import { S8Exit } from "./scenes/S8Exit";
import { S9Finale } from "./scenes/S9Finale";

/** `day` : jour du mois atteint pendant la scène (0 = lundi 28 septembre). */
export type SceneDef = { id: string; seconds: number; Component: FC; date?: string; day?: number };

// Ordre et durée des scènes. La caméra glisse de l'une à l'autre le long du fil.
export const SCENES: SceneDef[] = [
  { id: "ouverture", seconds: 6, Component: S1Opening },
  { id: "noeud", seconds: 8, Component: S2Knot },
  { id: "embauche", seconds: 12, Component: S3Hiring, date: "Lundi 28 septembre", day: 1 },
  { id: "rappels", seconds: 6, Component: S4Reminders, date: "Vendredi 2 octobre", day: 5 },
  { id: "copilote", seconds: 10, Component: S5Copilot, date: "Lundi 12 octobre", day: 15 },
  { id: "paie", seconds: 18, Component: S6Payroll, date: "Lundi 26 octobre", day: 29 },
  { id: "espace", seconds: 10, Component: S7Employee, date: "Mercredi 28 octobre", day: 31 },
  { id: "sortie", seconds: 8, Component: S8Exit, date: "Vendredi 30 octobre", day: 33 },
  { id: "final", seconds: 12, Component: S9Finale },
];

/** Durée du glissement de caméra entre deux scènes (en images). */
export const PAN = 26;
