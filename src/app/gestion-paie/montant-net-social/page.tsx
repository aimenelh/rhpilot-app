import { PayrollCapabilityPage } from "@/components/landing/PayrollCapabilityPage";
import { PAYROLL_CAPABILITIES } from "@/components/landing/payrollCapabilities";

export const metadata = { title: "Montant net social, RH Pilot", description: "Montant net social calculé à partir de la règle Publicodes dédiée et conservé dans le résultat de paie." };
export default function MontantNetSocialPage() { return <PayrollCapabilityPage feature={PAYROLL_CAPABILITIES.netSocial} />; }
