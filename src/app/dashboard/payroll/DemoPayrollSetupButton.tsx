"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

export function DemoPayrollSetupButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="secondary" disabled={pending}>
      {pending ? "Préparation..." : "Préparer le jeu de paie démo"}
    </Button>
  );
}
