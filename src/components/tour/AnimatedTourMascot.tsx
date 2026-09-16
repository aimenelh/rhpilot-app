"use client";

export type TourMascotPose = "welcome" | "present" | "point" | "tip" | "success";

const SPRITE_POSITIONS: Record<TourMascotPose, string> = {
  welcome: "0% 50%",
  present: "25% 50%",
  point: "50% 50%",
  tip: "75% 50%",
  success: "100% 50%",
};

export function AnimatedTourMascot({
  pose,
  stepKey,
}: {
  pose: TourMascotPose;
  stepKey: number;
}) {
  const emphasisClass = pose === "point" || pose === "tip" ? "tour-guide-mascot-emphasis" : "";

  return (
    <div className="relative h-36 w-36 shrink-0 max-sm:h-24 max-sm:w-24" aria-hidden="true">
      <style>{`
        @keyframes tourGuideEnter {
          0% { opacity: 0; transform: translate3d(-10px, 10px, 0) scale(.94); }
          70% { opacity: 1; transform: translate3d(1px, -2px, 0) scale(1.01); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes tourGuideBreathe {
          0%, 100% { transform: translateY(0) rotate(-.25deg); }
          50% { transform: translateY(-4px) rotate(.3deg); }
        }
        @keyframes tourGuideEmphasis {
          0%, 72%, 100% { transform: translateY(0) rotate(0deg); }
          80% { transform: translateY(-3px) rotate(-.45deg); }
          90% { transform: translateY(-1px) rotate(.35deg); }
        }
        @keyframes tourGuideShadow {
          0%, 100% { opacity: .12; transform: translateX(-50%) scaleX(1); }
          50% { opacity: .075; transform: translateX(-50%) scaleX(.9); }
        }
        .tour-guide-mascot-enter { animation: tourGuideEnter .44s cubic-bezier(.2,.8,.2,1) both; }
        .tour-guide-mascot-idle { animation: tourGuideBreathe 3.2s ease-in-out .44s infinite; transform-origin: 50% 90%; }
        .tour-guide-mascot-emphasis { animation-name: tourGuideEmphasis; animation-duration: 2.65s; }
        .tour-guide-mascot-shadow { animation: tourGuideShadow 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .tour-guide-mascot-enter,
          .tour-guide-mascot-idle,
          .tour-guide-mascot-emphasis,
          .tour-guide-mascot-shadow { animation: none !important; }
        }
      `}</style>

      <div className="tour-guide-mascot-shadow absolute bottom-1 left-1/2 h-2.5 w-16 -translate-x-1/2 rounded-[100%] bg-black blur-[5px]" />
      <div key={`${pose}-${stepKey}`} className="tour-guide-mascot-enter absolute inset-0">
        <div
          className={`tour-guide-mascot-idle absolute inset-0 bg-no-repeat ${emphasisClass}`}
          style={{
            backgroundImage: "url('/illustrations/onboarding/mascot-guide.webp')",
            backgroundSize: "500% 100%",
            backgroundPosition: SPRITE_POSITIONS[pose],
          }}
        />
      </div>
    </div>
  );
}
