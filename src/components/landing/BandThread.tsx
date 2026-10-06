import s from "./BandThread.module.css";

/** Fil blanc qui traverse le bas des en-têtes corail, comme sur la page d'accueil. */
export function BandThread() {
  return (
    <svg className={s.thread} viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
      <path
        pathLength={1}
        d="M-40 92 C 220 70 430 112 680 98 C 880 86 1000 62 1078 70 C 1146 77 1160 108 1126 112 C 1090 116 1080 84 1124 76 C 1210 62 1310 84 1480 58"
      />
    </svg>
  );
}
