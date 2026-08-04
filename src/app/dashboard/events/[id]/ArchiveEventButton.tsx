"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { archiveEmployeeEvent } from "../actions";

export function ArchiveEventButton({ eventId }: { eventId: string }) {
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-accent-rose"
        >
          <Trash2 size={14} />
          Archiver ce parcours
        </button>
      }
      title="Archiver ce parcours ?"
      description="Utile en cas de doublon créé par erreur. Ses tâches ne seront jamais supprimées définitivement, seulement retirées des listes actives."
      confirmLabel="Archiver le parcours"
      onConfirm={() => archiveEmployeeEvent(eventId)}
    />
  );
}
