// Avancement d'un parcours, dessiné comme le fil de la marque : la partie faite
// est un fil corail plein, ce qui reste un fil en pointillés, et un point marque
// l'étape où l'on en est. Parcours terminé : le point se remplit, le fil est noué.
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100);
  const done = max > 0 && value >= max;
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 px-[5px]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={`${value} étape${value > 1 ? "s" : ""} faite${value > 1 ? "s" : ""} sur ${max}`}
      >
        <div className="relative h-3">
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[#D7D9DF]" />
          <span
            className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-brand-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
          <span
            className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-primary transition-[left] duration-500 ${
              done ? "bg-brand-primary" : "bg-white"
            }`}
            style={{ left: `${percent}%` }}
          />
        </div>
      </div>
      <span className="shrink-0 text-xs font-medium text-ink-soft">
        {value}/{max}
      </span>
    </div>
  );
}
