import { PayrollFeaturePage } from "@/components/landing/PayrollFeaturePage";
import { PAYROLL_FEATURES } from "@/components/landing/payrollFeatures";

export const metadata = {
  title: "Arrêts de travail, RH Pilot",
  description: "Structurez le suivi des arrêts de travail et leur prise en compte dans la paie avec RH Pilot.",
};

export default function ArretsTravailPage() {
  return <PayrollFeaturePage feature={PAYROLL_FEATURES.arrets} />;
}
