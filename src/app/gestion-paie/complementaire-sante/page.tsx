import { PayrollCapabilityPage } from "@/components/landing/PayrollCapabilityPage";
import { PAYROLL_CAPABILITIES } from "@/components/landing/payrollCapabilities";

export const metadata = { title: "Complémentaire santé, RH Pilot", description: "Montant mensuel et part employeur de la complémentaire santé intégrés au contexte du calcul social." };
export default function ComplementaireSantePage() { return <PayrollCapabilityPage feature={PAYROLL_CAPABILITIES.health} />; }
