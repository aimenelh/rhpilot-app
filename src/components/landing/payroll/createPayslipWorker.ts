// Point unique de création du worker, pour que le bundler (webpack de Next)
// le découpe dans son propre fichier chargé à la demande.
export function createPayslipWorker(): Worker {
  return new Worker(new URL("./payslip.worker.ts", import.meta.url));
}
