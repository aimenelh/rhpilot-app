"use client";

import { useEffect } from "react";

/** Progressive enhancement: sections remain visible without JavaScript. */
export function LandingMotion() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | undefined;
    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-landing-motion] main > section:not(:first-child)"));
    const configure = () => {
      observer?.disconnect();
      elements.forEach(el => { el.removeAttribute("data-reveal"); el.removeAttribute("data-entered"); });
      if (media.matches) return;
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-entered", "true");
            observer?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });
      elements.forEach(el => {
        if (el.getBoundingClientRect().top > window.innerHeight) {
          el.setAttribute("data-reveal", "true"); observer?.observe(el);
        }
      });
    };
    configure(); media.addEventListener("change", configure);
    return () => { observer?.disconnect(); media.removeEventListener("change", configure); elements.forEach(el => { el.removeAttribute("data-reveal"); el.removeAttribute("data-entered"); }); };
  }, []);
  return null;
}
