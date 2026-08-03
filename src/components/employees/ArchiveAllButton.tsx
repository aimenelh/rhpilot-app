"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";

export function ArchiveAllButton({
  action,
  count,
}: {
  action: () => void;
  count: number;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="secondary" type="button">
          Archiver tous les salariés
        </Button>
      }
      title={`Archiver les ${count} salarié${count > 1 ? "s" : ""} actif${count > 1 ? "s" : ""} ?`}
      description="Ils disparaîtront de toutes les listes actives (tableau de bord, suggestions, parcours), sans rien supprimer définitivement : vous pourrez les réactiver individuellement depuis l'onglet Archivés."
      confirmLabel="Archiver tout"
      onConfirm={action}
    />
  );
}
