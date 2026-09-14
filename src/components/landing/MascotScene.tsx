"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import s from "./MascotScene.module.css";

/** Lightweight depth animation around the original illustration. No WebGL or altered artwork. */
export function MascotScene({
  src,
  alt,
  caption,
  priority = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          if (!motion.matches) element.dataset.entered = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(element);
    const reset = () => {
      cancelAnimationFrame(frame.current);
      plane.current?.style.removeProperty("transform");
      if (motion.matches) delete element.dataset.entered;
    };
    motion.addEventListener("change", reset);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", reset);
      cancelAnimationFrame(frame.current);
    };
  }, []);
  return (
    <figure className={s.figure}>
      <div
        ref={scene}
        className={s.scene}
        onPointerMove={(event) => {
          if (
            event.pointerType !== "mouse" ||
            !window.matchMedia(
              "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
            ).matches
          )
            return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = Math.max(
            -1,
            Math.min(
              1,
              ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
            ),
          );
          const y = Math.max(
            -1,
            Math.min(
              1,
              ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
            ),
          );
          cancelAnimationFrame(frame.current);
          frame.current = requestAnimationFrame(() => {
            if (plane.current)
              plane.current.style.transform = `rotateX(${-y * 4}deg) rotateY(${x * 6}deg)`;
          });
        }}
        onPointerLeave={() => {
          cancelAnimationFrame(frame.current);
          plane.current?.style.removeProperty("transform");
        }}
      >
        <div className={s.entrance}>
          <div ref={plane} className={s.plane}>
            <div className={s.backplate} aria-hidden="true" />
            <div className={s.orbit} aria-hidden="true" />
            <Image
              src={src}
              alt={alt}
              width={1100}
              height={780}
              priority={priority}
              sizes="(max-width: 700px) 90vw, 45vw"
              className={s.mascot}
            />
            <span className={s.tile} aria-hidden="true">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
                <path
                  d="m5 12 4 4L19 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
      {caption && <figcaption className={s.caption}>{caption}</figcaption>}
    </figure>
  );
}
