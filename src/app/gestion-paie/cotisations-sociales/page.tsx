import { PayrollCapabilityPage } from "@/components/landing/PayrollCapabilityPage";
import { PAYROLL_CAPABILITIES } from "@/components/landing/payrollCapabilities";

export const metadata = { title: "Cotisations sociales, RH Pilot", description: "Détail des cotisations salariales et patronales issues du calcul social RH Pilot." };
export default function CotisationsSocialesPage() { return <PayrollCapabilityPage feature={PAYROLL_CAPABILITIES.contributions} />; }
