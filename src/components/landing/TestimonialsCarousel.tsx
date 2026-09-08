import { ArrowRight, Quote } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";

const ANON_AVATARS = {
  emma: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAG5AP/EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8hP//Z",
  alicia: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAG5AP/EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8hP//Z",
  zelia: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAG5AP/EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8hP//Z",
  justine: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAG5AP/EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8hP//Z",
  naomy: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAG5AP/EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8hP//Z",
};

const AMEN_AVATAR = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAG5AP/EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8hP//Z";

const TESTIMONIALS = [
  {
    quote:
      "La tâche en RH est la gestion de la paie que j’ai le plus peur d’oublier.",
    source: "Professionnelle RH",
    avatar: ANON_AVATARS.alicia,
    featured: true,
  },
  {
    quote:
      "Les échéances liées à la gestion de la paie se déroulent chaque fin de mois et mettent les RH sous tension.",
    source: "RH en alternance",
    avatar: ANON_AVATARS.zelia,
  },
  {
    quote:
      "Il manquait parfois juste un rappel : une visite médicale, une pièce d’identité arrivée à expiration, ou un bon suivi après le recrutement.",
    source: "Professionnelle RH",
    avatar: ANON_AVATARS.justine,
  },
  {
    quote:
      "Le suivi des échéances RH (contrats, visites médicales, entretiens obligatoires) demande beaucoup de rigueur. Un oubli peut vite avoir des conséquences.",
    source: "Professionnelle RH",
    avatar: ANON_AVATARS.naomy,
  },
  {
    quote: "Certaines entreprises en auraient bien besoin !",
    source: "Professionnelle RH",
    avatar: ANON_AVATARS.emma,
  },
];

const THEMES = ["Paie de fin de mois", "Visites médicales", "Contrats", "Entretiens obligatoires"];

function Avatar({ src, clear = false }: { src: string; clear?: boolean }) {
  return (
    <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-full border border-surface-border bg-surface-subtle">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={clear ? "h-full w-full object-cover" : "h-full w-full scale-125 object-cover blur-[7px]"}
      />
    </span>
  );
}

function TestimonialCard({
  quote,
  source,
  avatar,
  featured = false,
}: {
  quote: string;
  source: string;
  avatar: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`h-full rounded-2xl border p-6 ${
        featured
          ? "border-brand-primary/20 bg-brand-primary/[0.035] shadow-card"
          : "border-surface-border bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <Avatar src={avatar} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Retour terrain</p>
          <p className="mt-0.5 text-xs font-medium text-ink-soft">{source}</p>
        </div>
      </div>
      <p className={`mt-6 leading-relaxed text-ink ${featured ? "text-xl font-medium" : "text-sm"}`}>
        {featured && <Quote className="mb-2 h-5 w-5 text-brand-primary" aria-hidden="true" />}
        {quote}
      </p>
    </div>
  );
}

export function TestimonialsCarousel() {
  return (
    <>
      <section className="relative overflow-hidden border-y border-surface-border bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <Reveal>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primary">Ils en parlent</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl lg:text-5xl">
                Ce sont les retours de terrain qui ont donné une direction à RH Pilot.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
                Avant de construire un outil, nous avons posé une question simple à des professionnels RH :
                quelle tâche, obligation ou échéance avez-vous le plus peur d’oublier ?
              </p>
            </div>
          </Reveal>

          <Reveal delay={100} className="mt-8">
            <div className="flex flex-wrap gap-2">
              {THEMES.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink-soft"
                >
                  {theme}
                </span>
              ))}
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 lg:grid-cols-6">
            <Reveal variant="left" className="lg:col-span-3">
              <TestimonialCard {...TESTIMONIALS[0]} />
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
              {TESTIMONIALS.slice(1).map((item, index) => (
                <Reveal key={item.quote} variant="up" delay={140 + index * 90}>
                  <TestimonialCard {...item} />
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={350} className="mt-8">
            <div className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-subtle p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-sm font-semibold text-ink">Un point commun revient souvent</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  Le problème n’est pas de manquer d’informations. C’est de devoir penser à tout, au bon moment.
                </p>
              </div>
              <span className="inline-flex h-10 items-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white">
                Des rappels au bon moment
              </span>
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
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">
                  Une question, puis des réponses très concrètes.
                </h2>
                <p className="mt-5 text-base leading-7 text-ink-soft">
                  Le projet a commencé par une démarche simple : parler à des personnes de terrain avant de développer quoi que ce soit.
                </p>

                <div className="mt-8 flex items-center gap-3">
                  <Avatar src={AMEN_AVATAR} clear />
                  <div>
                    <p className="text-sm font-semibold text-ink">Aimen El Housseini</p>
                    <p className="text-xs text-ink-faint">Fondateur de RH Pilot</p>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal variant="right" delay={100}>
              <div className="rounded-2xl border border-surface-border bg-white p-7 shadow-card sm:p-9">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-sm font-bold text-white">R</div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Le point de départ</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">La question posée aux professionnels RH</p>
                  </div>
                </div>

                <div className="mt-7 border-l-2 border-brand-primary/30 pl-5 text-[15px] leading-7 text-ink-soft">
                  <p>Bonjour</p>
                  <p className="mt-4">
                    Je me permets de vous contacter car je réalise actuellement une étude auprès de professionnels RH afin de mieux comprendre les difficultés rencontrées au quotidien dans les PME.
                  </p>
                  <p className="mt-4">
                    Avant de développer le moindre outil, je souhaite avant tout échanger avec des personnes de terrain pour m’assurer de répondre à un véritable besoin.
                  </p>
                  <p className="mt-4">Auriez-vous deux minutes pour répondre à une seule question&nbsp;?</p>
                  <p className="mt-4 font-medium text-ink">
                    👉 Quelle est, selon vous, la tâche, l’obligation ou l’échéance RH que vous avez le plus peur d’oublier ou qui vous fait perdre le plus de temps dans votre quotidien&nbsp;?
                  </p>
                </div>

                <div className="mt-8 rounded-xl bg-brand-primary/[0.045] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary">Ce que les retours ont montré</p>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    Les mêmes difficultés revenaient : paie de fin de mois, visites médicales, contrats, entretiens obligatoires, rappels et suivi des échéances.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={180} className="mt-10">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-surface-border bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">01</p>
                <p className="mt-2 text-sm font-semibold text-ink">Une question simple</p>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">Comprendre les vrais oublis et les vraies pertes de temps.</p>
              </div>
              <div className="rounded-xl border border-surface-border bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">02</p>
                <p className="mt-2 text-sm font-semibold text-ink">Des retours de terrain</p>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">Des situations différentes, mais des besoins qui se recoupent.</p>
              </div>
              <div className="rounded-xl border border-surface-border bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">03</p>
                <p className="mt-2 text-sm font-semibold text-ink">RH Pilot</p>
                <p className="mt-1.5 text-sm leading-6 text-ink-soft">Un outil pensé à partir de ces problèmes concrets.</p>
              </div>
            </div>
          </Reveal>

          <div className="mt-8 flex justify-end">
            <Link href="#copilote" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:text-brand-primary-dark">
              Voir RH Pilot en action
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
