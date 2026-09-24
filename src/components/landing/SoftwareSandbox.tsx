"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Logomark } from "@/components/Brand";
import { KINDS, dayMonth, dayOf, longDate, parseEvent, shortDate, timeOf, type Kind, type Role } from "./liveMonthData";
import s from "./SoftwareSandbox.module.css";

// Le logiciel sans compte : le visiteur écrit un événement, RH Pilot en fait un
// plan daté, l'ajoute à la fiche du salarié, au calendrier, et le Copilote le
// résume. Mêmes parcours et même compréhension de phrase que la simulation de
// l'accueil ; les réponses du Copilote sont calculées ici, sans IA.

type Person = { id: string; kind: Kind; name: string; first: string; time: number; role: string; user?: boolean };
type Task = { id: string; person: Person; label: string; role: Role; proof?: string; day: number };

const TODAY = 0; // lundi 28 septembre 2026 dans l'entreprise de démonstration
const TEAM: Person[] = [
  { id: "lea", kind: "embauche", name: "Léa Martin", first: "Léa", time: Date.UTC(2026, 9, 8), role: "Assistante commerciale" },
  { id: "karim", kind: "fin_periode_essai", name: "Karim Belhaj", first: "Karim", time: Date.UTC(2026, 9, 22), role: "Technicien" },
  { id: "tom", kind: "visite_medicale", name: "Tom Girard", first: "Tom", time: Date.UTC(2026, 9, 30), role: "Magasinier" },
];
const EXAMPLES = ["Sofia commence le 9 novembre", "L’essai de Paul finit dans 3 semaines", "Visite médicale de Nadia le 12/11"];
const QUESTIONS = ["Que dois-je anticiper cette semaine ?", "Qu’est-ce qui est en retard ?", "Qui arrive bientôt ?"] as const;
const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function tasksOf(person: Person): Task[] {
  return KINDS[person.kind].tasks.map((t, i) => ({ id: `${person.id}-${i}`, person, label: t.label(person.first), role: t.role, proof: t.proof, day: dayOf(person.time) + t.offset }));
}

// « Déclarer la DPAE » devient « déclarer la DPAE » : on garde les sigles.
const lowerFirst = (text: string) => (/^[A-ZÀ-Ý]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1));

const when = (day: number) => {
  const delta = day - TODAY;
  if (delta < 0) return `en retard de ${-delta} j`;
  if (delta === 0) return "aujourd’hui";
  if (delta === 1) return "demain";
  return `dans ${delta} j`;
};

export function SoftwareSandbox() {
  const [people, setPeople] = useState<Person[]>(TEAM);
  const [selected, setSelected] = useState("lea");
  const [done, setDone] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [month, setMonth] = useState(9); // octobre 2026
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [question, setQuestion] = useState<(typeof QUESTIONS)[number] | null>(null);
  const uid = useId();

  const tasks = useMemo(() => people.flatMap(tasksOf), [people]);
  // Les tâches passées de l'équipe de démonstration sont faites ; celles des
  // personnes ajoutées par le visiteur restent à faire, donc en retard si datées avant aujourd'hui.
  const isDone = (task: Task) => done.has(task.id) || (!task.person.user && task.day < TODAY);
  const person = people.find((p) => p.id === selected) ?? people[0];
  const plan = tasks.filter((t) => t.person.id === person.id);
  const planDone = plan.filter(isDone).length;
  const open = tasks.filter((t) => !isDone(t));
  const late = open.filter((t) => t.day < TODAY).sort((a, b) => a.day - b.day);
  const week = open.filter((t) => t.day >= TODAY && t.day < TODAY + 7).sort((a, b) => a.day - b.day);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = parseEvent(text.slice(0, 140), timeOf(TODAY));
    if (!result.ok) {
      setFeedback({
        ok: false,
        text: result.reason === "kind" ? "RH Pilot suit ici une embauche, une fin de période d’essai ou une visite médicale. Essayez : « Sofia commence le 9 novembre »." : "Pour quand ? Ajoutez une date, par exemple « le 9 novembre » ou « dans 3 semaines ».",
      });
      return;
    }
    const { kind, name, first, time } = result.value;
    const added: Person = { id: `u${Date.now()}`, kind, name, first, time, role: "Nouveau dossier", user: true };
    const plan = tasksOf(added);
    const lateCount = plan.filter((t) => t.day < TODAY).length;
    setPeople((list) => [...list.filter((p) => !p.user).concat(list.filter((p) => p.user).slice(-2)), added]);
    setSelected(added.id);
    setMonth(new Date(time).getUTCMonth());
    setOpenDay(null);
    setFeedback({ ok: true, text: `${KINDS[kind].label} de ${first} le ${dayMonth(time)} : ${plan.length} actions datées${lateCount ? `, dont ${lateCount} déjà en retard` : ""}.` });
    setText("");
  };

  const toggle = (task: Task) =>
    setDone((set) => {
      const next = new Set(set);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });

  // Calendrier du mois affiché, semaines commençant le lundi.
  const first = Date.UTC(2026, month, 1);
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(2026, month + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => (i < lead || i >= lead + daysInMonth ? null : dayOf(first) + i - lead));
  const byDay = new Map<number, Task[]>();
  for (const t of tasks) byDay.set(t.day, [...(byDay.get(t.day) ?? []), t]);

  const answer = (() => {
    if (question === "Que dois-je anticiper cette semaine ?") {
      if (!week.length && !late.length) return "Rien d’urgent cette semaine.";
      const parts = week.slice(0, 4).map((t) => `${lowerFirst(t.label)} (${t.person.first}, ${when(t.day)}, ${t.role})`);
      const more = week.length > 4 ? `, et ${week.length - 4} autre${week.length - 4 > 1 ? "s" : ""}` : "";
      return `${week.length ? `Cette semaine : ${parts.join(" ; ")}${more}.` : "Rien de prévu cette semaine."}${late.length ? ` Et ${late.length} action${late.length > 1 ? "s" : ""} en retard à rattraper d’abord.` : ""}`;
    }
    if (question === "Qu’est-ce qui est en retard ?") {
      if (!late.length) return "Rien n’est en retard. Ajoutez une embauche proche, par exemple « Sofia arrive lundi », pour voir ce qui se passe.";
      return `${late.length} action${late.length > 1 ? "s" : ""} en retard : ${late.map((t) => `${lowerFirst(t.label)} pour ${t.person.first} (prévue le ${dayMonth(timeOf(t.day))})`).join(" ; ")}.`;
    }
    if (question === "Qui arrive bientôt ?") {
      const arrivals = people.filter((p) => p.kind === "embauche" && dayOf(p.time) >= TODAY).sort((a, b) => a.time - b.time);
      if (!arrivals.length) return "Aucune arrivée prévue.";
      return arrivals.map((p) => `${p.first} arrive le ${dayMonth(p.time)} ; prochaine étape : ${lowerFirst(tasksOf(p).find((t) => !isDone(t))?.label ?? "tout est prêt")}`).join(". ") + ".";
    }
    return null;
  })();

  return (
    <div className={s.app}>
      <div className={s.bar}>
        <span className={s.brand}>
          <Logomark size={18} /> RH Pilot <small>Entreprise de démonstration (fictive)</small>
        </span>
        <span className={s.today}>{longDate(timeOf(TODAY))}</span>
      </div>

      <form className={s.ask} onSubmit={onSubmit}>
        <label htmlFor={`${uid}-ask`}>Écrivez ce qui arrive dans votre équipe</label>
        <div className={s.field}>
          <input id={`${uid}-ask`} value={text} maxLength={140} onChange={(e) => setText(e.target.value)} placeholder="Ex. : Sofia arrive lundi" autoComplete="off" />
          <button type="submit" disabled={!text.trim()}>
            Créer le plan
          </button>
        </div>
        <p className={s.examples}>
          Essayez :{" "}
          {EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => setText(example)}>
              « {example} »
            </button>
          ))}
        </p>
        <p className={s.feedback} data-ok={feedback?.ok} aria-live="polite">
          {feedback?.text ?? ""}
        </p>
      </form>

      <div className={s.grid}>
        <section id="parcours" className={s.panel} aria-labelledby={`${uid}-plan`}>
          <header>
            <h3 id={`${uid}-plan`}>Parcours · {person.name}</h3>
            <span>
              {KINDS[person.kind].label} le {dayMonth(person.time)} · {planDone}/{plan.length} faites
            </span>
          </header>
          <div className={s.progress} aria-hidden="true">
            <i style={{ width: `${(planDone / plan.length) * 100}%`, background: KINDS[person.kind].color }} />
          </div>
          <ol className={s.plan}>
            {plan.map((task) => {
              const finished = isDone(task);
              const overdue = !finished && task.day < TODAY;
              return (
                <li key={task.id} data-done={finished} data-late={overdue}>
                  <button type="button" className={s.check} aria-pressed={finished} aria-label={`${finished ? "Rouvrir" : "Marquer comme faite"} : ${task.label}`} onClick={() => toggle(task)}>
                    {finished ? "✓" : ""}
                  </button>
                  <div>
                    <strong>{task.label}</strong>
                    <span>
                      {task.role}
                      {task.proof ? ` · pièce : ${task.proof.replace(/^(l’|le |la )/, "")}` : ""}
                    </span>
                  </div>
                  <time>
                    {shortDate(timeOf(task.day))}
                    <small>{finished ? "faite" : when(task.day)}</small>
                  </time>
                </li>
              );
            })}
          </ol>
        </section>

        <div className={s.side}>
          <section id="salaries" className={s.panel} aria-labelledby={`${uid}-team`}>
            <header>
              <h3 id={`${uid}-team`}>Équipe</h3>
              <span>{people.length} dossiers</span>
            </header>
            <ul className={s.team}>
              {people.map((p) => {
                const next = tasksOf(p).find((t) => !isDone(t));
                const lateHere = tasksOf(p).some((t) => !isDone(t) && t.day < TODAY);
                return (
                  <li key={p.id}>
                    <button type="button" aria-pressed={p.id === person.id} onClick={() => setSelected(p.id)}>
                      <i style={{ background: KINDS[p.kind].color }} aria-hidden="true" />
                      <span className={s.who}>
                        {p.name}
                        <small>
                          {p.role} · {KINDS[p.kind].label.toLowerCase()}
                        </small>
                      </span>
                      <span className={s.next} data-late={lateHere}>
                        {next ? (lateHere ? "En retard" : when(next.day)) : "À jour"}
                        <small>{next ? next.label : "Parcours terminé"}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section id="echeances" className={s.panel} aria-labelledby={`${uid}-cal`}>
            <header>
              <h3 id={`${uid}-cal`}>
                {MONTHS[month][0].toUpperCase() + MONTHS[month].slice(1)} 2026
              </h3>
              <span className={s.nav}>
                <button type="button" aria-label="Mois précédent" disabled={month <= 8} onClick={() => { setMonth((m) => m - 1); setOpenDay(null); }}>
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>
                <button type="button" aria-label="Mois suivant" disabled={month >= 11} onClick={() => { setMonth((m) => m + 1); setOpenDay(null); }}>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </span>
            </header>
            <div className={s.cal} aria-label={`Échéances de ${MONTHS[month]} 2026`}>
              {WEEKDAYS.map((d) => (
                <span key={d} className={s.wd} aria-hidden="true">
                  {d}
                </span>
              ))}
              {cells.map((day, i) => {
                if (day === null) return <span key={`e${i}`} className={s.empty} />;
                const list = byDay.get(day) ?? [];
                return (
                  <button
                    key={day}
                    type="button"
                    className={s.day}
                    data-today={day === TODAY}
                    data-open={openDay === day}
                    data-has={list.length > 0}
                    disabled={!list.length}
                    aria-label={`${dayMonth(timeOf(day))} : ${list.length} échéance${list.length > 1 ? "s" : ""}`}
                    onClick={() => setOpenDay(openDay === day ? null : day)}
                  >
                    <span>{new Date(timeOf(day)).getUTCDate()}</span>
                    <span className={s.dots} aria-hidden="true">
                      {list.slice(0, 3).map((t) => (
                        <i key={t.id} data-done={isDone(t)} style={{ color: KINDS[t.person.kind].color }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
            {openDay !== null ? (
              <ul className={s.dayList}>
                {(byDay.get(openDay) ?? []).map((t) => (
                  <li key={t.id}>
                    <i style={{ background: KINDS[t.person.kind].color }} aria-hidden="true" />
                    {t.label} · {t.person.first}
                    <small>{isDone(t) ? "faite" : when(t.day)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.hint}>Choisissez un jour marqué pour voir ses échéances.</p>
            )}
          </section>
        </div>

        <section id="copilote" className={`${s.panel} ${s.copilot}`} aria-labelledby={`${uid}-copilot`}>
          <header>
            <h3 id={`${uid}-copilot`}>Copilote</h3>
            <span>Réponses tirées des données ci-dessus</span>
          </header>
          <div className={s.questions}>
            {QUESTIONS.map((q) => (
              <button key={q} type="button" aria-pressed={question === q} onClick={() => setQuestion(q)}>
                {q}
              </button>
            ))}
          </div>
          <p className={s.answer} aria-live="polite" key={`${question}-${open.length}-${people.length}`}>
            {answer ?? "Posez une question : la réponse s’appuie sur les parcours, les dates et ce qui est déjà fait."}
          </p>
          <p className={s.fine}>Ici, les réponses sont calculées directement à partir de la démonstration. Dans le logiciel, le Copilote répond sur les données de votre entreprise.</p>
        </section>
      </div>
    </div>
  );
}
