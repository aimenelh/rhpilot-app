import Image from "next/image";

export function AttentionPreview() {
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
        src="/illustrations/illu-signin-scene.png"
        alt="Le Copilote RH Pilot devant son ordinateur, avec une notification listant 3 éléments qui nécessitent votre attention"
        width={742}
        height={650}
        className="auth-scene-sway h-auto w-full max-w-[380px]"
        priority
      />
    </>
  );
}
