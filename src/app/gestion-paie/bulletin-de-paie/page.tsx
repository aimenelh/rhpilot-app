import { PayrollCapabilityPage } from "@/components/landing/PayrollCapabilityPage";
import { PAYROLL_CAPABILITIES } from "@/components/landing/payrollCapabilities";

export const metadata = { title: "Bulletin de paie, RH Pilot", description: "Contrôles préalables à la génération des bulletins à partir d’une période de paie verrouillée." };
export default function BulletinPaiePage() { return <PayrollCapabilityPage feature={PAYROLL_CAPABILITIES.payslip} />; }
