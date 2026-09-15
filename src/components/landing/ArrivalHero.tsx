"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import s from "./ArrivalHero.module.css";

const chapters = [
  { label: "Tout retrouver", title: "Votre équipe. Une vue d’ensemble.", text: "Salariés, parcours et échéances se retrouvent dans un même espace." },
  { label: "Voir les priorités", title: "Ce qui attend n’est plus invisible.", text: "Retards, tâches à attribuer, échéances de la semaine : repérez les actions qui demandent votre attention." },
  { label: "Comprendre la suite", title: "Une question. Le contexte sous les yeux.", text: "Le Copilote s’appuie sur votre suivi RH pour expliquer les échéances et les actions à examiner." },
];

export function ArrivalHero() {
  const root = useRef<HTMLElement>(null);
  const story = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = story.current;
    if (!el) return;
    const query = window.matchMedia("(min-width: 901px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!query.matches) return;
      const intro = root.current?.querySelector<HTMLElement>("[data-panorama]");
      if (intro) {
        const box = intro.getBoundingClientRect();
        root.current?.style.setProperty("--intro-progress", String(Math.min(1, Math.max(0, -box.top / box.height))));
      }
      const rect = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (100 - rect.top) / (rect.height - window.innerHeight)));
      el.style.setProperty("--progress", String(progress));
      setActive(Math.min(2, Math.floor(progress * 3)));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { window.addEventListener("scroll", schedule, { passive: true }); schedule(); }
      else window.removeEventListener("scroll", schedule);
    });
    observer.observe(root.current ?? el);
    window.addEventListener("resize", schedule);
    query.addEventListener("change", schedule);
    // Wait for the existing brand introduction before revealing the headline.
    const introObserver = new MutationObserver(() => {
      root.current?.setAttribute("data-ready", document.querySelector("[data-brand-intro]") ? "false" : "true");
    });
    introObserver.observe(root.current?.closest("[data-landing-motion]") ?? document.body, { childList: true });
    root.current?.setAttribute("data-ready", "true");
    return () => {
      observer.disconnect(); introObserver.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule);
      query.removeEventListener("change", schedule);
    };
  }, []);

  function selectChapter(index: number) {
    setActive(index);
    const el = story.current;
    if (el && window.matchMedia("(min-width: 901px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)").matches) {
      const top = window.scrollY + el.getBoundingClientRect().top - 100;
      window.scrollTo({ top: top + ((index + 0.15) / 3) * (el.offsetHeight - window.innerHeight), behavior: "instant" as ScrollBehavior });
    }
  }

  return (
    <section ref={root} className={s.hero} aria-labelledby="arrival-title">
      <div className={s.intro} data-panorama>
        <div className={s.centerpiece}>
          <p className={s.eyebrow}>RH PILOT · LE FIL DE VOS RH</p>
          <h1 id="arrival-title"><span>Vos RH avancent.</span><em>Vous gardez le fil.</em></h1>
          <p className={s.panoramaLead}>Salariés, parcours et échéances :<br />votre suivi RH, au même endroit.</p>
          <a className={s.scrollHint} href="#product-story">Découvrir le logiciel <ArrowDown size={16} /></a>
        </div>
        <div className={`${s.fragment} ${s.priorityFragment}`}>
          <div className={s.fragmentLabel}>01 · Vos priorités</div>
          <div className={s.priorityCrop}><Image src="/marketing/dashboard-real.png" alt="Priorités du jour dans RH Pilot : tâches en retard, à assigner et prévues cette semaine" width={1887} height={1031} sizes="900px" priority /></div>
        </div>
        <div className={`${s.fragment} ${s.calendarFragment}`}>
          <div className={s.fragmentLabel}>02 · Vos échéances</div>
          <Image src="/marketing/calendar-landing.webp" alt="Calendrier des échéances dans RH Pilot" width={1200} height={600} sizes="(max-width: 900px) 1px, 28vw" />
        </div>
        <div className={`${s.fragment} ${s.assistantFragment}`}>
          <div className={s.fragmentLabel}>03 · Votre Copilote</div>
          <div className={s.assistantCrop}><Image src="/marketing/copilot-real.png" alt="Le Copilote répond à une question sur les échéances de la semaine" width={1887} height={1030} sizes="1000px" /></div>
        </div>
        <div className={s.panoramaMascot} aria-hidden="true">
          <svg viewBox="700 140 554 970" fill="none"><defs><clipPath id="panorama-mascot"><rect x="700" y="140" width="554" height="970" /></clipPath></defs><image href="/illustrations/mascot/intro-push-wave.png" width="1254" height="1254" clipPath="url(#panorama-mascot)" /></svg>
          <span>On garde le fil.</span>
        </div>
        <svg className={s.thread} viewBox="0 0 1440 800" preserveAspectRatio="none" fill="none" aria-hidden="true"><path pathLength="1" d="M-40 340 C160 170 230 550 350 615 S530 740 710 660 S1030 580 1100 385 S1300 165 1480 235" /></svg>
        <span className={s.panoramaCaption}>Le vrai logiciel, dans votre quotidien.</span>
      </div>
      <div ref={story} className={s.story} id="product-story">
        <div className={s.sticky}>
          <div className={s.storyTop}><span>À L’INTÉRIEUR DE RH PILOT</span><span>Captures de l’application · version bêta</span></div>
          <div className={s.composition}>
            <div className={s.editorial}>
              <span className={s.chapterNumber} aria-hidden="true">0{active + 1}<small>/ 03</small></span>
              <div className={s.chapterCopy} key={active}><h2>{chapters[active].title}</h2><p>{chapters[active].text}</p></div>
              <div className={s.controls} aria-label="Choisir une vue du logiciel">{chapters.map((chapter, index) => <button key={chapter.label} type="button" aria-pressed={active === index} aria-controls="real-product-view" onClick={() => selectChapter(index)}><span aria-hidden="true">0{index + 1}</span>{chapter.label}<ArrowUpRight size={15} aria-hidden="true" /></button>)}</div>
              <Link href="/services#demo" className={s.demoLink}>Explorer la démonstration <ArrowUpRight size={16} /></Link>
            </div>
            <figure id="real-product-view" className={s.product} data-view={active}>
              <div className={s.productBar}><span>RH Pilot</span><span>{chapters[active].label}</span></div>
              <div className={s.viewport}>
                <div className={s.dashboard} aria-hidden={active === 2}><Image src="/marketing/dashboard-real.png" alt="Tableau de bord RH Pilot avec les priorités du jour et le Copilote" width={1887} height={1031} sizes="(max-width: 900px) 160vw, 85vw" priority /></div>
                <div className={s.copilot} aria-hidden={active !== 2}><Image src="/marketing/copilot-real.png" alt="Échange avec le Copilote à propos des échéances de la semaine" width={1887} height={1030} sizes="(max-width: 900px) 160vw, 85vw" /></div>
              </div>
              <figcaption><span className={s.progressLine} aria-hidden="true"><i /></span>Vos informations. Les actions à suivre.</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
