import { PayrollFeaturePage } from "@/components/landing/PayrollFeaturePage";
import { PAYROLL_FEATURES } from "@/components/landing/payrollFeatures";

export const metadata = {
  title: "Congés et absences, RH Pilot",
  description: "Reliez la gestion des congés et absences à la préparation de la paie avec RH Pilot.",
};

export default function CongesAbsencesPage() {
  return <PayrollFeaturePage feature={PAYROLL_FEATURES.absences} />;
}
