import { PayrollCapabilityEditorial, type PayrollEditorialCapability } from "./PayrollEditorialPage";

// Alias conservé pour les pages existantes : les sujets conventionnels
// utilisent le même gabarit éditorial que les autres sous-pages paie.
export type PayrollCapability = PayrollEditorialCapability;

export function PayrollCapabilityPage({ feature }: { feature: PayrollCapability }) {
  return <PayrollCapabilityEditorial feature={feature} />;
}
