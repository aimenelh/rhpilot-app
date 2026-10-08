import { ASSISTANT_IMAGES } from "./assistant";
import s from "./CopilotAvatar.module.css";

/**
 * L'assistante en buste, sans fond : elle respire, cligne des yeux, sourit et
 * penche la tête au survol (du bouton parent ou d'elle-même), et parle quand
 * `talking` est vrai. Les états sont des calques superposés, sans JavaScript.
 */
export function CopilotAvatar({ width = 72, talking = false, className }: { width?: number; talking?: boolean; className?: string }) {
  return (
    <span
      className={`${s.avatar} ${className ?? ""}`}
      style={{ ["--w" as string]: `${width}px` }}
      data-talking={talking ? "true" : undefined}
      aria-hidden="true"
    >
      <span className={s.lift}>
        <span className={s.sway}>
          <span className={s.flip}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSISTANT_IMAGES.base} alt="" width={160} height={208} className={s.base} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSISTANT_IMAGES.happy} alt="" width={160} height={208} className={s.happy} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSISTANT_IMAGES.talk} alt="" width={160} height={208} className={s.talk} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ASSISTANT_IMAGES.blink} alt="" width={160} height={208} className={s.blink} />
          </span>
        </span>
      </span>
    </span>
  );
}

/** Petite tête (en-tête du panneau, bulles de réponse). */
export function CopilotHead({ size = 28, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ASSISTANT_IMAGES.head}
      alt=""
      width={size}
      height={Math.round((size * 156) / 118)}
      className={`${s.head} ${className ?? ""}`}
      style={{ transform: "scaleX(-1)" }}
    />
  );
}
