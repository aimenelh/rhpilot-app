"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Paperclip } from "lucide-react";
import {
  uploadTaskAttachment,
  type TaskAttachmentActionState,
} from "../attachmentActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-md border border-surface-border bg-white px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-50"
    >
      {pending ? "Envoi…" : "Ajouter"}
    </button>
  );
}

export function TaskAttachmentUploadForm({ taskId }: { taskId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<TaskAttachmentActionState, FormData>(
    uploadTaskAttachment.bind(null, taskId),
    undefined,
  );

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-2 rounded-lg border border-dashed border-surface-border bg-surface-subtle/35 p-2.5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-xs text-ink-soft">
          <Paperclip size={13} className="shrink-0 text-ink-faint" />
          <input
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            required
            className="min-w-0 flex-1 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-white file:px-2 file:py-1 file:text-xs file:font-medium file:text-ink-soft"
          />
        </label>
        <SubmitButton />
      </div>
      <p className="mt-1.5 text-[10px] text-ink-faint">PDF, JPG ou PNG · 4 Mo max</p>
      {state?.error && (
        <p role="alert" className="mt-1.5 text-xs text-accent-rose">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="mt-1.5 text-xs text-accent-teal">
          {state.success}
        </p>
      )}
    </form>
  );
}
