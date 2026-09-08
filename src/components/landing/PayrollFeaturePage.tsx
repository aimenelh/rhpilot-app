import { PayrollFeatureEditorial, type PayrollEditorialFeature } from "./PayrollEditorialPage";

// Alias conservé pour ne pas modifier les 12 pages existantes : elles
// partagent désormais la même direction éditoriale et visuelle.
export type PayrollFeature = PayrollEditorialFeature;

export function PayrollFeaturePage({ feature }: { feature: PayrollFeature }) {
  return <PayrollFeatureEditorial feature={feature} />;
}
