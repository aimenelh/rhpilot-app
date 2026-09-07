import { PayrollFeaturePage } from "@/components/landing/PayrollFeaturePage";
import { PAYROLL_FEATURES } from "@/components/landing/payrollFeatures";

export const metadata = {
  title: "Production de la paie, RH Pilot",
  description: "Préparez, calculez, contrôlez et validez vos périodes de paie avec RH Pilot.",
};

export default function ProductionPaiePage() {
  return <PayrollFeaturePage feature={PAYROLL_FEATURES.production} />;
}
