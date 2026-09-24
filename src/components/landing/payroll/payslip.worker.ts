// Recalcule le bulletin de démonstration hors du fil principal : le moteur social
// met quelques centaines de millisecondes à évaluer un salarié.
import { computePayslipDemo, type DemoInput } from "./payslipDemo";

type WorkerScope = {
  onmessage: ((event: MessageEvent<{ id: number; input: DemoInput }>) => void) | null;
  postMessage: (message: unknown) => void;
};

const scope = self as unknown as WorkerScope;
scope.onmessage = (event) => {
  const { id, input } = event.data;
  try {
    scope.postMessage({ id, result: computePayslipDemo(input) });
  } catch (error) {
    scope.postMessage({ id, error: error instanceof Error ? error.message : "Calcul impossible." });
  }
};
