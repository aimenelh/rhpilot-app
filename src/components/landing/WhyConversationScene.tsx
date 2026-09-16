"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./WhyConversationScene.module.css";

const PHONE_MOCKUP_SRC =
  "https://static.vecteezy.com/system/resources/previews/041/306/517/non_2x/ai-generated-hand-holding-phone-mockup-with-blank-screen-free-png.png";

const messages = [
  { author: "Sophie", tone: "incoming", text: "Le nouveau collaborateur vient d’arriver. Qui s’occupe de l’accueil ?" },
  { author: "Lucas", tone: "outgoing", text: "Je pensais que c’était déjà prévu côté RH." },
  { author: "Nina", tone: "incoming", text: "De mon côté, je n’ai rien reçu." },
  { author: "Thomas", tone: "outgoing", text: "Le matériel est prêt au moins ?" },
  { author: "Sophie", tone: "incoming", text: "Et la visite médicale, quelqu’un l’a planifiée ?" },
] as const;

export function WhyConversationScene() {
  const [replayKey, setReplayKey] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setIsReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return (
    <div className={styles.scene} aria-label="Conversation d’équipe illustrant un manque de coordination RH">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.deskShadow} aria-hidden="true" />

      <div className={styles.mockupStage} aria-hidden="true">
        <img className={styles.phoneFrame} src={PHONE_MOCKUP_SRC} alt="" />

        <div className={styles.screen} key={replayKey}>
          <div className={styles.statusBar}>
            <span>9:41</span>
            <span>5G</span>
          </div>

          <div className={styles.chatHeader}>
            <span className={styles.backArrow}>‹</span>
            <span className={styles.groupAvatar}>R</span>
            <div className={styles.groupMeta}>
              <strong>Équipe RH</strong>
              <span>6 membres</span>
            </div>
          </div>

          <div className={styles.chatViewport}>
            <div className={styles.chatTrack}>
              <div className={styles.dayLabel}>Aujourd’hui</div>
              {messages.map((message, index) => (
                <div
                  key={`${message.author}-${message.text}`}
                  className={`${styles.messageRow} ${message.tone === "outgoing" ? styles.outgoingRow : ""}`}
                  style={{ "--message-index": index } as CSSProperties}
                >
                  <div className={`${styles.message} ${message.tone === "outgoing" ? styles.outgoing : styles.incoming}`}>
                    <span className={styles.author}>{message.author}</span>
                    <p>{message.text}</p>
                    <time>{`09:${42 + index}`}</time>
                  </div>
                </div>
              ))}
              <div className={styles.typing}><span /><span /><span /></div>
            </div>
          </div>

          <div className={styles.chatInput}>
            <span className={styles.plus}>+</span>
            <span className={styles.inputPlaceholder}>Message</span>
            <span className={styles.mic}>⌁</span>
          </div>
        </div>
      </div>

      <div className={styles.contextCard}>
        <span>Une arrivée. Cinq messages.</span>
        <strong>Et toujours personne ne sait exactement qui fait quoi.</strong>
      </div>

      {!isReducedMotion ? (
        <button type="button" className={styles.replay} onClick={() => setReplayKey((value) => value + 1)}>
          Rejouer
        </button>
      ) : null}

      <a className={styles.attribution} href="https://www.vecteezy.com/free-png/holding-phone" target="_blank" rel="noreferrer">
        Mockup : Vecteezy
      </a>
    </div>
  );
}
