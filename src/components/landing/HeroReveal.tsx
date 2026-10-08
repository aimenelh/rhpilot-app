"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { Bell, CalendarDays, FileText, LayoutGrid, Leaf, Route, Search, Settings, Sparkles, Users } from "lucide-react";
import { Logomark } from "@/components/Brand";
import { CopilotHead } from "@/components/copilote/CopilotAvatar";
import { ASSISTANT_NAME } from "@/components/copilote/assistant";
import s from "./HeroReveal.module.css";

// Haut de page : un aplat corail, « Gardez le fil. » souligné par le fil blanc,
// et le logiciel qui se redresse au défilement. L'écran est une reproduction fidèle du tableau de bord (mêmes
// rubriques, mêmes notions), avec des données d'exemple d'une boulangerie.
// Chorégraphie : une seule séquence au chargement (calée sur --intro-offset de
// BrandIntro), puis un seul effet lié au défilement (variable --p, de 0 à 1).

const NAV = [
  { label: "Tableau de bord", icon: LayoutGrid, active: true },
  { label: "Salariés", icon: Users },
  { label: "Parcours RH", icon: Route },
  { label: "Calendrier", icon: CalendarDays },
  { label: "Congés & absences", icon: Leaf },
  { label: "Documents", icon: FileText },
];
const NAV_MORE = [
  { label: "Copilote RH", icon: Sparkles },
  { label: "Configuration", icon: Settings },
];

const KPIS = [
  { value: 8, label: "Salariés" },
  { value: 5, label: "Parcours actifs" },
  { value: 3, after: 2, label: "Échéances cette semaine" },
  { value: 96, suffix: " %", label: "Parcours à jour" },
];

const TASKS = [
  { what: "Déclarer la DPAE", who: "Léa Martin", when: "Aujourd’hui", done: true },
  { what: "Préparer le poste de travail", who: "Léa Martin", when: "4 oct." },
  { what: "Entretien de fin d’essai", who: "Karim Belhaj", when: "16 oct." },
  { what: "Visite médicale", who: "Tom Girard", when: "20 oct." },
];

const PLAN = [
  { what: "Contrat préparé", when: "25 sept.", state: "done" },
  { what: "DPAE déclarée", when: "2 oct.", state: "turn" },
  { what: "Poste de travail", when: "4 oct.", state: "next" },
  { what: "Accueil de Léa", when: "5 oct.", state: "todo" },
  { what: "Visite médicale", when: "20 oct.", state: "todo" },
];

export function HeroReveal() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const thread = useRef<SVGSVGElement>(null);
  const fil = useRef<HTMLSpanElement>(null);

  // Mise à l'échelle de l'écran (dessiné à 1160 px de large) et défilement.
  useEffect(() => {
    const hero = root.current;
    const box = stage.current;
    if (!hero || !box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Le fil passe sous « Gardez le fil. », fait sa boucle après le point,
    // puis repart vers l'écran du logiciel. Tracé en pixels à partir des
    // positions réelles du titre (sans les transformations de défilement).
    const offsetIn = (el: HTMLElement) => {
      let x = 0;
      let y = 0;
      let node: HTMLElement | null = el;
      while (node && node !== hero) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      return { x, y };
    };
    const drawThread = () => {
      const svg = thread.current;
      const word = fil.current;
      if (!svg || !word) return;
      const W = hero.clientWidth;
      const H = hero.clientHeight;
      const fs = parseFloat(getComputedStyle(word).fontSize) || 100;
      const o = offsetIn(word);
      const titleLeft = offsetIn(word.parentElement as HTMLElement).x;
      // ligne de base du titre, puis le point final, que le fil entoure
      const yB = o.y + fs * 0.97;
      const yU = yB + fs * 0.1;
      // boucle juste après le point final, comme à la fin de la vidéo
      const px = o.x + word.offsetWidth + fs * 0.2;
      const py = yB - fs * 0.13;
      const r = fs * 0.16;
      const f = (n: number) => n.toFixed(1);
      const d = [
        `M -40 ${f(yU + fs * 0.18)}`,
        `C ${f(titleLeft * 0.6)} ${f(yU + fs * 0.12)} ${f(titleLeft)} ${f(yU)} ${f(titleLeft + fs)} ${f(yU - fs * 0.02)}`,
        `S ${f(px - fs * 1.4)} ${f(yU + fs * 0.05)} ${f(px - r * 1.4)} ${f(yU)}`,
        `C ${f(px)} ${f(yU)} ${f(px + r)} ${f(py + r * 0.7)} ${f(px + r)} ${f(py)}`,
        `C ${f(px + r)} ${f(py - r * 1.3)} ${f(px - r)} ${f(py - r * 1.3)} ${f(px - r)} ${f(py)}`,
        `C ${f(px - r)} ${f(py + r * 1.25)} ${f(px + r * 1.6)} ${f(yU + r * 0.15)} ${f(px + r * 3)} ${f(yU + r * 0.1)}`,
        `C ${f(px + fs * 2)} ${f(yU)} ${f(W * 0.78)} ${f(yU - fs * 0.22)} ${f(W + 40)} ${f(yU + fs * 0.04)}`,
      ].join(" ");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.querySelector("path")?.setAttribute("d", d);
      svg.dataset.ready = "true";
    };
    const fit = () => {
      const k = Math.min(1, box.clientWidth / 1160);
      hero.style.setProperty("--k", k.toFixed(4));
      drawThread();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    ro.observe(hero);
    void document.fonts?.ready.then(drawThread);

    let frame = 0;
    const update = () => {
      frame = 0;
      if (reduce.matches) {
        hero.style.setProperty("--p", "1");
        return;
      }
      const start = box.offsetTop - 140;
      const p = Math.min(1, Math.max(0, window.scrollY / Math.max(1, start)));
      hero.style.setProperty("--p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    reduce.addEventListener("change", update);

    // Compteurs : de 0 à leur valeur, une fois l'écran posé.
    const counters = Array.from(hero.querySelectorAll<HTMLElement>("[data-count]"));
    let raf = 0;
    if (!reduce.matches) {
      const offset = parseFloat(getComputedStyle(hero).getPropertyValue("--intro-offset")) || 0;
      const t0 = performance.now() + (offset + 1.15) * 1000;
      counters.forEach((el) => (el.textContent = "0"));
      const tick = (now: number) => {
        const k = Math.min(1, Math.max(0, (now - t0) / 900));
        const e = 1 - Math.pow(1 - k, 3);
        counters.forEach((el) => {
          el.textContent = String(Math.round(Number(el.dataset.count) * e));
        });
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      reduce.removeEventListener("change", update);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(raf);
      counters.forEach((el) => (el.textContent = el.dataset.count ?? ""));
    };
  }, []);

  return (
    <section ref={root} className={s.hero} aria-labelledby="hero-title">
      <svg ref={thread} className={s.thread} aria-hidden="true">
        <path pathLength={1} />
      </svg>

      <div className={s.copy}>
        <h1 id="hero-title" className={s.title}>
          <span className={s.line}>
            <span>
              Gardez le{" "}
              <span ref={fil} className={s.fil}>
                fil.
              </span>
            </span>
          </span>
        </h1>
        <div className={s.below}>
          <p className={s.lead}>
            RH Pilot est le logiciel RH des TPE et PME. Salariés, embauches, absences, documents et paie au même
            endroit : pour chaque événement, il prépare les tâches, les dates et les rappels.
          </p>
          <div className={s.actions}>
            <Link href="/sign-up" className={s.primary}>
              Créer mon espace gratuit
            </Link>
            <Link href="/services#demo" className={s.secondary}>
              Voir la démonstration
            </Link>
          </div>
        </div>
      </div>

      <div ref={stage} className={s.stage}>
        <div className={s.scaler}>
          <div className={s.tilt}>
            <div className={s.rise}>
              <div className={s.window} aria-hidden="true">
                <div className={s.appbar}>
                  <span className={s.brand}>
                    <Logomark size={22} />
                    <strong>
                      RH <em>Pilot</em>
                    </strong>
                  </span>
                  <span className={s.search}>
                    <Search size={15} strokeWidth={2} />
                    Rechercher un salarié, une tâche
                  </span>
                  <span className={s.user}>
                    <Bell size={17} strokeWidth={2} />
                    <span className={s.avatar}>NM</span>
                  </span>
                </div>
                <div className={s.app}>
                  <nav className={s.side}>
                    <span className={s.group}>Votre espace</span>
                    {NAV.map(({ label, icon: Icon, active }) => (
                      <span key={label} className={active ? s.navActive : s.nav}>
                        <Icon size={16} strokeWidth={2} />
                        {label}
                      </span>
                    ))}
                    <span className={s.group}>Pour aller plus loin</span>
                    {NAV_MORE.map(({ label, icon: Icon }) => (
                      <span key={label} className={s.nav}>
                        <Icon size={16} strokeWidth={2} />
                        {label}
                      </span>
                    ))}
                    <span className={s.org}>Boulangerie Durand</span>
                  </nav>
                  <div className={s.main}>
                    <div className={s.hello}>
                      <strong>Bonjour Nadia</strong>
                      <span>Voici ce qui arrive cette semaine.</span>
                    </div>
                    <div className={s.kpis}>
                      {KPIS.map((kpi) => (
                        <div key={kpi.label} className={s.kpi}>
                          <span className={s.kpiValue}>
                            {kpi.after !== undefined ? (
                              <span className={s.swap}>
                                <span data-count={kpi.value}>{kpi.value}</span>
                                <span>{kpi.after}</span>
                              </span>
                            ) : (
                              <span data-count={kpi.value}>{kpi.value}</span>
                            )}
                            {kpi.suffix}
                          </span>
                          <span className={s.kpiLabel}>{kpi.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className={s.cols}>
                      <div className={s.panel}>
                        <div className={s.panelHead}>Priorités de la semaine</div>
                        <ul className={s.tasks}>
                          {TASKS.map((task, i) => (
                            <li key={task.what} className={task.done ? s.taskDone : s.task} style={{ ["--i" as string]: i }}>
                              <span className={s.box}>
                                <svg viewBox="0 0 16 16" width="12" height="12">
                                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" pathLength={1} />
                                </svg>
                              </span>
                              <span className={s.taskText}>
                                <strong>{task.what}</strong>
                                <span>{task.who}</span>
                              </span>
                              <span className={s.when}>
                                {task.done ? (
                                  <span className={s.swap}>
                                    <span className={s.due}>{task.when}</span>
                                    <span className={s.ok}>Fait</span>
                                  </span>
                                ) : (
                                  task.when
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className={s.panel}>
                        <div className={s.panelHead}>Arrivée de Léa, le 5 octobre</div>
                        <ol className={s.plan}>
                          {PLAN.map((step, i) => (
                            <li key={step.what} data-state={step.state} style={{ ["--i" as string]: i }}>
                              <span className={s.knot} />
                              <strong>{step.what}</strong>
                              <span>{step.when}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`${s.float} ${s.toast}`} aria-hidden="true">
            <div className={s.floatIn}>
              <Bell size={16} strokeWidth={2.2} />
              <p>
                <strong>Rappel envoyé à Marc</strong>
                Préparer le poste de travail de Léa, pour le 4 octobre.
              </p>
            </div>
          </div>

          <div className={`${s.float} ${s.copilot}`} aria-hidden="true">
            <div className={s.floatIn}>
              <div className={s.copilotHead}>
                <CopilotHead size={40} />
                <strong>
                  {ASSISTANT_NAME}
                  <span>Assistante IA</span>
                </strong>
              </div>
              <p className={s.ask}>Qui termine sa période d’essai ce mois-ci ?</p>
              <p className={s.answer}>Karim Belhaj, le 20 octobre. Son entretien de fin d’essai est prévu le 16.</p>
            </div>
          </div>

          <div className={`${s.float} ${s.phone}`} aria-hidden="true">
            <div className={s.floatIn}>
              <div className={s.phoneFrame}>
                <Image src="/marketing/espace-bulletins.webp" alt="" width={600} height={1200} sizes="230px" priority />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
