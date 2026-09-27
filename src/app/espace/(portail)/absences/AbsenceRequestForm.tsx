"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Paperclip } from "lucide-react";
import { EMPLOYEE_REQUEST_TYPES, type EmployeeRequestType } from "@/lib/employee-space/labels";
import { SubmitButton } from "@/components/espace/SubmitButton";
import { requestAbsence, type EspaceActionState } from "../../actions";

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Une photo de téléphone dépasse souvent 4 Mo : on la réduit dans le
 * navigateur (2000 px de côté, JPEG) avant l'envoi. Un PDF part tel quel.
 */
async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png)$/.test(file.type) || file.size <= 1_500_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.(png|jpe?g)$/i, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const field = "mt-1.5 block h-12 w-full rounded-xl border border-surface-border bg-white px-3.5 text-[16px] text-ink outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10";

export function AbsenceRequestForm({ today }: { today: string }) {
  const [state, formAction] = useFormState<EspaceActionState, FormData>(requestAbsence, undefined);
  const [type, setType] = useState<EmployeeRequestType>("PAID_LEAVE");
  const [start, setStart] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const onFile = async (input: HTMLInputElement) => {
    const original = input.files?.[0];
    setFileError(null);
    if (!original) { setFileName(null); return; }
    const file = await shrinkImage(original);
    if (file !== original) {
      try {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
      } catch {
        // Navigateur trop ancien pour remplacer le fichier : l'original part tel quel.
      }
    }
    const sent = input.files?.[0] ?? original;
    if (sent.size > MAX_BYTES) { setFileError("Le fichier dépasse 4 Mo : prenez une photo moins lourde ou envoyez un PDF."); input.value = ""; setFileName(null); return; }
    setFileName(sent.name);
  };
  const formRef = useRef<HTMLFormElement>(null);
  const definition = EMPLOYEE_REQUEST_TYPES.find((entry) => entry.value === type)!;

  useEffect(() => {
    if (state?.success) { formRef.current?.reset(); setStart(""); setFileName(null); setFileError(null); setType("PAID_LEAVE"); }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="rounded-2xl border border-surface-border bg-white p-4 sm:p-5">
      <fieldset>
        <legend className="text-sm font-semibold text-ink">Type</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EMPLOYEE_REQUEST_TYPES.map((entry) => (
            <label key={entry.value} className={`flex min-h-[48px] cursor-pointer items-center rounded-xl border px-3 text-[14px] font-semibold transition ${type === entry.value ? "border-brand-primary bg-brand-primary/5 text-ink" : "border-surface-border text-ink-soft"}`}>
              <input type="radio" name="type" value={entry.value} checked={type === entry.value} onChange={() => setType(entry.value)} className="sr-only" />
              {entry.label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[13px] leading-5 text-ink-faint">{definition.hint}</p>
      </fieldset>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold text-ink">
          Du
          <input type="date" name="startDate" required min={type === "SICK_LEAVE" ? undefined : today} value={start} onChange={(event) => setStart(event.target.value)} className={field} />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Au (inclus)
          <input type="date" name="endDate" required min={start || undefined} className={field} />
        </label>
      </div>

      {definition.justification !== "none" ? (
        <label className="mt-4 flex min-h-[48px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-surface-border px-3.5 text-[14px] text-ink-soft hover:bg-surface-subtle/60">
          <Paperclip size={16} className="shrink-0" />
          <span className="truncate">{fileName ?? (definition.justification === "required" ? "Joindre l'avis d'arrêt (photo ou PDF)" : "Joindre un justificatif (facultatif)")}</span>
          <input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required={definition.justification === "required"} onChange={(event) => { void onFile(event.currentTarget); }} className="sr-only" />
        </label>
      ) : null}
      {fileError ? <p role="alert" className="mt-2 text-sm text-accent-rose">{fileError}</p> : null}

      <label className="mt-4 block text-sm font-semibold text-ink">
        Message <span className="font-normal text-ink-faint">(facultatif)</span>
        <textarea name="notes" rows={2} maxLength={500} className="mt-1.5 block w-full rounded-xl border border-surface-border bg-white px-3.5 py-3 text-[16px] text-ink outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10" />
      </label>

      <SubmitButton pendingLabel="Envoi…" className="mt-5 w-full">{type === "SICK_LEAVE" ? "Déclarer mon arrêt" : "Envoyer la demande"}</SubmitButton>
      {state?.error ? <p role="alert" className="mt-3 text-sm text-accent-rose">{state.error}</p> : null}
      {state?.success ? <p role="status" className="mt-3 text-sm text-accent-teal">{state.success}</p> : null}
    </form>
  );
}
