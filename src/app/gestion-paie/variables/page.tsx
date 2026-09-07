import { PayrollFeaturePage } from "@/components/landing/PayrollFeaturePage";
import { PAYROLL_FEATURES } from "@/components/landing/payrollFeatures";

export const metadata = {
  title: "Variables de paie, RH Pilot",
  description: "Réunissez et contrôlez les variables de paie avant le calcul avec RH Pilot.",
};

export default function VariablesPaiePage() {
  return <PayrollFeaturePage feature={PAYROLL_FEATURES.variables} />;
}
