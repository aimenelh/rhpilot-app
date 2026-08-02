"use client";

import { X } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { revokeInvitation } from "./inviteActions";

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  return (
    <ConfirmDialog
      trigger={
        <button
          type="button"
          aria-label="Annuler l'invitation"
          className="shrink-0 text-ink-faint hover:text-accent-rose"
        >
          <X size={16} />
        </button>
      }
      title="Annuler cette invitation ?"
      description="Le lien envoyé ne fonctionnera plus. Vous pourrez toujours réinviter cette adresse plus tard."
      confirmLabel="Annuler l'invitation"
      onConfirm={() => revokeInvitation(invitationId)}
    />
  );
}
