"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Logomark } from "@/components/Brand";
import { DAYS, KINDS, dayMonth, dayOf, longDate, nextWorkday, parseEvent, shortDate, timeOf, type Kind, type Role } from "./liveMonthData";
import s from "./LiveMonth.module.css";

// « Les 30 prochains jours, en 30 secondes » : une entreprise fictive, les vrais
// parcours de RH Pilot, et le logiciel qui travaille sous les yeux du visiteur.

type Event = { id: string; kind: Kind; name: string; first: string; time: number; addedDay: number; user?: boolean };
type Task = { id: string; event: Event; label: string; role: Role; proof?: string; day: number };
type FeedItem = { id: string; day: number; tone: "done" | "reminder" | "copilot" | "alert" | "added"; text: string; order: number };

// Dates choisies pour qu'aucune action de la fenêtre ne tombe un samedi ou un dimanche.
const BASE: Event[] = [
  { id: "lea", kind: "embauche", name: "Léa Martin", first: "Léa", time: Date.UTC(2026, 9, 8), addedDay: -99 },
  { id: "karim", kind: "fin_periode_essai", name: "Karim Belhaj", first: "Karim", time: Date.UTC(2026, 9, 22), addedDay: -99 },
  { id: "tom", kind: "visite_medicale", name: "Tom Girard", first: "Tom", time: Date.UTC(2026, 9, 30), addedDay: -99 },
];
const DECISION = "karim-2"; // « Décider : confirmation ou rupture », jeudi 15 octobre
const ALERT_DAY = 11; // vendredi 9 octobre, six jours avant l'échéance
const TONE: Record<FeedItem["tone"], string> = { done: "Fait", reminder: "Rappel", copilot: "Copilote", alert: "Alerte", added: "Ajouté" };
const EXAMPLES = ["Sofia commence le 9 novembre", "L’essai de Paul finit dans 3 semaines", "Visite médicale de Nadia le 12/11"];

const dayOfTask = (tasks: Task[], id: string) => tasks.find((t) => t.id === id)?.day ?? 0;

function tasksOf(event: Event): Task[] {
  return KINDS[event.kind].tasks.map((t, i) => ({
    id: `${event.id}-${i}`,
    event,
    label: t.label(event.first),
    role: t.role,
    proof: t.proof,
    day: dayOf(event.time) + t.offset,
  }));
}

export function LiveMonth() {
  const [day, setDay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const visible = useRef(false);
  const pausedByScroll = useRef(false);
  const playingRef = useRef(false);
  playingRef.current = playing;
  const [prepared, setPrepared] = useState<{ day: number; by: "vous" | "auto" } | null>(null);
  const [added, setAdded] = useState<Event[]>([]);
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const ended = day >= DAYS - 1;

  // Démarre quand la fenêtre du logiciel est bien visible, se met en pause quand
  // elle sort de l'écran et reprend quand on y revient.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          if (!started.current && !reduce) {
            started.current = true;
            setPlaying(true);
          } else if (pausedByScroll.current) {
            pausedByScroll.current = false;
            setPlaying(true);
          }
        } else if (playingRef.current) {
          pausedByScroll.current = true;
          setPlaying(false);
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setDay((d) => Math.min(d + 1, DAYS - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (day >= DAYS - 1) setPlaying(false);
  }, [day]);

  // Au moment de la décision, la démonstration s'arrête : c'est au visiteur de
  // cliquer, comme dans le logiciel. Sans clic, elle reprend seule après 9 s.
  const waiting = day === ALERT_DAY && prepared === null;
  useEffect(() => {
    if (!waiting) return;
    setPlaying(false);
    const timer = window.setTimeout(() => {
      setPrepared({ day: ALERT_DAY, by: "auto" });
      if (visible.current) setPlaying(true);
      else pausedByScroll.current = true;
    }, 9000);
    return () => window.clearTimeout(timer);
  }, [waiting]);

  const events = useMemo(() => [...BASE, ...added], [added]);
  const tasks = useMemo(() => events.flatMap(tasksOf), [events]);
  const decisionDay = nextWorkday(prepared ? prepared.day : ALERT_DAY);

  // Les actions de l'entreprise fictive se font à leur date ; la décision de Karim
  // attend d'être préparée. Les événements ajoutés par le visiteur restent à faire.
  const isDone = (task: Task) => {
    if (task.event.user) return false;
    if (task.day < 0) return true;
    if (task.id === DECISION) return day >= decisionDay;
    return task.day <= day;
  };

  const feed = useMemo(() => {
    const items: FeedItem[] = [];
    let order = 0;
    const push = (d: number, tone: FeedItem["tone"], text: string) => items.push({ id: `${d}-${order}`, day: d, tone, text, order: order++ });
    const at = (id: string) => dayOfTask(tasks, id);
    const base = tasks.filter((t) => !t.event.user && t.day >= 0 && t.day < DAYS);
    const date = (id: string) => dayMonth(timeOf(at(id)));
    push(0, "copilot", `Bonjour. 3 parcours en cours, ${base.length} actions prévues d’ici au ${dayMonth(timeOf(DAYS - 1))}.`);
    push(at("lea-1") - 3, "reminder", `Envoyé au RH : DPAE de Léa à déclarer au plus tard le ${date("lea-1")}.`);
    base
      .filter((t) => t.id !== DECISION)
      .forEach((t) => push(t.day, "done", `${t.label}${t.label.includes(t.event.first) ? "" : ` · ${t.event.first}`}${t.proof ? ` · avec ${t.proof}` : ""}`));
    const week = base.filter((t) => t.day > ALERT_DAY - 5 && t.day <= ALERT_DAY).length;
    push(ALERT_DAY, "copilot", `Résumé de la semaine : ${week} actions faites, aucune en retard.`);
    push(ALERT_DAY, "alert", `Essai de Karim : aucune décision enregistrée, échéance le ${date(DECISION)}.`);
    if (prepared?.by === "vous") push(prepared.day, "copilot", `Dossier préparé : bilan du ${date("karim-1")} et délai de prévenance joints. Vous décidez.`);
    else if (prepared) push(prepared.day, "copilot", `Dossier de décision préparé pour le dirigeant : bilan du ${date("karim-1")} et délai de prévenance joints.`);
    if (prepared) push(decisionDay, "done", "Décision enregistrée par le dirigeant · Karim");
    push(at("tom-2") - 2, "reminder", `Envoyé au RH : prévenir Tom de sa visite médicale avant le ${date("tom-2")}.`);
    push(at("lea-5"), "copilot", `Semaine prochaine : visite médicale de Tom le ${dayMonth(BASE[2].time)}. Tom est prévenu, la convocation est au dossier.`);
    added.forEach((e) => {
      const plan = tasksOf(e);
      const late = plan.filter((t) => t.day < e.addedDay).length;
      push(
        e.addedDay,
        "added",
        `Compris : ${KINDS[e.kind].label.toLowerCase()} de ${e.first} le ${dayMonth(e.time)}. ${plan.length} actions datées créées${late ? `, dont ${late} déjà en retard à rattraper` : ""}.`,
      );
    });
    return items.filter((i) => i.day <= day).sort((a, b) => b.day - a.day || b.order - a.order);
  }, [tasks, added, prepared, decisionDay, day]);

  const upcoming = tasks
    .filter((t) => !isDone(t))
    .map((t) => ({ t, late: t.day < day }))
    .sort((a, b) => Number(b.late) - Number(a.late) || a.t.day - b.t.day)
    .slice(0, 4);
  const doneCount = tasks.filter((t) => t.day >= 0 && t.day <= day && isDone(t)).length;
  const lateCount = tasks.filter((t) => t.day < day && !isDone(t)).length;
  const later = tasks.filter((t) => t.day >= DAYS).length;
  const showAlert = waiting;
  const deadline = dayMonth(timeOf(dayOfTask(tasks, DECISION)));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const today = timeOf(day);
    const result = parseEvent(text.slice(0, 140), today);
    if (!result.ok) {
      setFeedback({
        ok: false,
        text:
          result.reason === "kind"
            ? "Je sais suivre une embauche, une fin de période d’essai ou une visite médicale. Essayez par exemple : « Sofia commence le 9 novembre »."
            : `Pour quand ? Ajoutez une date, par exemple « le 9 novembre » ou « dans 3 semaines ».`,
      });
      return;
    }
    const { kind, name, first, time } = result.value;
    const next: Event = { id: `u${Date.now()}`, kind, name, first, time, addedDay: day, user: true };
    setAdded((list) => [...list.slice(-2), next]);
    setFeedback({ ok: true, text: `${KINDS[kind].label} de ${first} le ${dayMonth(time)} : ${KINDS[kind].tasks.length} actions datées.` });
    setText("");
  };

  const replay = () => {
    started.current = true;
    pausedByScroll.current = false;
    setDay(0);
    setPrepared(null);
    setAdded([]);
    setFeedback(null);
    setPlaying(true);
  };

  const x = (d: number) => `${(d / (DAYS - 1)) * 100}%`;
  const knots = tasks.filter((t) => t.day >= 0 && t.day < DAYS);
  const stack: Record<number, number> = {};

  return (
    <section className={s.live} aria-labelledby={`${inputId}-title`}>
      <div className={s.inner}>
        <div className={s.head}>
          <h2 id={`${inputId}-title`} className={s.title}>
            Les 30 prochains jours,
            <em> en 30 secondes.</em>
          </h2>
          <p className={s.lead}>
            Une entreprise fictive, trois salariés, les vrais parcours de RH Pilot. Regardez le logiciel travailler, puis ajoutez votre propre événement.
          </p>
        </div>

        <div ref={frame} className={s.window}>
          <div className={s.bar}>
            <span className={s.brand}>
              <Logomark size={18} /> RH Pilot
              <small>Entreprise de démonstration (fictive)</small>
            </span>
            <span className={s.date} aria-live="off">
              {longDate(timeOf(day))}
            </span>
            <span className={s.controls}>
              <span className={s.counter}>
                Jour {day + 1} / {DAYS}
              </span>
              {ended ? (
                <button type="button" onClick={replay} aria-label="Rejouer les 30 jours">
                  <RotateCcw size={15} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={waiting}
                  onClick={() => {
                    started.current = true;
                    pausedByScroll.current = false;
                    setPlaying((p) => !p);
                  }}
                  aria-label={playing ? "Mettre en pause" : "Lancer la simulation"}
                >
                  {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                </button>
              )}
            </span>
          </div>

          <div className={s.timeline} aria-hidden="true">
            <div className={s.track}>
              <span className={s.line} />
              <span className={s.progress} style={{ width: x(day) }} />
              {[0, 7, 14, 21, 28].map((d) => (
                <span key={d} className={s.tick} data-minor={d === 7 || d === 21} data-edge={d === 0 ? "start" : d === 28 ? "end" : undefined} style={{ left: x(d) }}>
                  {shortDate(timeOf(d))}
                </span>
              ))}
              {knots.map((t) => {
                const level = (stack[t.day] = (stack[t.day] ?? -1) + 1);
                const done = isDone(t);
                const late = !done && t.day < day;
                return (
                  <span
                    key={t.id}
                    className={s.knot}
                    data-state={done ? "done" : late ? "late" : "todo"}
                    style={{ left: x(t.day), marginTop: `${-level * 14}px`, color: KINDS[t.event.kind].color }}
                  />
                );
              })}
              <span className={s.today} style={{ left: x(day) }} data-edge={day > DAYS - 5 ? "end" : day < 3 ? "start" : undefined}>
                <b>Aujourd’hui</b>
              </span>
              {later > 0 && <span className={s.later}>+{later} après le {dayMonth(timeOf(DAYS - 1))}</span>}
            </div>
          </div>

          <div className={s.panes}>
            <div className={s.feed}>
              <h3>Ce que fait RH Pilot</h3>
              {showAlert && (
                <div className={s.alert}>
                  <p>
                    <b>Décision attendue</b> Essai de Karim : aucune décision enregistrée, échéance le {deadline}.
                    <small>La démonstration attend votre clic.</small>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPrepared({ day, by: "vous" });
                      setPlaying(true);
                    }}
                  >
                    Préparer la décision
                  </button>
                </div>
              )}
              <ol>
                {(showAlert ? feed.filter((item) => item.tone !== "alert").slice(0, 3) : feed.slice(0, 4)).map((item) => (
                  <li key={item.id} data-tone={item.tone}>
                    <time>{shortDate(timeOf(item.day))}</time>
                    <span>
                      <b>{TONE[item.tone]}</b> {item.text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className={s.next}>
              <h3>À venir</h3>
              <ul>
                {upcoming.map(({ t, late }) => {
                  const inDays = t.day - day;
                  return (
                    <li key={t.id} data-late={late}>
                      <i style={{ background: KINDS[t.event.kind].color }} aria-hidden="true" />
                      <span className={s.what}>
                        {t.label}
                        <small>
                          {t.event.first} · {t.role}
                        </small>
                      </span>
                      <span className={s.when}>
                        {late ? "En retard" : inDays === 0 ? "Aujourd’hui" : inDays === 1 ? "Demain" : `Dans ${inDays} j`}
                        <small>{shortDate(timeOf(t.day))}</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className={s.stats}>
                <span>
                  <b>{doneCount}</b> faites
                </span>
                <span>
                  <b>{lateCount}</b> en retard
                </span>
              </p>
            </div>
          </div>

          <form className={s.ask} onSubmit={onSubmit}>
            <label htmlFor={inputId}>Écrivez ce qui arrive</label>
            <div className={s.field}>
              <input
                id={inputId}
                value={text}
                maxLength={140}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex. : Sofia arrive lundi"
                autoComplete="off"
              />
              <button type="submit" disabled={!text.trim()}>
                Ajouter
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
        </div>

        <p className={s.outro} data-show={ended}>
          RH Pilot observe, explique et prépare. <em>Vous décidez.</em>
        </p>
      </div>
    </section>
  );
}
