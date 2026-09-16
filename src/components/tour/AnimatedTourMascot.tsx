"use client";

import Image from "next/image";

export type TourMascotPose = "welcome" | "present" | "point" | "tip" | "success";

const POSE_ASSETS: Record<TourMascotPose, string> = {
  welcome: "/illustrations/onboarding/guide-welcome.svg",
  present: "/illustrations/onboarding/guide-present.svg",
  point: "/illustrations/onboarding/guide-point.svg",
  tip: "/illustrations/onboarding/guide-tip.svg",
  success: "/illustrations/onboarding/guide-success.svg",
};

const POSE_MOTION: Record<TourMascotPose, string> = {
  welcome: "tour-guide-wave",
  present: "tour-guide-present",
  point: "tour-guide-point",
  tip: "tour-guide-tip",
  success: "tour-guide-success",
};

export function AnimatedTourMascot({
  pose,
  stepKey,
}: {
  pose: TourMascotPose;
  stepKey: number;
}) {
  return (
    <div className="relative h-40 w-36 shrink-0 max-sm:h-28 max-sm:w-24" aria-hidden="true">
      <style>{`
        @keyframes tourGuideEnter {
          0% { opacity: 0; transform: translate3d(-10px, 8px, 0) scale(.95); }
          72% { opacity: 1; transform: translate3d(1px, -2px, 0) scale(1.012); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes tourGuideFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes tourGuideWave {
          0%, 68%, 100% { transform: rotate(0deg); }
          76% { transform: rotate(-1.8deg); }
          86% { transform: rotate(1.2deg); }
          94% { transform: rotate(-.6deg); }
        }
        @keyframes tourGuidePresent {
          0%, 72%, 100% { transform: translateX(0); }
          82% { transform: translateX(2px); }
          90% { transform: translateX(0); }
        }
        @keyframes tourGuidePoint {
          0%, 70%, 100% { transform: translateX(0) rotate(0deg); }
          80% { transform: translateX(3px) rotate(.45deg); }
          90% { transform: translateX(1px) rotate(0deg); }
        }
        @keyframes tourGuideTip {
          0%, 70%, 100% { transform: translateY(0); }
          81% { transform: translateY(-4px); }
          91% { transform: translateY(-1px); }
        }
        @keyframes tourGuideSuccess {
          0%, 72%, 100% { transform: translateY(0) scale(1); }
          82% { transform: translateY(-3px) scale(1.015); }
          92% { transform: translateY(0) scale(1); }
        }
        @keyframes tourGuideShadow {
          0%, 100% { opacity: .12; transform: translateX(-50%) scaleX(1); }
          50% { opacity: .07; transform: translateX(-50%) scaleX(.9); }
        }
        .tour-guide-enter { animation: tourGuideEnter .42s cubic-bezier(.2,.8,.2,1) both; }
        .tour-guide-float { animation: tourGuideFloat 3.2s ease-in-out .42s infinite; transform-origin: 50% 92%; }
        .tour-guide-wave { animation: tourGuideWave 2.8s ease-in-out .55s infinite; transform-origin: 50% 92%; }
        .tour-guide-present { animation: tourGuidePresent 3s ease-in-out .55s infinite; }
        .tour-guide-point { animation: tourGuidePoint 2.65s ease-in-out .55s infinite; transform-origin: 50% 92%; }
        .tour-guide-tip { animation: tourGuideTip 2.7s ease-in-out .55s infinite; }
        .tour-guide-success { animation: tourGuideSuccess 2.8s ease-in-out .55s infinite; transform-origin: 50% 92%; }
        .tour-guide-shadow { animation: tourGuideShadow 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .tour-guide-enter,
          .tour-guide-float,
          .tour-guide-wave,
          .tour-guide-present,
          .tour-guide-point,
          .tour-guide-tip,
          .tour-guide-success,
          .tour-guide-shadow { animation: none !important; }
        }
      `}</style>

      <div className="tour-guide-shadow absolute bottom-1 left-1/2 h-2.5 w-16 -translate-x-1/2 rounded-[100%] bg-black blur-[5px]" />
      <div key={`${pose}-${stepKey}`} className="tour-guide-enter absolute inset-0">
        <div className="tour-guide-float absolute inset-0">
          <div className={`${POSE_MOTION[pose]} relative h-full w-full`}>
            <Image
              src={POSE_ASSETS[pose]}
              alt=""
              fill
              sizes="(max-width: 640px) 96px, 144px"
              className="object-contain object-bottom"
              unoptimized
              priority={stepKey === 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
