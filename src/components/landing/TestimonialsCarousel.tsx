import { ArrowRight, Quote } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";

const ANON_AVATARS = {
  emma: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCABgAGADASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAABQYDBAcCAAH/xAAkEAABAwUBAQACAwEAAAAAAAABAAIEAwURISIxEhMyFBVBUf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDZSVFUqAL1R+Ah0uUGA7QdyJQaDtBpdwaM7VO43QNz0lafednpAalXIb6QyrcQT6l6tdS4/soDNc7/AFAw/wBgM+qelcgCNpUdKcP9Uf8AYuafUGhxLmMjpHYdwa7G1lMa8EEdJht15yR0g02PJDgNq6x4ISfb7mHAdI/GlBwG0Esmv8tO0tXSf8g7RK4Sflp2ki9zsfW0A67XTbukqS7iXOPS9dJpLjtAn1y53qArTkF7vVfoguCDxDkhH4jMtCCOrTIahklxaSj9WmPhA57MZQURLLHeopAuZa4dJdrEtcuo8gtcNoNQtN1z89JwgXAFo2sjtc8tI2nG3XLkdIGm6SMNdtIF8knLtpxuz+XLP7285cgWJ1Ylx2qLTlylluy4qGl+yArC9CYYh5CX4esI5FdoIL1T9EFnj1Fnv5QqbsFAuyhsqq12HK9LGyh7tFAUhSC0jaY4VwLQNpOoPIKJx5BAG0Gx3Zp+XLPr205ctMutDLTpZ/e45y7SBFlDsqCnpyvTaRDyqIGHICcV+MIxHq6CAUHYRKjVwEBY1eVQlOyCuvza9VavUyEA2V6UPeNq/XOcqoW5KD5SaSURoUiVFFjlxGkeiQS4DSDbLjGy06SNe4WfrS02XQ+mnSVrtA+g7SDIblDIcdIJUpFrvFoN2thyeUry4Ba46QCaelbpvwFwaBafF4NIQT/l0oalTK5OVyWkoIX9FepUS53isMjlx8RKHALnDSDq3Qi5w0m2323IHKjtVs23lOFvt2GjlA81aeQhM2IHg6RsjKgq0g4IES5Wv6zylWfaNnlanLiBwOkAnW4HPKDLpFrLSeVSfAIPif5dtGTyhdW3DPiBQ/gu/wCLtlvJPiZhbhn9VYo20Z/VABjWokjlH7faNjlFYlsGRyj8K3AY0grW21huOUyRYYaBpdRYoaBpEadIAIP/2Q==",
  alicia: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCABgAGADASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAAAAUDBAYHAQL/xAAjEAACAQQCAwEAAwAAAAAAAAAAAQIDBBEhBTESIkEyExRR/8QAGAEBAQEBAQAAAAAAAAAAAAAAAAIDAQT/xAAZEQEBAQEBAQAAAAAAAAAAAAAAAQIRAxL/2gAIAQEAAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8hP//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8hP//Z",
  zelia: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCABgAGADASIAAhEBAxEB/8QAGgAAAwEBAQEAAAAAAAAAAAAAAwQFBgIBB//EACIQAAICAwEAAwEBAQEAAAAAAAABAwQCESExEiJBBRNRYf/EABgBAAMBAQAAAAAAAAAAAAAAAAECAwAE/8QAGREBAQEBAQEAAAAAAAAAAAAAAAERAhIh/9oADAMBAAIRAxEAPwD7G8geWejjKQXkl1+i6wkkqQrJYS/ReezrfSZPd0/QaMiq7S36d4WU/wBM47/fQsV3b9Bo+WmjnT/RnCRMgwWt66UIp9/o2hinjkdpikcuw+OYQFPTlM6CyTlKKzzaXpzlLwUsS8ZPRK27Ot9Itm09voxdm96RLE22+i2qcwd2nv0YhsvfpIUnQ8UvfRNWvPxpatneulevPtLpl6s3nS1Vk2kUlc/S9FKNxybJMOY7FmNKRSwy2EQtHkHxYzMm5eCtmX6s5/04LWZPqyMrRMvS+9Is0vfR6/J1kWaT7Gq/Ayl/9Cxy9J3+gTCXoki1vxoakvUXqee0jKUpeo0dHPaRSOXpdhyHYsidDlxDsTGhVOHIawYjCx3DweAwH+nBazJ9WcuXgrZm4znlLzU27ntskyJtlCzl8mxVR/Jjrc0r8WeLaY84OeC8kfxYsilpuln9kab+fntIylZ6yRo/52fg6Vaau+IfhJlXLaRTgRoU/D+DuApChzBcHgPluWT0JWM2U5K7S8ELEL/4c0RlSpO5BIY9neUL+XgxDHofVZ08cP18ErEWiu8fqJWI9m0/tOiWsy7/AD8vCTjE/l4VaODTQdL6aalltIs11vRGoYvSL1XDiGjadhxG8VwDFjwYSKRmKmpc8Jtml7w181Za8Jtmsu8I3lOxkZKmn4cKL4/hcsV0vwnyx6EpSrXAOcfyGGuneEe2LoaSwq7y8KlOo01wLBWTa4VqlVc4PIaDUq+tcLdePSQCtBrXCjFhpFpFIJhjpBEeJHQ4v//Z",
  justine: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCABgAGADASIAAhEBAxEB/8QAGwABAQEBAQEBAQAAAAAAAAAABQQDAgYAAQf/xAAhEAABBAMAAwEBAQAAAAAAAAAAAQIDBBEhMUFRYRMUEv/EABgBAQEBAQEAAAAAAAAAAAAAAAMCAQAE/8QAGBEBAQEBAQAAAAAAAAAAAAAAAQACERL/2gAMAwEAAhEDEQA/AP7G5xi9+D58mEI5pseSVqC6llIpZk9nE0/0gmsfQ1kM1Ek6ezL90z0Pks/TBbW+kdr8zTJ09lMcyewCO19LIbH00bHM/FL9K45MgcNjmy+GbPkQY0lWuO0UkikyUNcWUJHyy6IJ5u7OpZSGaQJZQsp5u7D55vprPIG2JehrLkuZZ99MFmXPTGSXZisgazGZCOffS2Cf6CMkwpbBLtChp0T8Ev0Qgl4B15OCMDyxhScglyXRvygNXk4Iwv0KMSQj5MksrjRyk0q6CZSjsv6EWZdqIW34RQO1JtSWsuXy7Of0JVk2fqP0Q3oKlJNlVeXaBf8AvZTXk2hpRq9FVkzgUgdwDpv4MV10hcLKQO4JQu0FQLwShUTMWoh7cIRzrhBOWPCBlrSKQ1kPcfpQK07KqMXF6DzNVXEMgUm1U0Rq4NGQqq8N2wa4SzFEqKbQLhyGj4ceDmNmHHFOpik7g3WXKIAU1wqDtTaIWQsvXTglChBWbwUhZoXMWqSxFpQS6zp6eeLKKDXK+c6O0XZbydpiqqkDoMrw9BZqrldEn8m+ApPlj4q3woSvrhaytjwa/hrhPJhh5a/wn/HC8HJK+fBOtVc8NCnTT1WKioO0mLohr1VymhulXVMaEyQaZGpHpBSJmiatFhEL2NwgwQLcyR5QhsV/9Z0KqmTF8eTUpG87NSyvCV1LC8PRyQIvgnfXT0Q5lNQX8uPB+/z/AAWdAno5/BPRHmQ3FLVz4PxKWfAukHw0bWT0aZpdxkNLC8E61bGNFEddPRTHEiFmY3V9FHhChqHzW4Oi6L//2Q==",
  naomy: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCABgAGADASIAAhEBAxEB/8QAGwAAAwEBAQEBAAAAAAAAAAAABAUGAwIHAQD/xAAlEAABBAICAgICAwAAAAAAAAABAAMEIQIRBTESIjJBExQVUWH/xAAYAQADAQEAAAAAAAAAAAAAAAAAAgMBBP/EABsRAQEBAQADAQAAAAAAAAAAAAABAhEDEjEh/9oADAMBAAIRAxEAPwD2QlZ5uALlxzQQEiUMd2gCHJAH2hXJgH2lUrkNbtK3uTv5LOt4pP3hvtaYTAftSH8nfyW7XJX8kdbxYNyAftEYOgqYj8hvVpnHmDLVrWcOhltdAoNp4H7RGOe0Mar6uQV9QCiTJ8QbSGdO1u1pNmUbU3PmEk2ltNH6XPJJtLs5RyPaGdeOWXa/YA5KWtcWznrb8+X9rvCUcT2s/wAdLBzeKWbPcHEeeQRadQ+Q3q1DiSccu0xhztEWr5qOo9DiS/IC01Zd2O1GcfN3q1RxJHkBaZM6xy2tAUI1nsInEoY8zmS9g2kEt85E2iZDxINpW9mSVz+wxX3E7yRrGKAaNpiwaUdV3eNscaQMqgUfll6pbMzopc/VNFjznjku48ojIWg5LllYNvay7XZhyaWvGzLFqt46TsC15zx0nRFqw4uTvVqiS2jObAR+BpJILuwE3ay2EFePPYnRQDuJBT1+NoGkqkM6Jpcieb+hWzoo5nOkBrRW7eekmo7/ABaHZueqVTHKKJcd9UqmO9rcRXV/C+S5ZQ+Ofsvj+eysccrXXmOTVPIDusharuKe+NqHhZ+wVZxLl4pir7jnNgJ8wdgKY4vPYCpYx9QgtRUmLRpJJkbW6VpJi0aSObE7pc1iPxJOtaKzsJtIjaJpAOskfSnVsb4DdzpK5WRO00ewKXvMk/SfKt8hQ6CSuMcDtH5RiT0usIh30rypXT9ExPkFU8Tid4pPEhnYpU/FxSCKW9Z1UcUKCp4w9QkXGs6AVBHx0AmAZ+PsGkolxN7pUrmGwgZDAINJLC2I6VD7pKZETW6VjKjC6SeVGF0o2E+JV6N/iDzi7PSoH2BvpClkb6S94z2KBC2elu1x2z0mrUcE9JjHhg6pNKJS2Jxlj1VFx/H+OqW8SEKpOosUAClXJ46hx/ECk1bx0Fm00AERiNJzv//Z",
};

const AIME_N_AVATAR = "data:image/jpeg;base64,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";

const TESTIMONIALS = [
  {
    quote: "La tâche en RH est la gestion de la paie que j’ai le plus peur d’oublier.",
    source: "Professionnelle RH",
    avatar: ANON_AVATARS.alicia,
    featured: true,
  },
  {
    quote: "Les échéances liées à la gestion de la paie se déroulent chaque fin de mois et mettent les RH sous tension.",
    source: "RH en alternance",
    avatar: ANON_AVATARS.zelia,
  },
  {
    quote: "Il manquait parfois juste un rappel : une visite médicale, une pièce d’identité arrivée à expiration, ou un bon suivi après le recrutement.",
    source: "Professionnelle RH",
    avatar: ANON_AVATARS.justine,
  },
  {
    quote: "Le suivi des échéances RH (contrats, visites médicales, entretiens obligatoires) demande beaucoup de rigueur. Un oubli peut vite avoir des conséquences.",
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
      <img src={src} alt="" aria-hidden="true" className={clear ? "h-full w-full object-cover" : "h-full w-full scale-125 object-cover blur-[7px]"} />
    </span>
  );
}

function TestimonialCard({ quote, source, avatar, featured = false }: { quote: string; source: string; avatar: string; featured?: boolean }) {
  return (
    <div className={`h-full rounded-2xl border p-6 ${featured ? "border-brand-primary/20 bg-brand-primary/[0.035] shadow-card" : "border-surface-border bg-white"}`}>
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
                Avant de construire un outil, nous avons posé une question simple à des professionnels RH : quelle tâche, obligation ou échéance avez-vous le plus peur d’oublier ?
              </p>
            </div>
          </Reveal>

          <Reveal delay={100} className="mt-8">
            <div className="flex flex-wrap gap-2">
              {THEMES.map((theme) => (
                <span key={theme} className="rounded-full border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink-soft">{theme}</span>
              ))}
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 lg:grid-cols-6">
            <Reveal variant="left" className="lg:col-span-3"><TestimonialCard {...TESTIMONIALS[0]} /></Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
              {TESTIMONIALS.slice(1).map((item, index) => (
                <Reveal key={item.quote} variant="up" delay={140 + index * 90}><TestimonialCard {...item} /></Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={350} className="mt-8">
            <div className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-subtle p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="text-sm font-semibold text-ink">Un point commun revient souvent</p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">Le problème n’est pas de manquer d’informations. C’est de devoir penser à tout, au bon moment.</p>
              </div>
              <span className="inline-flex h-10 items-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white">Des rappels au bon moment</span>
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
                  <Avatar src={AIME_N_AVATAR} clear />
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
