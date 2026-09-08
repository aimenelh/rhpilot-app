"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/landing/Reveal";

const TESTIMONIALS = [
  {
    quote: "La tâche en RH est la gestion de la paie que j’ai le plus peur d’oublier.",
    source: "Professionnelle RH",
  },
  {
    quote: "Les échéances liées à la gestion de la paie se déroulent chaque fin de mois et mettent les RH sous tension.",
    source: "RH en alternance",
  },
  {
    quote: "Il manquait parfois juste un rappel : une visite médicale, une pièce d’identité arrivée à expiration, ou un bon suivi après le recrutement.",
    source: "Professionnelle RH",
  },
  {
    quote: "Le suivi des échéances RH (contrats, visites médicales, entretiens obligatoires) demande beaucoup de rigueur. Un oubli peut vite avoir des conséquences.",
    source: "Professionnelle RH",
  },
  {
    quote: "Certaines entreprises en auraient bien besoin !",
    source: "Professionnelle RH",
  },
];

const THEMES = ["Paie de fin de mois", "Visites médicales", "Contrats", "Entretiens obligatoires"];

function AnonymousAvatar({ index }: { index: number }) {
  const variants = [
    "from-zinc-400 via-zinc-500 to-zinc-300",
    "from-stone-300 via-stone-400 to-stone-200",
    "from-slate-200 via-slate-300 to-slate-100",
    "from-slate-300 via-stone-300 to-slate-200",
    "from-zinc-500 via-zinc-600 to-zinc-400",
  ];

  return (
    <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-full border border-surface-border bg-surface-subtle">
      <span
        aria-hidden="true"
        className={`absolute inset-[-7px] rounded-full bg-gradient-to-br ${variants[index % variants.length]} blur-[7px]`}
      />
    </span>
  );
}

function TestimonialCard({
  item,
  index,
}: {
  item: (typeof TESTIMONIALS)[number];
  index: number;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl rounded-3xl border border-surface-border bg-white px-7 py-8 shadow-card sm:px-10 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AnonymousAvatar index={index} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-primary">Retour terrain</p>
            <p className="mt-0.5 text-sm font-medium text-ink-soft">{item.source}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-ink-faint">{String(index + 1).padStart(2, "0")} / {String(TESTIMONIALS.length).padStart(2, "0")}</span>
      </div>

      <blockquote className="mt-9 max-w-3xl text-2xl font-medium leading-[1.35] tracking-[-0.025em] text-ink sm:text-3xl lg:text-[2.1rem]">
        “{item.quote}”
      </blockquote>
    </div>
  );
}

export function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);
  const active = TESTIMONIALS[index];

  const previous = () => setIndex((current) => (current - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const next = () => setIndex((current) => (current + 1) % TESTIMONIALS.length);

  return (
    <>
      <section className="relative border-y border-surface-border bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Ils en parlent</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl lg:text-5xl">
                Ce sont les retours de terrain qui ont donné une direction à RH Pilot.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
                Avant de construire un outil, nous avons posé une question simple à des professionnels RH : quelle tâche, obligation ou échéance avez-vous le plus peur d’oublier ?
              </p>
            </div>
          </Reveal>

          <Reveal delay={100} className="mt-8">
            <div className="flex flex-wrap gap-2">
              {THEMES.map((theme) => (
                <span key={theme} className="rounded-full border border-surface-border bg-surface-subtle px-3.5 py-2 text-xs font-medium text-ink-soft">
                  {theme}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150} className="mt-10">
            <div className="mx-auto max-w-4xl">
              <TestimonialCard item={active} index={index} />
              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="max-w-md text-sm leading-6 text-ink-soft">
                  Un témoignage à la fois, pour laisser chaque retour respirer et rester lisible.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={previous}
                    aria-label="Retour précédent"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-surface-border bg-white text-ink transition hover:border-brand-primary hover:text-brand-primary"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Retour suivant"
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary text-white transition hover:bg-brand-primary-dark"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={250} className="mt-10">
            <div className="mx-auto max-w-4xl rounded-2xl border border-surface-border bg-surface-subtle px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-6">
              <div>
                <p className="text-sm font-semibold text-ink">Un point commun revient souvent</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">Le problème n’est pas de manquer d’informations. C’est de devoir penser à tout, au bon moment.</p>
              </div>
              <span className="mt-4 inline-flex shrink-0 items-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white sm:mt-0">Des rappels au bon moment</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative bg-surface-subtle py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <Reveal variant="left">
              <div className="lg:sticky lg:top-28">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Comment RH Pilot est né</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">Une question, puis des réponses très concrètes.</h2>
                <p className="mt-5 text-base leading-7 text-ink-soft">Le projet a commencé par une démarche simple : parler à des personnes de terrain avant de développer quoi que ce soit.</p>
                <div className="mt-8 flex items-center gap-3">
                  <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full border border-surface-border bg-white">
                    <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABgAGADASIAAhEBAxEB/8QAHAAAAQUBAQEAAAAAAAAAAAAAAAMFBgcIBAIB/8QANBAAAQMDAgQFAgUDBQAAAAAAAQIDBAAFEQYSByExURMUQWFxCCIjMkJSgSQzchUWYpGS/8QAGQEAAgMBAAAAAAAAAAAAAAAAAAECAwQF/8QAIREAAgICAgIDAQAAAAAAAAAAAAECEQMEEiETMSJBUYH/2gAMAwEAAhEDEQA/ANU0hOlsQYrsmW6hphtJUtajgACllKCQSSAB1J9Kyxxq4jOalujlotbqk2iMvaspOPGWOufg0AO3EjjHNub7tv0wsxoAJSqT+tz/AB7VUEt3cXJUxxTiwMqdcOVH+a8tjJps1QkuxosRC9qpDyUEdxmmNCFt07edZSlyGFFi3JOA4ocv4HrTlL4aNNZD0tbjv7zVvT59i0nDh2cqUFNtpSEtjHMgHrXNq3ysG0NTl5UlxO5KQeZ9q5OTZzOfXSO1i1MHD5dsoW66fuem1+ZjOKdjIPMjoP4p203ezIIejrXFmp/W2rCj8Gn6TcXLrAkMiC6y24k4KlA1W9oe8hd0tOp2lKtpPvW3XyTkqn7Ofs4oQlcPTNT8M+M8mI81btWL8WKcJblgfcj/AC71oiLIalR23o7iXGnEhSVpOQRWCVnlVucCeJDlmuDOn7w8VW6QoJjrUc+Es9E/BrSZTT9FAORRSEVlx91WdN6KcajrxMnnwEbTzSk9VVkxgn1OT6nue9Wp9TV3M3XMWClX4cJjaU/8jzzVUsmmMcGzSKrRMvGpLOzDCPteCtyugx3r20afNLzRBv0J9SwhCV/cT6Cozvi6JwrkrJ5rrSLt5lMrS8psFaSoEcsAYIzXFxD0+mNa7XASpxSY/PcT3qWaxvrzUK3rgsCWHFhKfD5hWfequ1orUbx8SZIeRsOQjZySO2fWuQoyk+36O6kq6V/pyo0smF/VsuuHdkgE8jmobedJOKfXL8YbivO09KldpuNyW0Wpah4X6M9a5LnNbfCm0bt7a9qsjl/FX6/NyMu141H0NZ3eGneAFAYIHSudZUlQU2spWDlKh+k96XdVyrkcNdI5Jsrgjqv/AHToaI68rMuN+A6D1O3kFH5qway79K13MfUt0ti1EolNhSE56FPWtRUhGJ+OD6l8W9RJV0bW2B/5qHNq96nf1BxPK8Ubi/6SglwHvgYqvULpjHNlyujfmm5tWKWS578/QUAWXoPUZbhOQ5SSWoiC6hX7E1CNb6sYfvRebmOutnqkL+1Q+KkXDZlKLoiTNQoRpKvKBKhjeT8+lcPEbh/bId4WqI042hRJ2pP21hzKEMny+zo4JZJYqh9DDCurcxaDHVuBpCW5iQ6D13V3QbSm2wFrSjASCRS67BOlaYauaWVKfU4SU+vh+hqerTcuJXt8lGLkR9xdcy1V8cUUnCgUnsRikVqrWYiyvp2eUni7am052uMvZ/hNbOHSsd/TPE8fiU3LP5YrK8ntuGK18JLOP7gpCM3/AFRWBS49sv7LZIa/pXNo788mqDhNPSpLceK2p15w4ShAyTW5NTWWNqGxTLXMH4Uhsp3ftPcVRvCPhdcbJqeZdL4hLUaIFtRkdS52X7YppW6E3RFrRwruy2EyrxJYhRvVGfxB/FTK3aFsNotjcwhU91TpQlT3Lby6iphcHzJu4bH3JS0rIPPJx1rxMtrkbTlrdXzQp7codqvUUmRttEK4yxAdI2J23PNtXFo+a8sjkvYD+YAVG4F7kakisMy0eJJAACh1PzU01Rb3X9SJuCEBcRoBppR5/aRzHxTjbNM22xyfOR/ucdTnYBkJz1qnY0/NKLj/AEv1tzwxaf8ACNR9PodWhuWtDbKcEgdSe1dstzY4mMw2NpVjaOgTTrPY8y8lLKMqznA9PmvLkFXmdoGXyOeKuw4MeBVApz557DTmRXUdgtVyj7no6RKJwHEcjVfX7QlxhZegpMqPjO0f3B8irfZt6i+l1fwAaemdPPyJzEVBVud5uEfpT705RTIRbQ1/TBp12BZLjeZbKmnZivBSlYwU7fWrvpCDFahRGozCQlttIAwMZ96XrMWhSMljxwPuwRy59qWopp12g9lbxWfA1qth5BSACU56HtUsmW/zunJUQY8U5Wj2PtTpIhx5DqHXWkl1H5V+orw4062tCmead2VCrHPkRUaVFZ21aH0JgzUlJbOM+9KstKmTi0lQS0k7cDrT5fbKv/Vy8yghtYzkd6aX4ztvuEVxKFFJWAsgVohKotlUlckOjttaiIYbaTgrVlRPWuSyMJe1I6tQ+0Egf9VJJ7Dj621NNlRHpXyz2VyM+686QncSQPXnVPP9LKIe1GM69CJGSVIYXt3Dtn1qxYUJuKVrABeWAFK+O1Fvt8aAhQjNhJUcqV6qPvXXVcp30NRoKKKKgSCiiigAooooAK+YH7Un5Ar7RQAUUUUAFFFFABRRRQB//9k=" alt="" aria-hidden="true" className="h-full w-full object-cover" />
                  </span>
                  <div><p className="text-sm font-semibold text-ink">Aimen El Housseini</p><p className="text-xs text-ink-faint">Fondateur de RH Pilot</p></div>
                </div>
              </div>
            </Reveal>

            <Reveal variant="right" delay={100}>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-card sm:p-9">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-sm font-bold text-white">R</div>
                  <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Le point de départ</p><p className="mt-0.5 text-sm font-semibold text-ink">La question posée aux professionnels RH</p></div>
                </div>
                <div className="mt-7 border-l-2 border-brand-primary/30 pl-5 text-[15px] leading-7 text-ink-soft">
                  <p>Bonjour</p>
                  <p className="mt-4">Je me permets de vous contacter car je réalise actuellement une étude auprès de professionnels RH afin de mieux comprendre les difficultés rencontrées au quotidien dans les PME.</p>
                  <p className="mt-4">Avant de développer le moindre outil, je souhaite avant tout échanger avec des personnes de terrain pour m’assurer de répondre à un véritable besoin.</p>
                  <p className="mt-4">Auriez-vous deux minutes pour répondre à une seule question&nbsp;?</p>
                  <p className="mt-4 font-medium text-ink">👉 Quelle est, selon vous, la tâche, l’obligation ou l’échéance RH que vous avez le plus peur d’oublier ou qui vous fait perdre le plus de temps dans votre quotidien&nbsp;?</p>
                </div>
                <div className="mt-8 rounded-xl bg-brand-primary/[0.045] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary">Ce que les retours ont montré</p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">Les mêmes difficultés revenaient : paie de fin de mois, visites médicales, contrats, entretiens obligatoires, rappels et suivi des échéances.</p>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={180} className="mt-10">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">01</p><p className="mt-2 text-sm font-semibold text-ink">Une question simple</p><p className="mt-1.5 text-sm leading-6 text-ink-soft">Comprendre les vrais oublis et les vraies pertes de temps.</p></div>
              <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">02</p><p className="mt-2 text-sm font-semibold text-ink">Des retours de terrain</p><p className="mt-1.5 text-sm leading-6 text-ink-soft">Des situations différentes, mais des besoins qui se recoupent.</p></div>
              <div className="rounded-xl border border-surface-border bg-white p-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">03</p><p className="mt-2 text-sm font-semibold text-ink">RH Pilot</p><p className="mt-1.5 text-sm leading-6 text-ink-soft">Un outil pensé à partir de ces problèmes concrets.</p></div>
            </div>
          </Reveal>

          <div className="mt-8 flex justify-end"><Link href="#copilote" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:text-brand-primary-dark">Voir RH Pilot en action<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
        </div>
      </section>
    </>
  );
}
