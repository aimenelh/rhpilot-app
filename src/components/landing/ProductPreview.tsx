import Image from "next/image";

export function ProductPreview() {
  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes authSceneSway {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(0.8deg); }
          }
          .auth-scene-sway {
            animation: authSceneSway 5s ease-in-out infinite;
            transform-origin: 50% 100%;
          }
        }
      `}</style>
      <Image
        src="/illustrations/illu-signup-scene.png"
        alt="Le Copilote RH Pilot assis sur la fiche d'embauche de Julie Martin, avec une visite médicale et un rappel envoyé qui flottent autour"
        width={763}
        height={818}
        className="auth-scene-sway h-auto w-full max-w-[380px]"
        priority
      />
    </>
  );
}
