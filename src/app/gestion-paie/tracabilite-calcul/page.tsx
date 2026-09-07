import { PayrollCapabilityPage } from "@/components/landing/PayrollCapabilityPage";
import { PAYROLL_CAPABILITIES } from "@/components/landing/payrollCapabilities";

export const metadata = { title: "Traçabilité du calcul de paie, RH Pilot", description: "Modèle, règles, données et résultats conservés avec chaque calcul de paie." };
export default function TracabiliteCalculPage() { return <PayrollCapabilityPage feature={PAYROLL_CAPABILITIES.traceability} />; }
