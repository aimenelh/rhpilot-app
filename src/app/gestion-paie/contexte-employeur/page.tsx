import { PayrollCapabilityPage } from "@/components/landing/PayrollCapabilityPage";
import { PAYROLL_CAPABILITIES } from "@/components/landing/payrollCapabilities";

export const metadata = { title: "Contexte employeur, RH Pilot", description: "Forme juridique, date de création, localisation de paie et taux AT/MP intégrés au contexte du calcul social." };
export default function ContexteEmployeurPage() { return <PayrollCapabilityPage feature={PAYROLL_CAPABILITIES.employer} />; }
