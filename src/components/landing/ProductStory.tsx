"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import s from "./ProductStory.module.css";

// Visite guidée en trois moments, avec les captures réelles de l'application.
const chapters = [
  {
    label: "Tout est daté",
    title: "Chaque étape a sa date, son responsable, sa pièce.",
    text: "Un parcours liste ses étapes dans l’ordre : la date prévue, qui s’en charge, la pièce attendue. Vous marquez chaque étape comme faite, au fil de l’eau.",
    image: { src: "/marketing/parcours-landing.webp", width: 1180, height: 620, alt: "Étapes d’un parcours d’embauche dans RH Pilot, avec dates, responsables et pièces attendues" },
  },
  {
    label: "Les rappels partent seuls",
    title: "Personne n’a besoin de s’en souvenir.",
    text: "Chacun reçoit le résumé de ses actions urgentes, à la fréquence choisie. L’historique montre qui a déjà été relancé.",
    image: { src: "/marketing/notifications-landing.webp", width: 1774, height: 887, alt: "Réglage des résumés et historique des rappels envoyés dans RH Pilot" },
  },
  {
    label: "Le Copilote répond",
    title: "Une question ? La réponse vient de vos données.",
    text: "Le Copilote s’appuie sur vos salariés, vos parcours et vos échéances pour répondre, puis propose la suite : un rappel, un dossier, un bilan.",
    image: { src: "/marketing/copilot-landing.webp", width: 1717, height: 916, alt: "Le Copilote liste les périodes d’essai qui se terminent ce mois-ci" },
  },
];

export function ProductStory() {
  const story = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = story.current;
    if (!el) return;
    const query = window.matchMedia("(min-width: 901px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!query.matches) return;
      const header = document.querySelector("header")?.parentElement?.getBoundingClientRect().bottom;
      if (header) el.style.setProperty("--stick-top", `${Math.round(header + 18)}px`);
      const rect = el.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (100 - rect.top) / (rect.height - window.innerHeight)));
      el.style.setProperty("--progress", String(progress));
      setActive(Math.min(chapters.length - 1, Math.floor(progress * chapters.length)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        window.addEventListener("scroll", schedule, { passive: true });
        schedule();
      } else window.removeEventListener("scroll", schedule);
    });
    observer.observe(el);
    window.addEventListener("resize", schedule);
    query.addEventListener("change", schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      query.removeEventListener("change", schedule);
    };
  }, []);

  function selectChapter(index: number) {
    setActive(index);
    const el = story.current;
    if (el && window.matchMedia("(min-width: 901px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)").matches) {
      const top = window.scrollY + el.getBoundingClientRect().top - 100;
      window.scrollTo({ top: top + ((index + 0.15) / chapters.length) * (el.offsetHeight - window.innerHeight), behavior: "instant" as ScrollBehavior });
    }
  }

  return (
    <section ref={story} className={s.story} id="product-story" aria-label="Visite du logiciel" data-no-reveal>
      <div className={s.sticky}>
        <div className={s.composition}>
          <div className={s.editorial}>
            <div className={s.chapterCopy} key={active}>
              <h2>{chapters[active].title}</h2>
              <p>{chapters[active].text}</p>
            </div>
            <div className={s.controls} aria-label="Choisir une vue du logiciel">
              {chapters.map((chapter, index) => (
                <button key={chapter.label} type="button" aria-pressed={active === index} aria-controls="real-product-view" onClick={() => selectChapter(index)}>
                  {chapter.label}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              ))}
            </div>
            <Link href="/services#demo" className={s.demoLink}>
              Explorer la démonstration <ArrowUpRight size={16} />
            </Link>
          </div>
          <figure id="real-product-view" className={s.product} data-view={active}>
            <div className={s.productBar}>
              <span>RH Pilot</span>
              <span>{chapters[active].label}</span>
            </div>
            <div className={s.viewport}>
              {chapters.map((chapter, index) => (
                <div key={chapter.label} className={s.shot} data-on={index === active} aria-hidden={index !== active}>
                  <Image
                    src={chapter.image.src}
                    alt={chapter.image.alt}
                    width={chapter.image.width}
                    height={chapter.image.height}
                    sizes="(max-width: 900px) 95vw, 70vw"
                  />
                </div>
              ))}
            </div>
            <figcaption>
              <span className={s.progressLine} aria-hidden="true">
                <i />
              </span>
              Captures réelles de l’application.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
