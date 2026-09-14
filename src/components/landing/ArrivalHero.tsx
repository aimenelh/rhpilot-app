import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CalendarDays,
  FileText,
  Users,
  ChevronRight,
} from "lucide-react";
import { Logomark } from "@/components/Brand";
import s from "./ArrivalHero.module.css";

export function ArrivalHero() {
  return (
    <section className={s.hero} aria-labelledby="arrival-title">
      <div className={s.wrap}>
        <p className={s.eyebrow}>RH PILOT · LE SUIVI RH DES PETITES ÉQUIPES</p>
        <div className={s.intro}>
          <div>
            <h1 id="arrival-title">
              Une équipe à accompagner.
              <br />
              <em>La suite, sous les yeux.</em>
            </h1>
            <div className={s.actions}>
              <Link href="/sign-up" className={s.primary}>
                Essayer gratuitement <ArrowUpRight size={17} />
              </Link>
              <Link href="/services#demo" className={s.secondary}>
                Voir le logiciel <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className={s.introAside}>
            <p>
              Salariés, démarches et échéances : retrouvez ce qui demande votre
              attention, et avancez.
            </p>
            <span>En bêta · Gratuit jusqu’à 3 salariés</span>
          </div>
        </div>
        <div className={s.sceneLabel}>
          <span>UNE ARRIVÉE, UN FIL CONDUCTEUR.</span>
          <span>Exemple illustratif · données fictives</span>
        </div>
        <div className={s.scene}>
          <div className={s.toolbar}>
            <span className={s.brand}>
              <Logomark size={23} /> RH Pilot
            </span>
            <span className={s.breadcrumb}>
              Parcours <ChevronRight size={12} /> Embauche
            </span>
            <span className={s.workspace}>
              Mon équipe <span>ML</span>
            </span>
          </div>
          <div className={s.workspaceBody}>
            <aside className={s.rail} aria-label="Repères du logiciel">
              <Users size={19} />
              <span className={s.railActive}>
                <FileText size={19} />
              </span>
              <CalendarDays size={19} />
              <span className={s.railLine} />
            </aside>
            <div className={s.journey}>
              <div className={s.journeyHeader}>
                <div>
                  <span className={s.smallLabel}>PARCOURS D’EMBAUCHE</span>
                  <h2>Bienvenue, Camille.</h2>
                  <p>
                    Chargée de clientèle <span>·</span> Arrivée lundi 21
                    septembre
                  </p>
                </div>
                <span className={s.avatar}>CM</span>
              </div>
              <div className={s.progress}>
                <span>
                  <strong>2 sur 4</strong> étapes réalisées
                </span>
                <span className={s.progressTrack}>
                  <i />
                </span>
                <span>En préparation</span>
              </div>
              <ol className={s.tasks}>
                <li>
                  <span className={s.done}>
                    <Check size={13} />
                  </span>
                  <div>
                    <h3>Créer la fiche de Camille</h3>
                    <p>Ses informations, réunies au même endroit.</p>
                  </div>
                  <span className={s.complete}>Terminé</span>
                </li>
                <li>
                  <span className={s.done}>
                    <Check size={13} />
                  </span>
                  <div>
                    <h3>Préparer les documents</h3>
                    <p>Les pièces utiles sont rattachées au parcours.</p>
                  </div>
                  <span className={s.complete}>Terminé</span>
                </li>
                <li className={s.currentTask}>
                  <span className={s.todo} />
                  <div>
                    <h3>Organiser son premier jour</h3>
                    <p>Accueil, matériel et présentation de l’équipe.</p>
                  </div>
                  <span className={s.assignee}>
                    <b>LD</b> Léa
                  </span>
                </li>
                <li>
                  <span className={s.todo} />
                  <div>
                    <h3>Faire le point après l’arrivée</h3>
                    <p>Un échange à préparer avec Camille.</p>
                  </div>
                  <span className={s.pending}>À venir</span>
                </li>
              </ol>
              <div className={s.journeyFoot}>
                <span>Une étape, un responsable, une date.</span>
                <Link href="/services#demo">
                  Explorer un parcours <ArrowUpRight size={14} />
                </Link>
              </div>
            </div>
            <aside className={s.agenda} aria-label="Échéance du parcours">
              <p className={s.smallLabel}>LE PROCHAIN RENDEZ-VOUS</p>
              <div className={s.date}>
                <span>LUNDI</span>
                <strong>21</strong>
                <span>SEPTEMBRE</span>
              </div>
              <div className={s.appointment}>
                <span className={s.time}>09:00</span>
                <h3>Premier jour de Camille</h3>
                <p>Léa prépare son accueil.</p>
                <span className={s.linked}>
                  <span /> Lié au parcours d’embauche
                </span>
              </div>
              <div className={s.mascotNote}>
                <div className={s.mascot} aria-hidden="true">
                  <svg viewBox="700 140 554 970" fill="none">
                    <defs>
                      <clipPath id="hero-mascot-crop">
                        <rect x="700" y="140" width="554" height="970" />
                      </clipPath>
                    </defs>
                    <image
                      href="/illustrations/mascot/intro-push-wave.png"
                      width="1254"
                      height="1254"
                      clipPath="url(#hero-mascot-crop)"
                    />
                  </svg>
                </div>
                <p>
                  Une place pour chacun.
                  <br />
                  Et pour chaque étape.
                </p>
              </div>
            </aside>
          </div>
        </div>
        <p className={s.sceneCaption}>
          Du premier document au premier jour : gardez le fil de ce qui reste à
          faire.
        </p>
      </div>
    </section>
  );
}
